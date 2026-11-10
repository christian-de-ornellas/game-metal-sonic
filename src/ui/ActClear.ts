import { Renderer } from "../core/Renderer";

type ActClearPhase = "slide_in" | "tally" | "done";

export class ActClear {
  private phase: ActClearPhase = "slide_in";
  private time = 0;
  private slideInDuration = 1.0;

  private zoneName: string;
  private act: number;
  private timeBonus: number;
  private ringBonus: number;
  private totalBonus: number;

  private displayedTimeBonus = 0;
  private displayedRingBonus = 0;
  private tallySpeed = 200; // points per second of tally
  private tallyDoneTimer = 0;

  private onComplete: () => void;
  private completed = false;

  constructor(zoneName: string, act: number, timeSeconds: number, rings: number, onComplete: () => void) {
    this.zoneName = zoneName;
    this.act = act;
    this.onComplete = onComplete;

    // Time bonus: faster = more points
    if (timeSeconds < 30) this.timeBonus = 50000;
    else if (timeSeconds < 45) this.timeBonus = 10000;
    else if (timeSeconds < 60) this.timeBonus = 5000;
    else if (timeSeconds < 90) this.timeBonus = 4000;
    else if (timeSeconds < 120) this.timeBonus = 3000;
    else if (timeSeconds < 180) this.timeBonus = 2000;
    else if (timeSeconds < 300) this.timeBonus = 1000;
    else this.timeBonus = 0;

    this.ringBonus = rings * 100;
    this.totalBonus = this.timeBonus + this.ringBonus;
  }

  get isComplete(): boolean {
    return this.completed;
  }

  update(dt: number) {
    this.time += dt;

    switch (this.phase) {
      case "slide_in":
        if (this.time >= this.slideInDuration) {
          this.phase = "tally";
        }
        break;

      case "tally": {
        const tallyRate = this.tallySpeed * (1 + this.time * 2); // accelerate over time

        if (this.displayedTimeBonus < this.timeBonus) {
          this.displayedTimeBonus = Math.min(this.displayedTimeBonus + tallyRate * dt, this.timeBonus);
        }
        if (this.displayedRingBonus < this.ringBonus) {
          this.displayedRingBonus = Math.min(this.displayedRingBonus + tallyRate * dt, this.ringBonus);
        }

        if (this.displayedTimeBonus >= this.timeBonus && this.displayedRingBonus >= this.ringBonus) {
          this.tallyDoneTimer += dt;
          if (this.tallyDoneTimer > 2.0) {
            this.phase = "done";
            this.completed = true;
            this.onComplete();
          }
        }
        break;
      }

      case "done":
        break;
    }
  }

  getTotalBonus(): number {
    return this.totalBonus;
  }

  render(r: Renderer) {
    const ctx = r.ctx;
    const w = r.width;
    const h = r.height;
    const centerX = w / 2;

    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, w, h);

    // Slide-in animation
    let offsetX = 0;
    if (this.phase === "slide_in") {
      const t = Math.min(this.time / this.slideInDuration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease out cubic
      offsetX = (1 - ease) * w;
    }

    const baseY = h * 0.25;

    // Zone name + Act
    ctx.save();
    ctx.shadowColor = "#000066";
    ctx.shadowBlur = 12;
    r.drawScreenText(
      `${this.zoneName} - ACT ${this.act}`,
      centerX + offsetX, baseY,
      "#4488ff", 42, "center", "#000044"
    );
    ctx.restore();

    // ACT CLEAR
    ctx.save();
    ctx.shadowColor = "#888800";
    ctx.shadowBlur = 15;
    r.drawScreenText(
      "ACT CLEAR",
      centerX + offsetX, baseY + 55,
      "#ffcc00", 52, "center", "#664400"
    );
    ctx.restore();

    // Bonus display
    const bonusY = baseY + 140;
    const labelX = centerX - 120 + offsetX;
    const valueX = centerX + 140 + offsetX;
    const fontSize = 28;

    // Time Bonus
    r.drawScreenText("TIME BONUS", labelX, bonusY, "#ffffff", fontSize, "left", "black");
    r.drawScreenText(
      Math.floor(this.displayedTimeBonus).toString(),
      valueX, bonusY, "#ffdd44", fontSize, "right", "black"
    );

    // Ring Bonus
    r.drawScreenText("RING BONUS", labelX, bonusY + 45, "#ffffff", fontSize, "left", "black");
    r.drawScreenText(
      Math.floor(this.displayedRingBonus).toString(),
      valueX, bonusY + 45, "#ffdd44", fontSize, "right", "black"
    );

    // Total (show when tally is done)
    if (this.displayedTimeBonus >= this.timeBonus && this.displayedRingBonus >= this.ringBonus) {
      // Separator line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(labelX, bonusY + 95);
      ctx.lineTo(valueX, bonusY + 95);
      ctx.stroke();

      r.drawScreenText("TOTAL", labelX, bonusY + 105, "#ffffff", fontSize, "left", "black");
      r.drawScreenText(
        this.totalBonus.toString(),
        valueX, bonusY + 105, "#ffcc00", 32, "right", "black"
      );
    }
  }
}
