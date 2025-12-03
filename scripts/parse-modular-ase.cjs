const Aseprite = require('ase-parser');
const fs = require('fs');
const path = require('path');

const asePath = path.join(__dirname, '../public/assets/skins/modular/animations.ase');
const buff = fs.readFileSync(asePath);
const aseFile = new Aseprite(buff, 'animations.ase');

aseFile.parse();

console.log('=== MODULAR ANIMATIONS INFO ===\n');
console.log('Frame size:', aseFile.width, 'x', aseFile.height);
console.log('Total frames:', aseFile.numFrames);
console.log('Layers:', aseFile.layers.length);

console.log('\n=== LAYERS ===');
aseFile.layers.forEach((layer, i) => {
  console.log(`  ${i}: ${layer.name}`);
});

console.log('\n=== TAGS (ANIMATIONS) ===');
if (aseFile.tags && aseFile.tags.length > 0) {
  aseFile.tags.forEach((tag, i) => {
    const frameCount = tag.to - tag.from + 1;
    console.log(`  ${i}: "${tag.name}" - frames ${tag.from} to ${tag.to} (${frameCount} frames)`);
  });
} else {
  console.log('  No tags found');
}

console.log('\n=== FRAME DURATIONS (first 10) ===');
aseFile.frames.slice(0, 10).forEach((frame, i) => {
  console.log(`  Frame ${i}: ${frame.frameDuration}ms`);
});

// Output JSON for config
const config = {
  frameWidth: aseFile.width,
  frameHeight: aseFile.height,
  totalFrames: aseFile.numFrames,
  layers: aseFile.layers.map(l => l.name),
  animations: aseFile.tags.map(t => ({
    name: t.name,
    from: t.from,
    to: t.to,
    frameCount: t.to - t.from + 1
  }))
};

console.log('\n=== JSON CONFIG ===');
console.log(JSON.stringify(config, null, 2));
