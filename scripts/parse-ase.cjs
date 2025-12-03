const Aseprite = require('ase-parser');
const fs = require('fs');
const path = require('path');

const asePath = path.join(__dirname, '../public/assets/skins/succubus/animations.ase');
const buff = fs.readFileSync(asePath);
const aseFile = new Aseprite(buff, 'succubus.ase');

aseFile.parse();

console.log('=== ASEPRITE FILE INFO ===\n');
console.log('Width:', aseFile.width);
console.log('Height:', aseFile.height);
console.log('Frames:', aseFile.numFrames);
console.log('Layers:', aseFile.layers.length);

console.log('\n=== LAYERS ===');
aseFile.layers.forEach((layer, i) => {
  console.log(`  ${i}: ${layer.name} (${layer.type})`);
});

console.log('\n=== TAGS (ANIMATIONS) ===');
if (aseFile.tags && aseFile.tags.length > 0) {
  aseFile.tags.forEach((tag, i) => {
    console.log(`  ${i}: "${tag.name}" - frames ${tag.from} to ${tag.to} (${tag.to - tag.from + 1} frames)`);
  });
} else {
  console.log('  No tags found');
}

console.log('\n=== FRAME DURATIONS ===');
aseFile.frames.forEach((frame, i) => {
  if (i < 20 || i > aseFile.numFrames - 5) {
    console.log(`  Frame ${i}: ${frame.frameDuration}ms`);
  } else if (i === 20) {
    console.log('  ...');
  }
});

// Výpočet rozložení v PNG
const pngWidth = 1248;
const pngHeight = 2808;
const frameWidth = aseFile.width;
const frameHeight = aseFile.height;
const framesPerRow = Math.floor(pngWidth / frameWidth);
const totalRows = Math.ceil(aseFile.numFrames / framesPerRow);

console.log('\n=== PNG LAYOUT CALCULATION ===');
console.log(`Frame size: ${frameWidth}x${frameHeight}`);
console.log(`Frames per row: ${framesPerRow}`);
console.log(`Total rows needed: ${totalRows}`);
console.log(`Expected PNG height: ${totalRows * frameHeight}`);
