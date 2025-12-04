/**
 * CharacterPreviewScene
 * 
 * Phaser scene for previewing modular character customization.
 * Renders layered sprites and synchronizes animations.
 * 
 * Uses unified ModularCharacterVisual for rendering.
 */

import Phaser from 'phaser';
import {
  type ModularCharacterSelection,
} from '../data/modularConfig';
import { preloadModularCharacter } from '../utils/ModularCharacterBuilder';
import { ModularCharacterVisual } from '../entities/ModularCharacterVisual';

export default class CharacterPreviewScene extends Phaser.Scene {
  private character: ModularCharacterVisual | null = null;
  private currentAnimName: string = 'idle';
  private currentSelection: ModularCharacterSelection | null = null;
  
  constructor() {
    super({ key: 'CharacterPreviewScene' });
  }
  
  create() {
    // Listen for resize events
    this.scale.on('resize', this.onResize, this);
    
    // Emit ready event for Svelte
    this.game.events.emit('ready');
  }
  
  /**
   * Handle resize - reposition and rescale character
   */
  private onResize() {
    if (this.character) {
      this.repositionCharacter();
    }
  }
  
  /**
   * Calculate display scale based on canvas size
   */
  private getDisplayScale(): number {
    const minDimension = Math.min(this.cameras.main.width, this.cameras.main.height);
    // Scale to fit ~70% of the canvas height
    return Math.max(3, Math.floor(minDimension / 64 * 0.65));
  }
  
  /**
   * Reposition and rescale character
   */
  private repositionCharacter() {
    if (!this.character) return;

    const centerX = this.cameras.main.width / 2;
    // Offset up by ~10% of height to account for empty space above character's head
    const centerY = this.cameras.main.height / 2 - (this.cameras.main.height * 0.05);
    const scale = this.getDisplayScale();
    
    this.character.setPosition(centerX, centerY);
    this.character.setScale(scale);
  }
  
  /**
   * Update character with new selection (called from Svelte)
   */
  public updateCharacter(selection: ModularCharacterSelection) {
    this.currentSelection = selection;
    
    // Preload assets then build/update character
    preloadModularCharacter(this, selection).then(() => {
      this.buildOrUpdateCharacter();
    });
  }
  
  /**
   * Build or update the visual character
   */
  private buildOrUpdateCharacter() {
    if (!this.currentSelection) return;

    if (this.character) {
      this.character.updateSelection(this.currentSelection);
    } else {
      this.character = new ModularCharacterVisual(
        this,
        0, 0, // Position set by repositionCharacter
        this.currentSelection,
        {
          animated: true,
          animation: this.currentAnimName,
          scale: this.getDisplayScale()
        }
      );
    }

    // Ensure correct position and animation
    this.repositionCharacter();
    this.character.playAnimation(this.currentAnimName);
  }
  
  /**
   * Play a specific animation (called from Svelte)
   */
  public playAnimation(animName: string) {
    this.currentAnimName = animName;
    if (this.character) {
      this.character.playAnimation(animName);
    }
  }
}
