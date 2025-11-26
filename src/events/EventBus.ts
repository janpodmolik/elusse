/**
 * EventBus - Centralized event communication system
 * 
 * Provides a unified way to communicate between:
 * - Phaser scenes
 * - Svelte components
 * - Controllers and managers
 * 
 * Replaces scattered approaches like:
 * - window.addEventListener('customEvent', ...)
 * - scene.data.set/get(...)
 * - Direct store subscriptions
 */

type EventCallback<T = unknown> = (data: T) => void;

interface EventSubscription {
  unsubscribe: () => void;
}

class EventBusClass {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Subscribe to an event
   * @returns Subscription object with unsubscribe method
   */
  on<T = unknown>(event: string, callback: EventCallback<T>): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback as EventCallback);
    
    return {
      unsubscribe: () => {
        callbacks.delete(callback as EventCallback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Subscribe to an event only once
   */
  once<T = unknown>(event: string, callback: EventCallback<T>): EventSubscription {
    const subscription = this.on<T>(event, (data) => {
      subscription.unsubscribe();
      callback(data);
    });
    return subscription;
  }

  /**
   * Emit an event to all listeners
   */
  emit<T = unknown>(event: string, data?: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in listener for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get count of listeners for an event (useful for debugging)
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// Singleton instance
export const EventBus = new EventBusClass();

// ============================================
// Event type definitions for type safety
// ============================================

/** Asset dropped from palette to canvas */
export interface AssetDroppedEvent {
  assetKey: string;
  canvasX: number;
  canvasY: number;
}

/** Item selected in builder */
export interface ItemSelectedEvent {
  itemId: string | null;
}

/** Item dragging state changed */
export interface ItemDragStateEvent {
  isDragging: boolean;
  itemId?: string;
}

/** Player position updated in builder */
export interface PlayerPositionEvent {
  x: number;
  y: number;
}

/** Scene transition requested */
export interface SceneTransitionEvent {
  from: string;
  to: string;
  data?: Record<string, unknown>;
}

// ============================================
// Event name constants
// ============================================

export const EVENTS = {
  // Asset events
  ASSET_DROPPED: 'asset:dropped',
  
  // Item events
  ITEM_SELECTED: 'item:selected',
  ITEM_DESELECTED: 'item:deselected',
  ITEM_DRAG_START: 'item:dragStart',
  ITEM_DRAG_END: 'item:dragEnd',
  ITEM_DELETED: 'item:deleted',
  ITEM_CREATED: 'item:created',
  ITEM_UPDATED: 'item:updated',
  
  // Player events
  PLAYER_POSITION_CHANGED: 'player:positionChanged',
  PLAYER_DRAG_START: 'player:dragStart',
  PLAYER_DRAG_END: 'player:dragEnd',
  
  // Scene events
  SCENE_TRANSITION: 'scene:transition',
  SCENE_READY: 'scene:ready',
  
  // Builder events
  BUILDER_MODE_ENTER: 'builder:enter',
  BUILDER_MODE_EXIT: 'builder:exit',
  
  // Camera events
  CAMERA_PAN_START: 'camera:panStart',
  CAMERA_PAN_END: 'camera:panEnd',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];
