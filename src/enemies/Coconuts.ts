import { Renderer } from "../core/Renderer";
import { Badnik } from "./Badnik";
import { COCONUTS_THROW_INTERVAL, COCONUTS_THROW_SPEED, ENEMY_DETECT_RADIUS } from "../constants";

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  rotation: number;
}

export class Coconuts extends Badnik {
  private throwTimer = COCONUTS_THROW_INTERVAL;
  private projectiles: Projectile[] = [];
  private facingRight = true;
  private throwAnim = 0;

  constructor(x: number, y: number) {
    super(x, y);
  }

  update(dt: number, playerX: number, playerY: number) {
    if (!this.alive) {
      this.updateAnimal(dt);
      this.updateProjectiles(dt);
      return;
    }

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ENEMY_DETECT_RADIUS) {
      this.facingRight = dx > 0;

      this.throwTimer -= dt;
      if (this.throwTimer <= 0) {
        this.throwProjectile(playerX, playerY);
        this.throwTimer = COCONUTS_THROW_INTERVAL;
        this.throwAnim = 0.3;
      }
    }

    if (this.throwAnim > 0) this.throwAnim -= dt;

    this.updateProjectiles(dt);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.vy -= 10 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += dt * 8;
      p.life -= dt;

      if (p.life <= 0 || p.y < -10) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private throwProjectile(targetX: number, targetY: number) {
    const dx = targetX - this.x;
    const dy = targetY - (this.y + 0.5);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    this.projectiles.push({
      x: this.x,
      y: this.y + 0.5,
      vx: (dx / dist) * COCONUTS_THROW_SPEED,
      vy: (dy / dist) * COCONUTS_THROW_SPEED + 3,
      life: 3,
      rotation: 0,
    });
  }

  override hasProjectileNear(px: number, py: number): boolean {
    for (const p of this.projectiles) {
      const dx = p.x - px;
      const dy = p.y - py;
      if (Math.sqrt(dx * dx + dy * dy) < 1.0) return true;
    }
    return false;
  }

  override destroy() {
    super.destroy();
    this.projectiles = [];
  }

  render(r: Renderer) {
    // Always render projectiles
    this.renderProjectiles(r);

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

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.35 * s, 0.45 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffaa44";
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -0.55 * s, 0.25 * s, 0, Math.PI * 2);
    ctx.fillStyle = "#ee8833";
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0.08 * s * dir, -0.6 * s, 0.06 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(0.1 * s * dir, -0.6 * s, 0.03 * s, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(-0.15 * s * dir, 0.15 * s);
    ctx.quadraticCurveTo(-0.5 * s * dir, 0, -0.4 * s * dir, 0.3 * s);
    ctx.strokeStyle = "#cc7722";
    ctx.lineWidth = 0.08 * s;
    ctx.stroke();

    // Arms
    const armAngle = this.throwAnim > 0 ? -1.5 : 0.5;
    ctx.strokeStyle = "#888899";
    ctx.lineWidth = 0.06 * s;

    // Throwing arm
    ctx.beginPath();
    ctx.moveTo(0.3 * s * dir, -0.1 * s);
    const armEndX = 0.3 * s * dir + Math.cos(armAngle) * 0.3 * s * dir;
    const armEndY = -0.1 * s + Math.sin(armAngle) * 0.3 * s;
    ctx.lineTo(armEndX, armEndY);
    ctx.stroke();

    // Other arm
    ctx.beginPath();
    ctx.moveTo(-0.3 * s * dir, -0.1 * s);
    ctx.lineTo(-0.3 * s * dir - 0.2 * s * dir, 0.1 * s);
    ctx.stroke();

    ctx.restore();
  }

  private renderProjectiles(r: Renderer) {
    const ctx = r.ctx;

    for (const p of this.projectiles) {
      const sx = r.worldToScreenX(p.x);
      const sy = r.worldToScreenY(p.y);
      const radius = 0.2 * r.zoom;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rotation);

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#6B4226";
      ctx.fill();

      // Cross pattern
      ctx.strokeStyle = "#4a2a10";
      ctx.lineWidth = Math.max(0.5, 0.02 * r.zoom);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.7, 0);
      ctx.lineTo(radius * 0.7, 0);
      ctx.moveTo(0, -radius * 0.7);
      ctx.lineTo(0, radius * 0.7);
      ctx.stroke();

      ctx.restore();
    }
  }
}
