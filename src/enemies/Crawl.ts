import { Renderer } from "../core/Renderer";
import { Badnik } from "./Badnik";
import { CRAWL_SPEED, ENEMY_DAMAGE_RADIUS } from "../constants";

export class Crawl extends Badnik {
  private patrolStartX: number;
  private patrolEndX: number;
  private facingRight = true;
  private getHeight: (x: number) => number;

  constructor(x: number, patrolRange: number, getHeight: (x: number) => number) {
    super(x, getHeight(x));
    this.patrolStartX = x - patrolRange / 2;
    this.patrolEndX = x + patrolRange / 2;
    this.getHeight = getHeight;
  }

  /** Shield on top - jumping on it damages player */
  override canDamagePlayer(px: number, py: number): boolean {
    if (!this.alive) return false;
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < ENEMY_DAMAGE_RADIUS;
  }

  /** Can only be destroyed by spinning from the side, not jumping from above */
  override canBeDestroyed(px: number, py: number, isAttacking: boolean): boolean {
    if (!this.alive) return false;
    if (!isAttacking) return false;

    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= ENEMY_DAMAGE_RADIUS * 1.2) return false;

    // If player is above, they're jumping onto the shield - block destruction
    if (py > this.y + 0.3) return false;

    return true;
  }

  update(dt: number, _playerX: number, _playerY: number) {
    if (!this.alive) {
      this.updateAnimal(dt);
      return;
    }

    const speed = CRAWL_SPEED * (this.facingRight ? 1 : -1);
    this.x += speed * dt;
    this.y = this.getHeight(this.x);

    if (this.x >= this.patrolEndX) {
      this.x = this.patrolEndX;
      this.facingRight = false;
    } else if (this.x <= this.patrolStartX) {
      this.x = this.patrolStartX;
      this.facingRight = true;
    }
  }

  render(r: Renderer) {
    if (!this.alive) {
      this.renderAnimal(r);
      return;
    }

    const ctx = r.ctx;
    const sx = r.worldToScreenX(this.x);
    const sy = r.worldToScreenY(this.y);
    const s = r.zoom;
    const dir = this.facingRight ? 1 : -1;

    ctx.save();
    ctx.translate(sx, sy);

    // Body (armored)
    ctx.beginPath();
    ctx.ellipse(0, -0.1 * s, 0.4 * s, 0.35 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#888899";
    ctx.fill();

    // Shield on top (silver dome)
    ctx.beginPath();
    ctx.ellipse(0, -0.35 * s, 0.35 * s, 0.2 * s, 0, Math.PI, 0);
    ctx.fillStyle = "#aaaacc";
    ctx.fill();

    // Shield spikes
    for (let i = 0; i < 3; i++) {
      const spikeX = (-0.2 + i * 0.2) * s;
      ctx.beginPath();
      ctx.moveTo(spikeX - 0.04 * s, -0.45 * s);
      ctx.lineTo(spikeX, -0.6 * s);
      ctx.lineTo(spikeX + 0.04 * s, -0.45 * s);
      ctx.closePath();
      ctx.fillStyle = "#aaaacc";
      ctx.fill();
    }

    // Eyes (mean)
    ctx.fillStyle = "#ff3333";
    ctx.beginPath();
    ctx.arc(0.1 * s * dir, -0.15 * s, 0.06 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.22 * s * dir, -0.12 * s, 0.05 * s, 0, Math.PI * 2);
    ctx.fill();

    // Treads/wheels
    ctx.fillStyle = "#444455";
    ctx.fillRect(-0.3 * s, 0.15 * s, 0.2 * s, 0.12 * s);
    ctx.fillRect(0.1 * s, 0.15 * s, 0.2 * s, 0.12 * s);

    ctx.restore();
  }
}
