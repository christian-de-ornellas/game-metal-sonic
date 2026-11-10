import { Renderer } from "../../core/Renderer";
import { MetalSonicController } from "../../character/MetalSonicController";
import { FLIPPER_POWER } from "../../constants";

interface Flipper {
  x: number;
  y: number;
  width: number;
  angle: number;     // rest angle (radians from horizontal)
  side: "left" | "right"; // which side is the pivot
  flipTimer: number; // animation timer
  flipPhase: "rest" | "launching" | "returning";
}

export class FlipperBuilder {
  private flippers: Flipper[] = [];
  private time = 0;

  addFlipper(x: number, y: number, width: number = 3, angle: number = 0.3, side: "left" | "right" = "left") {
    this.flippers.push({ x, y, width, angle, side, flipTimer: 0, flipPhase: "rest" });
  }

  update(dt: number) {
    this.time += dt;
    for (const f of this.flippers) {
      if (f.flipPhase === "launching") {
        f.flipTimer += dt * 10;
        if (f.flipTimer >= 1) {
          f.flipPhase = "returning";
          f.flipTimer = 1;
        }
      } else if (f.flipPhase === "returning") {
        f.flipTimer -= dt * 3;
        if (f.flipTimer <= 0) {
          f.flipPhase = "rest";
          f.flipTimer = 0;
        }
      }
    }
  }

  /** Check if player is on a flipper and launch them */
  checkCollision(controller: MetalSonicController): boolean {
    for (const f of this.flippers) {
      if (f.flipPhase !== "rest") continue;

      const dx = controller.x - f.x;
      const dy = controller.y - f.y;

      // Check if player is on the flipper surface
      if (Math.abs(dx) < f.width / 2 && dy >= -0.5 && dy < 1.0 && controller.verticalSpeed <= 0) {
        // Launch!
        const launchAngle = f.side === "left" ? Math.PI * 0.4 : Math.PI * 0.6;
        const vx = Math.cos(launchAngle) * FLIPPER_POWER * 0.3;
        const vy = FLIPPER_POWER;
        controller.springLaunch(
          f.side === "left" ? Math.abs(vx) : -Math.abs(vx),
          vy
        );

        f.flipPhase = "launching";
        f.flipTimer = 0;
        return true;
      }
    }
    return false;
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();
    const ctx = r.ctx;

    for (const f of this.flippers) {
      if (f.x < bounds.left - 5 || f.x > bounds.right + 5) continue;

      const pivotX = f.side === "left" ? f.x - f.width / 2 : f.x + f.width / 2;
      const sx = r.worldToScreenX(pivotX);
      const sy = r.worldToScreenY(f.y);
      const sw = f.width * r.zoom;

      // Calculate flip angle
      const flipAngle = f.angle + f.flipTimer * 0.8;
      const dir = f.side === "left" ? 1 : -1;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-flipAngle * dir);

      // Flipper body
      ctx.fillStyle = "#ff8844";

      // Tapered shape
      ctx.beginPath();
      ctx.moveTo(0, -0.2 * r.zoom);
      ctx.lineTo(sw * dir, -0.1 * r.zoom);
      ctx.lineTo(sw * dir, 0.1 * r.zoom);
      ctx.lineTo(0, 0.2 * r.zoom);
      ctx.closePath();
      ctx.fill();

      // Pivot circle
      ctx.beginPath();
      ctx.arc(0, 0, 0.15 * r.zoom, 0, Math.PI * 2);
      ctx.fillStyle = "#ffaa33";
      ctx.fill();
      ctx.strokeStyle = "#cc7711";
      ctx.lineWidth = Math.max(1, 0.03 * r.zoom);
      ctx.stroke();

      // Highlight glow when launching
      if (f.flipPhase === "launching") {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -0.2 * r.zoom);
        ctx.lineTo(sw * dir, -0.1 * r.zoom);
        ctx.lineTo(sw * dir, 0.1 * r.zoom);
        ctx.lineTo(0, 0.2 * r.zoom);
        ctx.closePath();
        ctx.strokeStyle = "#ffcc44";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }
}
