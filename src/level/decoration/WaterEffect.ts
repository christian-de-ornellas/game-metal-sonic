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

    // Surface wave line
    ctx.beginPath();
    ctx.moveTo(startSx, waterScreenY);
    for (let sx = startSx; sx <= endSx; sx += 2) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15 +
                    Math.sin(wx * 1.5 + this.time * 3) * 0.08;
      ctx.lineTo(sx, r.worldToScreenY(WATER_HEIGHT + waveY));
    }

    // Fill down to bottom of screen
    ctx.lineTo(endSx, r.height);
    ctx.lineTo(startSx, r.height);
    ctx.closePath();

    // Water body gradient
    const waterGrad = ctx.createLinearGradient(0, waterScreenY, 0, r.height);
    waterGrad.addColorStop(0, "rgba(30, 120, 200, 0.5)");
    waterGrad.addColorStop(0.3, "rgba(20, 80, 160, 0.6)");
    waterGrad.addColorStop(1, "rgba(10, 40, 100, 0.7)");
    ctx.fillStyle = waterGrad;
    ctx.fill();

    // Foam line (white semi-transparent above surface)
    ctx.beginPath();
    ctx.moveTo(startSx, waterScreenY);
    for (let sx = startSx; sx <= endSx; sx += 2) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15 +
                    Math.sin(wx * 1.5 + this.time * 3) * 0.08;
      const foamJitter = Math.sin(wx * 3.2 + this.time * 5) * 0.04;
      ctx.lineTo(sx, r.worldToScreenY(WATER_HEIGHT + waveY + 0.12 + foamJitter));
    }
    // Close back along normal surface
    for (let sx = endSx; sx >= startSx; sx -= 2) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15 +
                    Math.sin(wx * 1.5 + this.time * 3) * 0.08;
      ctx.lineTo(sx, r.worldToScreenY(WATER_HEIGHT + waveY));
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(220, 240, 255, 0.35)";
    ctx.fill();

    // Surface highlight line
    ctx.beginPath();
    ctx.moveTo(startSx, waterScreenY);
    for (let sx = startSx; sx <= endSx; sx += 2) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15 +
                    Math.sin(wx * 1.5 + this.time * 3) * 0.08;
      ctx.lineTo(sx, r.worldToScreenY(WATER_HEIGHT + waveY));
    }
    ctx.strokeStyle = "rgba(150, 220, 255, 0.6)";
    ctx.lineWidth = Math.max(1, 0.05 * r.zoom);
    ctx.stroke();

    // Sparkle dots on surface
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for (let i = 0; i < 15; i++) {
      const sparkleX = this.startX + ((this.time * 0.5 + i * 7.3) % (this.endX - this.startX));
      if (sparkleX < bounds.left || sparkleX > bounds.right) continue;
      const sparklePhase = Math.sin(this.time * 3 + i * 2.7);
      if (sparklePhase < 0.5) continue;

      const waveY = Math.sin(sparkleX * 0.8 + this.time * 2) * 0.15;
      const ssx = r.worldToScreenX(sparkleX);
      const ssy = r.worldToScreenY(WATER_HEIGHT + waveY + 0.1);
      const sparkleR = (sparklePhase - 0.5) * 3 * r.zoom * 0.05;

      ctx.beginPath();
      ctx.arc(ssx, ssy, sparkleR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
