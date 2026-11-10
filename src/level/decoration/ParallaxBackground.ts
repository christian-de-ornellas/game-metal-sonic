import { Renderer } from "../../core/Renderer";

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface BackgroundTheme {
  skyGradient: { stop: number; color: string }[];
  mountainLayers: { parallax: number; yParallax: number; color1: string; color2: string; scale: number }[];
  bushColor: string;
  cloudEnabled: boolean;
}

export class ParallaxBackground {
  private clouds: Cloud[] = [];
  private time = 0;
  private theme: BackgroundTheme;

  constructor(theme?: BackgroundTheme) {
    this.theme = theme ?? ParallaxBackground.emeraldHillTheme();

    if (this.theme.cloudEnabled) {
      for (let i = 0; i < 20; i++) {
        this.clouds.push({
          x: Math.random() * 600 - 100,
          y: 20 + Math.random() * 25,
          width: 3 + Math.random() * 6,
          height: 1.5 + Math.random() * 2,
          speed: 0.3 + Math.random() * 0.5,
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
        { parallax: 0.1, yParallax: 0.05, color1: "#5577aa", color2: "#446688", scale: 0.4 },
        { parallax: 0.3, yParallax: 0.1, color1: "#447744", color2: "#336633", scale: 0.6 },
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
      mountainLayers: [
        { parallax: 0.1, yParallax: 0.05, color1: "#333355", color2: "#222244", scale: 0.4 },
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
        { parallax: 0.1, yParallax: 0.05, color1: "#111133", color2: "#0a0a22", scale: 0.4 },
        { parallax: 0.25, yParallax: 0.1, color1: "#1a1a44", color2: "#111133", scale: 0.55 },
      ],
      bushColor: "#111133",
      cloudEnabled: false,
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

    // Layer 0: Sky gradient (static, fills screen)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, r.height);
    for (const s of this.theme.skyGradient) {
      skyGrad.addColorStop(s.stop, s.color);
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, r.width, r.height);

    // Mountain layers
    for (const layer of this.theme.mountainLayers) {
      this.drawMountains(r, cameraX * layer.parallax, cameraY * layer.yParallax, layer.color1, layer.color2, layer.scale);
    }

    // Clouds
    if (this.theme.cloudEnabled) {
      this.drawClouds(r, cameraX * 0.15);
    }

    // Bushes/vegetation
    this.drawBushes(r, cameraX * 0.5, cameraY * 0.2);
  }

  private drawMountains(r: Renderer, offsetX: number, offsetY: number, color1: string, color2: string, scale: number) {
    const ctx = r.ctx;
    const baseY = r.height * 0.55 - offsetY * r.zoom * 0.3;
    const mountainWidth = 120 * scale;

    ctx.beginPath();
    ctx.moveTo(0, r.height);

    // Generate mountain silhouette
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

      // Cloud puffs (overlapping ellipses)
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

    // Ground fill below bushes
    ctx.fillStyle = this.theme.bushColor;
    ctx.fillRect(0, baseY, r.width, r.height - baseY);
  }
}
