import { Renderer } from "./Renderer";

interface Afterimage {
  x: number;
  y: number;
  alpha: number;
}

export class SpeedEffects {
  private afterimages: Afterimage[] = [];
  private afterimageTimer = 0;
  private speedLineAlpha = 0;

  update(dt: number, playerX: number, playerY: number, speed: number, isSpinning: boolean) {
    // Afterimages: record positions when spinning fast
    this.afterimageTimer -= dt;
    if (isSpinning && speed > 8 && this.afterimageTimer <= 0) {
      this.afterimages.push({ x: playerX, y: playerY, alpha: 0.4 });
      this.afterimageTimer = 0.03;
      if (this.afterimages.length > 8) {
        this.afterimages.shift();
      }
    }

    // Fade out afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].alpha -= dt * 2;
      if (this.afterimages[i].alpha <= 0) {
        this.afterimages.splice(i, 1);
      }
    }

    // Speed line intensity
    const targetAlpha = speed > 10 ? Math.min((speed - 10) / 10, 0.5) : 0;
    this.speedLineAlpha += (targetAlpha - this.speedLineAlpha) * dt * 5;
  }

  /** Render behind the player (between level and player) */
  render(r: Renderer, playerX: number, playerY: number, speed: number, time: number) {
    const ctx = r.ctx;

    // Afterimages
    for (const img of this.afterimages) {
      const sx = r.worldToScreenX(img.x);
      const sy = r.worldToScreenY(img.y + 0.8);
      const sr = 0.6 * r.zoom;
      ctx.globalAlpha = img.alpha;
      ctx.fillStyle = "#4488ff";
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speed lines
    if (this.speedLineAlpha > 0.01) {
      ctx.globalAlpha = this.speedLineAlpha;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1, 0.02 * r.zoom);

      const psx = r.worldToScreenX(playerX);
      const psy = r.worldToScreenY(playerY + 0.8);

      for (let i = 0; i < 12; i++) {
        const seed = i * 7.31 + time * 3;
        const offsetY = (Math.sin(seed) * 0.5) * 3 * r.zoom;
        const lineLen = (1.5 + Math.sin(seed * 1.3) * 0.5) * r.zoom;
        const dir = speed > 0 ? -1 : 1;

        ctx.beginPath();
        ctx.moveTo(psx + dir * 1.5 * r.zoom, psy + offsetY);
        ctx.lineTo(psx + dir * (1.5 * r.zoom + lineLen), psy + offsetY);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }
}
