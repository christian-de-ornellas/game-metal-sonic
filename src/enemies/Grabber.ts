import { Renderer } from "../core/Renderer";
import { Badnik } from "./Badnik";
import { GRABBER_DROP_SPEED } from "../constants";

type GrabberState = "ceiling" | "dropping" | "retracting";

export class Grabber extends Badnik {
  private baseY: number;
  private ceilingY: number;
  private state: GrabberState = "ceiling";
  private chainLength = 0;
  private detectRange: number;

  constructor(x: number, ceilingY: number, detectRange: number = 6) {
    super(x, ceilingY);
    this.baseY = ceilingY;
    this.ceilingY = ceilingY;
    this.detectRange = detectRange;
  }

  update(dt: number, playerX: number, playerY: number) {
    if (!this.alive) {
      this.updateAnimal(dt);
      return;
    }

    switch (this.state) {
      case "ceiling": {
        this.y = this.ceilingY;
        this.chainLength = 0;
        // Check if player is below
        const dx = Math.abs(playerX - this.x);
        const dy = this.ceilingY - playerY;
        if (dx < 2 && dy > 1 && dy < this.detectRange) {
          this.state = "dropping";
        }
        break;
      }

      case "dropping": {
        const dropDist = GRABBER_DROP_SPEED * dt;
        this.chainLength += dropDist;
        this.y = this.ceilingY - this.chainLength;

        // Stop dropping after reaching max extension
        if (this.chainLength >= this.detectRange) {
          this.state = "retracting";
        }
        break;
      }

      case "retracting": {
        const retractDist = 6 * dt;
        this.chainLength -= retractDist;
        this.y = this.ceilingY - this.chainLength;

        if (this.chainLength <= 0) {
          this.chainLength = 0;
          this.y = this.ceilingY;
          this.state = "ceiling";
        }
        break;
      }
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
    const ceilingSy = r.worldToScreenY(this.ceilingY);
    const s = r.zoom;

    // Chain from ceiling to body
    if (this.chainLength > 0.1) {
      ctx.strokeStyle = "#888899";
      ctx.lineWidth = Math.max(1, 0.06 * s);

      // Draw chain links
      const linkCount = Math.max(2, Math.floor(this.chainLength * 2));
      for (let i = 0; i < linkCount; i++) {
        const t = i / linkCount;
        const ly = ceilingSy + (sy - ceilingSy) * t;
        const linkW = 0.1 * s;

        ctx.beginPath();
        ctx.ellipse(sx + (i % 2 === 0 ? linkW * 0.3 : -linkW * 0.3), ly, linkW, 0.15 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Ceiling mount
    ctx.fillStyle = "#666688";
    ctx.fillRect(sx - 0.3 * s, ceilingSy, 0.6 * s, 0.2 * s);

    // Body (robot claw)
    const bodyGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 0.4 * s);
    bodyGrad.addColorStop(0, "#aa4444");
    bodyGrad.addColorStop(1, "#882222");
    ctx.beginPath();
    ctx.arc(sx, sy, 0.4 * s, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Eyes
    ctx.save();
    const eyeGlow = this.state === "dropping" ? "#ff0000" : "#ff4444";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = this.state === "dropping" ? 8 : 3;
    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.arc(sx - 0.12 * s, sy - 0.05 * s, 0.06 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx + 0.12 * s, sy - 0.05 * s, 0.06 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Claws (open when dropping)
    const clawOpen = this.state === "dropping" ? 0.4 : 0.15;
    ctx.strokeStyle = "#aa5555";
    ctx.lineWidth = Math.max(1, 0.07 * s);

    // Left claw
    ctx.beginPath();
    ctx.moveTo(sx - 0.2 * s, sy + 0.2 * s);
    ctx.lineTo(sx - (0.2 + clawOpen) * s, sy + 0.5 * s);
    ctx.stroke();

    // Right claw
    ctx.beginPath();
    ctx.moveTo(sx + 0.2 * s, sy + 0.2 * s);
    ctx.lineTo(sx + (0.2 + clawOpen) * s, sy + 0.5 * s);
    ctx.stroke();
  }
}
