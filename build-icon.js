const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const svg = `
<svg width="256" height="256" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" fill="black" />
  <circle cx="40" cy="40" r="30" stroke="white" stroke-width="2.5" stroke-dasharray="140 50"/>
  <circle cx="55" cy="28" r="5" fill="white"/>
  <path d="M25 40 Q40 15 55 40 Q40 30 25 40Z" fill="white" opacity="0.9"/>
</svg>
`;

async function buildIcon() {
  console.log('Generating PNG from SVG...');
  const pngBuffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();
  
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  fs.writeFileSync(pngPath, pngBuffer);
  console.log('Saved assets/icon.png');

  console.log('Converting PNG to ICO...');
  const icoBuffer = await pngToIco(pngPath);
  
  const icoPath = path.join(__dirname, 'assets', 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Saved assets/icon.ico');
}

buildIcon().catch(console.error);
