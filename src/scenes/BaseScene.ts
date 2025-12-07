import Phaser from 'phaser';

/**
 * BaseScene - Abstract base class for all game scenes
 * 
 * Provides shared lifecycle management, event handling, and cleanup patterns
 * to ensure consistency between GameScene and BuilderScene.
 * 
 * @lifecycle
 * 1. init(data) - Store configuration, reset guards
 * 2. preload() - Queue assets (sync, Phaser handles loading)
 * 3. create() - Register shutdown handler, start async init
 * 4. initializeScene() - Async initialization (override in subclass)
 * 5. update() - Game loop (guarded by isInitialized)
 * 6. shutdown() - Cleanup subscriptions, remove listeners
 * 
 * @patterns
 * - isInitialized: Guards update() until async init completes
 * - isShuttingDown: Prevents double cleanup on shutdown
 * - unsubscribers: Array of cleanup functions for store subscriptions
 * - Resize handler: Automatic setup/cleanup with scene lifecycle
 */
export abstract class BaseScene extends Phaser.Scene {
  /**
   * Flag to prevent update() calls before async initialization completes.
   * Set to true at the end of initializeScene(), false in shutdown().
   */
  protected isInitialized: boolean = false;
  
  /**
   * Guard to prevent double shutdown cleanup.
   * Set to true at start of shutdown(), checked before cleanup.
   */
  protected isShuttingDown: boolean = false;
  
  /**
   * Array of unsubscribe functions for Svelte store subscriptions.
   * All functions are called during shutdown().
   */
  protected unsubscribers: Array<() => void> = [];

  /**
   * Base initialization - resets lifecycle guards.
   * Override in subclass, but call super.init(data) first.
   */
  init(_data?: unknown): void {
    this.isInitialized = false;
    this.isShuttingDown = false;
    this.unsubscribers = [];
  }

  /**
   * Base create - registers shutdown handler and starts async init.
   * Override in subclass, but call super.create() first.
   */
  create(): void {
    // Register shutdown handler for proper cleanup
    this.events.on('shutdown', this.shutdown, this);
    
    // Setup resize handler
    this.setupResizeHandler();
  }

  /**
   * Abstract method for async scene initialization.
   * Called after create(), should set isInitialized = true when done.
   */
  protected abstract initializeScene(): Promise<void>;

  /**
   * Abstract method for handling window/canvas resize.
   * Called automatically when viewport size changes.
   */
  protected abstract handleResize(gameSize: Phaser.Structs.Size): void;

  /**
   * Setup resize event listener.
   * Called in create(), removed in shutdown().
   */
  protected setupResizeHandler(): void {
    this.scale.on('resize', this.handleResize, this);
  }

  /**
   * Remove resize event listener.
   * Called in shutdown().
   */
  protected removeResizeHandler(): void {
    this.scale.off('resize', this.handleResize, this);
  }

  /**
   * Add a store subscription cleanup function.
   * Will be called during shutdown().
   */
  protected addUnsubscriber(unsubscribe: () => void): void {
    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Cleanup all store subscriptions.
   * Called during shutdown().
   */
  protected cleanupSubscriptions(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }

  /**
   * Base shutdown - handles common cleanup.
   * Override in subclass, but call super.shutdown() at the end.
   */
  shutdown(): void {
    // Guard against double shutdown
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    // Mark as not initialized
    this.isInitialized = false;
    
    // Remove resize listener
    this.removeResizeHandler();
    
    // Clean up store subscriptions
    this.cleanupSubscriptions();
  }
}
