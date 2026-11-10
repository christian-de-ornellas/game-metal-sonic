import { Renderer } from "../core/Renderer";
import { Boss } from "./Boss";
import { ROBO_TINIC_HP } from "../constants";

type AttackState = "hover" | "dive" | "grounded" | "rising" | "laser_charge" | "laser_fire";

interface Bomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  explodeTimer: number;
}

export class RoboTinic extends Boss {
  private attackState: AttackState = "hover";
  private stateTimer = 0;
  private hoverBaseY = 14;
  private hoverTime = 0;
  private hoverSpeed = 4;
  private direction = 1;
  private diveTargetX = 0;
  private groundPauseTime = 1.5;
  private bombs: Bomb[] = [];
  private bombCooldown = 0;
  private laserY = 0;
  private laserAlpha = 0;
  private antennaPhase = 0;
  private exhaustPhase = 0;
  private smokeAmount = 0;
  private defeatTimer = 0;
  private defeatExplosions = 0;
  readonly arenaLeft: number;
  readonly arenaRight: number;

  constructor(arenaLeft: number, arenaRight: number) {
    super(ROBO_TINIC_HP, 0, 14);
    this.arenaLeft = arenaLeft;
    this.arenaRight = arenaRight;
    // Init bombs pool
    for (let i = 0; i < 10; i++) {
      this.bombs.push({ x: 0, y: 0, vx: 0, vy: 0, active: false, explodeTimer: 0 });
    }
  }

  getBossName(): string {
    return "ROBO TINIC";
  }

  getPhaseLevel(): number {
    if (this.hp > 5) return 1;
    if (this.hp > 2) return 2;
    return 3;
  }

  private warningAlarmCooldown = 0;

  update(dt: number, playerX: number, _playerY: number) {
    this.updateTimers(dt);
    this.antennaPhase += dt * 4;
    this.exhaustPhase += dt * 8;
    this.hoverTime += dt;

    const phase = this.getPhaseLevel();
    this.smokeAmount = phase === 3 ? 0.8 : phase === 2 ? 0.3 : 0;

    // Phase 3 warning alarm
    if (phase === 3 && !this.defeated) {
      this.warningAlarmCooldown -= dt;
      if (this.warningAlarmCooldown <= 0) {
        this.emitSound("warningAlarm");
        this.warningAlarmCooldown = 2.0;
      }
    }

    if (this.defeated) {
      this.updateDefeat(dt);
      return;
    }

    // Update bombs
    this.updateBombs(dt);
    this.bombCooldown = Math.max(0, this.bombCooldown - dt);

    switch (this.attackState) {
      case "hover":
        this.updateHover(dt, playerX, phase);
        break;
      case "dive":
        this.updateDive(dt);
        break;
      case "grounded":
        this.updateGrounded(dt, phase);
        break;
      case "rising":
        this.updateRising(dt);
        break;
      case "laser_charge":
        this.updateLaserCharge(dt, playerX);
        break;
      case "laser_fire":
        this.updateLaserFire(dt);
        break;
    }
  }

  private updateHover(dt: number, playerX: number, phase: number) {
    const speed = this.hoverSpeed * (1 + (phase - 1) * 0.4);
    this.x += this.direction * speed * dt;

    // Sine wave vertical movement
    this.y = this.hoverBaseY + Math.sin(this.hoverTime * 2) * 2;

    // Bounce off arena walls
    if (this.x > this.arenaRight - 3) { this.direction = -1; }
    if (this.x < this.arenaLeft + 3) { this.direction = 1; }

    this.stateTimer += dt;

    // Drop bombs periodically
    const bombInterval = phase === 3 ? 0.8 : phase === 2 ? 1.2 : 2.0;
    if (this.bombCooldown <= 0 && this.stateTimer > 1) {
      const bombCount = phase;
      for (let i = 0; i < bombCount; i++) {
        this.dropBomb(this.x + (i - (bombCount - 1) / 2) * 2);
      }
      this.bombCooldown = bombInterval;
    }

    // After hovering, decide next action
    const hoverDuration = phase === 3 ? 2 : phase === 2 ? 3 : 4;
    if (this.stateTimer > hoverDuration) {
      if (phase >= 2 && Math.random() < 0.4) {
        // Laser attack
        this.attackState = "laser_charge";
        this.stateTimer = 0;
        this.laserY = this.y;
      } else {
        // Dive attack
        this.attackState = "dive";
        this.diveTargetX = playerX;
        this.stateTimer = 0;
      }
    }
  }

