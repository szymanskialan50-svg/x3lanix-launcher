const fs = require('fs');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

const svg = `<svg viewBox="0 0 80 80" width="256" height="256" xmlns="http://www.w3.org/2000/svg" fill="none">
  <circle cx="40" cy="40" r="30" stroke="white" stroke-width="4.5" stroke-dasharray="140 50"/>
  <circle cx="55" cy="28" r="7" fill="white"/>
  <path d="M25 40 Q40 15 55 40 Q40 30 25 40Z" fill="white" opacity="0.9"/>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toBuffer()
  .then(buf => {
    fs.writeFileSync('assets/icon.png', buf);
    return pngToIco(buf);
  })
  .then(icoBuf => {
    fs.writeFileSync('assets/icon.ico', icoBuf);
    console.log('Done');
  })
  .catch(console.error);
