import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { ModularPlayer } from '../../entities/ModularPlayer';
import { getSavedCharacterSelection } from '../../data/CharacterStorage';
import { preloadSkins, createAllSkinAnimations } from '../../utils/skinLoader';
import { getModularPlayerGroundY, getPlayerGroundY } from '../../constants/playerConstants';
import { GroundManager } from '../GroundManager';
import type { IPlayer } from '../../entities';
import type { ModularCharacterSelection } from '../../data/modularConfig';
import type { MapConfig } from '../../data/mapConfig';

export class GamePlayerManager {
  private scene: Phaser.Scene;
  private player: IPlayer | null = null;
  private useModularPlayer: boolean = false;
  private savedCharacterSelection: ModularCharacterSelection | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Initialize player settings from local storage
   */
  public init(): void {
    // Check if user selected custom character in BackgroundSelect
    const useModularSetting = localStorage.getItem('useModularPlayer');
    
    // Check if we have a saved modular character
    this.savedCharacterSelection = getSavedCharacterSelection();
    
    // Use modular player if explicitly selected AND we have character data
    this.useModularPlayer = useModularSetting === 'true' && this.savedCharacterSelection !== null;
  }

  /**
   * Preload player assets
   */
  public preload(): void {
    // Load player sprite sheets (for legacy Player)
    if (!this.useModularPlayer) {
      preloadSkins(this.scene);
    }
  }

  /**
   * Load player assets asynchronously
   */
  public async loadAssets(): Promise<void> {
    // Create animations for legacy skins (if not using modular)
    if (!this.useModularPlayer) {
      createAllSkinAnimations(this.scene);
    }
    
    // Load modular character assets if needed
    if (this.useModularPlayer && this.savedCharacterSelection) {
      await ModularPlayer.preloadCharacter(this.scene, this.savedCharacterSelection);
    }
  }

  /**
   * Create the player entity and setup collisions
   */
  public createPlayer(mapConfig: MapConfig, ground: Phaser.GameObjects.Rectangle): IPlayer {
    if (this.useModularPlayer && this.savedCharacterSelection) {
      // Use modular character - calculate proper Y for center origin
      const modularGroundY = getModularPlayerGroundY(mapConfig.worldHeight);
      const playerY = Math.min(mapConfig.playerStartY, modularGroundY);
      
      const modularPlayer = new ModularPlayer(
        this.scene, 
        mapConfig.playerStartX, 
        playerY, 
        this.savedCharacterSelection
      );
      modularPlayer.buildCharacter();
      this.player = modularPlayer;
      
      // Add collision between modular player and ground
      GroundManager.addPlayerCollision(this.scene, modularPlayer, ground);
    } else {
      // Use legacy player
      const staticGroundY = getPlayerGroundY(mapConfig.worldHeight);
      const playerY = Math.min(mapConfig.playerStartY, staticGroundY);
      
      const staticPlayer = new Player(this.scene, mapConfig.playerStartX, playerY);
      this.player = staticPlayer;
      
      // Add collision between player and ground
      GroundManager.addPlayerCollision(this.scene, staticPlayer, ground);
    }

    return this.player;
  }

  /**
   * Get the player instance
   */
  public getPlayer(): IPlayer | null {
    return this.player;
  }

  /**
   * Check if using modular player
   */
  public isModular(): boolean {
    return this.useModularPlayer;
  }
}
