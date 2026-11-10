import { Renderer } from "../core/Renderer";

interface TutorialStep {
  text: string;
  duration: number;
}

export class Tutorial {
  private steps: TutorialStep[];
  private currentStep = 0;
  private timer = 0;
  private alpha = 0;
  private active = false;
  private isTouchDevice = false;

  constructor() {
    this.steps = [];
  }

  start(isTouchDevice: boolean) {
    this.isTouchDevice = isTouchDevice;
    this.steps = isTouchDevice ? [
      { text: "Use the D-PAD to move", duration: 3 },
      { text: "Tap A to JUMP", duration: 3 },
      { text: "Tap S while holding DOWN to SPIN DASH", duration: 4 },
      { text: "Collect RINGS to protect yourself!", duration: 3 },
    ] : [
      { text: "ARROWS or WASD to move", duration: 3 },
      { text: "SPACE to JUMP", duration: 3 },
      { text: "Hold DOWN + press SPACE to SPIN DASH", duration: 4 },
      { text: "Collect RINGS to protect yourself!", duration: 3 },
    ];
    this.currentStep = 0;
    this.timer = 0;
    this.alpha = 0;
    this.active = true;
  }

  get isActive() { return this.active; }

  update(dt: number) {
    if (!this.active) return;

    this.timer += dt;
    const step = this.steps[this.currentStep];
    if (!step) { this.active = false; return; }

    // Fade in/out
    const fadeIn = 0.3;
    const fadeOut = 0.3;
    if (this.timer < fadeIn) {
      this.alpha = this.timer / fadeIn;
    } else if (this.timer > step.duration - fadeOut) {
      this.alpha = Math.max(0, (step.duration - this.timer) / fadeOut);
    } else {
      this.alpha = 1;
    }

    if (this.timer >= step.duration) {
      this.currentStep++;
      this.timer = 0;
      if (this.currentStep >= this.steps.length) {
        this.active = false;
      }
    }
  }

  render(r: Renderer) {
    if (!this.active || this.currentStep >= this.steps.length) return;

    const ctx = r.ctx;
    const step = this.steps[this.currentStep];
    const centerX = r.width / 2;
    const y = r.height * 0.18;

    ctx.save();
    ctx.globalAlpha = this.alpha * 0.85;

    // Background pill
    ctx.font = `bold 20px monospace`;
    const textW = ctx.measureText(step.text).width;
    const padX = 24;
    const padY = 12;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    ctx.roundRect(centerX - textW / 2 - padX, y - padY, textW + padX * 2, 28 + padY * 2, 14);
    ctx.fill();

    ctx.globalAlpha = this.alpha;
    r.drawScreenText(step.text, centerX, y, "#ffffff", 20, "center");

    ctx.restore();
  }
}
