import { Renderer } from "../core/Renderer";
import { ENEMY_DAMAGE_RADIUS } from "../constants";

export abstract class Badnik {
  x: number;
  y: number;
  alive = true;

  // Animal released on destroy
  private animalX = 0;
  private animalY = 0;
  private animalVx = 0;
  private animalVy = 0;
  private animalActive = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  abstract update(dt: number, playerX: number, playerY: number): void;
  abstract render(r: Renderer): void;

  canDamagePlayer(px: number, py: number): boolean {
    if (!this.alive) return false;
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < ENEMY_DAMAGE_RADIUS;
  }

  canBeDestroyed(px: number, py: number, isAttacking: boolean): boolean {
    if (!this.alive) return false;
    if (!isAttacking) return false;
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < ENEMY_DAMAGE_RADIUS * 1.2;
  }

  destroy() {
    this.alive = false;
    this.animalActive = true;
    this.animalX = this.x;
    this.animalY = this.y;
    this.animalVx = (Math.random() - 0.5) * 3;
    this.animalVy = 5;
  }

  hasProjectileNear(_px: number, _py: number): boolean {
    return false;
  }

  updateAnimal(dt: number) {
    if (!this.animalActive) return;
    this.animalVy -= 15 * dt;
    this.animalX += this.animalVx * dt;
    this.animalY += this.animalVy * dt;
    if (this.animalY < -5) this.animalActive = false;
  }

  renderAnimal(r: Renderer) {
    if (!this.animalActive) return;
    const sx = r.worldToScreenX(this.animalX);
    const sy = r.worldToScreenY(this.animalY);
    const radius = 0.15 * r.zoom;

    const ctx = r.ctx;
    // Small bird
    ctx.fillStyle = "#4488ff";
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.strokeStyle = "#66aaff";
    ctx.lineWidth = Math.max(1, 0.03 * r.zoom);
    ctx.beginPath();
    ctx.moveTo(sx - radius, sy);
    ctx.lineTo(sx - radius * 2, sy - radius);
    ctx.moveTo(sx + radius, sy);
    ctx.lineTo(sx + radius * 2, sy - radius);
    ctx.stroke();
  }
}
