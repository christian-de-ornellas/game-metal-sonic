import { Renderer } from "../core/Renderer";
import { GameState } from "../core/GameState";

export type PowerUpType = "speed_shoes" | "invincibility" | "shield" | "rings_10" | "extra_life";

interface Monitor {
  x: number;
  y: number;
  type: PowerUpType;
  broken: boolean;
  animPhase: number;
}

export class PowerUpMonitor {
  private monitors: Monitor[] = [];
  private time = 0;

  constructor(private gameState: GameState) {}

  addMonitor(x: number, y: number, type: PowerUpType) {
    this.monitors.push({ x, y, type, broken: false, animPhase: Math.random() * Math.PI * 2 });
  }

  checkCollision(playerX: number, playerY: number, isAttacking: boolean): PowerUpType | null {
    for (const m of this.monitors) {
      if (m.broken) continue;
      const dx = playerX - m.x;
      const dy = playerY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.5 && isAttacking) {
        m.broken = true;
        this.applyPowerUp(m.type);
        return m.type;
      }
    }
    return null;
  }

  private applyPowerUp(type: PowerUpType) {
    switch (type) {
      case "speed_shoes":
        this.gameState.speedBoost = true;
        this.gameState.speedBoostTimer = 10;
        break;
      case "invincibility":
        this.gameState.invincible = true;
        this.gameState.invincibilityTimer = 10;
        break;
      case "shield":
        this.gameState.shield = true;
        break;
      case "rings_10":
        this.gameState.addRings(10);
        break;
      case "extra_life":
        this.gameState.lives++;
        break;
    }
  }

  update(dt: number) {
    this.time += dt;
  }

  render(r: Renderer) {
    const bounds = r.getVisibleBounds();
    const ctx = r.ctx;

    for (const m of this.monitors) {
      if (m.broken) continue;
      if (m.x < bounds.left - 2 || m.x > bounds.right + 2) continue;
      if (m.y < bounds.bottom - 2 || m.y > bounds.top + 2) continue;

      const sx = r.worldToScreenX(m.x);
      const sy = r.worldToScreenY(m.y);
      const s = r.zoom;

      // TV box
      const boxW = 1.2 * s;
      const boxH = 1.4 * s;
      ctx.fillStyle = "#333344";
      ctx.fillRect(sx - boxW / 2, sy - boxH / 2, boxW, boxH);

      // Screen
      const screenW = 0.9 * s;
      const screenH = 0.9 * s;
      ctx.fillStyle = "#88aacc";
      ctx.fillRect(sx - screenW / 2, sy - screenH / 2 - 0.1 * s, screenW, screenH);

      // Icon
      this.drawIcon(ctx, sx, sy - 0.1 * s, s * 0.3, m.type);

      // Stand
      ctx.fillStyle = "#555566";
      ctx.fillRect(sx - 0.15 * s, sy + boxH / 2, 0.3 * s, 0.3 * s);

      // Subtle glow
      const glowAlpha = 0.3 + Math.sin(this.time * 3 + m.animPhase) * 0.15;
      ctx.save();
      ctx.globalAlpha = glowAlpha;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - boxW / 2, sy - boxH / 2, boxW, boxH);
      ctx.restore();
    }
  }

  private drawIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, type: PowerUpType) {
    ctx.save();
    switch (type) {
      case "speed_shoes":
        // Shoe icon
        ctx.fillStyle = "#ff4444";
        ctx.beginPath();
        ctx.ellipse(cx, cy, size * 0.8, size * 0.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.3, cy - size * 0.2);
        ctx.lineTo(cx + size * 0.3, cy - size * 0.2);
        ctx.lineTo(cx + size * 0.1, cy - size * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
      case "invincibility":
        // Star icon
        ctx.fillStyle = "#ffdd00";
        this.drawStar(ctx, cx, cy, size * 0.4, size * 0.8, 5);
        break;
      case "shield":
        // Bubble icon
        ctx.strokeStyle = "#44aaff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(68,170,255,0.3)";
        ctx.fill();
        break;
      case "rings_10":
        // Ring icon
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#88aacc";
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "extra_life":
        // 1UP text
        ctx.fillStyle = "#44ff44";
        ctx.font = `bold ${size * 1.5}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("1UP", cx, cy);
        break;
    }
    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, innerR: number, outerR: number, points: number) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}
