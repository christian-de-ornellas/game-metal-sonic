import { Renderer } from "../core/Renderer";
import { GameState } from "../core/GameState";

export class HUD {
  private prevRings = 0;
  private prevScore = 0;
  private ringPulse = 0;
  private scorePulse = 0;
  private zoneNameTimer = 0;
  private zoneName = "";

  constructor(private gameState: GameState) {}

  showZoneName(name: string) {
    this.zoneName = name;
    this.zoneNameTimer = 3.0; // show for 3 seconds
  }

  render(r: Renderer, speed: number) {
    const gs = this.gameState;
    const fontSize = Math.max(16, Math.min(22, r.width * 0.018));
    const pad = 20;
    const dt = 1 / 60; // approximate

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

    // Zone name display (fade out)
    if (this.zoneNameTimer > 0) {
      this.zoneNameTimer -= dt;
      const alpha = this.zoneNameTimer > 1.0 ? 1.0 : this.zoneNameTimer;
      const ctx = r.ctx;
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.shadowColor = "#000044";
      ctx.shadowBlur = 8;
      r.drawScreenText(
        this.zoneName,
        r.width / 2, pad + fontSize + 30,
        "#4488ff", 36, "center", "#000044"
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
      r.width - pad, pad,
      ringColor, ringSize, "right", "black",
    );

    // LIVES (below rings)
    r.drawScreenText(
      `LIVES: ${Math.max(gs.lives, 0)}`,
      r.width - pad, pad + fontSize + 8,
      "white", fontSize, "right", "black",
    );

    // Speed indicator (bottom center)
    if (speed > 2) {
      const bars = Math.min(Math.floor(speed / 1.5), 10);
      const speedText = "\u2588".repeat(bars) + ` ${speed.toFixed(1)}`;
      r.drawScreenText(
        speedText,
        r.width / 2, r.height - pad - fontSize,
        "#88ccff", fontSize * 0.8, "center", "black",
      );
    }
  }
}
