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

    // Surface wave line
    ctx.beginPath();
    ctx.moveTo(startSx, waterScreenY);
    for (let sx = startSx; sx <= endSx; sx += 2) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15 +
                    Math.sin(wx * 1.5 + this.time * 3) * 0.08;
      ctx.lineTo(sx, r.worldToScreenY(this.waterHeight + waveY));
    }

    // Fill down to bottom of screen
    ctx.lineTo(endSx, r.height);
    ctx.lineTo(startSx, r.height);
    ctx.closePath();

    // Toxic purple gradient
    const waterGrad = ctx.createLinearGradient(0, waterScreenY, 0, r.height);
    waterGrad.addColorStop(0, "rgba(120, 40, 160, 0.5)");
    waterGrad.addColorStop(0.3, "rgba(90, 30, 130, 0.6)");
    waterGrad.addColorStop(1, "rgba(50, 15, 80, 0.7)");
    ctx.fillStyle = waterGrad;
    ctx.fill();

    // Foam line (toxic green-purple)
    ctx.beginPath();
    ctx.moveTo(startSx, waterScreenY);
    for (let sx = startSx; sx <= endSx; sx += 2) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15 +
                    Math.sin(wx * 1.5 + this.time * 3) * 0.08;
      const foamJitter = Math.sin(wx * 3.2 + this.time * 5) * 0.04;
      ctx.lineTo(sx, r.worldToScreenY(this.waterHeight + waveY + 0.12 + foamJitter));
    }
    for (let sx = endSx; sx >= startSx; sx -= 2) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15 +
                    Math.sin(wx * 1.5 + this.time * 3) * 0.08;
      ctx.lineTo(sx, r.worldToScreenY(this.waterHeight + waveY));
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(180, 100, 255, 0.35)";
    ctx.fill();

    // Surface highlight line
    ctx.beginPath();
    ctx.moveTo(startSx, waterScreenY);
    for (let sx = startSx; sx <= endSx; sx += 2) {
      const wx = r.screenToWorldX(sx);
      const waveY = Math.sin(wx * 0.8 + this.time * 2) * 0.15 +
                    Math.sin(wx * 1.5 + this.time * 3) * 0.08;
      ctx.lineTo(sx, r.worldToScreenY(this.waterHeight + waveY));
    }
    ctx.strokeStyle = "rgba(200, 120, 255, 0.6)";
    ctx.lineWidth = Math.max(1, 0.05 * r.zoom);
    ctx.stroke();

    // Bubbles instead of sparkles
    for (let i = 0; i < 12; i++) {
      const bubbleX = this.startX + ((this.time * 0.3 + i * 5.7) % (this.endX - this.startX));
      if (bubbleX < bounds.left || bubbleX > bounds.right) continue;

      const bubblePhase = Math.sin(this.time * 2 + i * 1.9);
      const bubbleY = this.waterHeight - 0.5 - (((this.time * 0.8 + i * 3.1) % 2.0));

      if (bubbleY < this.waterHeight - 3) continue;

      const bsx = r.worldToScreenX(bubbleX);
      const bsy = r.worldToScreenY(bubbleY);
      const bubbleR = (0.5 + bubblePhase * 0.3) * r.zoom * 0.06;

      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "rgba(200, 140, 255, 0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bsx, bsy, bubbleR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
