const Aseprite = require('ase-parser');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SKIN_FOLDER = path.join(__dirname, '../public/assets/skins/static/succubus');
const asePath = path.join(SKIN_FOLDER, 'animations.ase');
const pngPath = path.join(SKIN_FOLDER, 'basic/all.png');
const outputFolder = path.join(SKIN_FOLDER, 'basic');

// Animations to extract (manual row definition)
// Row index is 0-based (1st row = 0)
const ANIMATIONS_TO_EXTRACT = [
  { name: 'idle', row: 0, count: 5 }, // 1st row
  { name: 'jump', row: 2, count: 4 }, // 3rd row
  { name: 'fall', row: 4, count: 4 }, // 5th row
  { name: 'run', row: 6, count: 8 }   // 7th row
];

async function extractAnimations() {
  // Load ASE file for metadata
  const buff = fs.readFileSync(asePath);
  const aseFile = new Aseprite(buff, 'succubus.ase');
  aseFile.parse();

  const frameWidth = aseFile.width;   // 156
  const frameHeight = aseFile.height; // 72
  const framesPerRow = 8; // Calculated from PNG width 1248 / 156

  console.log(`Frame size: ${frameWidth}x${frameHeight}`);
  console.log(`Frames per row: ${framesPerRow}`);

  // Load PNG
  const pngBuffer = fs.readFileSync(pngPath);
  const pngMetadata = await sharp(pngBuffer).metadata();
  console.log(`PNG size: ${pngMetadata.width}x${pngMetadata.height}`);

  for (const anim of ANIMATIONS_TO_EXTRACT) {
    console.log(`\nExtracting "${anim.name}": row ${anim.row}, count ${anim.count}`);

    const frames = [];
    for (let i = 0; i < anim.count; i++) {
      const col = i;
      const row = anim.row;
      
      const x = col * frameWidth;
      const y = row * frameHeight;

      console.log(`  Frame ${i}: grid pos (${col}, ${row}) -> pixel (${x}, ${y})`);

      // Extract frame
      const frameBuffer = await sharp(pngBuffer)
        .extract({ left: x, top: y, width: frameWidth, height: frameHeight })
        .png()
        .toBuffer();
      
      frames.push(frameBuffer);
    }

    // Create horizontal spritesheet (PNG)
    const sheetWidth = frameWidth * frames.length;
    const sheetHeight = frameHeight;
    
    // Compose all frames horizontally
    const composites = frames.map((frame, index) => ({
      input: frame,
      left: index * frameWidth,
      top: 0
    }));

    await sharp({
      create: {
        width: sheetWidth,
        height: sheetHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite(composites)
      .png()
      .toFile(path.join(outputFolder, `${anim.name}.png`));

    console.log(`  Created ${anim.name}.png (${sheetWidth}x${sheetHeight})`);
  }

  console.log('\n✅ Done!');
}

extractAnimations().catch(console.error);
