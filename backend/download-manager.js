const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DownloadManager {
  constructor() {
    this.activeDownloads = new Map();
  }

  /**
   * Download a file with progress tracking
   * @param {string} url - URL to download
   * @param {string} destPath - Full destination file path
   * @param {function} onProgress - Callback: ({ percent, downloaded, total, speed })
   * @param {string} id - Optional download identifier for cancellation
   * @returns {Promise<string>} - Resolved dest path
   */
  async download(url, destPath, onProgress = null, id = null) {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const abortController = new AbortController();
    if (id) {
      this.activeDownloads.set(id, abortController);
    }

    try {
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        signal: abortController.signal,
        headers: {
          'User-Agent': 'X3LANIX-Launcher/1.0.0 (custom-mc-launcher)'
        },
        maxRedirects: 10,
        timeout: 60000
      });

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      let startTime = Date.now();

      const writer = fs.createWriteStream(destPath);

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (onProgress && totalBytes > 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = downloadedBytes / elapsed; // bytes per second
            onProgress({
              percent: Math.round((downloadedBytes / totalBytes) * 100),
              downloaded: downloadedBytes,
              total: totalBytes,
              speed,
              downloadedMB: (downloadedBytes / 1048576).toFixed(1),
              totalMB: (totalBytes / 1048576).toFixed(1)
            });
          }
        });

        response.data.pipe(writer);

        writer.on('finish', () => {
          if (id) this.activeDownloads.delete(id);
          resolve(destPath);
        });

        writer.on('error', (err) => {
          if (id) this.activeDownloads.delete(id);
          // Clean up partial file
          try { fs.unlinkSync(destPath); } catch (_) {}
          reject(err);
        });

        response.data.on('error', (err) => {
          if (id) this.activeDownloads.delete(id);
          writer.destroy();
          try { fs.unlinkSync(destPath); } catch (_) {}
          reject(err);
        });
      });
    } catch (err) {
      if (id) this.activeDownloads.delete(id);
      if (axios.isCancel(err)) {
        try { fs.unlinkSync(destPath); } catch (_) {}
        throw new Error('Download cancelled');
      }
      throw err;
    }
  }

  /**
   * Download multiple files sequentially with overall progress
   * @param {Array<{url, dest, name}>} files
   * @param {function} onProgress - ({ currentFile, fileIndex, totalFiles, fileProgress })
   */
  async downloadMultiple(files, onProgress = null) {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.download(
        file.url,
        file.dest,
        (fileProgress) => {
          if (onProgress) {
            onProgress({
              currentFile: file.name || path.basename(file.dest),
              fileIndex: i,
              totalFiles: files.length,
              fileProgress,
              overallPercent: Math.round(((i + fileProgress.percent / 100) / files.length) * 100)
            });
          }
        },
        `multi-${i}`
      );
      results.push(result);
    }
    return results;
  }

  cancel(id) {
    const controller = this.activeDownloads.get(id);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(id);
    }
  }

  cancelAll() {
    for (const [id, controller] of this.activeDownloads) {
      controller.abort();
    }
    this.activeDownloads.clear();
  }

  /**
   * Download with exponential backoff retry
   * Ported from x3lanix lancher's backon::ExponentialBuilder pattern
   * @param {string} url 
   * @param {string} destPath 
   * @param {function} onProgress 
   * @param {number} maxRetries - Max retry attempts (default 3)
   * @param {number} baseDelay - Initial delay in ms (default 1000)
   */
  async downloadWithRetry(url, destPath, onProgress = null, maxRetries = 3, baseDelay = 1000) {
    let lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.download(url, destPath, onProgress, `retry-${attempt}`);
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(`[DownloadManager] Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms — ${err.message}`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastErr;
  }

  /**
   * Download multiple files concurrently with configurable parallelism
   * Ported from x3lanix lancher's concurrent download system
   * @param {Array<{url, dest, name}>} files
   * @param {function} onProgress - ({ currentFile, fileIndex, totalFiles, fileProgress, overallPercent })
   * @param {number} concurrency - Max concurrent downloads (default 5)
   */
  async downloadConcurrent(files, onProgress = null, concurrency = 5) {
    const results = new Array(files.length).fill(null);
    let completedCount = 0;
    let activeCount = 0;
    let nextIndex = 0;

    return new Promise((resolve, reject) => {
      const startNext = () => {
        while (activeCount < concurrency && nextIndex < files.length) {
          const idx = nextIndex++;
          const file = files[idx];
          activeCount++;

          this.downloadWithRetry(
            file.url,
            file.dest,
            (fileProgress) => {
              if (onProgress) {
                onProgress({
                  currentFile: file.name || path.basename(file.dest),
                  fileIndex: idx,
                  totalFiles: files.length,
                  fileProgress,
                  overallPercent: Math.round(((completedCount + fileProgress.percent / 100) / files.length) * 100),
                  completedCount
                });
              }
            }
          ).then((result) => {
            results[idx] = { success: true, path: result };
            completedCount++;
            activeCount--;

            if (onProgress) {
              onProgress({
                currentFile: file.name || path.basename(file.dest),
                fileIndex: idx,
                totalFiles: files.length,
                overallPercent: Math.round((completedCount / files.length) * 100),
                completedCount,
                stage: completedCount === files.length ? 'complete' : 'downloading'
              });
            }

            if (completedCount === files.length) {
              resolve(results);
            } else {
              startNext();
            }
          }).catch((err) => {
            results[idx] = { success: false, error: err.message };
            completedCount++;
            activeCount--;
            
            // Continue with other downloads even if one fails
            if (completedCount === files.length) {
              resolve(results);
            } else {
              startNext();
            }
          });
        }
      };

      startNext();
    });
  }
}

module.exports = new DownloadManager();

