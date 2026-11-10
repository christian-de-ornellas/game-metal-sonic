import { Renderer } from "../core/Renderer";

type CinematicState = "inactive" | "intro" | "phase_transition" | "defeat";

interface ScreenFlash {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

export class BossCinematic {
  state: CinematicState = "inactive";
  private timer = 0;
  private phaseLevel = 1;
  private bossName = "";
  private particles: Particle[] = [];
  private bossWorldX = 0;
  private bossWorldY = 0;

  // Callbacks
  onIntroComplete?: () => void;
  onPhaseTransitionComplete?: () => void;
  onDefeatComplete?: () => void;
  onPlaySound?: (sound: string) => void;

  update(dt: number, bossX: number, bossY: number): void {
    if (this.state === "inactive") return;
    this.timer += dt;
    this.bossWorldX = bossX;
    this.bossWorldY = bossY;

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 8 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    switch (this.state) {
      case "intro":
        this._updateIntro(dt);
        break;
      case "phase_transition":
        this._updatePhaseTransition(dt);
        break;
      case "defeat":
        this._updateDefeat(dt);
        break;
    }
  }

  render(renderer: Renderer): void {
    if (this.state === "inactive") return;
    const ctx = renderer.ctx;
    const w = renderer.width;
    const h = renderer.height;

    switch (this.state) {
      case "intro":
        this._renderIntro(ctx, w, h, renderer);
        break;
      case "phase_transition":
        this._renderPhaseTransition(ctx, w, h, renderer);
        break;
      case "defeat":
        this._renderDefeat(ctx, w, h, renderer);
        break;
    }
  }

  startIntro(bossName: string): void {
    this.state = "intro";
    this.timer = 0;
    this.bossName = bossName;
    this.particles = [];
    this.onPlaySound?.("bossIntro");
  }

  startPhaseTransition(newPhase: number): void {
    this.state = "phase_transition";
    this.timer = 0;
    this.phaseLevel = newPhase;
    this.particles = [];
    this.onPlaySound?.("phaseTransition");
  }

  startDefeat(): void {
    this.state = "defeat";
    this.timer = 0;
    this.particles = [];
  }

  isActive(): boolean {
    return this.state !== "inactive";
  }

  getGameSpeedMultiplier(): number {
    switch (this.state) {
      case "intro":
        return 0;
      case "phase_transition":
        if (this.timer < 0.2) return 0.2;
        if (this.timer > 2.0) return this._lerp(0.2, 1.0, (this.timer - 2.0) / 0.5);
        return 0.2;
      case "defeat":
        if (this.timer < 3.0) return 0.1;
        return 0;
      default:
        return 1;
    }
  }

  getCameraZoomMultiplier(): number {
    switch (this.state) {
      case "intro": {
        if (this.timer < 0.3) return 1;
        if (this.timer < 1.5) return this._lerp(1, 1.4, Math.min(1, (this.timer - 0.3) / 0.5));
        if (this.timer > 2.0) return this._lerp(1.4, 1, Math.min(1, (this.timer - 2.0) / 0.5));
        return 1.4;
      }
      case "phase_transition": {
        if (this.timer < 0.3) return this._lerp(1, 1.15, this.timer / 0.3);
        if (this.timer > 1.5) return this._lerp(1.15, 1, Math.min(1, (this.timer - 1.5) / 0.5));
        return 1.15;
      }
      case "defeat": {
        if (this.timer < 0.3) return this._lerp(1, 1.3, this.timer / 0.3);
        if (this.timer > 3.5) return this._lerp(1.3, 1, Math.min(1, (this.timer - 3.5) / 0.5));
        return 1.3;
      }
      default:
        return 1;
    }
  }

  getScreenFlash(): ScreenFlash | null {
    switch (this.state) {
      case "phase_transition": {
        if (this.timer >= 0.2 && this.timer < 0.5) {
          const t = (this.timer - 0.2) / 0.3;
          return { r: 255, g: 255, b: 255, alpha: 0.6 * (1 - t) };
        }
        return null;
      }
      case "defeat": {
        if (this.timer >= 2.5 && this.timer < 3.0) {
          const t = (this.timer - 2.5) / 0.5;
          return { r: 255, g: 255, b: 255, alpha: 0.8 * (1 - t) };
        }
        return null;
      }
      default:
        return null;
    }
  }

  getShake(): number {
    switch (this.state) {
      case "phase_transition": {
        if (this.timer < 0.5) return 3;
        if (this.timer < 1.5) return 2;
        return 0;
      }
      case "defeat": {
        if (this.timer < 0.5) return 2;
        if (this.timer < 2.5) return 3 + this.timer;
        if (this.timer >= 2.5 && this.timer < 3.0) return 8;
        return 0;
      }
      default:
        return 0;
    }
  }

  // === INTRO ===

  private _updateIntro(_dt: number) {
    if (this.timer >= 3.0) {
      this.state = "inactive";
      this.onIntroComplete?.();
    }
  }