  private updateDive(dt: number) {
    // Move toward player X, dive down
    const dx = this.diveTargetX - this.x;
    this.x += Math.sign(dx) * Math.min(Math.abs(dx), 12 * dt);
    this.y -= 18 * dt;

    if (this.y <= 3) {
      this.y = 3;
      this.attackState = "grounded";
      this.stateTimer = 0;
      this.emitSound("bossImpact");
    }
  }

  private updateGrounded(dt: number, phase: number) {
    this.stateTimer += dt;
    const pauseTime = phase === 3 ? 0.5 : phase === 2 ? 1.0 : this.groundPauseTime;

    if (this.stateTimer > pauseTime) {
      this.attackState = "rising";
      this.stateTimer = 0;
    }
  }

  private updateRising(dt: number) {
    this.y += 10 * dt;
    if (this.y >= this.hoverBaseY) {
      this.y = this.hoverBaseY;
      this.attackState = "hover";
      this.stateTimer = 0;
    }
  }

  private laserChargeSoundPlayed = false;

  private updateLaserCharge(dt: number, playerX: number) {
    this.stateTimer += dt;
    this.laserAlpha = Math.min(1, this.stateTimer / 0.8);
    // Track player Y for aim
    this.laserY = this.y - 1;
    // Slight tracking of player X
    const dx = playerX - this.x;
    this.x += Math.sign(dx) * Math.min(Math.abs(dx), 2 * dt);

    if (!this.laserChargeSoundPlayed) {
      this.laserChargeSoundPlayed = true;
      this.emitSound("laserCharge");
    }

    if (this.stateTimer > 0.8) {
      this.attackState = "laser_fire";
      this.stateTimer = 0;
      this.laserChargeSoundPlayed = false;
      this.emitSound("laserFire");
    }
  }

  private updateLaserFire(dt: number) {
    this.stateTimer += dt;
    this.laserAlpha = Math.max(0, 1 - this.stateTimer / 0.5);

    if (this.stateTimer > 0.5) {
      this.attackState = "hover";
      this.stateTimer = 0;
      this.laserAlpha = 0;
    }
  }

  private dropBomb(x: number) {
    for (const b of this.bombs) {
      if (!b.active) {
        b.x = x;
        b.y = this.y - 2;
        b.vx = (Math.random() - 0.5) * 2;
        b.vy = 0;
        b.active = true;
        b.explodeTimer = 4;
        this.emitSound("bombDrop");
        return;
      }
    }
  }

  private updateBombs(dt: number) {
    for (const b of this.bombs) {
      if (!b.active) continue;
      b.vy -= 20 * dt; // gravity
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.explodeTimer -= dt;

      if (b.y <= 0.5 || b.explodeTimer <= 0) {
        b.active = false;
      }
    }
  }

  private updateDefeat(dt: number) {
    this.defeatTimer += dt;

    // Chain explosions
    if (this.defeatTimer > this.defeatExplosions * 0.3 && this.defeatExplosions < 8) {
      this.defeatExplosions++;
    }

    // Fall and explode
    if (this.defeatTimer < 2) {
      this.y -= 3 * dt;
      this.x += (Math.random() - 0.5) * dt * 3;
    }
  }

  isDefeatedAnimationDone(): boolean {
    return this.defeated && this.defeatTimer > 3;
  }

  /** Check if a bomb is near the player */
  isBombNear(px: number, py: number): boolean {
    for (const b of this.bombs) {
      if (!b.active) continue;
      const dx = px - b.x;
      const dy = py - b.y;
      if (dx * dx + dy * dy < 2.25) return true;
    }
    return false;
  }

  /** Check if laser hits player */
  isLaserHitting(px: number, py: number): boolean {
    if (this.attackState !== "laser_fire") return false;
    // Laser is horizontal from the boss
    const laserY = this.y - 1;
    if (Math.abs(py - laserY) > 1.5) return false;
    // Laser extends in the direction the boss was facing
    return true;
  }

