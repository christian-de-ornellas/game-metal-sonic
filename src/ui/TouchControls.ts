import { Renderer } from "../core/Renderer";

export interface TouchState {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  spinDash: boolean;
  spinDashPressed: boolean;
  spinDashReleased: boolean;
  fullscreenTap: boolean;
  attack: boolean;
  attackPressed: boolean;
}

interface TouchButton {
  x: number;
  y: number;
  radius: number;
  label: string;
  pressed: boolean;
  color?: string;
}

export class TouchControls {
  isTouchDevice = false;
  bossMode = false;
  private canvas: HTMLCanvasElement;
  private buttons: {
    left: TouchButton;
    right: TouchButton;
    down: TouchButton;
    jump: TouchButton;
    spinDash: TouchButton;
    fullscreen: TouchButton;
    attack: TouchButton;
  };
  private prevJump = false;
  private prevSpinDash = false;
  private prevAttack = false;
  private activeTouches: Map<number, { x: number; y: number }> = new Map();
  private fullscreenTapped = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const r = 30;
    this.buttons = {
      left: { x: 0, y: 0, radius: r, label: "\u25C0", pressed: false },
      right: { x: 0, y: 0, radius: r, label: "\u25B6", pressed: false },
      down: { x: 0, y: 0, radius: r, label: "\u25BC", pressed: false },
      jump: { x: 0, y: 0, radius: r, label: "A", pressed: false, color: "rgba(80,180,255," },
      spinDash: { x: 0, y: 0, radius: r, label: "S", pressed: false, color: "rgba(255,160,40," },
      fullscreen: { x: 0, y: 0, radius: r * 0.5, label: "\u26F6", pressed: false },
      attack: { x: 0, y: 0, radius: r, label: "\uD83D\uDD25", pressed: false, color: "rgba(255,80,40," },
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
    for (const btn of Object.values(this.buttons)) {
      btn.pressed = false;
    }
    this.fullscreenTapped = false;

    const rect = this.canvas.getBoundingClientRect();

    for (const [, touch] of this.activeTouches) {
      const tx = touch.x - rect.left;
      const ty = touch.y - rect.top;

      for (const [key, btn] of Object.entries(this.buttons)) {
        const dx = tx - btn.x;
        const dy = ty - btn.y;
        const hitRadius = btn.radius * 1.4;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          btn.pressed = true;
          if (key === "fullscreen") this.fullscreenTapped = true;
        }
      }
    }

    // Haptic feedback on new presses
    if (this.buttons.jump.pressed || this.buttons.spinDash.pressed || this.buttons.attack.pressed) {
      this.vibrate(15);
    }
  }

  private vibrate(ms: number) {
    try {
      navigator?.vibrate?.(ms);
    } catch { /* not supported */ }
  }

  getState(): TouchState {
    const jump = this.buttons.jump.pressed;
    const jumpPressed = jump && !this.prevJump;
    const jumpReleased = !jump && this.prevJump;
    this.prevJump = jump;

    const spinDash = this.buttons.spinDash.pressed;
    const spinDashPressed = spinDash && !this.prevSpinDash;
    const spinDashReleased = !spinDash && this.prevSpinDash;
    this.prevSpinDash = spinDash;

    const attack = this.buttons.attack.pressed;
    const attackPressed = attack && !this.prevAttack;
    this.prevAttack = attack;

    return {
      left: this.buttons.left.pressed,
      right: this.buttons.right.pressed,
      down: this.buttons.down.pressed,
      jump,
      jumpPressed,
      jumpReleased,
      spinDash,
      spinDashPressed,
      spinDashReleased,
      fullscreenTap: this.fullscreenTapped,
      attack,
      attackPressed,
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

    // Jump button (right side, bottom)
    this.buttons.jump.x = w - margin - baseRadius;
    this.buttons.jump.y = h - margin - baseRadius;
    this.buttons.jump.radius = baseRadius * 1.3;

    // Spin dash button (right side, above jump)
    this.buttons.spinDash.x = w - margin - baseRadius * 2.8;
    this.buttons.spinDash.y = h - margin - baseRadius * 0.6;
    this.buttons.spinDash.radius = baseRadius;

    // Fullscreen button (top right)
    this.buttons.fullscreen.x = w - 30;
    this.buttons.fullscreen.y = 30;
    this.buttons.fullscreen.radius = 18;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // D-pad buttons
    for (const btn of [this.buttons.left, this.buttons.right, this.buttons.down]) {
      this.drawButton(ctx, btn);
    }

    // Action buttons with colors
    this.drawButton(ctx, this.buttons.jump);
    this.drawButton(ctx, this.buttons.spinDash);

    // Attack button (only in boss mode)
    if (this.bossMode) {
      this.buttons.attack.x = w - margin - baseRadius * 4.6;
      this.buttons.attack.y = h - margin - baseRadius * 1.8;
      this.buttons.attack.radius = baseRadius;
      this.drawButton(ctx, this.buttons.attack);
    } else {
      // Move attack button offscreen when not in boss mode
      this.buttons.attack.x = -200;
      this.buttons.attack.y = -200;
    }

    // Fullscreen button (smaller, subtle)
    const fs = this.buttons.fullscreen;
    ctx.beginPath();
    ctx.arc(fs.x, fs.y, fs.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `${fs.radius * 0.9}px sans-serif`;
    ctx.fillText("\u26F6", fs.x, fs.y);

    ctx.restore();
  }

  private drawButton(ctx: CanvasRenderingContext2D, btn: TouchButton) {
    const alpha = btn.pressed ? 0.6 : 0.35;
    const baseColor = btn.color ?? "rgba(255,255,255,";

    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
    ctx.fillStyle = baseColor + `${alpha})`;
    ctx.fill();
    ctx.strokeStyle = baseColor + `${alpha + 0.15})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = `rgba(0, 0, 0, ${alpha + 0.3})`;
    ctx.font = `bold ${btn.radius * 0.7}px sans-serif`;
    ctx.fillText(btn.label, btn.x, btn.y);
  }
}
