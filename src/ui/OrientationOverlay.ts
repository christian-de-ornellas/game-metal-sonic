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

    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;

    // Phone icon (rotated)
    ctx.save();
    ctx.translate(centerX, centerY - 40);
    ctx.rotate(-Math.PI / 4);
    ctx.strokeStyle = "#4488ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-20, -35, 40, 70, 6);
    ctx.stroke();
    // Screen
    ctx.fillStyle = "#223366";
    ctx.fillRect(-15, -25, 30, 50);
    // Arrow indicating rotation
    ctx.restore();

    // Rotation arrow
    ctx.save();
    ctx.translate(centerX + 50, centerY - 40);
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 20, -Math.PI * 0.7, Math.PI * 0.3);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(18, 10);
    ctx.lineTo(12, 22);
    ctx.lineTo(6, 10);
    ctx.fillStyle = "#ffcc00";
    ctx.fill();
    ctx.restore();

    r.drawScreenText(
      "Rotate your device",
      centerX, centerY + 50,
      "#ffffff", 22, "center",
    );
    r.drawScreenText(
      "for the best experience",
      centerX, centerY + 80,
      "#aaaaaa", 16, "center",
    );
    r.drawScreenText(
      "Tap to dismiss",
      centerX, centerY + 130,
      "#666666", 14, "center",
    );
  }
}