  render(renderer: Renderer) {
    if (this.defeated && this.defeatTimer > 2.5) return;

    const ctx = renderer.ctx;
    const flashVisible = this.hitFlashTimer > 0 && Math.sin(this.hitFlashTimer * 40) > 0;

    ctx.save();
    if (flashVisible) {
      ctx.globalAlpha = 0.5;
    }

    // Exhaust flames
    this.renderExhaust(renderer);

    // Hovercraft body
    this.renderHovercraft(renderer);

    // Cockpit dome
    this.renderCockpit(renderer);

    // Robo Tinic inside
    this.renderRobotBody(renderer);

    // Antenna
    this.renderAntenna(renderer);

    // Smoke when damaged
    if (this.smokeAmount > 0) {
      this.renderSmoke(renderer);
    }

    ctx.restore();

    // Bombs
    this.renderBombs(renderer);

    // Laser
    if (this.attackState === "laser_charge" || this.attackState === "laser_fire") {
      this.renderLaser(renderer);
    }

    // Defeat explosions
    if (this.defeated) {
      this.renderDefeatExplosions(renderer);
    }
  }

  private renderExhaust(renderer: Renderer) {
    const ctx = renderer.ctx;
    // Two jet exhausts under the hovercraft
    for (const side of [-1, 1]) {
      const jx = this.x + side * 2.5;
      const jy = this.y - 2.5;
      const sx = renderer.worldToScreenX(jx);
      const sy = renderer.worldToScreenY(jy);
      const flicker = Math.sin(this.exhaustPhase + side * 2) * 0.3 + 0.7;
      const flameH = (1.5 + flicker) * renderer.zoom;

      ctx.globalAlpha = flicker;
      ctx.beginPath();
      ctx.ellipse(sx, sy + flameH * 0.3, 0.6 * renderer.zoom, flameH * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6414";
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private renderHovercraft(renderer: Renderer) {
    const ctx = renderer.ctx;
    const sx = renderer.worldToScreenX(this.x);
    const sy = renderer.worldToScreenY(this.y);

    // Main hull
    ctx.beginPath();
    ctx.ellipse(sx, sy + 0.5 * renderer.zoom, 4 * renderer.zoom, 1.8 * renderer.zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#555566";
    ctx.fill();
    ctx.strokeStyle = "#888899";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Red trim stripe
    ctx.beginPath();
    ctx.ellipse(sx, sy + 0.8 * renderer.zoom, 3.8 * renderer.zoom, 0.4 * renderer.zoom, 0, 0, Math.PI);
    ctx.fillStyle = "#aa2222";
    ctx.fill();
  }

  private renderCockpit(renderer: Renderer) {
    const ctx = renderer.ctx;
    const sx = renderer.worldToScreenX(this.x);
    const sy = renderer.worldToScreenY(this.y + 1.5);

    // Dome
    ctx.beginPath();
    ctx.ellipse(sx, sy + 0.5 * renderer.zoom, 2.2 * renderer.zoom, 1.8 * renderer.zoom, 0, Math.PI, Math.PI * 2);
    ctx.fillStyle = "rgba(100, 180, 220, 0.3)";
    ctx.fill();
    ctx.strokeStyle = "rgba(150, 200, 240, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.ellipse(sx - 0.6 * renderer.zoom, sy - 0.3 * renderer.zoom, 0.8 * renderer.zoom, 0.4 * renderer.zoom, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200, 230, 255, 0.3)";
    ctx.fill();
  }

  private renderRobotBody(renderer: Renderer) {
    const ctx = renderer.ctx;
    const sx = renderer.worldToScreenX(this.x);
    const sy = renderer.worldToScreenY(this.y + 2);

    // Robot torso
    ctx.beginPath();
    ctx.ellipse(sx, sy, 1.2 * renderer.zoom, 1.0 * renderer.zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#444450";
    ctx.fill();

    // Head
    const headY = sy - 1.2 * renderer.zoom;
    ctx.beginPath();
    ctx.arc(sx, headY, 0.8 * renderer.zoom, 0, Math.PI * 2);
    ctx.fillStyle = "#555560";
    ctx.fill();

    // Red glowing eyes
    const eyeGlow = Math.sin(this.antennaPhase * 2) * 0.3 + 0.7;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx + side * 0.3 * renderer.zoom, headY - 0.1 * renderer.zoom, 0.15 * renderer.zoom, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
      ctx.fill();
    }

    // Mechanical claws
    for (const side of [-1, 1]) {
      const clawX = sx + side * 1.8 * renderer.zoom;
      const clawY = sy + 0.3 * renderer.zoom;
      ctx.beginPath();
      ctx.moveTo(sx + side * 1.2 * renderer.zoom, sy);
      ctx.lineTo(clawX, clawY);
      ctx.lineTo(clawX + side * 0.3 * renderer.zoom, clawY + 0.4 * renderer.zoom);
      ctx.moveTo(clawX, clawY);
      ctx.lineTo(clawX - side * 0.1 * renderer.zoom, clawY + 0.4 * renderer.zoom);
      ctx.strokeStyle = "#666677";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private renderAntenna(renderer: Renderer) {
    const ctx = renderer.ctx;
    const sx = renderer.worldToScreenX(this.x);
    const sy = renderer.worldToScreenY(this.y + 4);

    // Antenna pole
    ctx.beginPath();
    ctx.moveTo(sx, sy + 1.5 * renderer.zoom);
    ctx.lineTo(sx, sy - 0.5 * renderer.zoom);
    ctx.strokeStyle = "#777788";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Blinking light
    const blink = Math.sin(this.antennaPhase * 3) > 0;
    if (blink) {
      ctx.beginPath();
      ctx.arc(sx, sy - 0.5 * renderer.zoom, 0.2 * renderer.zoom, 0, Math.PI * 2);
      ctx.fillStyle = "#ff4444";
      ctx.fill();
    }
  }

  private renderSmoke(renderer: Renderer) {
    const ctx = renderer.ctx;
    const time = this.hoverTime;
    for (let i = 0; i < 3; i++) {
      const t = (time * 2 + i * 1.3) % 3;
      if (t > 2) continue;
      const sx = renderer.worldToScreenX(this.x + Math.sin(i * 2.1 + time) * 1.5);
      const sy = renderer.worldToScreenY(this.y + 1 + t * 2);
      const alpha = (1 - t / 2) * this.smokeAmount * 0.5;
      const size = (0.5 + t * 0.8) * renderer.zoom;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fillStyle = "#555555";
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderBombs(renderer: Renderer) {
    const ctx = renderer.ctx;
    for (const b of this.bombs) {
      if (!b.active) continue;
      const sx = renderer.worldToScreenX(b.x);
      const sy = renderer.worldToScreenY(b.y);
      const sr = 0.5 * renderer.zoom;

      // Bomb body
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = "#333333";
      ctx.fill();
      ctx.strokeStyle = "#555555";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Fuse spark
      const sparkPhase = Math.sin(b.explodeTimer * 15);
      if (sparkPhase > 0) {
        ctx.beginPath();
        ctx.arc(sx, sy - sr, 0.1 * renderer.zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#ffcc44";
        ctx.fill();
      }
    }
  }

  private renderLaser(renderer: Renderer) {
    const ctx = renderer.ctx;
    const laserY = this.y - 1;

    if (this.attackState === "laser_charge") {
      // Telegraph: thin red line
      const sx1 = renderer.worldToScreenX(this.arenaLeft);
      const sx2 = renderer.worldToScreenX(this.arenaRight);
      const sy = renderer.worldToScreenY(laserY);

      ctx.save();
      ctx.globalAlpha = this.laserAlpha * 0.6;
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(sx1, sy);
      ctx.lineTo(sx2, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else if (this.attackState === "laser_fire") {
      // Full laser beam
      const sx1 = renderer.worldToScreenX(this.arenaLeft);
      const sx2 = renderer.worldToScreenX(this.arenaRight);
      const sy = renderer.worldToScreenY(laserY);
      const beamH = 1.5 * renderer.zoom;

      ctx.save();
      ctx.globalAlpha = this.laserAlpha;

      ctx.fillStyle = "rgba(255, 200, 200, 1)";
      ctx.fillRect(sx1, sy - beamH, sx2 - sx1, beamH * 2);

      ctx.restore();
    }
  }

  private renderDefeatExplosions(renderer: Renderer) {
    const ctx = renderer.ctx;
    for (let i = 0; i < this.defeatExplosions; i++) {
      const t = this.defeatTimer - i * 0.3;
      if (t < 0 || t > 0.8) continue;

      const progress = t / 0.8;
      const angle = i * 1.7 + i * i * 0.3;
      const dist = 2 + i * 0.5;
      const ex = this.x + Math.cos(angle) * dist;
      const ey = this.y + Math.sin(angle) * dist;

      const sx = renderer.worldToScreenX(ex);
      const sy = renderer.worldToScreenY(ey);
      const sr = (1 + progress * 2) * renderer.zoom;

      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6600";
      ctx.fill();
      ctx.restore();
    }
  }

  protected getHitRadius(): number {
    return 3.5;
  }

  protected getDamageRadius(): number {
    return 2.5;
  }
}
