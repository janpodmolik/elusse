import { NPCState } from '../NPCState';

export class PatrolState extends NPCState {
  private direction: number = 1;
  private moveSpeed: number = 30;
  private patrolTimer: number = 0;
  private readonly PATROL_DURATION = 2000; // ms

  enter(): void {
    this.patrolTimer = 0;
    // Pick random direction
    this.direction = Math.random() > 0.5 ? 1 : -1;
    this.updateVelocity();
  }

  update(_time: number, delta: number): void {
    this.patrolTimer += delta;

    // Simple patrol logic: switch direction every few seconds
    if (this.patrolTimer > this.PATROL_DURATION) {
      this.direction *= -1;
      this.patrolTimer = 0;
      this.updateVelocity();
    }
  }

  exit(): void {
    this.npc.setVelocity(0, 0);
  }

  private updateVelocity() {
    this.npc.setVelocityX(this.moveSpeed * this.direction);
    this.npc.setFlipX(this.direction < 0);
  }
}
