import { Renderer } from "../core/Renderer";

type CinematicScene = "victory" | "celebration" | "memories" | "sunset" | "credits" | "the_end";

interface CinematicParticle {
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

const SCENE_DURATIONS: Record<CinematicScene, number> = {
  victory: 5,
  celebration: 6,
  memories: 8,
  sunset: 6,
  credits: 12,
  the_end: Infinity,
};

const SCENES: CinematicScene[] = ["victory", "celebration", "memories", "sunset", "credits", "the_end"];

export class EndingCinematic {
  private scene: CinematicScene = "victory";
  private sceneIndex = 0;
  private sceneTimer = 0;
  private fadeAlpha = 1; // Start faded in from boss defeat
  private fadeDirection: "in" | "out" | "none" = "in";
  private particles: CinematicParticle[] = [];
  private totalTime = 0;
  private memoriesScroll = 0;
  private creditsScroll = 0;
  private finished = false;
  private stars: { x: number; y: number; size: number; twinkle: number }[] = [];

  // Stats for "the end" screen
  readonly score: number;
  readonly totalGameTime: number;
  readonly ringsCollected: number;
  readonly bossesDefeated: number;

  private onComplete: () => void;

  constructor(score: number, totalTime: number, rings: number, bossesDefeated: number, onComplete: () => void) {
    this.score = score;
    this.totalGameTime = totalTime;
    this.ringsCollected = rings;
    this.bossesDefeated = bossesDefeated;
    this.onComplete = onComplete;

    // Pre-generate stars
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 1 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  get isFinished(): boolean {
    return this.finished;
  }

  handleInput() {
    if (this.scene === "the_end" && this.sceneTimer > 1) {
      this.finished = true;
      this.onComplete();
    }
  }

  update(dt: number) {
    this.totalTime += dt;
    this.sceneTimer += dt;

    // Fade transitions
    if (this.fadeDirection === "in") {
      this.fadeAlpha -= dt * 1.5;
      if (this.fadeAlpha <= 0) {
        this.fadeAlpha = 0;
        this.fadeDirection = "none";
      }
    } else if (this.fadeDirection === "out") {
      this.fadeAlpha += dt * 1.5;
      if (this.fadeAlpha >= 1) {
        this.fadeAlpha = 1;
        this.advanceScene();
      }
    }

    // Check scene end
    const duration = SCENE_DURATIONS[this.scene];
    if (duration !== Infinity && this.sceneTimer > duration - 0.7 && this.fadeDirection === "none") {
      this.fadeDirection = "out";
    }

    // Update particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 30 * dt; // gravity for fireworks
      p.life -= dt;
      return p.life > 0;
    });

    // Scene-specific updates
    switch (this.scene) {
      case "victory":
        this.updateVictory(dt);
        break;
      case "celebration":
        this.updateCelebration(dt);
        break;
      case "memories":
        this.memoriesScroll += dt * 40;
        break;
      case "credits":
        this.creditsScroll += dt * 50;
        break;
    }
  }

  private updateVictory(dt: number) {
    // Golden particles
    if (Math.random() < dt * 10) {
      this.particles.push({
        x: Math.random() * 100 - 50,
        y: Math.random() * 20,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 5 + 2,
        life: 2 + Math.random(),
        maxLife: 3,
        size: 2 + Math.random() * 3,
        r: 255, g: 200 + Math.random() * 55, b: 50,
      });
    }
  }

