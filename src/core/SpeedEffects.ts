import { Renderer } from "./Renderer";

interface Afterimage {
  x: number;
  y: number;
  alpha: number;
}

const MAX_AFTERIMAGES = 8;

export class SpeedEffects {
  private afterimages: Afterimage[] = [];
  private afterimageTimer = 0;
  private speedLineAlpha = 0;
  private writeIndex = 0;

  update(dt: number, playerX: number, playerY: number, speed: number, isSpinning: boolean) {
    // Afterimages: record positions when spinning fast
    this.afterimageTimer -= dt;
    if (isSpinning && speed > 8 && this.afterimageTimer <= 0) {
      if (this.afterimages.length < MAX_AFTERIMAGES) {
        this.afterimages.push({ x: playerX, y: playerY, alpha: 0.4 });
      } else {
        const img = this.afterimages[this.writeIndex];
        img.x = playerX;
        img.y = playerY;
        img.alpha = 0.4;
        this.writeIndex = (this.writeIndex + 1) % MAX_AFTERIMAGES;
      }
      this.afterimageTimer = 0.03;
    }

    // Fade out afterimages - swap-and-pop for removal
    let i = this.afterimages.length;
    while (i-- > 0) {
      this.afterimages[i].alpha -= dt * 2;
      if (this.afterimages[i].alpha <= 0) {
        this.afterimages[i] = this.afterimages[this.afterimages.length - 1];
        this.afterimages.pop();
        if (this.writeIndex >= this.afterimages.length) {
          this.writeIndex = 0;
        }
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

      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const seed = i * 7.31 + time * 3;
        const offsetY = (Math.sin(seed) * 0.5) * 3 * r.zoom;
        const lineLen = (1.5 + Math.sin(seed * 1.3) * 0.5) * r.zoom;
        const dir = speed > 0 ? -1 : 1;

        ctx.moveTo(psx + dir * 1.5 * r.zoom, psy + offsetY);
        ctx.lineTo(psx + dir * (1.5 * r.zoom + lineLen), psy + offsetY);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }
}
