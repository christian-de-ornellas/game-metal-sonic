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
  pauseTap: boolean;
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
    pause: TouchButton;
    attack: TouchButton;
  };
  private prevJump = false;
  private prevSpinDash = false;
  private prevAttack = false;
  private activeTouches: Map<number, { x: number; y: number }> = new Map();
  private fullscreenTapped = false;
  private pauseTapped = false;
  // Track which buttons were pressed on previous update for haptic edge detection
  private prevButtonStates: Set<string> = new Set();
  // Reusable Set for updateButtonStates to avoid allocation per touch event
  private _tempPrevPressed: Set<string> = new Set();

  // Cached button positions - only recalculated on resize
  private cachedWidth = 0;
  private cachedHeight = 0;
  private cachedSafeLeft = 0;
  private cachedSafeRight = 0;
  private cachedSafeTop = 0;
  private cachedSafeBottom = 0;

  // Pre-computed color strings for drawButton
  private buttonColorCache: Map<string, { fill: string; fillPressed: string; stroke: string; strokePressed: string; textFill: string; textFillPressed: string }> = new Map();

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
      pause: { x: 0, y: 0, radius: r * 0.5, label: "\u23F8", pressed: false },
      attack: { x: 0, y: 0, radius: r, label: "\uD83D\uDD25", pressed: false, color: "rgba(255,80,40," },
    };

    // Pre-compute color strings for all buttons
    this.precomputeColors();

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

  private precomputeColors() {
    for (const [key, btn] of Object.entries(this.buttons)) {
      const baseColor = btn.color ?? "rgba(255,255,255,";
      this.buttonColorCache.set(key, {
        fill: baseColor + "0.35)",
        fillPressed: baseColor + "0.6)",
        stroke: baseColor + "0.5)",
        strokePressed: baseColor + "0.75)",
        textFill: "rgba(0, 0, 0, 0.65)",
        textFillPressed: "rgba(0, 0, 0, 0.9)",
      });
    }
  }

  private updateButtonStates() {
    // Reuse Set to avoid allocation per touch event
    const prevPressed = this._tempPrevPressed;
    prevPressed.clear();
    for (const [key, btn] of Object.entries(this.buttons)) {
      if (btn.pressed) prevPressed.add(key);
    }

    // Reset all
    for (const btn of Object.values(this.buttons)) {
      btn.pressed = false;
    }
    this.fullscreenTapped = false;
    this.pauseTapped = false;

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
          if (key === "pause") this.pauseTapped = true;
        }
      }
    }

    // Haptic feedback only on NEW presses (not continuous)
    const hapticButtons = ["jump", "spinDash", "attack", "pause"];
    for (const key of hapticButtons) {
      if ((this.buttons as any)[key].pressed && !prevPressed.has(key)) {
        this.vibrate(15);
        break; // One vibration per event is enough
      }
    }

    this.prevButtonStates = prevPressed;
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
      pauseTap: this.pauseTapped,
      attack,
      attackPressed,
    };
  }

  private updateButtonPositions(w: number, h: number, safeLeft: number, safeRight: number, safeTop: number, safeBottom: number) {
    // Only recalculate if dimensions changed
    if (w === this.cachedWidth && h === this.cachedHeight &&
        safeLeft === this.cachedSafeLeft && safeRight === this.cachedSafeRight &&
        safeTop === this.cachedSafeTop && safeBottom === this.cachedSafeBottom) {
      return;
    }
    this.cachedWidth = w;
    this.cachedHeight = h;
    this.cachedSafeLeft = safeLeft;
    this.cachedSafeRight = safeRight;
    this.cachedSafeTop = safeTop;
    this.cachedSafeBottom = safeBottom;

    const baseRadius = Math.min(w, h) * 0.09;
    const margin = baseRadius * 1.3;
    const dpadCenterX = safeLeft + margin + baseRadius;
    const dpadCenterY = h - safeBottom - margin - baseRadius;

    this.buttons.left.x = dpadCenterX - baseRadius * 1.5;
    this.buttons.left.y = dpadCenterY;
    this.buttons.left.radius = baseRadius;

    this.buttons.right.x = dpadCenterX + baseRadius * 1.5;
    this.buttons.right.y = dpadCenterY;
    this.buttons.right.radius = baseRadius;

    this.buttons.down.x = dpadCenterX;
    this.buttons.down.y = dpadCenterY + baseRadius * 1.5;
    this.buttons.down.radius = baseRadius;

    this.buttons.jump.x = w - safeRight - margin - baseRadius;
    this.buttons.jump.y = h - safeBottom - margin - baseRadius;
    this.buttons.jump.radius = baseRadius * 1.3;

    this.buttons.spinDash.x = w - safeRight - margin - baseRadius * 2.8;
    this.buttons.spinDash.y = h - safeBottom - margin - baseRadius * 0.6;
    this.buttons.spinDash.radius = baseRadius;

    // Scale utility button size with screen (min 18, max 28)
    const utilRadius = Math.max(18, Math.min(28, Math.min(w, h) * 0.045));
    const utilMargin = utilRadius * 1.6;

    this.buttons.fullscreen.x = w - safeRight - utilMargin;
    this.buttons.fullscreen.y = safeTop + utilMargin;
    this.buttons.fullscreen.radius = utilRadius;

    this.buttons.pause.x = safeLeft + utilMargin;
    this.buttons.pause.y = safeTop + utilMargin;
    this.buttons.pause.radius = utilRadius;
  }

  render(r: Renderer) {
    if (!this.isTouchDevice) return;

    const ctx = r.ctx;
    const w = r.width;
    const h = r.height;

    // Cache button positions - only recalculate on resize
    this.updateButtonPositions(w, h, r.safeLeft, r.safeRight, r.safeTop, r.safeBottom);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // D-pad buttons
    this.drawButton(ctx, this.buttons.left, "left");
    this.drawButton(ctx, this.buttons.right, "right");
    this.drawButton(ctx, this.buttons.down, "down");

    // Action buttons with colors
    this.drawButton(ctx, this.buttons.jump, "jump");
    this.drawButton(ctx, this.buttons.spinDash, "spinDash");

    // Attack button (only in boss mode)
    if (this.bossMode) {
      const baseRadius = Math.min(w, h) * 0.09;
      const margin = baseRadius * 1.3;
      this.buttons.attack.x = w - r.safeRight - margin - baseRadius * 4.6;
      this.buttons.attack.y = h - r.safeBottom - margin - baseRadius * 1.8;
      this.buttons.attack.radius = baseRadius;
      this.drawButton(ctx, this.buttons.attack, "attack");
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

    // Pause button (smaller, subtle)
    const ps = this.buttons.pause;
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, ps.radius, 0, Math.PI * 2);
    ctx.fillStyle = ps.pressed ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `${ps.radius * 0.9}px sans-serif`;
    ctx.fillText("\u23F8", ps.x, ps.y);
  }

  private drawButton(ctx: CanvasRenderingContext2D, btn: TouchButton, key: string) {
    const colors = this.buttonColorCache.get(key);
    if (!colors) return;

    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
    ctx.fillStyle = btn.pressed ? colors.fillPressed : colors.fill;
    ctx.fill();
    ctx.strokeStyle = btn.pressed ? colors.strokePressed : colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = btn.pressed ? colors.textFillPressed : colors.textFill;
    ctx.font = `bold ${btn.radius * 0.7}px sans-serif`;
    ctx.fillText(btn.label, btn.x, btn.y);
  }
}
