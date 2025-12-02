/**
 * GIF Loader Utility
 * 
 * Parses GIF files and creates Phaser spritesheets from them.
 * Uses gifuct-js to decode GIF frames, then builds a canvas-based
 * spritesheet that Phaser can use for animations.
 */

import { parseGIF, decompressFrames } from 'gifuct-js';

export interface GifFrameData {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  delays: number[]; // Frame delays in ms
}

/**
 * Load and parse a GIF file, returning frame data and creating a spritesheet texture
 */
export async function loadGifAsSpritesheet(
  scene: Phaser.Scene,
  key: string,
  url: string,
  frameWidth: number = 48,
  frameHeight: number = 48
): Promise<GifFrameData> {
  // Fetch the GIF file
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  
  // Parse GIF
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);
  
  if (frames.length === 0) {
    throw new Error(`No frames found in GIF: ${url}`);
  }
  
  // Create a horizontal spritesheet canvas
  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frames.length;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;
  
  // Temporary canvas for compositing each frame
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = gif.lsd.width;
  tempCanvas.height = gif.lsd.height;
  const tempCtx = tempCanvas.getContext('2d')!;
  
  // Track frame delays
  const delays: number[] = [];
  
  // Draw each frame to the spritesheet
  frames.forEach((frame, index) => {
    // Handle frame disposal and compositing
    const imageData = tempCtx.createImageData(frame.dims.width, frame.dims.height);
    imageData.data.set(frame.patch);
    
    // For disposal method 2 (restore to background), clear first
    if (frame.disposalType === 2) {
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
    
    // Create temporary canvas for this frame's patch
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    const patchCtx = patchCanvas.getContext('2d')!;
    patchCtx.putImageData(imageData, 0, 0);
    
    // Draw patch to temp canvas at correct position
    tempCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);
    
    // Draw the composited frame to the spritesheet
    // Center the frame if GIF dimensions don't match expected frame size
    const offsetX = Math.floor((frameWidth - gif.lsd.width) / 2);
    const offsetY = Math.floor((frameHeight - gif.lsd.height) / 2);
    ctx.drawImage(tempCanvas, index * frameWidth + offsetX, offsetY);
    
    // Store delay in milliseconds (gifuct-js returns centiseconds, multiply by 10)
    // Default to 100ms if not specified
    const delayMs = (frame.delay || 10) * 10;
    delays.push(delayMs);
  });
  
  // Add canvas as Phaser texture
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  
  // Add the canvas texture and create spritesheet frames
  const texture = scene.textures.addCanvas(key, canvas);
  
  // Add frames to the texture so Phaser can use generateFrameNumbers
  if (texture) {
    for (let i = 0; i < frames.length; i++) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }
  }
  
  return {
    frameCount: frames.length,
    frameWidth,
    frameHeight,
    delays
  };
}

/**
 * Calculate average frame rate from delays (in milliseconds)
 */
export function calculateFrameRate(delays: number[]): number {
  if (delays.length === 0) return 10;
  const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
  const frameRate = Math.round(1000 / avgDelay);
  // Clamp to reasonable range (1-60 fps)
  return Math.max(1, Math.min(60, frameRate));
}

/**
 * Batch load multiple GIFs for a skin
 */
export async function loadSkinGifs(
  scene: Phaser.Scene,
  skinId: string,
  basePath: string,
  frameSize: number = 48
): Promise<{
  idle: GifFrameData;
  run: GifFrameData;
}> {
  const [idle, run] = await Promise.all([
    loadGifAsSpritesheet(scene, `${skinId}-idle`, `${basePath}/idle.gif`, frameSize, frameSize),
    loadGifAsSpritesheet(scene, `${skinId}-run`, `${basePath}/run.gif`, frameSize, frameSize),
  ]);
  
  return { idle, run };
}
