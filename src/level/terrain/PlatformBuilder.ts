import { Renderer } from "../../core/Renderer";

interface Platform {
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  axisX: number;
  axisY: number;
  range: number;
  speed: number;
  phase: number;
}

export class PlatformBuilder {
  private platforms: Platform[] = [];

  addPlatform(
    x: number, y: number,
    width: number, height: number,
    axisX: number, axisY: number,
    range: number, speed: number, phase: number = 0,
  ) {
    const len = Math.sqrt(axisX * axisX + axisY * axisY) || 1;
    this.platforms.push({
      startX: x, startY: y,
      x, y,
      width, height,
      axisX: axisX / len,
      axisY: axisY / len,
      range, speed, phase,
    });
  }

  update(time: number) {
    for (const p of this.platforms) {
      const offset = Math.sin(time * p.speed + p.phase) * p.range;
      p.x = p.startX + p.axisX * offset;
      p.y = p.startY + p.axisY * offset;
    }
  }

  /** Check if a point is standing on any platform. Returns platform surface Y or null */
  checkPlatformCollision(px: number, py: number, vy: number): number | null {
    for (const p of this.platforms) {
      if (px >= p.x - p.width / 2 && px <= p.x + p.width / 2) {
        const platTop = p.y + p.height / 2;
        // Only collide from above (falling down onto it)
        if (py >= platTop - 0.5 && py <= platTop + 1 && vy <= 0) {
          return platTop;
        }
      }
    }
    return null;
  }

  buildDefaultPlatforms() {
    // Floating platforms near water section
    this.addPlatform(195, 0, 3, 0.5, 0, 1, 2, 1.5, 0);
    this.addPlatform(205, 1, 3, 0.5, 0, 1, 2, 1.0, Math.PI / 3);
    this.addPlatform(215, 2, 4, 0.5, 0, 1, 3, 0.8, Math.PI / 2);

    // Upper route in hill area
    this.addPlatform(70, 6, 3, 0.5, 1, 0, 3, 0.7, 0);
    this.addPlatform(85, 8, 3, 0.5, 0, 1, 2, 1.2, Math.PI);
  }

  render(r: Renderer) {
    const ctx = r.ctx;
    const bounds = r.getVisibleBounds();

    for (const p of this.platforms) {
      if (p.x + p.width < bounds.left || p.x - p.width > bounds.right) continue;
      if (p.y + p.height < bounds.bottom || p.y - p.height > bounds.top) continue;

      const sx = r.worldToScreenX(p.x - p.width / 2);
      const sy = r.worldToScreenY(p.y + p.height / 2);
      const sw = p.width * r.zoom;
      const sh = p.height * r.zoom;

      // Platform body
      ctx.fillStyle = "#667766";
      ctx.fillRect(sx, sy, sw, sh);

      // Gold edge on top
      ctx.fillStyle = "#ddaa11";
      ctx.fillRect(sx - 1, sy - 2 * r.zoom * 0.05, sw + 2, Math.max(2, 0.1 * r.zoom));

      // Bottom shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(sx, sy + sh, sw, 2 * r.zoom * 0.05);
    }
  }
}
