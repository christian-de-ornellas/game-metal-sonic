import { Renderer } from "../core/Renderer";
import { Badnik } from "./Badnik";
import { BUZZBOMBER_SPEED } from "../constants";

type BuzzState = "patrol" | "diving" | "recovering";

export class BuzzBomber extends Badnik {
  private patrolStartX: number;
  private patrolEndX: number;
  private baseY: number;
  private t = 0;
  private wingAngle = 0;
  private facingRight = true;

  // Dive attack
  private buzzState: BuzzState = "patrol";
  private diveTargetX = 0;
  private diveTargetY = 0;
  private recoverTimer = 0;
  private diveCooldown = 0;

  constructor(x: number, y: number, patrolRange: number = 10) {
    super(x, y);
    this.patrolStartX = x;
    this.patrolEndX = x + patrolRange;
    this.baseY = y;
  }

  update(dt: number, playerX: number, playerY: number) {
    if (!this.alive) {
      this.updateAnimal(dt);
      return;
    }

    this.wingAngle += dt * 25;
    if (this.diveCooldown > 0) this.diveCooldown -= dt;

    switch (this.buzzState) {
      case "patrol": {
        // Normal patrol
        const totalDist = this.patrolEndX - this.patrolStartX;
        this.t += dt * BUZZBOMBER_SPEED / totalDist;
        if (this.t > 1) this.t -= 2;

        const smoothT = Math.abs(this.t);
        this.x = this.patrolStartX + (this.patrolEndX - this.patrolStartX) * smoothT;
        this.y = this.baseY + Math.sin(this.t * Math.PI * 4) * 0.3;

        this.facingRight = this.t > 0;

        // Check for dive opportunity
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        if (this.diveCooldown <= 0 &&
            dy < -1 && // player is below
            Math.abs(dx) < 8 && // horizontally close
            Math.abs(dy) < 12 && // not too far below
            Math.random() < dt * 0.8) { // chance per second
          this.buzzState = "diving";
          this.diveTargetX = playerX;
          this.diveTargetY = playerY;
        }
        break;
      }

      case "diving": {
        // Dive toward the target position
        const dx = this.diveTargetX - this.x;
        const dy = this.diveTargetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5 || this.y < this.diveTargetY - 1) {
          // Reached target or passed it, start recovering
          this.buzzState = "recovering";
          this.recoverTimer = 1.0;
        } else {
          const diveSpeed = 8;
          this.x += (dx / dist) * diveSpeed * dt;
          this.y += (dy / dist) * diveSpeed * dt;
          this.facingRight = dx > 0;
        }
        break;
      }

      case "recovering": {
        // Float back up to patrol height
        this.recoverTimer -= dt;
        const targetY = this.baseY;
        const dy = targetY - this.y;

        this.y += dy * dt * 2;

        // Also drift back toward patrol center
        const centerX = (this.patrolStartX + this.patrolEndX) / 2;
        const driftX = centerX - this.x;
        this.x += driftX * dt;

        if (this.recoverTimer <= 0 && Math.abs(dy) < 0.5) {
          this.buzzState = "patrol";
          this.diveCooldown = 3;
          // Recalculate t from current x position
          this.t = (this.x - this.patrolStartX) / (this.patrolEndX - this.patrolStartX);
        }
        break;
      }
    }
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
    const dir = this.facingRight ? 1 : -1;

    ctx.save();
    ctx.translate(sx, sy);

    // Tilt when diving
    if (this.buzzState === "diving") {
      ctx.rotate(dir * 0.3);
    }

    // Wings (behind body)
    const wingFlap = Math.sin(this.wingAngle) * 0.4;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#ddeeff";

    // Left wing
    ctx.beginPath();
    ctx.ellipse(-0.6 * s * dir, -0.3 * s + wingFlap * s * 0.2, 0.6 * s, 0.15 * s, wingFlap * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.ellipse(0.6 * s * dir, -0.3 * s - wingFlap * s * 0.2, 0.6 * s, 0.15 * s, -wingFlap * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body (oval)
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.5 * s, 0.3 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffaa44";
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0.3 * s * dir, -0.1 * s, 0.22 * s, 0, Math.PI * 2);
    ctx.fillStyle = "#888899";
    ctx.fill();

    // Eyes (red, brighter when diving)
    const eyeColor = this.buzzState === "diving" ? "#ff0000" : "#ff2222";
    ctx.beginPath();
    ctx.arc(0.38 * s * dir, -0.15 * s, 0.06 * s, 0, Math.PI * 2);
    ctx.fillStyle = eyeColor;
    ctx.fill();

    // Stinger
    ctx.beginPath();
    ctx.moveTo(-0.1 * s * dir, 0.2 * s);
    ctx.lineTo(-0.2 * s * dir, 0.4 * s);
    ctx.lineTo(0, 0.2 * s);
    ctx.fillStyle = "#ddcc22";
    ctx.fill();

    ctx.restore();
  }
}
