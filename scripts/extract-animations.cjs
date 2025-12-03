const Aseprite = require('ase-parser');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SKIN_FOLDER = path.join(__dirname, '../public/assets/skins/succubus');
const asePath = path.join(SKIN_FOLDER, 'animations.ase');
const pngPath = path.join(SKIN_FOLDER, 'basic.png');

// Animace které chceme extrahovat
const ANIMATIONS_TO_EXTRACT = [
  { name: 'idle', tag: 'Idle' },
  { name: 'run', tag: 'Walk' }  // Zkusíme Walk místo Run
];

async function extractAnimations() {
  // Načtení ASE souboru pro metadata
  const buff = fs.readFileSync(asePath);
  const aseFile = new Aseprite(buff, 'succubus.ase');
  aseFile.parse();

  const frameWidth = aseFile.width;   // 156
  const frameHeight = aseFile.height; // 72
  const framesPerRow = 8; // Spočítáno z PNG šířky 1248 / 156

  console.log(`Frame size: ${frameWidth}x${frameHeight}`);
  console.log(`Frames per row: ${framesPerRow}`);

  // Načtení PNG
  const pngBuffer = fs.readFileSync(pngPath);
  const pngMetadata = await sharp(pngBuffer).metadata();
  console.log(`PNG size: ${pngMetadata.width}x${pngMetadata.height}`);

  for (const anim of ANIMATIONS_TO_EXTRACT) {
    const tag = aseFile.tags.find(t => t.name === anim.tag);
    if (!tag) {
      console.log(`Tag "${anim.tag}" not found!`);
      continue;
    }

    console.log(`\nExtracting "${anim.tag}": frames ${tag.from} to ${tag.to}`);

    const frames = [];
    for (let i = tag.from; i <= tag.to; i++) {
      // Pozice framu v PNG gridu (0-indexed, ale tagy jsou 1-indexed)
      const frameIndex = i - 1; // ASE tagy jsou 1-indexed
      const col = frameIndex % framesPerRow;
      const row = Math.floor(frameIndex / framesPerRow);
      
      const x = col * frameWidth;
      const y = row * frameHeight;

      console.log(`  Frame ${i}: grid pos (${col}, ${row}) -> pixel (${x}, ${y})`);

      // Extrahování framu
      const frameBuffer = await sharp(pngBuffer)
        .extract({ left: x, top: y, width: frameWidth, height: frameHeight })
        .png()
        .toBuffer();
      
      frames.push(frameBuffer);
    }

    // Vytvoření horizontálního spritesheetu (PNG)
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
      .toFile(path.join(SKIN_FOLDER, `${anim.name}.png`));

    console.log(`  Created ${anim.name}.png (${sheetWidth}x${sheetHeight})`);
  }

  console.log('\n✅ Done!');
}

extractAnimations().catch(console.error);
