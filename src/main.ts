import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { BuilderScene } from './scenes/BuilderScene';
import { mount } from 'svelte';
import GameUI from './ui/GameUI.svelte';
import { currentLanguage, currentSkin, currentBackground, isTouchDevice, showControlsDialog } from './stores';
import { localization } from './data/localization';
import { catSkinManager } from './data/catSkin';
import { backgroundManager } from './data/background';
import { initSceneManager } from './utils/sceneManager';

// Wait for DOM to be ready
const gameUIElement = document.getElementById('game-ui');

if (!gameUIElement) {
  throw new Error('game-ui element not found!');
}

// Initialize Svelte UI (Svelte 5 syntax)
mount(GameUI, {
  target: gameUIElement,
});

// Initialize stores with saved values from localStorage
currentLanguage.set(localization.getLanguage());
currentSkin.set(catSkinManager.getSkin());
currentBackground.set(backgroundManager.getCurrentConfig().name);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800, x: 0 },
      debug: false,
    },
  },
  audio: {
    noAudio: true,
  },
  scene: [GameScene, BuilderScene],
};

const game = new Phaser.Game(config);

// Initialize scene manager
initSceneManager(game);

// Detect touch device and show controls dialog on first load
const isTouch = game.device.input.touch;
isTouchDevice.set(isTouch);

// Check if this is a page refresh
const isPageRefresh = performance.getEntriesByType('navigation')[0] 
  && (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).type === 'reload';

const hasSeenHintThisSession = sessionStorage.getItem('hasSeenControlsHint');

if (!hasSeenHintThisSession || isPageRefresh) {
  sessionStorage.setItem('hasSeenControlsHint', 'true');
  showControlsDialog.set(true);
}
