import { Renderer } from "../core/Renderer";
import { Badnik } from "./Badnik";
import { FLASHER_VULNERABLE_DURATION, FLASHER_INVULNERABLE_DURATION, ENEMY_DAMAGE_RADIUS } from "../constants";

export class Flasher extends Badnik {
  private vulnerable = true;
  private phaseTimer = FLASHER_VULNERABLE_DURATION;
  private baseX: number;
  private baseY: number;
  private hoverOffset = 0;

  constructor(x: number, y: number) {
    super(x, y);
    this.baseX = x;
    this.baseY = y;
  }

  override canBeDestroyed(px: number, py: number, isAttacking: boolean): boolean {
    if (!this.alive) return false;
    if (!isAttacking) return false;
    if (!this.vulnerable) return false;

    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < ENEMY_DAMAGE_RADIUS * 1.2;
  }

  override canDamagePlayer(px: number, py: number): boolean {
    if (!this.alive) return false;
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < ENEMY_DAMAGE_RADIUS;
  }

  update(dt: number, _playerX: number, _playerY: number) {
    if (!this.alive) {
      this.updateAnimal(dt);
      return;
    }

    // Phase timer
    this.phaseTimer -= dt;
    if (this.phaseTimer <= 0) {
      this.vulnerable = !this.vulnerable;
      this.phaseTimer = this.vulnerable ? FLASHER_VULNERABLE_DURATION : FLASHER_INVULNERABLE_DURATION;
    }

    // Hover animation
    this.hoverOffset += dt * 3;
    this.y = this.baseY + Math.sin(this.hoverOffset) * 0.5;
  }

  render(r: Renderer) {
    if (!this.alive) {
      this.renderAnimal(r);
      return;
    }

    const ctx = r.ctx;
    const sx = r.worldToScreenX(this.x);
    const sy = r.worldToScreenY(this.y);
    const s = r.zoom;

    ctx.save();

    // When invulnerable: semi-transparent and pulsing
    if (!this.vulnerable) {
      const pulse = 0.3 + Math.sin(this.hoverOffset * 5) * 0.2;
      ctx.globalAlpha = pulse;
    }

    // Body (orb-like)
    const bodyGrad = ctx.createRadialGradient(
      sx - 0.1 * s, sy - 0.1 * s, 0.05 * s,
      sx, sy, 0.45 * s
    );
    if (this.vulnerable) {
      bodyGrad.addColorStop(0, "#ffdd44");
      bodyGrad.addColorStop(0.6, "#ff8800");
      bodyGrad.addColorStop(1, "#cc4400");
    } else {
      bodyGrad.addColorStop(0, "#88aaff");
      bodyGrad.addColorStop(0.6, "#4466cc");
      bodyGrad.addColorStop(1, "#223388");
    }

    ctx.beginPath();
    ctx.arc(sx, sy, 0.4 * s, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Electric arcs when invulnerable
    if (!this.vulnerable) {
      ctx.strokeStyle = "#88ccff";
      ctx.lineWidth = Math.max(1, 0.03 * s);
      for (let i = 0; i < 4; i++) {
        const angle = this.hoverOffset * 3 + (Math.PI * 2 / 4) * i;
        const arcLen = 0.6 * s;
        ctx.beginPath();
        ctx.moveTo(
          sx + Math.cos(angle) * 0.35 * s,
          sy + Math.sin(angle) * 0.35 * s
        );
        ctx.lineTo(
          sx + Math.cos(angle + 0.3) * arcLen + (Math.random() - 0.5) * 0.1 * s,
          sy + Math.sin(angle + 0.3) * arcLen + (Math.random() - 0.5) * 0.1 * s
        );
        ctx.stroke();
      }
    }

    // Eyes
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.vulnerable ? "#ff0000" : "#ffffff";
    ctx.save();
    ctx.shadowColor = this.vulnerable ? "#ff0000" : "#88ccff";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(sx - 0.1 * s, sy - 0.05 * s, 0.06 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx + 0.1 * s, sy - 0.05 * s, 0.06 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Glow ring when vulnerable (target indicator)
    if (this.vulnerable) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this.hoverOffset * 4) * 0.15;
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = Math.max(1, 0.04 * s);
      ctx.beginPath();
      ctx.arc(sx, sy, 0.55 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}
