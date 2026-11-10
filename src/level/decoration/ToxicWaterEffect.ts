import { Renderer } from "../../core/Renderer";

export class ToxicWaterEffect {
  private startX = 0;
  private endX = 0;
  private waterHeight = -3;
  private time = 0;
  readonly isDangerous = true;

  build(startX: number, width: number, height: number = -3) {
    this.startX = startX;
    this.endX = startX + width;
    this.waterHeight = height;
  }

  update(dt: number) {
    this.time += dt;
  }

  getWaterHeight(): number {
    return this.waterHeight;
  }

  /** Check if player is touching toxic water */
  isPlayerInWater(playerX: number, playerY: number): boolean {
    return playerX >= this.startX && playerX <= this.endX && playerY <= this.waterHeight + 0.3;
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();
    if (this.endX < bounds.left || this.startX > bounds.right) return;

    const ctx = r.ctx;
    const waterScreenY = r.worldToScreenY(this.waterHeight);
    const startSx = r.worldToScreenX(Math.max(this.startX, bounds.left));
    const endSx = r.worldToScreenX(Math.min(this.endX, bounds.right));

    // Single pass: wave surface + fill to bottom
    ctx.beginPath();
    ctx.moveTo(startSx, waterScreenY);
    for (let sx = startSx; sx <= endSx; sx += 4) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15;
      ctx.lineTo(sx, r.worldToScreenY(this.waterHeight + waveY));
    }
    ctx.lineTo(endSx, r.height);
    ctx.lineTo(startSx, r.height);
    ctx.closePath();
    ctx.fillStyle = "rgba(100, 35, 140, 0.55)";
    ctx.fill();
  }
}
