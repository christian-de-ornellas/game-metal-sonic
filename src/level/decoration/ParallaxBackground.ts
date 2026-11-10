import { Renderer } from "../../core/Renderer";

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface Bird {
  x: number;
  y: number;
  speed: number;
  flapPhase: number;
  flapSpeed: number;
}

export interface BackgroundTheme {
  skyGradient: { stop: number; color: string }[];
  mountainLayers: { parallax: number; yParallax: number; color1: string; color2: string; scale: number }[];
  bushColor: string;
  cloudEnabled: boolean;
  starsEnabled?: boolean;
  birdsEnabled?: boolean;
  neonEnabled?: boolean;
}

export class ParallaxBackground {
  private clouds: Cloud[] = [];
  private stars: Star[] = [];
  private birds: Bird[] = [];
  private time = 0;
  private theme: BackgroundTheme;

  constructor(theme?: BackgroundTheme) {
    this.theme = theme ?? ParallaxBackground.emeraldHillTheme();

    if (this.theme.cloudEnabled) {
      for (let i = 0; i < 25; i++) {
        this.clouds.push({
          x: Math.random() * 600 - 100,
          y: 20 + Math.random() * 25,
          width: 3 + Math.random() * 6,
          height: 1.5 + Math.random() * 2,
          speed: 0.3 + Math.random() * 0.5,
        });
      }
    }

    if (this.theme.starsEnabled) {
      for (let i = 0; i < 80; i++) {
        this.stars.push({
          x: Math.random() * 800,
          y: Math.random() * 50 + 5,
          size: 0.5 + Math.random() * 1.5,
          twinkleSpeed: 1 + Math.random() * 3,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    if (this.theme.birdsEnabled) {
      for (let i = 0; i < 5; i++) {
        this.birds.push({
          x: Math.random() * 500,
          y: 25 + Math.random() * 15,
          speed: 1 + Math.random() * 2,
          flapPhase: Math.random() * Math.PI * 2,
          flapSpeed: 5 + Math.random() * 3,
        });
      }
    }
  }

  static emeraldHillTheme(): BackgroundTheme {
    return {
      skyGradient: [
        { stop: 0, color: "#3388cc" },
        { stop: 0.4, color: "#66bbee" },
        { stop: 0.7, color: "#88ddff" },
        { stop: 1, color: "#aaeeff" },
      ],
      mountainLayers: [
        { parallax: 0.05, yParallax: 0.03, color1: "#6688bb", color2: "#557799", scale: 0.3 },
        { parallax: 0.1, yParallax: 0.05, color1: "#5577aa", color2: "#446688", scale: 0.4 },
        { parallax: 0.2, yParallax: 0.08, color1: "#558855", color2: "#447744", scale: 0.5 },
        { parallax: 0.3, yParallax: 0.1, color1: "#447744", color2: "#336633", scale: 0.6 },
      ],
      bushColor: "#228833",
      cloudEnabled: true,
      birdsEnabled: true,
    };
  }

  static chemicalPlantTheme(): BackgroundTheme {
    return {
      skyGradient: [
        { stop: 0, color: "#1a1a33" },
        { stop: 0.4, color: "#2a2a55" },
        { stop: 0.7, color: "#3a3066" },
        { stop: 1, color: "#4a3a77" },
      ],
      mountainLayers: [
        { parallax: 0.05, yParallax: 0.03, color1: "#222244", color2: "#1a1a33", scale: 0.3 },
        { parallax: 0.1, yParallax: 0.05, color1: "#333355", color2: "#222244", scale: 0.4 },
        { parallax: 0.2, yParallax: 0.08, color1: "#3a3a5a", color2: "#2a2a4a", scale: 0.5 },
        { parallax: 0.3, yParallax: 0.1, color1: "#444466", color2: "#333355", scale: 0.6 },
      ],
      bushColor: "#333355",
      cloudEnabled: false,
    };
  }

  static casinoNightTheme(): BackgroundTheme {
    return {
      skyGradient: [
        { stop: 0, color: "#000022" },
        { stop: 0.3, color: "#110033" },
        { stop: 0.6, color: "#1a0044" },
        { stop: 1, color: "#220055" },
      ],
      mountainLayers: [
        { parallax: 0.05, yParallax: 0.03, color1: "#0a0a22", color2: "#050511", scale: 0.3 },
        { parallax: 0.1, yParallax: 0.05, color1: "#111133", color2: "#0a0a22", scale: 0.4 },
        { parallax: 0.25, yParallax: 0.1, color1: "#1a1a44", color2: "#111133", scale: 0.55 },
      ],
      bushColor: "#111133",
      cloudEnabled: false,
      starsEnabled: true,
      neonEnabled: true,
    };
  }

  update(dt: number) {
    this.time += dt;
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > 500) cloud.x = -50;
    }
    for (const bird of this.birds) {
      bird.x += bird.speed * dt;
      bird.flapPhase += bird.flapSpeed * dt;
      if (bird.x > 500) bird.x = -20;
    }
  }

  render(r: Renderer) {
    const ctx = r.ctx;
    const cameraX = r.cameraX;
    const cameraY = r.cameraY;

    // Layer 0: Sky gradient (static, fills screen)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, r.height);
    for (const s of this.theme.skyGradient) {
      skyGrad.addColorStop(s.stop, s.color);
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, r.width, r.height);

    // Stars (for night themes)
    if (this.theme.starsEnabled) {
      this.drawStars(r, cameraX * 0.02);
    }

    // Mountain layers
    for (const layer of this.theme.mountainLayers) {
      this.drawMountains(r, cameraX * layer.parallax, cameraY * layer.yParallax, layer.color1, layer.color2, layer.scale);
    }

    // Neon city glow (Casino Night)
    if (this.theme.neonEnabled) {
      this.drawNeonGlow(r, cameraX * 0.15);
    }

    // Clouds
    if (this.theme.cloudEnabled) {
      this.drawClouds(r, cameraX * 0.15);
    }

    // Birds
    if (this.theme.birdsEnabled) {
      this.drawBirds(r, cameraX * 0.2);
    }

    // Bushes/vegetation
    this.drawBushes(r, cameraX * 0.5, cameraY * 0.2);
  }

  private drawStars(r: Renderer, offsetX: number) {
    const ctx = r.ctx;
    for (const star of this.stars) {
      const sx = (star.x - offsetX) * r.zoom * 0.3;
      const sy = r.height * 0.05 + (50 - star.y) * r.zoom * 0.2;
      if (sx < -10 || sx > r.width + 10) continue;

      const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawNeonGlow(r: Renderer, offsetX: number) {
    const ctx = r.ctx;
    const baseY = r.height * 0.5;
    const colors = ["#ff00ff", "#00ffff", "#ffff00", "#ff4444", "#44ff44"];

    for (let i = 0; i < 12; i++) {
      const worldX = i * 80 + 20;
      const sx = (worldX - offsetX) * r.zoom * 0.3;
      if (sx < -60 || sx > r.width + 60) continue;

      const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.time * (2 + i * 0.3) + i));
      const color = colors[i % colors.length];

      ctx.save();
      ctx.globalAlpha = pulse * 0.15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, baseY - 40 - i * 5, 30 + Math.sin(this.time + i) * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBirds(r: Renderer, offsetX: number) {
    const ctx = r.ctx;
    for (const bird of this.birds) {
      const sx = (bird.x - offsetX) * r.zoom * 0.4;
      const sy = r.height * 0.15 + (40 - bird.y) * r.zoom * 0.3;
      if (sx < -20 || sx > r.width + 20) continue;

      const wingAngle = Math.sin(bird.flapPhase) * 0.5;
      const size = 4 * r.zoom * 0.1;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      // Left wing
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-size, -size * wingAngle * 2, -size * 2, -size * wingAngle);
      ctx.stroke();

      // Right wing
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size, -size * wingAngle * 2, size * 2, -size * wingAngle);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawMountains(r: Renderer, offsetX: number, offsetY: number, color1: string, color2: string, scale: number) {
    const ctx = r.ctx;
    const baseY = r.height * 0.55 - offsetY * r.zoom * 0.3;
    const mountainWidth = 120 * scale;

    ctx.beginPath();
    ctx.moveTo(0, r.height);

    for (let sx = -mountainWidth; sx <= r.width + mountainWidth; sx += 2) {
      const worldX = sx / (r.zoom * scale) + offsetX;
      const h1 = Math.sin(worldX * 0.015) * 80 * scale;
      const h2 = Math.sin(worldX * 0.008 + 1.5) * 120 * scale;
      const h3 = Math.sin(worldX * 0.025 + 3.0) * 40 * scale;
      const mountainH = Math.max(h1, h2 * 0.7) + h3 * 0.5 + 50 * scale;
      ctx.lineTo(sx, baseY - mountainH);
    }

    ctx.lineTo(r.width + mountainWidth, r.height);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baseY - 200 * scale, 0, baseY + 50);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  private drawClouds(r: Renderer, offsetX: number) {
    const ctx = r.ctx;

    for (const cloud of this.clouds) {
      const sx = (cloud.x - offsetX) * r.zoom * 0.5;
      const sy = r.height * 0.15 + (45 - cloud.y) * r.zoom * 0.3;

      if (sx < -200 || sx > r.width + 200) continue;

      const cw = cloud.width * r.zoom * 0.8;
      const ch = cloud.height * r.zoom * 0.8;

      ctx.save();
      ctx.globalAlpha = 0.7;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(sx, sy, cw * 0.5, ch * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx - cw * 0.3, sy + ch * 0.1, cw * 0.35, ch * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + cw * 0.3, sy + ch * 0.05, cw * 0.4, ch * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Extra puff for richer clouds
      ctx.beginPath();
      ctx.ellipse(sx + cw * 0.1, sy - ch * 0.2, cw * 0.3, ch * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawBushes(r: Renderer, offsetX: number, offsetY: number) {
    const ctx = r.ctx;
    const baseY = r.height * 0.7 - offsetY * r.zoom * 0.2;

    ctx.fillStyle = this.theme.bushColor;

    for (let sx = -20; sx <= r.width + 20; sx += 8) {
      const worldX = sx / (r.zoom * 0.5) + offsetX;
      const bushH = (15 + Math.sin(worldX * 0.3) * 8 + Math.sin(worldX * 0.7) * 5);

      ctx.beginPath();
      ctx.ellipse(sx, baseY, 12, bushH, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = this.theme.bushColor;
    ctx.fillRect(0, baseY, r.width, r.height - baseY);
  }
}
