import { Renderer } from "../core/Renderer";
import { Boss } from "./Boss";

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  active: boolean;
}

const MAX_PROJECTILES = 10;
const PROJECTILE_SPEED = 15;
const PROJECTILE_LIFETIME = 3;
const COOLDOWN = 0.4;
const HIT_RADIUS = 1.5;

export class PlayerProjectileSystem {
  private projectiles: Projectile[] = [];
  private cooldownTimer = 0;

  constructor() {
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      this.projectiles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false });
    }
  }

  fire(x: number, y: number, facingRight: boolean): boolean {
    if (this.cooldownTimer > 0) return false;

    for (const p of this.projectiles) {
      if (!p.active) {
        p.x = x + (facingRight ? 1 : -1);
        p.y = y + 0.8;
        p.vx = facingRight ? PROJECTILE_SPEED : -PROJECTILE_SPEED;
        p.vy = 0;
        p.life = PROJECTILE_LIFETIME;
        p.active = true;
        this.cooldownTimer = COOLDOWN;
        return true;
      }
    }
    return false;
  }

  update(dt: number, boss: Boss | null): { hit: boolean; hitX: number; hitY: number } {
    this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);

    let hit = false;
    let hitX = 0;
    let hitY = 0;

    for (const p of this.projectiles) {
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      // Check collision with boss
      if (boss && boss.isVulnerable()) {
        const dx = p.x - boss.x;
        const dy = p.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < HIT_RADIUS + 1.5) {
          if (boss.takeDamage()) {
            hit = true;
            hitX = p.x;
            hitY = p.y;
            p.active = false;
          }
        }
      }
    }

    return { hit, hitX, hitY };
  }

  render(renderer: Renderer) {
    const ctx = renderer.ctx;

    for (const p of this.projectiles) {
      if (!p.active) continue;

      const sx = renderer.worldToScreenX(p.x);
      const sy = renderer.worldToScreenY(p.y);
      const sr = 0.4 * renderer.zoom;

      // Trail
      const trailLen = 3;
      for (let i = 0; i < trailLen; i++) {
        const t = i / trailLen;
        const tx = sx - (p.vx > 0 ? 1 : -1) * i * sr * 0.8;
        const alpha = 0.6 * (1 - t);
        const trailR = sr * (1 - t * 0.4);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(tx, sy, trailR, 0, Math.PI * 2);
        ctx.fillStyle = "#66ddff";
        ctx.fill();
      }

      // Core ball
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = "#88eeff";
      ctx.fill();
    }
  }

  clear() {
    for (const p of this.projectiles) {
      p.active = false;
    }
    this.cooldownTimer = 0;
  }
}
