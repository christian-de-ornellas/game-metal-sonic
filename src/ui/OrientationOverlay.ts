import { Renderer } from "../core/Renderer";

export class OrientationOverlay {
  private showRotateHint = false;
  private dismissed = false;

  update() {
    if (this.dismissed) {
      this.showRotateHint = false;
      return;
    }
    // Only show on narrow screens (likely mobile in portrait)
    const isPortrait = window.innerHeight > window.innerWidth;
    const isNarrow = window.innerWidth < 600;
    this.showRotateHint = isPortrait && isNarrow;
  }

  dismiss() {
    this.dismissed = true;
  }

  get isShowing() { return this.showRotateHint; }

  render(r: Renderer) {
    if (!this.showRotateHint) return;

    const ctx = r.ctx;
    const w = r.width;
    const h = r.height;
    const scale = Math.min(w, h) / 400; // scale everything relative to 400px reference

    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;

    // Phone icon (rotated) — scaled
    const phoneW = 40 * scale;
    const phoneH = 70 * scale;
    ctx.save();
    ctx.translate(centerX, centerY - 40 * scale);
    ctx.rotate(-Math.PI / 4);
    ctx.strokeStyle = "#4488ff";
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.roundRect(-phoneW / 2, -phoneH / 2, phoneW, phoneH, 6 * scale);
    ctx.stroke();
    // Screen
    ctx.fillStyle = "#223366";
    ctx.fillRect(-phoneW * 0.375, -phoneH * 0.36, phoneW * 0.75, phoneH * 0.71);
    ctx.restore();

    // Rotation arrow — scaled
    ctx.save();
    ctx.translate(centerX + 50 * scale, centerY - 40 * scale);
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, 20 * scale, -Math.PI * 0.7, Math.PI * 0.3);
    ctx.stroke();
    // Arrowhead
    const aSize = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(18 * scale, 10 * scale);
    ctx.lineTo(12 * scale, (10 + aSize * 2) * scale);
    ctx.lineTo(6 * scale, 10 * scale);
    ctx.fillStyle = "#ffcc00";
    ctx.fill();
    ctx.restore();

    const textSize1 = Math.max(14, Math.round(22 * scale));
    const textSize2 = Math.max(12, Math.round(16 * scale));
    const textSize3 = Math.max(11, Math.round(14 * scale));

    r.drawScreenText(
      "Rotate your device",
      centerX, centerY + 50 * scale,
      "#ffffff", textSize1, "center",
    );
    r.drawScreenText(
      "for the best experience",
      centerX, centerY + 80 * scale,
      "#aaaaaa", textSize2, "center",
    );
    r.drawScreenText(
      "Tap to dismiss",
      centerX, centerY + 130 * scale,
      "#666666", textSize3, "center",
    );
  }
}
