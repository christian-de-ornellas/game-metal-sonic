import { Renderer } from "../core/Renderer";

export interface TouchState {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
}

interface TouchButton {
  x: number;
  y: number;
  radius: number;
  label: string;
  pressed: boolean;
}

export class TouchControls {
  isTouchDevice = false;
  private canvas: HTMLCanvasElement;
  private buttons: {
    left: TouchButton;
    right: TouchButton;
    down: TouchButton;
    jump: TouchButton;
  };
  private prevJump = false;
  private activeTouches: Map<number, { x: number; y: number }> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Initialize with placeholder positions — recalculated on each render
    const r = 30;
    this.buttons = {
      left: { x: 0, y: 0, radius: r, label: "◀", pressed: false },
      right: { x: 0, y: 0, radius: r, label: "▶", pressed: false },
      down: { x: 0, y: 0, radius: r, label: "▼", pressed: false },
      jump: { x: 0, y: 0, radius: r, label: "A", pressed: false },
    };

    canvas.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: false });
    canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: false });
    canvas.addEventListener("touchend", (e) => this.handleTouchEnd(e), { passive: false });
    canvas.addEventListener("touchcancel", (e) => this.handleTouchEnd(e), { passive: false });
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    this.isTouchDevice = true;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    this.updateButtonStates();
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    this.updateButtonStates();
  }

  private handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      this.activeTouches.delete(e.changedTouches[i].identifier);
    }
    this.updateButtonStates();
  }

  private updateButtonStates() {
    // Reset all
    this.buttons.left.pressed = false;
    this.buttons.right.pressed = false;
    this.buttons.down.pressed = false;
    this.buttons.jump.pressed = false;

    const rect = this.canvas.getBoundingClientRect();

    for (const [, touch] of this.activeTouches) {
      const tx = touch.x - rect.left;
      const ty = touch.y - rect.top;

      for (const btn of [this.buttons.left, this.buttons.right, this.buttons.down, this.buttons.jump]) {
        const dx = tx - btn.x;
        const dy = ty - btn.y;
        // Use 1.4x radius for easier hit target
        const hitRadius = btn.radius * 1.4;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          btn.pressed = true;
        }
      }
    }
  }

  /** Call once per frame to compute jumpPressed/jumpReleased */
  update() {
    // prevJump is updated in getState()
  }

  getState(): TouchState {
    const jump = this.buttons.jump.pressed;
    const jumpPressed = jump && !this.prevJump;
    const jumpReleased = !jump && this.prevJump;
    this.prevJump = jump;

    return {
      left: this.buttons.left.pressed,
      right: this.buttons.right.pressed,
      down: this.buttons.down.pressed,
      jump,
      jumpPressed,
      jumpReleased,
    };
  }

  render(r: Renderer) {
    if (!this.isTouchDevice) return;

    const ctx = r.ctx;
    const w = r.width;
    const h = r.height;
    const baseRadius = Math.min(w, h) * 0.09;

    // Recalculate button positions based on current screen size
    const margin = baseRadius * 1.3;
    const dpadCenterX = margin + baseRadius;
    const dpadCenterY = h - margin - baseRadius;

    this.buttons.left.x = dpadCenterX - baseRadius * 1.5;
    this.buttons.left.y = dpadCenterY;
    this.buttons.left.radius = baseRadius;

    this.buttons.right.x = dpadCenterX + baseRadius * 1.5;
    this.buttons.right.y = dpadCenterY;
    this.buttons.right.radius = baseRadius;

    this.buttons.down.x = dpadCenterX;
    this.buttons.down.y = dpadCenterY + baseRadius * 1.5;
    this.buttons.down.radius = baseRadius;

    this.buttons.jump.x = w - margin - baseRadius;
    this.buttons.jump.y = h - margin - baseRadius;
    this.buttons.jump.radius = baseRadius * 1.3;

    // Draw each button
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const btn of [this.buttons.left, this.buttons.right, this.buttons.down, this.buttons.jump]) {
      const alpha = btn.pressed ? 0.6 : 0.35;

      ctx.beginPath();
      ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha + 0.15})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = `rgba(0, 0, 0, ${alpha + 0.3})`;
      ctx.font = `bold ${btn.radius * 0.7}px sans-serif`;
      ctx.fillText(btn.label, btn.x, btn.y);
    }

    ctx.restore();
  }
}
