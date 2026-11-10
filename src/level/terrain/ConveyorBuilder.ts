import { Renderer } from "../../core/Renderer";

interface Conveyor {
  startX: number;
  endX: number;
  y: number;
  speed: number; // positive = right, negative = left
}

export class ConveyorBuilder {
  private conveyors: Conveyor[] = [];
  private time = 0;

  addConveyor(startX: number, endX: number, y: number, speed: number) {
    this.conveyors.push({ startX, endX, y, speed });
  }

  update(dt: number) {
    this.time += dt;
  }

  /** Check if player is on a conveyor and return the force */
  getConveyorForce(playerX: number, playerY: number): number {
    for (const c of this.conveyors) {
      if (playerX >= c.startX && playerX <= c.endX) {
        const dy = Math.abs(playerY - c.y);
        if (dy < 1.0) {
          return c.speed;
        }
      }
    }
    return 0;
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();
    const ctx = r.ctx;

    for (const c of this.conveyors) {
      if (c.endX < bounds.left || c.startX > bounds.right) continue;

      const startSx = r.worldToScreenX(c.startX);
      const endSx = r.worldToScreenX(c.endX);
      const sy = r.worldToScreenY(c.y);
      const beltH = 0.3 * r.zoom;

      // Belt background
      ctx.fillStyle = "#444466";
      ctx.fillRect(startSx, sy, endSx - startSx, beltH);

      // Belt edge
      ctx.fillStyle = "#666688";
      ctx.fillRect(startSx, sy, endSx - startSx, beltH * 0.15);
      ctx.fillRect(startSx, sy + beltH * 0.85, endSx - startSx, beltH * 0.15);

      // Animated chevrons/arrows
      const dir = c.speed > 0 ? 1 : -1;
      const chevronSpacing = 2 * r.zoom;
      const offset = (this.time * Math.abs(c.speed) * r.zoom * 0.5) % chevronSpacing;

      ctx.save();
      ctx.beginPath();
      ctx.rect(startSx, sy, endSx - startSx, beltH);
      ctx.clip();

      ctx.strokeStyle = "#8888aa";
      ctx.lineWidth = Math.max(1, 0.04 * r.zoom);

      for (let x = startSx - chevronSpacing + offset * dir; x <= endSx + chevronSpacing; x += chevronSpacing) {
        const arrowY = sy + beltH * 0.5;
        const arrowSize = beltH * 0.3;

        ctx.beginPath();
        ctx.moveTo(x - arrowSize * dir, arrowY - arrowSize);
        ctx.lineTo(x, arrowY);
        ctx.lineTo(x - arrowSize * dir, arrowY + arrowSize);
        ctx.stroke();
      }

      ctx.restore();

      // Side pillars
      ctx.fillStyle = "#555577";
      const pillarW = 0.15 * r.zoom;
      ctx.fillRect(startSx - pillarW, sy, pillarW, beltH);
      ctx.fillRect(endSx, sy, pillarW, beltH);
    }
  }
}