  private _renderIntro(ctx: CanvasRenderingContext2D, w: number, h: number, renderer: Renderer) {
    const scale = Math.min(w / 800, h / 600, 1);

    // Dark overlay (0.0s -> 0.3s: fade in, 2.5s -> 3.0s: fade out)
    let overlayAlpha: number;
    if (this.timer < 0.3) {
      overlayAlpha = (this.timer / 0.3) * 0.7;
    } else if (this.timer > 2.5) {
      overlayAlpha = 0.7 * (1 - (this.timer - 2.5) / 0.5);
    } else {
      overlayAlpha = 0.7;
    }
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, overlayAlpha)})`;
    ctx.fillRect(0, 0, w, h);

    // Boss name text (0.5s -> 2.0s)
    if (this.timer >= 0.5 && this.timer < 2.5) {
      const textAlpha = this.timer < 0.8 ? (this.timer - 0.5) / 0.3
        : this.timer > 2.0 ? 1 - (this.timer - 2.0) / 0.5 : 1;

      ctx.save();
      ctx.globalAlpha = Math.max(0, textAlpha);
      ctx.shadowColor = "#ff4400";
      ctx.shadowBlur = 20 + Math.sin(this.timer * 6) * 5;
      ctx.font = `bold ${56 * scale}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ff6633";
      ctx.fillText(this.bossName, w / 2, h / 2 - 40 * scale);
      ctx.restore();
    }

    // "READY?" text (1.5s -> 2.5s)
    if (this.timer >= 1.5 && this.timer < 2.5) {
      const pulse = Math.sin(this.timer * 8) * 0.15 + 0.85;
      const textAlpha = this.timer > 2.0 ? 1 - (this.timer - 2.0) / 0.5 : 1;

      ctx.save();
      ctx.globalAlpha = Math.max(0, textAlpha) * pulse;
      ctx.font = `bold ${36 * scale}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("READY?", w / 2, h / 2 + 30 * scale);
      ctx.restore();
    }

    // Warning lines
    if (this.timer >= 0.3 && this.timer < 2.5) {
      const lineAlpha = this.timer > 2.0 ? (2.5 - this.timer) / 0.5 : Math.min(1, (this.timer - 0.3) / 0.3);
      ctx.save();
      ctx.globalAlpha = lineAlpha * 0.6;
      ctx.strokeStyle = "#ff3300";
      ctx.lineWidth = 2;
      const stripeH = 30 * scale;
      for (const yOff of [h / 2 - 80 * scale, h / 2 + 60 * scale]) {
        for (let x = -stripeH; x < w + stripeH; x += stripeH * 2) {
          const offset = (this.timer * 100) % (stripeH * 2);
          ctx.beginPath();
          ctx.moveTo(x + offset, yOff);
          ctx.lineTo(x + stripeH + offset, yOff + stripeH);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // === PHASE TRANSITION ===

  private _updatePhaseTransition(_dt: number) {
    // Spawn particles at 1.0s
    if (this.timer >= 1.0 && this.timer < 1.1 && this.particles.length === 0) {
      const color = this.phaseLevel === 3
        ? { r: 255, g: 60, b: 30 }
        : { r: 255, g: 220, b: 50 };
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2;
        const speed = 5 + Math.random() * 8;
        this.particles.push({
          x: this.bossWorldX,
          y: this.bossWorldY + 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.2,
          maxLife: 1.2,
          size: 0.2 + Math.random() * 0.15,
          r: color.r,
          g: color.g,
          b: color.b,
        });
      }
    }

    if (this.timer >= 2.5) {
      this.state = "inactive";
      this.onPhaseTransitionComplete?.();
    }
  }

  private _renderPhaseTransition(ctx: CanvasRenderingContext2D, w: number, h: number, renderer: Renderer) {
    const scale = Math.min(w / 800, h / 600, 1);

    // Boss rage glow (0.5s -> 1.5s)
    if (this.timer >= 0.5 && this.timer < 1.5) {
      const bsx = renderer.worldToScreenX(this.bossWorldX);
      const bsy = renderer.worldToScreenY(this.bossWorldY + 2);
      const glowAlpha = Math.sin((this.timer - 0.5) * Math.PI) * 0.4;
      const glowColor = this.phaseLevel === 3 ? "255, 30, 0" : "255, 180, 0";
      const grad = ctx.createRadialGradient(bsx, bsy, 0, bsx, bsy, 120 * scale);
      grad.addColorStop(0, `rgba(${glowColor}, ${glowAlpha})`);
      grad.addColorStop(1, `rgba(${glowColor}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Particles (world-space)
    for (const p of this.particles) {
      const sx = renderer.worldToScreenX(p.x);
      const sy = renderer.worldToScreenY(p.y);
      const lifeRatio = p.life / p.maxLife;
      const sr = p.size * renderer.zoom * lifeRatio;
      ctx.save();
      ctx.globalAlpha = lifeRatio;
      ctx.shadowColor = `rgb(${p.r}, ${p.g}, ${p.b})`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${p.r}, ${p.g}, ${p.b})`;
      ctx.fill();
      ctx.restore();
    }

    // Phase text (0.8s -> 1.8s)
    if (this.timer >= 0.8 && this.timer < 1.8) {
      const textAlpha = this.timer < 1.0 ? (this.timer - 0.8) / 0.2
        : this.timer > 1.5 ? 1 - (this.timer - 1.5) / 0.3 : 1;

      const phaseText = this.phaseLevel === 3 ? "PHASE 3 - FURY!" : "PHASE 2 - ENHANCED!";
      const textColor = this.phaseLevel === 3 ? "#ff3300" : "#ffcc00";
      const glowColor = this.phaseLevel === 3 ? "#ff0000" : "#ff8800";

      ctx.save();
      ctx.globalAlpha = Math.max(0, textAlpha);
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.font = `bold ${42 * scale}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = textColor;
      ctx.fillText(phaseText, w / 2, h / 2 - 60 * scale);
      ctx.restore();
    }

    // Vignette darkening
    if (this.timer < 0.5) {
      const alpha = Math.min(0.3, this.timer / 0.5 * 0.3);
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // === DEFEAT ===

  private _updateDefeat(_dt: number) {
    // Stop music at 0.0s
    if (this.timer >= 0.01 && this.timer < 0.05) {
      this.onPlaySound?.("stopBossMusic");
    }

    // Chain explosions (0.5s -> 2.5s)
    if (this.timer >= 0.5 && this.timer < 2.5) {
      const explosionRate = 0.15;
      const idx = Math.floor((this.timer - 0.5) / explosionRate);
      const prevIdx = Math.floor((this.timer - 0.5 - 0.016) / explosionRate);
      if (idx > prevIdx) {
        const angle = idx * 2.4 + idx * idx * 0.3;
        const dist = 2 + Math.random() * 4;
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 3 + Math.random() * 5;
          this.particles.push({
            x: this.bossWorldX + Math.cos(angle) * dist,
            y: this.bossWorldY + 2 + Math.sin(angle) * dist,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd + 3,
            life: 0.8,
            maxLife: 0.8,
            size: 0.2 + Math.random() * 0.2,
            r: 255,
            g: Math.floor(100 + Math.random() * 155),
            b: Math.floor(Math.random() * 50),
          });
        }
      }
    }

    // Victory fanfare at 3.5s
    if (this.timer >= 3.5 && this.timer < 3.55) {
      this.onPlaySound?.("bossDefeat");
    }

    if (this.timer >= 5.0) {
      this.state = "inactive";
      this.onDefeatComplete?.();
    }
  }

  private _renderDefeat(ctx: CanvasRenderingContext2D, w: number, h: number, renderer: Renderer) {
    const scale = Math.min(w / 800, h / 600, 1);

    // Slow-mo dark overlay
    if (this.timer < 3.0) {
      const alpha = Math.min(0.3, this.timer * 0.15);
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Particles
    for (const p of this.particles) {
      const sx = renderer.worldToScreenX(p.x);
      const sy = renderer.worldToScreenY(p.y);
      const lifeRatio = p.life / p.maxLife;
      const sr = (p.size + (1 - lifeRatio) * 0.3) * renderer.zoom;
      ctx.save();
      ctx.globalAlpha = lifeRatio;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, `rgb(${p.r}, ${p.g}, ${p.b})`);
      grad.addColorStop(1, `rgba(${p.r}, ${p.g}, 0, 0)`);
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    // Dramatic silence period (3.0s -> 3.5s) - dark overlay
    if (this.timer >= 3.0 && this.timer < 3.5) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, w, h);
    }

    // "BOSS DEFEATED!" text (3.5s -> 4.5s+)
    if (this.timer >= 3.5) {
      const textAlpha = this.timer < 3.8 ? (this.timer - 3.5) / 0.3
        : this.timer > 4.5 ? 1 - (this.timer - 4.5) / 0.5 : 1;

      ctx.save();
      ctx.globalAlpha = Math.max(0, textAlpha);
      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 20 + Math.sin(this.timer * 4) * 5;
      ctx.font = `bold ${52 * scale}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffcc00";
      ctx.fillText("BOSS DEFEATED!", w / 2, h / 2 - 30 * scale);
      ctx.restore();

      // Score popup text
      if (this.timer >= 4.0 && this.timer < 5.0) {
        const scoreAlpha = this.timer < 4.2 ? (this.timer - 4.0) / 0.2
          : this.timer > 4.7 ? 1 - (this.timer - 4.7) / 0.3 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, scoreAlpha);
        ctx.font = `bold ${28 * scale}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("VICTORY!", w / 2, h / 2 + 20 * scale);
        ctx.restore();
      }
    }
  }

  // === UTILITY ===

  private _lerp(a: number, b: number, t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return a + (b - a) * clamped;
  }
}
