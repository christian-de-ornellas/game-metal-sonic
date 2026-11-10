import { Renderer } from "../core/Renderer";
import { Badnik } from "./Badnik";
import { SPINY_SPEED, ENEMY_DAMAGE_RADIUS } from "../constants";

export class Spiny extends Badnik {
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

  /** Spiny cannot be destroyed by jumping - only by spinning */
  override canBeDestroyed(px: number, py: number, isAttacking: boolean): boolean {
    if (!this.alive) return false;
    if (!isAttacking) return false;

    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= ENEMY_DAMAGE_RADIUS * 1.2) return false;

    // Only spinning (not jumping from above) can destroy
    // If player is above, they're jumping - block it
    if (py > this.y + 0.5) return false;

    return true;
  }

  /** Spiny damages player on top contact */
  override canDamagePlayer(px: number, py: number): boolean {
    if (!this.alive) return false;
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < ENEMY_DAMAGE_RADIUS;
  }

  update(dt: number, _playerX: number, _playerY: number) {
    if (!this.alive) {
      this.updateAnimal(dt);
      return;
    }

    // Patrol back and forth
    const speed = SPINY_SPEED * (this.facingRight ? 1 : -1);
    this.x += speed * dt;

    // Follow terrain
    this.y = this.getHeight(this.x);

    // Reverse at patrol limits
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

    // Body (dark blue armored ball)
    const bodyGrad = ctx.createRadialGradient(-0.05 * s, -0.1 * s, 0.05 * s, 0, 0, 0.4 * s);
    bodyGrad.addColorStop(0, "#4455cc");
    bodyGrad.addColorStop(1, "#222266");
    ctx.beginPath();
    ctx.arc(0, -0.15 * s, 0.4 * s, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Spines on top (red, dangerous!)
    const spineCount = 5;
    for (let i = 0; i < spineCount; i++) {
      const angle = Math.PI * 0.2 + (Math.PI * 0.6 / (spineCount - 1)) * i;
      const baseX = Math.cos(angle) * 0.35 * s;
      const baseY = -Math.sin(angle) * 0.35 * s - 0.15 * s;
      const tipX = Math.cos(angle) * 0.65 * s;
      const tipY = -Math.sin(angle) * 0.65 * s - 0.15 * s;

      ctx.beginPath();
      ctx.moveTo(baseX - 0.04 * s, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(baseX + 0.04 * s, baseY);
      ctx.closePath();
      ctx.fillStyle = "#ff3333";
      ctx.fill();
    }

    // Eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0.1 * s * dir, -0.2 * s, 0.07 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(0.12 * s * dir, -0.2 * s, 0.04 * s, 0, Math.PI * 2);
    ctx.fill();

    // Legs (short stubby)
    ctx.fillStyle = "#333366";
    ctx.fillRect(-0.15 * s, 0.1 * s, 0.1 * s, 0.15 * s);
    ctx.fillRect(0.05 * s, 0.1 * s, 0.1 * s, 0.15 * s);

    ctx.restore();
  }
}
