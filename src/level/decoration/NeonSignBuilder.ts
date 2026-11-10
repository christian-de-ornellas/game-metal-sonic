import { Renderer } from "../../core/Renderer";

interface NeonSign {
  x: number;
  y: number;
  width: number;
  height: number;
  color1: string;
  color2: string;
  phase: number;
}

export class NeonSignBuilder {
  private signs: NeonSign[] = [];
  private time = 0;

  addSign(x: number, y: number, width: number = 2, height: number = 1.5, color1: string = "#ff44aa", color2: string = "#44aaff") {
    this.signs.push({ x, y, width, height, color1, color2, phase: Math.random() * Math.PI * 2 });
  }

  addSignLine(startX: number, endX: number, count: number, getHeight: (x: number) => number) {
    const colors = [
      ["#ff44aa", "#ffcc00"],
      ["#44aaff", "#44ff88"],
      ["#ff4444", "#ffaa00"],
      ["#aa44ff", "#ff44aa"],
    ];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = startX + (endX - startX) * t;
      const y = getHeight(x);
      const [c1, c2] = colors[i % colors.length];
      const w = 1.5 + Math.random() * 1.5;
      const h = 1 + Math.random() * 1;
      this.addSign(x, y + 3 + Math.random() * 2, w, h, c1, c2);
    }
  }

  update(dt: number) {
    this.time += dt;
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();
    const ctx = r.ctx;

    for (const sign of this.signs) {
      if (sign.x < bounds.left - 3 || sign.x > bounds.right + 3) continue;

      const sx = r.worldToScreenX(sign.x);
      const sy = r.worldToScreenY(sign.y);
      const sw = sign.width * r.zoom;
      const sh = sign.height * r.zoom;

      // Pulsating intensity
      const pulse = 0.7 + Math.sin(this.time * 3 + sign.phase) * 0.3;

      ctx.save();
      ctx.globalAlpha = pulse;

      // Sign background
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(sx - sw / 2, sy - sh / 2, sw, sh);

      // Border (alternating colors)
      const borderColor = Math.sin(this.time * 2 + sign.phase) > 0 ? sign.color1 : sign.color2;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = Math.max(1, 0.05 * r.zoom);
      ctx.strokeRect(sx - sw / 2, sy - sh / 2, sw, sh);

      // Inner neon text/pattern
      ctx.fillStyle = sign.color1;

      // Simple decorative pattern (casino-style)
      const innerW = sw * 0.7;
      const innerH = sh * 0.4;
      ctx.fillRect(sx - innerW / 2, sy - innerH / 2, innerW, innerH);

      // Small dots along top
      ctx.fillStyle = sign.color2;
      const dotCount = Math.floor(sw / (0.15 * r.zoom));
      for (let i = 0; i < dotCount; i++) {
        const dotX = sx - sw / 2 + (sw / dotCount) * (i + 0.5);
        const dotPhase = Math.sin(this.time * 5 + i * 0.8 + sign.phase);
        if (dotPhase > 0) {
          ctx.beginPath();
          ctx.arc(dotX, sy - sh / 2 + 0.06 * r.zoom, 0.04 * r.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pole
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#444466";
      ctx.fillRect(sx - 0.05 * r.zoom, sy + sh / 2, 0.1 * r.zoom, 1.5 * r.zoom);

      ctx.restore();
    }
  }
}
