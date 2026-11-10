import { Renderer } from "../../core/Renderer";
import { MetalSonicController } from "../../character/MetalSonicController";

export interface Spring {
  x: number;
  y: number;
  power: number;        // launch speed in units/s
  angle: number;        // launch angle in radians (PI/2 = straight up)
  color: "yellow" | "red";
  compressed: number;   // 0-1, for animation
}

export class SpringBuilder {
  private springs: Spring[] = [];

  addSpring(x: number, y: number, power: number, angle: number = Math.PI / 2, color: "yellow" | "red" = "yellow") {
    this.springs.push({ x, y, power, angle, color, compressed: 0 });
  }

  getSprings(): Spring[] {
    return this.springs;
  }

  /** Check if player hits a spring and launch them */
  checkCollision(controller: MetalSonicController): Spring | null {
    for (const spring of this.springs) {
      const dx = controller.x - spring.x;
      const dy = controller.y - spring.y;

      // Only trigger when falling onto spring from above
      if (Math.abs(dx) < 1 && dy >= -0.3 && dy < 1.5 && controller.verticalSpeed <= 0) {
        const vx = Math.cos(spring.angle) * spring.power;
        const vy = Math.sin(spring.angle) * spring.power;
        controller.springLaunch(
          spring.angle === Math.PI / 2 ? controller.groundSpeed : vx,
          vy,
        );
        spring.compressed = 1;
        return spring;
      }
    }
    return null;
  }

  update(dt: number) {
    for (const spring of this.springs) {
      if (spring.compressed > 0) {
        spring.compressed = Math.max(0, spring.compressed - dt * 8);
      }
    }
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();
    const ctx = r.ctx;

    for (const spring of this.springs) {
      if (spring.x < bounds.left - 2 || spring.x > bounds.right + 2) continue;

      const sx = r.worldToScreenX(spring.x);
      const baseY = r.worldToScreenY(spring.y);
      const s = r.zoom;
      const comp = spring.compressed;

      // Base plate
      const baseW = 0.8 * s;
      const baseH = 0.2 * s;
      ctx.fillStyle = "#888899";
      ctx.fillRect(sx - baseW / 2, baseY, baseW, baseH);

      // Spring coils (zigzag)
      const springH = (0.6 - comp * 0.3) * s;
      const coilW = 0.3 * s;
      const coils = 4;
      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = Math.max(1, 0.05 * s);
      ctx.beginPath();
      ctx.moveTo(sx, baseY);
      for (let i = 0; i < coils; i++) {
        const t = (i + 0.5) / coils;
        const cy = baseY - t * springH;
        const cx = i % 2 === 0 ? sx - coilW : sx + coilW;
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(sx, baseY - springH);
      ctx.stroke();

      // Top plate (colored)
      const topY = baseY - springH;
      const topW = 0.7 * s;
      const topH = 0.25 * s;
      const mainColor = spring.color === "yellow" ? "#ffcc00" : "#ff3333";
      const darkColor = spring.color === "yellow" ? "#cc9900" : "#cc0000";

      ctx.fillStyle = mainColor;
      ctx.fillRect(sx - topW / 2, topY - topH, topW, topH);

      // Highlight stripe
      ctx.fillStyle = darkColor;
      ctx.fillRect(sx - topW / 2, topY - topH * 0.3, topW, topH * 0.3);

      // Arrow indicator
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      const arrowY = topY - topH / 2;
      ctx.moveTo(sx, arrowY - 0.12 * s);
      ctx.lineTo(sx - 0.1 * s, arrowY + 0.05 * s);
      ctx.lineTo(sx + 0.1 * s, arrowY + 0.05 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
}
