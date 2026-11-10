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

export interface BackgroundTheme {
  skyGradient: { stop: number; color: string }[];
  skyFallbackColor: string;
  mountainLayers: { parallax: number; yParallax: number; color: string; scale: number }[];
  bushColor: string;
  cloudEnabled: boolean;
  starsEnabled?: boolean;
  neonEnabled?: boolean;
}

export class ParallaxBackground {
  private clouds: Cloud[] = [];
  private stars: Star[] = [];
  private time = 0;
  private theme: BackgroundTheme;

  constructor(theme?: BackgroundTheme) {
    this.theme = theme ?? ParallaxBackground.emeraldHillTheme();

    if (this.theme.cloudEnabled) {
      for (let i = 0; i < 12; i++) {
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
      for (let i = 0; i < 30; i++) {
        this.stars.push({
          x: Math.random() * 800,
          y: Math.random() * 50 + 5,
          size: 0.5 + Math.random() * 1.5,
          twinkleSpeed: 1 + Math.random() * 3,
          twinkleOffset: Math.random() * Math.PI * 2,
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
      skyFallbackColor: "#66bbee",
      mountainLayers: [
        { parallax: 0.1, yParallax: 0.05, color: "#5577aa", scale: 0.4 },
        { parallax: 0.2, yParallax: 0.08, color: "#558855", scale: 0.5 },
        { parallax: 0.3, yParallax: 0.1, color: "#447744", scale: 0.6 },
      ],
      bushColor: "#228833",
      cloudEnabled: true,
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
      skyFallbackColor: "#2a2a55",
      mountainLayers: [
        { parallax: 0.1, yParallax: 0.05, color: "#333355", scale: 0.4 },
        { parallax: 0.2, yParallax: 0.08, color: "#3a3a5a", scale: 0.5 },
        { parallax: 0.3, yParallax: 0.1, color: "#444466", scale: 0.6 },
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
      skyFallbackColor: "#110033",
      mountainLayers: [
        { parallax: 0.1, yParallax: 0.05, color: "#111133", scale: 0.4 },
        { parallax: 0.25, yParallax: 0.1, color: "#1a1a44", scale: 0.55 },
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
  }

  render(r: Renderer) {
    const ctx = r.ctx;
    const cameraX = r.cameraX;
    const cameraY = r.cameraY;

    // Sky - flat color (no gradient)
    ctx.fillStyle = this.theme.skyFallbackColor;
    ctx.fillRect(0, 0, r.width, r.height);

    // Stars (for night themes)
    if (this.theme.starsEnabled) {
      this.drawStars(r, cameraX * 0.02);
    }

    // Mountain layers
    for (const layer of this.theme.mountainLayers) {
      this.drawMountains(r, cameraX * layer.parallax, cameraY * layer.yParallax, layer.color, layer.scale);
    }

    // Neon city glow (Casino Night)
    if (this.theme.neonEnabled) {
      this.drawNeonGlow(r, cameraX * 0.15);
    }

    // Clouds
    if (this.theme.cloudEnabled) {
      this.drawClouds(r, cameraX * 0.15);
    }

    // Bushes/vegetation
    this.drawBushes(r, cameraX * 0.5, cameraY * 0.2);
  }

  private drawStars(r: Renderer, offsetX: number) {
    const ctx = r.ctx;
    ctx.fillStyle = "#ffffff";
    for (const star of this.stars) {
      const sx = (star.x - offsetX) * r.zoom * 0.3;
      if (sx < -10 || sx > r.width + 10) continue;
      const sy = r.height * 0.05 + (50 - star.y) * r.zoom * 0.2;

      const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset));
      ctx.globalAlpha = twinkle;
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

      ctx.globalAlpha = pulse * 0.15;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(sx, baseY - 40 - i * 5, 30 + Math.sin(this.time + i) * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawMountains(r: Renderer, offsetX: number, offsetY: number, color: string, scale: number) {
    const ctx = r.ctx;
    const baseY = r.height * 0.55 - offsetY * r.zoom * 0.3;
    const mountainWidth = 120 * scale;

    ctx.beginPath();
    ctx.moveTo(0, r.height);

    for (let sx = -mountainWidth; sx <= r.width + mountainWidth; sx += 6) {
      const worldX = sx / (r.zoom * scale) + offsetX;
      const h1 = Math.sin(worldX * 0.015) * 80 * scale;
      const h2 = Math.sin(worldX * 0.008 + 1.5) * 120 * scale;
      const h3 = Math.sin(worldX * 0.025 + 3.0) * 40 * scale;
      const mountainH = Math.max(h1, h2 * 0.7) + h3 * 0.5 + 50 * scale;
      ctx.lineTo(sx, baseY - mountainH);
    }

    ctx.lineTo(r.width + mountainWidth, r.height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  private drawClouds(r: Renderer, offsetX: number) {
    const ctx = r.ctx;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#ffffff";

    for (const cloud of this.clouds) {
      const sx = (cloud.x - offsetX) * r.zoom * 0.5;
      if (sx < -200 || sx > r.width + 200) continue;
      const sy = r.height * 0.15 + (45 - cloud.y) * r.zoom * 0.3;

      const cw = cloud.width * r.zoom * 0.8;
      const ch = cloud.height * r.zoom * 0.8;

      ctx.beginPath();
      ctx.ellipse(sx, sy, cw * 0.5, ch * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + cw * 0.2, sy + ch * 0.05, cw * 0.4, ch * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private drawBushes(r: Renderer, offsetX: number, offsetY: number) {
    const ctx = r.ctx;
    const baseY = r.height * 0.7 - offsetY * r.zoom * 0.2;

    ctx.fillStyle = this.theme.bushColor;

    for (let sx = -20; sx <= r.width + 20; sx += 16) {
      const worldX = sx / (r.zoom * 0.5) + offsetX;
      const bushH = (15 + Math.sin(worldX * 0.3) * 8 + Math.sin(worldX * 0.7) * 5);

      ctx.beginPath();
      ctx.ellipse(sx, baseY, 12, bushH, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillRect(0, baseY, r.width, r.height - baseY);
  }
}
