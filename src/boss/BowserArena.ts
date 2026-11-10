import { Renderer } from "../core/Renderer";
import { BOSS_ARENA_WIDTH, BOSS_ARENA_GROUND_Y } from "../constants";

export class BowserArena {
  readonly groundY = BOSS_ARENA_GROUND_Y;
  readonly leftWall = -BOSS_ARENA_WIDTH / 2;
  readonly rightWall = BOSS_ARENA_WIDTH / 2;
  private time = 0;
  private lavaRise = 0; // How much lava has risen in phase 3
  private torchPhases: number[] = [];

  constructor() {
    for (let i = 0; i < 8; i++) {
      this.torchPhases.push(Math.random() * Math.PI * 2);
    }
  }

  setLavaRise(amount: number) {
    this.lavaRise = amount;
  }

  get effectiveLeft(): number {
    return this.leftWall + this.lavaRise * 3;
  }

  get effectiveRight(): number {
    return this.rightWall - this.lavaRise * 3;
  }

  update(dt: number) {
    this.time += dt;
    for (let i = 0; i < this.torchPhases.length; i++) {
      this.torchPhases[i] += dt * (3 + i * 0.5);
    }
  }

  render(renderer: Renderer) {
    const ctx = renderer.ctx;

    // Castle background - dark stone
    ctx.fillStyle = "#251528";
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    // Stone wall bricks
    const bounds = renderer.getVisibleBounds();
    for (let wy = Math.floor(bounds.bottom / 3) * 3; wy < bounds.top + 3; wy += 3) {
      const offset = ((wy / 3) % 2) * 2.5;
      for (let wx = Math.floor(bounds.left / 5) * 5 - offset; wx < bounds.right + 5; wx += 5) {
        if (wy < this.groundY + 1) continue;
        const brightness = 30 + Math.abs(((wx * 7 + wy * 13) % 20) - 10);
        renderer.drawRect(wx, wy, 4.8, 2.8, `rgb(${brightness + 10}, ${brightness}, ${brightness + 5})`);
        renderer.drawRect(wx + 0.1, wy + 0.1, 4.6, 2.6, `rgb(${brightness + 20}, ${brightness + 10}, ${brightness + 15})`);
      }
    }

    // Torches on walls
    const torchXs = [-25, -15, -5, 5, 15, 25];
    for (let i = 0; i < torchXs.length; i++) {
      this.renderTorch(renderer, torchXs[i], 10, this.torchPhases[i]);
    }

    // Lava below platform
    this.renderLava(renderer);

    // Stone platform
    const platLeft = this.effectiveLeft;
    const platRight = this.effectiveRight;
    renderer.drawRect(platLeft, this.groundY - 1.5, platRight - platLeft, 1.5, "#443344");
    renderer.drawRect(platLeft, this.groundY - 0.3, platRight - platLeft, 0.3, "#665566");

    // Platform edge detail
    for (let wx = platLeft; wx < platRight; wx += 2) {
      renderer.drawRect(wx, this.groundY - 1.5, 1.8, 0.15, "#554455");
    }

    // Side walls
    renderer.drawRect(this.leftWall - 2, this.groundY - 5, 2, 25, "#332233");
    renderer.drawRect(this.rightWall, this.groundY - 5, 2, 25, "#332233");
  }

  private renderLava(renderer: Renderer) {
    const ctx = renderer.ctx;
    const lavaTop = this.groundY - 1.5;
    const screenY = renderer.worldToScreenY(lavaTop);
    const screenBottom = renderer.height;

    // Lava base
    ctx.fillStyle = "#cc2200";
    ctx.fillRect(0, screenY, renderer.width, screenBottom - screenY);

    // Lava surface waves
    const bounds = renderer.getVisibleBounds();
    ctx.beginPath();
    const waveY = lavaTop;
    const startX = renderer.worldToScreenX(bounds.left - 2);
    const endX = renderer.worldToScreenX(bounds.right + 2);
    ctx.moveTo(startX, renderer.worldToScreenY(waveY));
    for (let sx = startX; sx <= endX; sx += 4) {
      const wx = renderer.screenToWorldX(sx);
      const waveOffset = Math.sin(wx * 0.5 + this.time * 2) * 0.3 + Math.sin(wx * 0.8 - this.time * 1.5) * 0.2;
      ctx.lineTo(sx, renderer.worldToScreenY(waveY + waveOffset));
    }
    ctx.lineTo(endX, screenBottom);
    ctx.lineTo(startX, screenBottom);
    ctx.closePath();
    ctx.fillStyle = "#ff6622";
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Lava glow
    ctx.fillStyle = `rgba(255, 100, 0, ${0.05 + Math.sin(this.time * 1.5) * 0.02})`;
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    // Lava rising on sides in phase 3
    if (this.lavaRise > 0) {
      const riseHeight = this.lavaRise * 5;
      // Left lava
      const leftEdge = renderer.worldToScreenX(this.effectiveLeft);
      const leftWallScreen = renderer.worldToScreenX(this.leftWall);
      const topScreen = renderer.worldToScreenY(this.groundY + riseHeight);
      ctx.fillStyle = "#ff4400";
      ctx.globalAlpha = 0.8;
      ctx.fillRect(leftWallScreen, topScreen, leftEdge - leftWallScreen, screenBottom - topScreen);
      // Right lava
      const rightEdge = renderer.worldToScreenX(this.effectiveRight);
      const rightWallScreen = renderer.worldToScreenX(this.rightWall);
      ctx.fillRect(rightEdge, topScreen, rightWallScreen - rightEdge, screenBottom - topScreen);
      ctx.globalAlpha = 1;
    }
  }

  private renderTorch(renderer: Renderer, wx: number, wy: number, phase: number) {
    const ctx = renderer.ctx;
    const sx = renderer.worldToScreenX(wx);
    const sy = renderer.worldToScreenY(wy);

    // Torch bracket
    ctx.fillStyle = "#554433";
    ctx.fillRect(sx - 3, sy, 6, 15);

    // Flame
    const flicker1 = Math.sin(phase) * 0.3 + 0.7;
    const flicker2 = Math.sin(phase * 1.7) * 0.2 + 0.8;
    const flameH = (1.5 + flicker1 * 0.8) * renderer.zoom;

    ctx.beginPath();
    ctx.ellipse(sx, sy - flameH * 0.2, 0.5 * renderer.zoom * flicker2, flameH, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffaa22";
    ctx.fill();
  }

  getEffectiveHeight(_x: number): number {
    return this.groundY;
  }

  clampPlayerX(x: number): number {
    return Math.max(this.effectiveLeft + 1, Math.min(this.effectiveRight - 1, x));
  }
}