  private updateCelebration(dt: number) {
    // Fireworks
    if (Math.random() < dt * 3) {
      const cx = Math.random() * 80 - 40;
      const cy = 10 + Math.random() * 15;
      const colors = [
        { r: 255, g: 50, b: 50 },
        { r: 50, g: 255, b: 50 },
        { r: 50, g: 50, b: 255 },
        { r: 255, g: 255, b: 50 },
        { r: 255, g: 50, b: 255 },
        { r: 50, g: 255, b: 255 },
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const speed = 4 + Math.random() * 6;
        this.particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1 + Math.random() * 0.5,
          maxLife: 1.5,
          size: 2 + Math.random() * 2,
          ...color,
        });
      }
    }
  }

  private advanceScene() {
    this.sceneIndex++;
    if (this.sceneIndex >= SCENES.length) {
      this.sceneIndex = SCENES.length - 1;
    }
    this.scene = SCENES[this.sceneIndex];
    this.sceneTimer = 0;
    this.fadeDirection = "in";
    this.fadeAlpha = 1;
  }

  render(renderer: Renderer) {
    const ctx = renderer.ctx;
    const w = renderer.width;
    const h = renderer.height;

    switch (this.scene) {
      case "victory":
        this.renderVictory(ctx, w, h, renderer);
        break;
      case "celebration":
        this.renderCelebration(ctx, w, h, renderer);
        break;
      case "memories":
        this.renderMemories(ctx, w, h, renderer);
        break;
      case "sunset":
        this.renderSunset(ctx, w, h, renderer);
        break;
      case "credits":
        this.renderCredits(ctx, w, h, renderer);
        break;
      case "the_end":
        this.renderTheEnd(ctx, w, h, renderer);
        break;
    }

    // Fade overlay
    if (this.fadeAlpha > 0.01) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private renderVictory(ctx: CanvasRenderingContext2D, w: number, h: number, _r: Renderer) {
    // Dark background with golden particles
    ctx.fillStyle = "#0a0a15";
    ctx.fillRect(0, 0, w, h);

    // Particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.r},${Math.floor(p.g)},${p.b})`;
      const px = w / 2 + p.x * 5;
      const py = h / 2 - p.y * 5;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Text
    const textAlpha = Math.min(1, this.sceneTimer / 1.5);
    ctx.globalAlpha = textAlpha;
    ctx.save();
    ctx.shadowColor = "#ffaa00";
    ctx.shadowBlur = 20;
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffcc00";
    ctx.fillText("THE EVIL HAS BEEN DEFEATED!", w / 2, h / 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private renderCelebration(ctx: CanvasRenderingContext2D, w: number, h: number, _r: Renderer) {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, "#1a1a44");
    skyGrad.addColorStop(0.5, "#2a2a66");
    skyGrad.addColorStop(1, "#44cc44");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = "#22aa22";
    ctx.fillRect(0, h * 0.75, w, h * 0.25);

    // Firework particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      const px = w / 2 + p.x * 6;
      const py = h * 0.5 - p.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Player silhouette (left)
    this.drawPlayerSilhouette(ctx, w * 0.4, h * 0.72, 1.2, "#2288ff");

    // Mario silhouette (right)
    this.drawMarioSilhouette(ctx, w * 0.6, h * 0.72, 1.2);

    // Text
    const textAlpha = Math.min(1, Math.max(0, this.sceneTimer - 1) / 1);
    ctx.globalAlpha = textAlpha;
    ctx.save();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 15;
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("HEROES UNITED!", w / 2, h * 0.35);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private renderMemories(ctx: CanvasRenderingContext2D, w: number, h: number, _r: Renderer) {
    ctx.fillStyle = "#0a0a15";
    ctx.fillRect(0, 0, w, h);

    // Parallax zone silhouettes
    const zones = [
      { name: "EMERALD HILL", color: "#22aa44", x: 0 },
      { name: "CHEMICAL PLANT", color: "#8844cc", x: w },
      { name: "CASINO NIGHT", color: "#cc44aa", x: w * 2 },
    ];

    const scrollOffset = this.memoriesScroll;

    for (const zone of zones) {
      const zoneX = zone.x - scrollOffset * 3 + w * 0.3;
      if (zoneX > w + 200 || zoneX < -w) continue;

      // Zone background band
      ctx.save();
      ctx.globalAlpha = 0.3;
      const bandGrad = ctx.createLinearGradient(zoneX, h * 0.3, zoneX + w * 0.6, h * 0.7);
      bandGrad.addColorStop(0, "transparent");
      bandGrad.addColorStop(0.3, zone.color);
      bandGrad.addColorStop(0.7, zone.color);
      bandGrad.addColorStop(1, "transparent");
      ctx.fillStyle = bandGrad;
      ctx.fillRect(zoneX, h * 0.3, w * 0.6, h * 0.4);
      ctx.restore();

      // Zone name
      const nameAlpha = Math.max(0, 1 - Math.abs(zoneX + w * 0.3 - w / 2) / (w * 0.3));
      if (nameAlpha > 0) {
        ctx.globalAlpha = nameAlpha;
        ctx.save();
        ctx.shadowColor = zone.color;
        ctx.shadowBlur = 15;
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = zone.color;
        ctx.fillText(zone.name, zoneX + w * 0.3, h / 2);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    // Silhouette hills
    ctx.fillStyle = "#111122";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.8);
    for (let x = 0; x <= w; x += 20) {
      const hillY = h * 0.7 + Math.sin(x * 0.01 + scrollOffset * 0.02) * 30;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  private renderSunset(ctx: CanvasRenderingContext2D, w: number, h: number, _r: Renderer) {
    // Sunset gradient
    const sunsetGrad = ctx.createLinearGradient(0, 0, 0, h);
    sunsetGrad.addColorStop(0, "#1a1a44");
    sunsetGrad.addColorStop(0.2, "#442266");
    sunsetGrad.addColorStop(0.45, "#cc4422");
    sunsetGrad.addColorStop(0.55, "#ff8844");
    sunsetGrad.addColorStop(0.65, "#ffaa66");
    sunsetGrad.addColorStop(0.7, "#22aa44");
    sunsetGrad.addColorStop(1, "#115522");
    ctx.fillStyle = sunsetGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars appearing
    const starProgress = Math.min(1, this.sceneTimer / 4);
    for (const star of this.stars) {
      if (star.y > 0.3) continue;
      const alpha = starProgress * (Math.sin(this.totalTime * 2 + star.twinkle) * 0.3 + 0.7);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h * 0.4, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Sun on horizon
    const sunY = h * 0.55;
    const sunGrad = ctx.createRadialGradient(w * 0.5, sunY, 0, w * 0.5, sunY, 80);
    sunGrad.addColorStop(0, "rgba(255, 200, 100, 0.8)");
    sunGrad.addColorStop(0.5, "rgba(255, 150, 50, 0.3)");
    sunGrad.addColorStop(1, "rgba(255, 100, 20, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, sunY, 80, 0, Math.PI * 2);
    ctx.fill();

    // Player silhouette running
    const runX = (this.sceneTimer / 6) * w * 1.2 - w * 0.1;
    this.drawRunnerSilhouette(ctx, runX, h * 0.67, this.sceneTimer);

    // Text
    const textAlpha = Math.min(1, Math.max(0, this.sceneTimer - 2) / 1.5);
    ctx.globalAlpha = textAlpha;
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffcc88";
    ctx.fillText("AND THE ADVENTURE CONTINUES...", w / 2, h * 0.25);
    ctx.globalAlpha = 1;
  }

  private renderCredits(ctx: CanvasRenderingContext2D, w: number, h: number, _r: Renderer) {
    // Starfield background
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const alpha = Math.sin(this.totalTime * 1.5 + star.twinkle) * 0.3 + 0.7;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Credits scroll
    const credits = [
      { text: "O MUNDO DE PEDRO", size: 48, color: "#ffcc00", gap: 80 },
      { text: "", size: 1, color: "", gap: 30 },
      { text: "Created by", size: 20, color: "#8888aa", gap: 35 },
      { text: "Christian Possidonio", size: 32, color: "#ffffff", gap: 50 },
      { text: "&", size: 20, color: "#8888aa", gap: 35 },
      { text: "Pedro Lucas Possidonio", size: 32, color: "#ffffff", gap: 70 },
      { text: "Game Design & Programming", size: 20, color: "#8888aa", gap: 35 },
      { text: "Christian Possidonio", size: 28, color: "#ffffff", gap: 60 },
      { text: "Character Design", size: 20, color: "#8888aa", gap: 35 },
      { text: "Pedro Lucas Possidonio", size: 28, color: "#ffffff", gap: 60 },
      { text: "Built with", size: 20, color: "#8888aa", gap: 35 },
      { text: "Canvas 2D & TypeScript", size: 28, color: "#44aaff", gap: 60 },
      { text: "Special Thanks", size: 20, color: "#8888aa", gap: 35 },
      { text: "You, the player!", size: 28, color: "#ffaa44", gap: 60 },
      { text: "possidonio.com", size: 24, color: "#44ff88", gap: 40 },
    ];

    let yOffset = h + 50 - this.creditsScroll;
    ctx.textAlign = "center";
    for (const line of credits) {
      if (line.text === "") {
        yOffset += line.gap;
        continue;
      }
      if (yOffset > -60 && yOffset < h + 60) {
        ctx.font = `bold ${line.size}px monospace`;
        ctx.fillStyle = line.color;
        if (line.size >= 40) {
          ctx.save();
          ctx.shadowColor = "#ffaa00";
          ctx.shadowBlur = 15;
          ctx.fillText(line.text, w / 2, yOffset);
          ctx.restore();
        } else {
          ctx.fillText(line.text, w / 2, yOffset);
        }
      }
      yOffset += line.gap;
    }
  }

  private renderTheEnd(ctx: CanvasRenderingContext2D, w: number, h: number, r: Renderer) {
    // Starfield
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const alpha = Math.sin(this.totalTime * 1.5 + star.twinkle) * 0.3 + 0.7;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // "THE END" with golden glow
    const pulse = Math.sin(this.totalTime * 2) * 0.15 + 0.85;
    ctx.save();
    ctx.shadowColor = "#ffaa00";
    ctx.shadowBlur = 30 * pulse;
    ctx.font = "bold 72px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffcc00";
    ctx.fillText("THE END", w / 2, h * 0.3);
    ctx.restore();

    // Score
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`FINAL SCORE: ${this.score}`, w / 2, h * 0.45);

    // Stats
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#aaaacc";
    const minutes = Math.floor(this.totalGameTime / 60);
    const seconds = Math.floor(this.totalGameTime % 60);
    ctx.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, "0")}`, w / 2, h * 0.55);
    ctx.fillText(`Rings: ${this.ringsCollected}`, w / 2, h * 0.60);
    ctx.fillText(`Bosses Defeated: ${this.bossesDefeated}`, w / 2, h * 0.65);

    // Press any key
    const blinkAlpha = Math.sin(this.totalTime * 3) * 0.3 + 0.7;
    ctx.globalAlpha = blinkAlpha;
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#88aacc";
    ctx.fillText("PRESS ANY KEY TO RETURN TO TITLE", w / 2, h * 0.82);
    ctx.globalAlpha = 1;
  }

  private drawPlayerSilhouette(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
    ctx.save();
    ctx.fillStyle = color;
    // Simple character silhouette
    ctx.beginPath();
    ctx.arc(x, y - 30 * scale, 10 * scale, 0, Math.PI * 2); // head
    ctx.fill();
    ctx.fillRect(x - 8 * scale, y - 20 * scale, 16 * scale, 20 * scale); // body
    // Spines on head
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 5 * scale + i * 5 * scale, y - 35 * scale);
      ctx.lineTo(x - 10 * scale - i * 5 * scale, y - 45 * scale - i * 3 * scale);
      ctx.lineTo(x - 2 * scale + i * 5 * scale, y - 38 * scale);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMarioSilhouette(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
    ctx.save();
    ctx.fillStyle = "#cc2222";
    // Mario victory pose
    ctx.beginPath();
    ctx.arc(x, y - 28 * scale, 9 * scale, 0, Math.PI * 2); // head
    ctx.fill();
    ctx.fillRect(x - 7 * scale, y - 19 * scale, 14 * scale, 19 * scale); // body

    // Cap
    ctx.fillRect(x - 10 * scale, y - 35 * scale, 20 * scale, 6 * scale);

    // Raised arm (victory pose)
    ctx.fillRect(x + 7 * scale, y - 35 * scale, 5 * scale, 18 * scale);
    // Hand
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + 9.5 * scale, y - 37 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawRunnerSilhouette(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
    ctx.save();
    ctx.fillStyle = "#111118";

    // Running animation
    const legSwing = Math.sin(time * 12) * 15;

    // Body
    ctx.beginPath();
    ctx.arc(x, y - 25, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 7, y - 15, 14, 15);

    // Spines
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 3 + i * 4, y - 30);
      ctx.lineTo(x - 15 - i * 6, y - 35 - i * 3);
      ctx.lineTo(x - 1 + i * 4, y - 33);
      ctx.fill();
    }

    // Legs
    ctx.save();
    ctx.translate(x - 3, y);
    ctx.rotate(legSwing * Math.PI / 180);
    ctx.fillRect(-2, 0, 4, 12);
    ctx.restore();

    ctx.save();
    ctx.translate(x + 3, y);
    ctx.rotate(-legSwing * Math.PI / 180);
    ctx.fillRect(-2, 0, 4, 12);
    ctx.restore();

    ctx.restore();
  }
}
