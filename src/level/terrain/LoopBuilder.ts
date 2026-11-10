import { Renderer } from "../../core/Renderer";
import { MetalSonicController } from "../../character/MetalSonicController";

export interface LoopZone {
  centerX: number;
  centerY: number;
  radius: number;
  minSpeed: number;
}

export class LoopBuilder {
  private loops: LoopZone[] = [];

  addLoop(centerX: number, centerY: number, radius: number, minSpeed: number = 4) {
    this.loops.push({ centerX, centerY, radius, minSpeed });
  }

  getLoops(): LoopZone[] {
    return this.loops;
  }

  /** Check if player should enter a loop and handle it */
  checkLoopEntry(controller: MetalSonicController) {
    if (controller.loopCooldown > 0) return;

    for (const loop of this.loops) {
      const dx = controller.x - loop.centerX;
      const dy = controller.y - loop.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Near the bottom of the loop entrance: close to circumference,
      // below center, and moving fast enough
      if (Math.abs(dist - loop.radius) < 2 &&
          controller.y < loop.centerY &&
          controller.getSpeed() >= loop.minSpeed) {
        controller.enterLoop(loop.centerX, loop.centerY, loop.radius);
        return;
      }
    }
  }

  render(r: Renderer) {
    const ctx = r.ctx;

    for (const loop of this.loops) {
      const sx = r.worldToScreenX(loop.centerX);
      const sy = r.worldToScreenY(loop.centerY);
      const sr = loop.radius * r.zoom;

      // Loop track (thick arc)
      const trackWidth = 2 * r.zoom;

      // Outer ring (dark)
      ctx.beginPath();
      ctx.arc(sx, sy, sr + trackWidth / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "#1a5a0e";
      ctx.lineWidth = trackWidth + 2 * r.zoom;
      ctx.stroke();

      // Main track
      const trackGrad = ctx.createRadialGradient(sx, sy, sr - trackWidth, sx, sy, sr + trackWidth);
      trackGrad.addColorStop(0, "#2aaa18");
      trackGrad.addColorStop(0.5, "#1e7a10");
      trackGrad.addColorStop(1, "#155a0a");
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.strokeStyle = trackGrad;
      ctx.lineWidth = trackWidth;
      ctx.stroke();

      // Checker pattern on the loop track
      ctx.save();
      ctx.globalAlpha = 0.15;
      const segments = 16;
      for (let i = 0; i < segments; i++) {
        if (i % 2 === 0) {
          const a1 = (i / segments) * Math.PI * 2;
          const a2 = ((i + 1) / segments) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, -a1, -a2, true);
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = trackWidth * 0.8;
          ctx.stroke();
        }
      }
      ctx.restore();

      // Support pillars at bottom
      const pillarWidth = 0.8 * r.zoom;
      const pillarBottom = r.worldToScreenY(loop.centerY - loop.radius - 2);
      const pillarTop = r.worldToScreenY(loop.centerY - loop.radius + 1);

      ctx.fillStyle = "#555566";
      ctx.fillRect(sx - sr - pillarWidth / 2, pillarTop, pillarWidth, pillarBottom - pillarTop);
      ctx.fillRect(sx + sr - pillarWidth / 2, pillarTop, pillarWidth, pillarBottom - pillarTop);
    }
  }
}
