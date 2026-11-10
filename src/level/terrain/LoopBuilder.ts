import { Renderer } from "../../core/Renderer";
import { MetalSonicController } from "../../character/MetalSonicController";

export interface LoopZone {
  centerX: number;
  centerY: number;
  radius: number;
  minSpeed: number;
  groundY: number;
}

export class LoopBuilder {
  private loops: LoopZone[] = [];

  addLoop(centerX: number, centerY: number, radius: number, minSpeed: number = 4, groundY: number = 0) {
    this.loops.push({ centerX, centerY, radius, minSpeed, groundY });
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
        controller.enterLoop(loop.centerX, loop.centerY, loop.radius, loop.groundY);
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
      const groundScreenY = r.worldToScreenY(loop.groundY);

      // Track thickness in screen pixels
      const trackThickness = 1.8 * r.zoom;

      // --- Entry ramp (left side) ---
      const rampLength = 4 * r.zoom;
      const entryX = sx - sr - trackThickness / 2;
      const exitX = sx + sr + trackThickness / 2;

      // Entry ramp: triangle from ground level up to where the loop starts
      ctx.beginPath();
      ctx.moveTo(entryX - rampLength, groundScreenY);
      ctx.lineTo(entryX, groundScreenY);
      ctx.lineTo(entryX, groundScreenY - trackThickness * 0.3);
      ctx.lineTo(entryX - rampLength, groundScreenY);
      ctx.closePath();
      ctx.fillStyle = "#6b3a1f";
      ctx.fill();

      // Grass on entry ramp
      ctx.beginPath();
      ctx.moveTo(entryX - rampLength, groundScreenY);
      ctx.lineTo(entryX, groundScreenY - trackThickness * 0.3);
      ctx.strokeStyle = "#2aaa18";
      ctx.lineWidth = Math.max(1, 0.3 * r.zoom);
      ctx.stroke();

      // --- Exit ramp (right side) ---
      ctx.beginPath();
      ctx.moveTo(exitX, groundScreenY);
      ctx.lineTo(exitX + rampLength, groundScreenY);
      ctx.lineTo(exitX + rampLength, groundScreenY);
      ctx.lineTo(exitX, groundScreenY - trackThickness * 0.3);
      ctx.closePath();
      ctx.fillStyle = "#6b3a1f";
      ctx.fill();

      // Grass on exit ramp
      ctx.beginPath();
      ctx.moveTo(exitX, groundScreenY - trackThickness * 0.3);
      ctx.lineTo(exitX + rampLength, groundScreenY);
      ctx.strokeStyle = "#2aaa18";
      ctx.lineWidth = Math.max(1, 0.3 * r.zoom);
      ctx.stroke();

      // --- Loop ring: solid earth arc (thick filled annulus) ---
      const outerR = sr + trackThickness / 2;
      const innerR = sr - trackThickness / 2;

      // Earth fill (brown) — full ring
      ctx.beginPath();
      ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
      ctx.arc(sx, sy, innerR, Math.PI * 2, 0, true);
      ctx.closePath();
      ctx.fillStyle = "#6b3a1f";
      ctx.fill();

      // Darker inner edge for depth
      ctx.beginPath();
      ctx.arc(sx, sy, innerR, 0, Math.PI * 2);
      ctx.strokeStyle = "#4a2510";
      ctx.lineWidth = Math.max(1, 0.15 * r.zoom);
      ctx.stroke();

      // Darker outer edge
      ctx.beginPath();
      ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = "#4a2510";
      ctx.lineWidth = Math.max(1, 0.15 * r.zoom);
      ctx.stroke();

      // --- Grass layer on top surface of the ring ---
      // Draw grass along the outer edge of the ring (the surface the player runs on)
      // We draw it as a slightly thicker arc on the outer surface
      const grassWidth = Math.max(1.5, 0.4 * r.zoom);
      const segments = 32;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;

        // Grass goes on the "outside" surface of the track
        ctx.beginPath();
        ctx.arc(sx, sy, outerR + grassWidth * 0.3, -a1, -a2, true);
        ctx.strokeStyle = i % 2 === 0 ? "#2aaa18" : "#1e8a12";
        ctx.lineWidth = grassWidth;
        ctx.stroke();
      }

      // --- Subtle texture on the earth ---
      ctx.save();
      ctx.globalAlpha = 0.1;
      const texSegments = 24;
      for (let i = 0; i < texSegments; i++) {
        if (i % 2 === 0) {
          const a1 = (i / texSegments) * Math.PI * 2;
          const a2 = ((i + 1) / texSegments) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, -a1, -a2, true);
          ctx.strokeStyle = "#3a1a08";
          ctx.lineWidth = trackThickness * 0.6;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
}
