import { Renderer } from "../core/Renderer";
import { BOSS_ARENA_WIDTH, BOSS_ARENA_GROUND_Y } from "../constants";

export class RoboTinicArena {
  readonly groundY = BOSS_ARENA_GROUND_Y;
  readonly leftWall = -BOSS_ARENA_WIDTH / 2;
  readonly rightWall = BOSS_ARENA_WIDTH / 2;
  private time = 0;
  private gearAngles = [0, 0, 0, 0];

  update(dt: number) {
    this.time += dt;
    for (let i = 0; i < this.gearAngles.length; i++) {
      this.gearAngles[i] += dt * (0.5 + i * 0.3) * (i % 2 === 0 ? 1 : -1);
    }
  }

  render(renderer: Renderer) {
    const ctx = renderer.ctx;

    // Dark factory background
    ctx.fillStyle = "#2a1515";
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    // Red pulsating ambient light
    const pulse = Math.sin(this.time * 2) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(180, 20, 20, ${0.03 + pulse * 0.04})`;
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    // Back wall metal panels
    const bounds = renderer.getVisibleBounds();
    for (let wx = Math.floor(bounds.left / 6) * 6; wx < bounds.right + 6; wx += 6) {
      const panelBottom = this.groundY + 2;
      const panelTop = panelBottom + 20;
      renderer.drawRect(wx, panelBottom, 5.8, panelTop - panelBottom, "#2a2a30");
      renderer.drawRect(wx + 0.1, panelBottom + 0.1, 5.6, panelTop - panelBottom - 0.2, "#353540");
      // Rivets
      for (let ry = panelBottom + 1; ry < panelTop; ry += 3) {
        renderer.drawCircle(wx + 0.4, ry, 0.15, "#555566");
        renderer.drawCircle(wx + 5.4, ry, 0.15, "#555566");
      }
    }

    // Gears on back wall
    const gearPositions = [
      { x: -20, y: 12, r: 4 },
      { x: -8, y: 16, r: 3 },
      { x: 12, y: 14, r: 3.5 },
      { x: 22, y: 10, r: 2.5 },
    ];
    for (let i = 0; i < gearPositions.length; i++) {
      const g = gearPositions[i];
      this.renderGear(renderer, g.x, g.y, g.r, this.gearAngles[i]);
    }

    // Red warning lights on walls
    const lightPositions = [-25, -12, 0, 12, 25];
    for (const lx of lightPositions) {
      const lightPulse = Math.sin(this.time * 3 + lx * 0.5) * 0.5 + 0.5;
      const sx = renderer.worldToScreenX(lx);
      const sy = renderer.worldToScreenY(18);
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, ${Math.floor(40 * lightPulse)}, 0, ${0.5 + lightPulse * 0.5})`;
      ctx.fill();
    }

    // Metal floor platform
    const floorLeft = this.leftWall;
    const floorRight = this.rightWall;
    renderer.drawRect(floorLeft, this.groundY - 2, floorRight - floorLeft, 2, "#3a3a44");
    renderer.drawRect(floorLeft, this.groundY - 0.3, floorRight - floorLeft, 0.3, "#555568");

    // Floor detail - hazard stripes at edges
    for (let i = 0; i < 4; i++) {
      const stripeW = 1.5;
      renderer.drawRect(floorLeft + i * stripeW * 2, this.groundY - 0.1, stripeW, 0.1, "#ccaa00");
      renderer.drawRect(floorRight - (i + 1) * stripeW * 2, this.groundY - 0.1, stripeW, 0.1, "#ccaa00");
    }

    // Visible arena walls
    renderer.drawRect(this.leftWall - 1, this.groundY, 1, 20, "#2a2a30");
    renderer.drawRect(this.rightWall, this.groundY, 1, 20, "#2a2a30");
  }

  private renderGear(renderer: Renderer, wx: number, wy: number, radius: number, angle: number) {
    const ctx = renderer.ctx;
    const sx = renderer.worldToScreenX(wx);
    const sy = renderer.worldToScreenY(wy);
    const sr = radius * renderer.zoom;
    const teeth = Math.floor(radius * 3);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // Gear body
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a1 = (i / teeth) * Math.PI * 2;
      const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
      const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
      const a4 = ((i + 0.8) / teeth) * Math.PI * 2;
      const outerR = sr * 1.15;
      if (i === 0) {
        ctx.moveTo(Math.cos(a1) * sr, Math.sin(a1) * sr);
      }
      ctx.lineTo(Math.cos(a2) * sr, Math.sin(a2) * sr);
      ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
      ctx.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
      ctx.lineTo(Math.cos(a4) * sr, Math.sin(a4) * sr);
    }
    ctx.closePath();
    ctx.fillStyle = "#44444e";
    ctx.fill();
    ctx.strokeStyle = "#5a5a66";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center hole
    ctx.beginPath();
    ctx.arc(0, 0, sr * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = "#222228";
    ctx.fill();

    ctx.restore();
  }

  getEffectiveHeight(_x: number): number {
    return this.groundY;
  }

  clampPlayerX(x: number): number {
    return Math.max(this.leftWall + 1, Math.min(this.rightWall - 1, x));
  }
}
