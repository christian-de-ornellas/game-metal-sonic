import { Renderer } from "../../core/Renderer";

export interface TerrainTheme {
  surfaceGradient: { stop: number; color: string }[];
  checkerColor: string;
  grassColor: string;
  grassEnabled: boolean;
}

export const EMERALD_HILL_THEME: TerrainTheme = {
  surfaceGradient: [
    { stop: 0, color: "#2aaa18" },
    { stop: 0.3, color: "#1e7a10" },
    { stop: 0.6, color: "#8B6914" },
    { stop: 1, color: "#5a3a08" },
  ],
  checkerColor: "#000000",
  grassColor: "#33cc22",
  grassEnabled: true,
};

export const CHEMICAL_PLANT_THEME: TerrainTheme = {
  surfaceGradient: [
    { stop: 0, color: "#6666aa" },
    { stop: 0.3, color: "#555588" },
    { stop: 0.6, color: "#444466" },
    { stop: 1, color: "#333344" },
  ],
  checkerColor: "#222233",
  grassColor: "#6666aa",
  grassEnabled: false,
};

export const CASINO_NIGHT_THEME: TerrainTheme = {
  surfaceGradient: [
    { stop: 0, color: "#cc3344" },
    { stop: 0.3, color: "#aa2233" },
    { stop: 0.6, color: "#882222" },
    { stop: 1, color: "#551111" },
  ],
  checkerColor: "#ffcc00",
  grassColor: "#cc3344",
  grassEnabled: false,
};

export type HeightFn = (x: number) => number;

export class TerrainBuilder {
  private heightFn: HeightFn;
  private theme: TerrainTheme;

  constructor(heightFn?: HeightFn, theme?: TerrainTheme) {
    this.heightFn = heightFn ?? emeraldHillHeight;
    this.theme = theme ?? EMERALD_HILL_THEME;
  }

  /** Get the terrain height at world X coordinate */
  getHeight(x: number): number {
    return this.heightFn(x);
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();
    const step = 1 / r.zoom; // ~1 screen pixel per sample
    const startX = Math.floor(bounds.left - 2);
    const endX = Math.ceil(bounds.right + 2);

    const ctx = r.ctx;

    // Draw the ground fill: from terrain surface down to bottom
    ctx.beginPath();

    // Start bottom-left
    const screenBottom = r.worldToScreenY(bounds.bottom - 10);
    ctx.moveTo(r.worldToScreenX(startX), screenBottom);

    // Trace the terrain surface
    for (let x = startX; x <= endX; x += step) {
      const h = this.heightFn(x);
      ctx.lineTo(r.worldToScreenX(x), r.worldToScreenY(h));
    }

    // Close to bottom-right and back
    ctx.lineTo(r.worldToScreenX(endX), screenBottom);
    ctx.closePath();

    // Fill with gradient
    const topScreenY = r.worldToScreenY(5);
    const bottomScreenY = r.worldToScreenY(-10);
    const fillGrad = ctx.createLinearGradient(0, topScreenY, 0, bottomScreenY);
    for (const s of this.theme.surfaceGradient) {
      fillGrad.addColorStop(s.stop, s.color);
    }
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Draw checker pattern (horizontal stripes)
    this.drawCheckerPattern(r, startX, endX);

    // Grass tufts on top
    if (this.theme.grassEnabled) {
      this.drawGrass(r, startX, endX);
    }
  }

  private drawCheckerPattern(r: Renderer, startX: number, endX: number) {
    const ctx = r.ctx;
    const stripeHeight = 1.5; // world units
    const stripeWidth = 2; // world units

    ctx.save();
    ctx.globalAlpha = 0.25;

    for (let x = startX; x <= endX; x += stripeWidth) {
      const h = this.heightFn(x);
      const col = Math.floor(x / stripeWidth);
      for (let row = 0; row < 6; row++) {
        if ((col + row) % 2 === 0) {
          const y = h - row * stripeHeight;
          const sx = r.worldToScreenX(x);
          const sy = r.worldToScreenY(y);
          const sw = stripeWidth * r.zoom;
          const sh = stripeHeight * r.zoom;
          ctx.fillStyle = this.theme.checkerColor;
          ctx.fillRect(sx, sy, sw, sh);
        }
      }
    }

    ctx.restore();
  }

  private drawGrass(r: Renderer, startX: number, endX: number) {
    const ctx = r.ctx;
    ctx.strokeStyle = this.theme.grassColor;
    ctx.lineWidth = Math.max(1, r.zoom * 0.04);

    for (let x = startX; x <= endX; x += 0.3) {
      const h = this.heightFn(x);
      const sx = r.worldToScreenX(x);
      const sy = r.worldToScreenY(h);
      const grassH = (2 + Math.sin(x * 7) * 1.5) * r.zoom * 0.05;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.sin(x * 3) * r.zoom * 0.03, sy - grassH);
      ctx.stroke();
    }
  }
}

/** Standalone height function for Emerald Hill Zone */
export function emeraldHillHeight(x: number): number {
  // Flat intro (0..30)
  if (x < 30) return 0;

  // Gentle hills (30..120)
  if (x < 120) {
    const t = (x - 30) / 90;
    return Math.sin(t * Math.PI * 3) * 2.5 * Math.sin(t * Math.PI);
  }

  // Flat before loop (120..150)
  if (x < 150) return 0;

  // Slope down to water (150..180)
  if (x < 180) {
    const t = (x - 150) / 30;
    return -t * 4;
  }

  // Low flat for water/bridge (180..230)
  if (x < 230) return -4;

  // Slope back up (230..260)
  if (x < 260) {
    const t = (x - 230) / 30;
    return -4 + t * 4;
  }

  // More hills (260..302)
  if (x < 302) {
    const t = (x - 260) / 42;
    return Math.sin(t * Math.PI * 2) * 3;
  }

  // Flat zone before second loop (302..318)
  if (x < 318) return 0;

  // More hills after second loop (318..340)
  if (x < 340) {
    const t = (x - 318) / 22;
    return Math.sin(t * Math.PI * 1.5) * 2;
  }

  // Final sprint flat (340+)
  return 0;
}
