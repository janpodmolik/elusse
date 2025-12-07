import { NPCState } from '../NPCState';

export class IdleState extends NPCState {
  enter(): void {
    // Play idle animation if available
    const animKey = `${this.npc.npcId}_idle`;
    if (this.npc.anims.exists(animKey)) {
      this.npc.play(animKey, true);
    }
    
    this.npc.setVelocity(0, 0);
  }

  update(_time: number, _delta: number): void {
    // Idle logic (e.g., look around, wait for trigger)
  }

  exit(): void {
    // Cleanup if needed
  }
}
