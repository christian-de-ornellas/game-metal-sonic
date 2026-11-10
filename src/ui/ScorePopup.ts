import { Renderer } from "../core/Renderer";

interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
}

export class ScorePopup {
  private popups: Popup[] = [];

  add(x: number, y: number, text: string, duration: number = 1.2) {
    this.popups.push({ x, y, text, life: duration, maxLife: duration });
  }

  update(dt: number) {
    let i = this.popups.length;
    while (i-- > 0) {
      const p = this.popups[i];
      p.life -= dt;
      p.y += dt * 2; // float upward (world Y is up)
      if (p.life <= 0) {
        this.popups[i] = this.popups[this.popups.length - 1];
        this.popups.pop();
      }
    }
  }

  render(r: Renderer) {
    const ctx = r.ctx;

    for (const p of this.popups) {
      const t = 1 - p.life / p.maxLife;
      const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      if (alpha <= 0) continue;

      const sx = r.worldToScreenX(p.x);
      const sy = r.worldToScreenY(p.y);
      const fontSize = Math.max(12, 0.5 * r.zoom);

      ctx.globalAlpha = alpha;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Shadow
      ctx.fillStyle = "#000000";
      ctx.fillText(p.text, sx + 1, sy + 1);

      // Text
      ctx.fillStyle = "#ffcc00";
      ctx.fillText(p.text, sx, sy);
    }

    ctx.globalAlpha = 1;
  }
}
