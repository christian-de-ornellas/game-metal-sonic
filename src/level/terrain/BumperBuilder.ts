import { Renderer } from "../../core/Renderer";
import { MetalSonicController } from "../../character/MetalSonicController";
import { BUMPER_POWER } from "../../constants";

interface Bumper {
  x: number;
  y: number;
  radius: number;
  hitTimer: number; // glow animation countdown
}

export class BumperBuilder {
  private bumpers: Bumper[] = [];
  private time = 0;

  addBumper(x: number, y: number, radius: number = 0.8) {
    this.bumpers.push({ x, y, radius, hitTimer: 0 });
  }

  update(dt: number) {
    this.time += dt;
    for (const b of this.bumpers) {
      if (b.hitTimer > 0) b.hitTimer -= dt;
    }
  }

  /** Check collision with player and bounce them */
  checkCollision(controller: MetalSonicController): { x: number; y: number; score: number } | null {
    for (const b of this.bumpers) {
      const dx = controller.x - b.x;
      const dy = controller.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < b.radius + 0.6 && b.hitTimer <= 0) {
        // Calculate bounce direction (normal from bumper center to player)
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);

        const vx = nx * BUMPER_POWER;
        const vy = ny * BUMPER_POWER;
        controller.springLaunch(vx, vy);

        b.hitTimer = 0.3;
        return { x: b.x, y: b.y, score: 10 };
      }
    }
    return null;
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();
    const ctx = r.ctx;

    for (const b of this.bumpers) {
      if (b.x < bounds.left - 2 || b.x > bounds.right + 2) continue;

      const sx = r.worldToScreenX(b.x);
      const sy = r.worldToScreenY(b.y);
      const sr = b.radius * r.zoom;
      const isHit = b.hitTimer > 0;

      // Outer ring
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? "#ff88ff" : "#ff66aa";
      ctx.fill();

      // Inner circle highlight
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? "#ffffff" : "#ffddee";
      ctx.fill();

      // Yellow ring accent
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = isHit ? "#ffff00" : "#ffcc44";
      ctx.lineWidth = Math.max(1, 0.06 * r.zoom);
      ctx.stroke();
    }
  }
}
