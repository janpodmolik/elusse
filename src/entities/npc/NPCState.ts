import type { NPC } from '../NPC';

export abstract class NPCState {
  protected npc: NPC;

  constructor(npc: NPC) {
    this.npc = npc;
  }

  /**
   * Called when entering the state.
   */
  abstract enter(): void;

  /**
   * Called every frame.
   * @param time Current time
   * @param delta Time since last frame
   */
  abstract update(time: number, delta: number): void;

  /**
   * Called when exiting the state.
   */
  abstract exit(): void;
}
