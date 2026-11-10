import { Renderer } from "../core/Renderer";
import { GameState } from "../core/GameState";
import { LEVEL_LENGTH } from "../constants";

export class HUD {
  private prevRings = 0;
  private prevScore = 0;
  private ringPulse = 0;
  private scorePulse = 0;
  private zoneNameTimer = 0;
  private zoneName = "";

  // Zone title slide-in animation
  private zoneNameSlideIn = 0; // 0 = offscreen, 1 = in place

  constructor(private gameState: GameState) {}

  showZoneName(name: string) {
    this.zoneName = name;
    this.zoneNameTimer = 3.0;
    this.zoneNameSlideIn = 0;
  }

  render(r: Renderer, speed: number, playerX: number = 0) {
    const gs = this.gameState;
    const w = r.width;
    const isSmall = w < 400;
    const fontSize = isSmall ? 14 : Math.max(16, Math.min(22, w * 0.018));
    const pad = isSmall ? 10 : 20;
    const dt = 1 / 60;

    // Detect changes and trigger pulses
    if (gs.rings !== this.prevRings) {
      this.ringPulse = 1;
      this.prevRings = gs.rings;
    }
    if (gs.score !== this.prevScore) {
      this.scorePulse = 1;
      this.prevScore = gs.score;
    }

    // Decay pulses
    if (this.ringPulse > 0) this.ringPulse = Math.max(0, this.ringPulse - dt * 4);
    if (this.scorePulse > 0) this.scorePulse = Math.max(0, this.scorePulse - dt * 4);

    // Zone name display with slide-in
    if (this.zoneNameTimer > 0) {
      this.zoneNameTimer -= dt;
      this.zoneNameSlideIn = Math.min(1, this.zoneNameSlideIn + dt * 4);

      const alpha = this.zoneNameTimer > 1.0 ? 1.0 : this.zoneNameTimer;
      const easeSlide = 1 - Math.pow(1 - this.zoneNameSlideIn, 3);
      const slideOffset = (1 - easeSlide) * w * 0.5;

      const ctx = r.ctx;
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.shadowColor = "#000044";
      ctx.shadowBlur = 8;
      r.drawScreenText(
        this.zoneName,
        w / 2 + slideOffset, pad + fontSize + 30,
        "#4488ff", isSmall ? 24 : 36, "center", "#000044"
      );
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // SCORE (top-left) with pulse
    const scoreScale = 1 + this.scorePulse * 0.15;
    const scoreSize = fontSize * scoreScale;
    r.drawScreenText(
      `SCORE: ${gs.score}`,
      pad, pad,
      this.scorePulse > 0.5 ? "#ffee88" : "white",
      scoreSize, "left", "black",
    );

    // TIME (below score)
    const mins = Math.floor(gs.time / 60);
    const secs = Math.floor(gs.time % 60);
    r.drawScreenText(
      `TIME: ${mins}:${secs.toString().padStart(2, "0")}`,
      pad, pad + fontSize + 8,
      "white", fontSize, "left", "black",
    );

    // RINGS (top-right) with pulse
    const ringScale = 1 + this.ringPulse * 0.2;
    const ringSize = fontSize * ringScale;
    const ringColor = gs.rings === 0 ? "#ff4444" :
                      this.ringPulse > 0.5 ? "#ffdd44" : "white";
    r.drawScreenText(
      `RINGS: ${gs.rings}`,
      w - pad, pad,
      ringColor, ringSize, "right", "black",
    );

    // LIVES (below rings)
    r.drawScreenText(
      `LIVES: ${Math.max(gs.lives, 0)}`,
      w - pad, pad + fontSize + 8,
      "white", fontSize, "right", "black",
    );

    // Speed indicator (bottom center) — hide on very small screens
    if (speed > 2 && !isSmall) {
      const bars = Math.min(Math.floor(speed / 1.5), 10);
      const speedText = "\u2588".repeat(bars) + ` ${speed.toFixed(1)}`;
      r.drawScreenText(
        speedText,
        w / 2, r.height - pad - fontSize,
        "#88ccff", fontSize * 0.8, "center", "black",
      );
    }

    // Progress bar (bottom of screen)
    this.renderProgressBar(r, playerX, pad);
  }

  private renderProgressBar(r: Renderer, playerX: number, pad: number) {
    const ctx = r.ctx;
    const barW = Math.min(200, r.width * 0.35);
    const barH = 6;
    const barX = r.width / 2 - barW / 2;
    const barY = r.height - pad / 2 - barH;
    const progress = Math.max(0, Math.min(1, playerX / LEVEL_LENGTH));

    // Background
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();

    // Fill
    const fillW = barW * progress;
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, "#4488ff");
      grad.addColorStop(1, "#44ff88");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 3);
      ctx.fill();
    }

    // Player dot
    const dotX = barX + fillW;
    ctx.beginPath();
    ctx.arc(dotX, barY + barH / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
}
