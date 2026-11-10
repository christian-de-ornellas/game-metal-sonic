export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  dpr = 1;
  private lastFontSize = 0;
  private lastFontStr = "";

  // Safe area insets (CSS pixels)
  safeTop = 0;
  safeBottom = 0;
  safeLeft = 0;
  safeRight = 0;

  // Camera offset (world coords of top-left corner)
  cameraX = 0;
  cameraY = 0;
  zoom = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Set canvas buffer to physical pixels
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);

    // Set CSS size to logical pixels
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";

    // Scale context so all drawing uses logical pixels
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Expose logical dimensions (existing code unchanged)
    this.width = w;
    this.height = h;

    this.updateSafeAreaInsets();
  }

  private updateSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement);
    this.safeTop = parseFloat(style.getPropertyValue("--sai-top")) || 0;
    this.safeBottom = parseFloat(style.getPropertyValue("--sai-bottom")) || 0;
    this.safeLeft = parseFloat(style.getPropertyValue("--sai-left")) || 0;
    this.safeRight = parseFloat(style.getPropertyValue("--sai-right")) || 0;
  }

  setCamera(x: number, y: number, zoom: number) {
    this.cameraX = x;
    this.cameraY = y;
    this.zoom = zoom;
  }

  /** Convert world coords to screen coords */
  worldToScreenX(wx: number): number {
    return (wx - this.cameraX) * this.zoom + this.width / 2;
  }

  worldToScreenY(wy: number): number {
    // Y is inverted: world Y up = screen Y down
    return -(wy - this.cameraY) * this.zoom + this.height / 2;
  }

  /** Convert screen to world */
  screenToWorldX(sx: number): number {
    return (sx - this.width / 2) / this.zoom + this.cameraX;
  }

  screenToWorldY(sy: number): number {
    return -(sy - this.height / 2) / this.zoom + this.cameraY;
  }

  /** Get visible world bounds */
  getVisibleBounds() {
    const halfW = (this.width / 2) / this.zoom;
    const halfH = (this.height / 2) / this.zoom;
    return {
      left: this.cameraX - halfW,
      right: this.cameraX + halfW,
      top: this.cameraY + halfH,
      bottom: this.cameraY - halfH,
    };
  }

  clear() {
    // Reset to identity to clear the full physical canvas, then restore scale
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Fill entire screen with a color */
  fillScreen(color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /** Draw a filled circle in world coords */
  drawCircle(wx: number, wy: number, radius: number, color: string) {
    const sx = this.worldToScreenX(wx);
    const sy = this.worldToScreenY(wy);
    const sr = radius * this.zoom;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  /** Draw a circle with radial gradient */
  drawGradientCircle(
    wx: number, wy: number, radius: number,
    innerColor: string, outerColor: string,
  ) {
    const sx = this.worldToScreenX(wx);
    const sy = this.worldToScreenY(wy);
    const sr = radius * this.zoom;
    const grad = this.ctx.createRadialGradient(
      sx - sr * 0.2, sy - sr * 0.2, sr * 0.1,
      sx, sy, sr,
    );
    grad.addColorStop(0, innerColor);
    grad.addColorStop(1, outerColor);
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
  }

  /** Draw a filled ellipse in world coords */
  drawEllipse(
    wx: number, wy: number,
    radiusX: number, radiusY: number,
    rotation: number, color: string,
  ) {
    const sx = this.worldToScreenX(wx);
    const sy = this.worldToScreenY(wy);
    const srx = radiusX * this.zoom;
    const sry = radiusY * this.zoom;
    this.ctx.beginPath();
    this.ctx.ellipse(sx, sy, srx, sry, -rotation, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  /** Draw ellipse with radial gradient */
  drawGradientEllipse(
    wx: number, wy: number,
    radiusX: number, radiusY: number,
    rotation: number,
    innerColor: string, outerColor: string,
  ) {
    const sx = this.worldToScreenX(wx);
    const sy = this.worldToScreenY(wy);
    const srx = radiusX * this.zoom;
    const sry = radiusY * this.zoom;
    const maxR = Math.max(srx, sry);
    const grad = this.ctx.createRadialGradient(
      sx - maxR * 0.15, sy - maxR * 0.15, maxR * 0.1,
      sx, sy, maxR,
    );
    grad.addColorStop(0, innerColor);
    grad.addColorStop(1, outerColor);
    this.ctx.beginPath();
    this.ctx.ellipse(sx, sy, srx, sry, -rotation, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
  }

  /** Draw a filled rect in world coords */
  drawRect(wx: number, wy: number, w: number, h: number, color: string) {
    const sx = this.worldToScreenX(wx);
    const sy = this.worldToScreenY(wy + h); // top-left in screen
    this.ctx.fillStyle = color;
    this.ctx.fillRect(sx, sy, w * this.zoom, h * this.zoom);
  }

  /** Draw rect with vertical gradient */
  drawGradientRect(
    wx: number, wy: number, w: number, h: number,
    topColor: string, bottomColor: string,
  ) {
    const sx = this.worldToScreenX(wx);
    const sy = this.worldToScreenY(wy + h);
    const sw = w * this.zoom;
    const sh = h * this.zoom;
    const grad = this.ctx.createLinearGradient(sx, sy, sx, sy + sh);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(sx, sy, sw, sh);
  }

  /** Draw a line in world coords */
  drawLine(
    x1: number, y1: number, x2: number, y2: number,
    color: string, lineWidth: number = 1,
  ) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.worldToScreenX(x1), this.worldToScreenY(y1));
    this.ctx.lineTo(this.worldToScreenX(x2), this.worldToScreenY(y2));
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth * this.zoom;
    this.ctx.stroke();
  }

  /** Draw a polygon/path from world-space points */
  drawPath(points: { x: number; y: number }[], fillColor: string, strokeColor?: string, lineWidth?: number) {
    if (points.length < 2) return;
    this.ctx.beginPath();
    this.ctx.moveTo(this.worldToScreenX(points[0].x), this.worldToScreenY(points[0].y));
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(this.worldToScreenX(points[i].x), this.worldToScreenY(points[i].y));
    }
    this.ctx.closePath();
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = (lineWidth ?? 1) * this.zoom;
      this.ctx.stroke();
    }
  }

  /** Draw text in screen coords (for HUD) */
  drawScreenText(
    text: string, sx: number, sy: number,
    color: string, fontSize: number,
    align: CanvasTextAlign = "left",
    shadowColor?: string,
  ) {
    if (fontSize !== this.lastFontSize) {
      this.lastFontSize = fontSize;
      this.lastFontStr = `bold ${fontSize}px monospace`;
    }
    this.ctx.font = this.lastFontStr;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = "top";
    if (shadowColor) {
      this.ctx.fillStyle = shadowColor;
      this.ctx.fillText(text, sx + 2, sy + 2);
    }
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, sx, sy);
  }

  /** Scale a base size responsively based on screen dimensions.
   * Returns base size on tablets/desktop, smaller on phones. */
  responsiveSize(base: number): number {
    const minDim = Math.min(this.width, this.height);
    const scale = Math.max(0.55, Math.min(1.0, minDim / 500));
    return Math.max(10, Math.round(base * scale));
  }

  /** True if screen is likely a small mobile device in landscape */
  get isSmallScreen(): boolean {
    return Math.min(this.width, this.height) < 420;
  }

  /** Save/restore context state */
  save() { this.ctx.save(); }
  restore() { this.ctx.restore(); }

  /** Set global alpha */
  setAlpha(a: number) { this.ctx.globalAlpha = a; }

  /** Set shadow for glow effects */
  setShadow(color: string, blur: number) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = blur;
  }

  clearShadow() {
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
  }
}
