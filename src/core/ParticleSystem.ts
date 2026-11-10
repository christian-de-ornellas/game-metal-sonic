import { Renderer } from "./Renderer";

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  sizeEnd: number;
  r: number;
  g: number;
  b: number;
  colorStr: string;
  alpha: number;
  alphaEnd: number;
  gravity: number;
  friction: number;
}

export interface ParticleEmitConfig {
  x: number;
  y: number;
  count: number;
  speedMin: number;
  speedMax: number;
  angleMin?: number;  // radians, default 0
  angleMax?: number;  // radians, default 2*PI
  life: number;
  size: number;
  sizeEnd?: number;
  r: number;
  g: number;
  b: number;
  alpha?: number;
  alphaEnd?: number;
  gravity?: number;
  friction?: number;
}

const POOL_SIZE = 512;

export class ParticleSystem {
  private pool: Particle[] = [];
  private activeCount = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1,
        size: 0, sizeEnd: 0,
        r: 255, g: 255, b: 255,
        colorStr: "rgb(255,255,255)",
        alpha: 1, alphaEnd: 0,
        gravity: 0, friction: 0,
      });
    }
  }

  private acquire(): Particle | null {
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this.pool[i].active) {
        this.pool[i].active = true;
        this.activeCount++;
        return this.pool[i];
      }
    }
    return null;
  }

  emit(config: ParticleEmitConfig) {
    const angleMin = config.angleMin ?? 0;
    const angleMax = config.angleMax ?? Math.PI * 2;

    for (let i = 0; i < config.count; i++) {
      const p = this.acquire();
      if (!p) return;

      const angle = angleMin + Math.random() * (angleMax - angleMin);
      const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);

      p.x = config.x;
      p.y = config.y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = config.life * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.size = config.size * (0.8 + Math.random() * 0.4);
      p.sizeEnd = config.sizeEnd ?? 0;
      p.r = config.r;
      p.g = config.g;
      p.b = config.b;
      p.colorStr = `rgb(${config.r},${config.g},${config.b})`;
      p.alpha = config.alpha ?? 1;
      p.alphaEnd = config.alphaEnd ?? 0;
      p.gravity = config.gravity ?? -10;
      p.friction = config.friction ?? 0;
    }
  }

  update(dt: number) {
    this.activeCount = 0;
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.vy += p.gravity * dt;
      if (p.friction > 0) {
        p.vx *= Math.max(0, 1 - p.friction * dt);
        p.vy *= Math.max(0, 1 - p.friction * dt);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.activeCount++;
    }
  }

  render(r: Renderer) {
    if (this.activeCount === 0) return;

    const ctx = r.ctx;
    const bounds = r.getVisibleBounds();

    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      // Culling
      if (p.x < bounds.left - 2 || p.x > bounds.right + 2 ||
          p.y < bounds.bottom - 2 || p.y > bounds.top + 2) continue;

      const t = 1 - p.life / p.maxLife; // 0 at birth, 1 at death
      const size = p.size + (p.sizeEnd - p.size) * t;
      const alpha = p.alpha + (p.alphaEnd - p.alpha) * t;

      if (alpha <= 0 || size <= 0) continue;

      const sx = r.worldToScreenX(p.x);
      const sy = r.worldToScreenY(p.y);
      const sr = size * r.zoom;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.colorStr;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }
}
