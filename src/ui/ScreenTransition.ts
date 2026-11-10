import { Renderer } from "../core/Renderer";

type TransitionType = "fade" | "iris";

export class ScreenTransition {
  private active = false;
  private type: TransitionType = "fade";
  private progress = 0;       // 0 → 1 → 0  (in → hold → out)
  private phase: "in" | "hold" | "out" = "in";
  private duration = 0.4;     // half-transition time (in or out)
  private holdTime = 0.1;
  private holdTimer = 0;
  private onMidpoint: (() => void) | null = null;
  private midpointFired = false;

  // Iris center (world coords converted to screen externally)
  private irisScreenX = 0;
  private irisScreenY = 0;

  get isActive() { return this.active; }

  /** Start a fade-to-black transition */
  fadeToBlack(duration: number, onMidpoint: () => void) {
    this.start("fade", duration, onMidpoint);
  }

  /** Start a Sonic-style iris wipe (circle closing then opening) */
  irisWipe(screenX: number, screenY: number, duration: number, onMidpoint: () => void) {
    this.irisScreenX = screenX;
    this.irisScreenY = screenY;
    this.start("iris", duration, onMidpoint);
  }

  private start(type: TransitionType, duration: number, onMidpoint: () => void) {
    this.active = true;
    this.type = type;
    this.duration = duration;
    this.progress = 0;
    this.phase = "in";
    this.holdTimer = 0;
    this.holdTime = 0.1;
    this.onMidpoint = onMidpoint;
    this.midpointFired = false;
  }

  update(dt: number) {
    if (!this.active) return;

    if (this.phase === "in") {
      this.progress += dt / this.duration;
      if (this.progress >= 1) {
        this.progress = 1;
        this.phase = "hold";
        if (!this.midpointFired) {
          this.midpointFired = true;
          this.onMidpoint?.();
        }
      }
    } else if (this.phase === "hold") {
      this.holdTimer += dt;
      if (this.holdTimer >= this.holdTime) {
        this.phase = "out";
      }
    } else if (this.phase === "out") {
      this.progress -= dt / this.duration;
      if (this.progress <= 0) {
        this.progress = 0;
        this.active = false;
      }
    }
  }

  render(r: Renderer) {
    if (!this.active) return;

    const ctx = r.ctx;
    const w = r.width;
    const h = r.height;

    if (this.type === "fade") {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.progress})`;
      ctx.fillRect(0, 0, w, h);
    } else if (this.type === "iris") {
      // Circle that shrinks to close (progress 0→1 = full open → fully closed)
      const maxRadius = Math.sqrt(w * w + h * h);
      const radius = maxRadius * (1 - this.progress);

      ctx.save();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      // Draw outer rect, then cut out circle (even-odd)
      ctx.rect(0, 0, w, h);
      ctx.arc(this.irisScreenX, this.irisScreenY, Math.max(radius, 0), 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.restore();
    }
  }
}
