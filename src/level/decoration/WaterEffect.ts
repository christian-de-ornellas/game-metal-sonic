import { Renderer } from "../../core/Renderer";
import { WATER_HEIGHT } from "../../constants";

export class WaterEffect {
  private startX = 0;
  private endX = 0;
  private time = 0;

  build(startX: number, width: number) {
    this.startX = startX;
    this.endX = startX + width;
  }

  update(dt: number) {
    this.time += dt;
  }

  getWaterHeight(): number {
    return WATER_HEIGHT;
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();
    if (this.endX < bounds.left || this.startX > bounds.right) return;

    const ctx = r.ctx;
    const waterScreenY = r.worldToScreenY(WATER_HEIGHT);
    const startSx = r.worldToScreenX(Math.max(this.startX, bounds.left));
    const endSx = r.worldToScreenX(Math.min(this.endX, bounds.right));

    // Single pass: wave surface + fill to bottom
    ctx.beginPath();
    ctx.moveTo(startSx, waterScreenY);
    for (let sx = startSx; sx <= endSx; sx += 4) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15;
      ctx.lineTo(sx, r.worldToScreenY(WATER_HEIGHT + waveY));
    }
    ctx.lineTo(endSx, r.height);
    ctx.lineTo(startSx, r.height);
    ctx.closePath();
    ctx.fillStyle = "rgba(25, 100, 180, 0.55)";
    ctx.fill();
  }
}
