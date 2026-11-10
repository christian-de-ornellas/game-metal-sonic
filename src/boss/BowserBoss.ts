import { Renderer } from "../core/Renderer";
import { Boss } from "./Boss";
import { BOWSER_HP } from "../constants";

type BowserAttack = "walk" | "fire_breath" | "ground_pound" | "ground_pound_land" |
  "shell_spin" | "hammer_throw" | "idle" | "rage_roar";

interface Hammer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  active: boolean;
}

interface Shockwave {
  x: number;
  progress: number;
  active: boolean;
}

export class BowserBoss extends Boss {
  private attack: BowserAttack = "idle";
  private stateTimer = 0;
  private attackCooldown = 2;
  private facingRight = false;
  private walkSpeed = 2;
  private vy = 0;
  private fireBreathAngle = 0;
  private fireBreathTimer = 0;
  private fireBreathActive = false;
  private shellSpinSpeed = 0;
  private shellSpinDirection = 1;
  private hammers: Hammer[] = [];
  private shockwave: Shockwave = { x: 0, progress: 0, active: false };
  private rageTimer = 0;
  private screenShake = 0;
  private breathPhase = 0;
  private jawOpen = 0;
  private eyeGlow = 0;
  private defeatTimer = 0;
  private defeatExplosions = 0;
  readonly arenaLeft: number;
  readonly arenaRight: number;
  readonly groundY: number;

  constructor(arenaLeft: number, arenaRight: number, groundY: number) {
    super(BOWSER_HP, 10, groundY);
    this.arenaLeft = arenaLeft;
    this.arenaRight = arenaRight;
    this.groundY = groundY;
    for (let i = 0; i < 6; i++) {
      this.hammers.push({ x: 0, y: 0, vx: 0, vy: 0, rotation: 0, active: false });
    }
  }

  getBossName(): string {
    return "BOWSER";
  }

  private getPhaseLevel(): number {
    if (this.hp > 8) return 1;
    if (this.hp > 4) return 2;
    return 3;
  }

  getScreenShake(): number {
    const s = this.screenShake;
    this.screenShake = 0;
    return s;
  }

  /** Check if fire breath hits player */
  isFireHitting(px: number, py: number): boolean {
    if (!this.fireBreathActive) return false;
    const dx = px - this.x;
    const dy = py - (this.y + 4);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 18 || dist < 2) return false;

    const angleToPlayer = Math.atan2(dy, dx);
    const angleDiff = Math.abs(angleToPlayer - this.fireBreathAngle);
    return angleDiff < 0.4 || angleDiff > Math.PI * 2 - 0.4;
  }

  /** Check if shockwave hits player */
  isShockwaveHitting(px: number, py: number): boolean {
    if (!this.shockwave.active) return false;
    if (py > this.groundY + 1.5) return false; // Player jumped over it
    const waveRadius = this.shockwave.progress * 25;
    const dx = Math.abs(px - this.shockwave.x);
    return dx > waveRadius - 2 && dx < waveRadius + 2;
  }

  /** Check if any hammer is near player */
  isHammerNear(px: number, py: number): boolean {
    for (const h of this.hammers) {
      if (!h.active) continue;
      const dx = px - h.x;
      const dy = py - h.y;
      if (dx * dx + dy * dy < 2.25) return true;
    }
    return false;
  }

  /** Returns lava rise amount for arena phase 3 */
  getLavaRise(): number {
    if (this.getPhaseLevel() < 3) return 0;
    return Math.min(3, (1 - this.hp / 4) * 3);
  }

  update(dt: number, playerX: number, playerY: number) {
    this.updateTimers(dt);
    this.breathPhase += dt;
    this.rageTimer += dt;

    if (this.defeated) {
      this.updateDefeat(dt);
      return;
    }

    const phase = this.getPhaseLevel();
    this.facingRight = playerX > this.x;
    this.eyeGlow = phase === 3 ? 1 : phase === 2 ? 0.6 : 0.3;

    // Periodic screen shake in phase 3
    if (phase === 3 && Math.sin(this.rageTimer * 2) > 0.95) {
      this.screenShake = 3;
    }

    this.attackCooldown -= dt;
    this.updateHammers(dt);
    this.updateShockwave(dt);

    switch (this.attack) {
      case "idle":
        this.updateIdle(dt, playerX, phase);
        break;
      case "walk":
        this.updateWalk(dt, playerX, phase);
        break;
      case "fire_breath":
        this.updateFireBreath(dt, playerX, playerY, phase);
        break;
      case "ground_pound":
        this.updateGroundPound(dt);
        break;
      case "ground_pound_land":
        this.updateGroundPoundLand(dt);
        break;
      case "shell_spin":
        this.updateShellSpin(dt);
        break;
      case "hammer_throw":
        this.updateHammerThrow(dt, playerX);
        break;
      case "rage_roar":
        this.updateRageRoar(dt);
        break;
    }

    // Gravity
    if (this.y > this.groundY && this.attack !== "ground_pound") {
      this.vy -= 25 * dt;
      this.y += this.vy * dt;
      if (this.y <= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
      }
    }
  }

  private updateIdle(dt: number, playerX: number, phase: number) {
    this.stateTimer += dt;
    this.jawOpen = Math.max(0, this.jawOpen - dt * 3);

    if (this.stateTimer > 1) {
      this.chooseAttack(playerX, phase);
    }
  }

  private chooseAttack(playerX: number, phase: number) {
    if (this.attackCooldown > 0) {
      this.attack = "walk";
      this.stateTimer = 0;
      return;
    }

    const dist = Math.abs(playerX - this.x);
    const roll = Math.random();

    if (phase === 1) {
      if (dist < 10 && roll < 0.5) {
        this.startFireBreath();
      } else if (roll < 0.8) {
        this.startGroundPound();
      } else {
        this.attack = "walk";
        this.stateTimer = 0;
      }
    } else if (phase === 2) {
      if (roll < 0.25) {
        this.startFireBreath();
      } else if (roll < 0.5) {
        this.startGroundPound();
      } else if (roll < 0.75) {
        this.startShellSpin();
      } else {
        this.startHammerThrow();
      }
    } else {
      // Phase 3 - combo attacks
      if (roll < 0.2) {
        this.startFireBreath();
      } else if (roll < 0.45) {
        this.startGroundPound();
      } else if (roll < 0.6) {
        this.startShellSpin();
      } else if (roll < 0.8) {
        this.startHammerThrow();
      } else {
        this.attack = "rage_roar";
        this.stateTimer = 0;
        this.screenShake = 5;
      }
    }
    this.attackCooldown = phase === 3 ? 1 : phase === 2 ? 1.5 : 2;
  }

  private updateWalk(dt: number, playerX: number, phase: number) {
    this.stateTimer += dt;
    const speed = this.walkSpeed * (1 + (phase - 1) * 0.5);
    const dx = playerX - this.x;
    this.x += Math.sign(dx) * speed * dt;
    this.x = Math.max(this.arenaLeft + 3, Math.min(this.arenaRight - 3, this.x));

    if (this.stateTimer > 2 || Math.abs(dx) < 5) {
      this.chooseAttack(playerX, phase);
    }
  }

  private startFireBreath() {
    this.attack = "fire_breath";
    this.stateTimer = 0;
    this.fireBreathTimer = 0;
    this.fireBreathActive = false;
    this.jawOpen = 0;
  }

  private updateFireBreath(dt: number, playerX: number, playerY: number, phase: number) {
    this.stateTimer += dt;
    this.fireBreathTimer += dt;

    // Roar phase (telegraph)
    if (this.fireBreathTimer < 0.6) {
      this.jawOpen = Math.min(1, this.fireBreathTimer / 0.4);
      return;
    }

    // Fire phase
    this.fireBreathActive = true;
    const targetAngle = Math.atan2(playerY - (this.y + 4), playerX - this.x);
    if (phase >= 2) {
      // Track player
      this.fireBreathAngle += (targetAngle - this.fireBreathAngle) * dt * 2;
    } else {
      this.fireBreathAngle = this.facingRight ? 0 : Math.PI;
    }

    const duration = phase === 3 ? 2.5 : 2;
    if (this.fireBreathTimer > 0.6 + duration) {
      this.fireBreathActive = false;
      this.attack = "idle";
      this.stateTimer = 0;
      this.jawOpen = 0;
    }
  }

  private startGroundPound() {
    this.attack = "ground_pound";
    this.stateTimer = 0;
    this.vy = 18;
    this.y += 0.1;
  }

  private updateGroundPound(dt: number) {
    this.stateTimer += dt;

    if (this.stateTimer < 0.5) {
      // Rising
      this.vy -= 15 * dt;
      this.y += this.vy * dt;
    } else {
      // Slamming down
      this.vy -= 50 * dt;
      this.y += this.vy * dt;

      if (this.y <= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.attack = "ground_pound_land";
        this.stateTimer = 0;
        this.screenShake = 8;
        // Create shockwave
        this.shockwave = { x: this.x, progress: 0, active: true };
      }
    }
  }

  private updateGroundPoundLand(dt: number) {
    this.stateTimer += dt;
    // Vulnerable for 1.5 seconds after landing
    if (this.stateTimer > 1.5) {
      this.attack = "idle";
      this.stateTimer = 0;
    }
  }

  private startShellSpin() {
    this.attack = "shell_spin";
    this.stateTimer = 0;
    this.shellSpinSpeed = 18;
    this.shellSpinDirection = this.facingRight ? 1 : -1;
  }

  private updateShellSpin(dt: number) {
    this.stateTimer += dt;
    this.x += this.shellSpinDirection * this.shellSpinSpeed * dt;

    // Bounce off walls
    if (this.x > this.arenaRight - 3) {
      this.x = this.arenaRight - 3;
      this.shellSpinDirection = -1;
    }
    if (this.x < this.arenaLeft + 3) {
      this.x = this.arenaLeft + 3;
      this.shellSpinDirection = 1;
    }

    if (this.stateTimer > 3) {
      this.attack = "idle";
      this.stateTimer = 0;
    }
  }

  private startHammerThrow() {
    this.attack = "hammer_throw";
    this.stateTimer = 0;
  }

  private updateHammerThrow(dt: number, playerX: number) {
    this.stateTimer += dt;

    // Throw 3 hammers at intervals
    const throwTimes = [0.3, 0.6, 0.9];
    for (const t of throwTimes) {
      if (this.stateTimer > t && this.stateTimer - dt <= t) {
        this.throwHammer(playerX);
      }
    }

    if (this.stateTimer > 1.5) {
      this.attack = "idle";
      this.stateTimer = 0;
    }
  }

  private throwHammer(playerX: number) {
    for (const h of this.hammers) {
      if (!h.active) {
        h.x = this.x;
        h.y = this.y + 5;
        const dx = playerX - this.x;
        h.vx = Math.sign(dx) * (6 + Math.random() * 4);
        h.vy = 10 + Math.random() * 4;
        h.rotation = 0;
        h.active = true;
        return;
      }
    }
  }

  private updateHammers(dt: number) {
    for (const h of this.hammers) {
      if (!h.active) continue;
      h.vy -= 25 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rotation += dt * 8;
      if (h.y < this.groundY - 1) h.active = false;
    }
  }

  private updateShockwave(dt: number) {
    if (!this.shockwave.active) return;
    this.shockwave.progress += dt;
    if (this.shockwave.progress > 1) {
      this.shockwave.active = false;
    }
  }

  private updateRageRoar(dt: number) {
    this.stateTimer += dt;
    this.jawOpen = 1;
    if (this.stateTimer > 1.5) {
      this.attack = "idle";
      this.stateTimer = 0;
      this.jawOpen = 0;
    }
  }

  private updateDefeat(dt: number) {
    this.defeatTimer += dt;
    if (this.defeatTimer > this.defeatExplosions * 0.25 && this.defeatExplosions < 12) {
      this.defeatExplosions++;
      this.screenShake = 6;
    }
  }

  isDefeatedAnimationDone(): boolean {
    return this.defeated && this.defeatTimer > 4;
  }

  /** Is boss in vulnerable ground pound land state? */
  isGroundPoundVulnerable(): boolean {
    return this.attack === "ground_pound_land";
  }

  render(renderer: Renderer) {
    if (this.defeated && this.defeatTimer > 3.5) return;

    const ctx = renderer.ctx;
    const flashVisible = this.hitFlashTimer > 0 && Math.sin(this.hitFlashTimer * 40) > 0;
    const phase = this.getPhaseLevel();
    const rageColor = phase === 3 ? Math.sin(this.rageTimer * 4) * 0.3 + 0.3 : 0;

    ctx.save();
    if (flashVisible) ctx.globalAlpha = 0.5;

    const sx = renderer.worldToScreenX(this.x);
    const sy = renderer.worldToScreenY(this.y);
    const z = renderer.zoom;
    const dir = this.facingRight ? 1 : -1;

    const isSpinning = this.attack === "shell_spin";

    if (isSpinning) {
      this.renderShellSpin(renderer, sx, sy, z);
    } else {
      this.renderFullBowser(renderer, sx, sy, z, dir, rageColor);
    }

    ctx.restore();

    // Fire breath effect
    if (this.fireBreathActive) {
      this.renderFireBreath(renderer);
    }

    // Hammers
    this.renderHammers(renderer);

    // Shockwave
    if (this.shockwave.active) {
      this.renderShockwave(renderer);
    }

    // Defeat explosions
    if (this.defeated) {
      this.renderDefeatExplosions(renderer);
    }
  }

  private renderShellSpin(renderer: Renderer, sx: number, sy: number, z: number) {
    const ctx = renderer.ctx;
    const spinAngle = this.stateTimer * 12;

    ctx.save();
    ctx.translate(sx, sy - 2.5 * z);
    ctx.rotate(spinAngle);

    // Shell
    ctx.beginPath();
    ctx.arc(0, 0, 3 * z, 0, Math.PI * 2);
    ctx.fillStyle = "#228833";
    ctx.fill();
    ctx.strokeStyle = "#115522";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Spikes on shell
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spX = Math.cos(a) * 3 * z;
      const spY = Math.sin(a) * 3 * z;
      ctx.beginPath();
      ctx.arc(spX, spY, 0.5 * z, 0, Math.PI * 2);
      ctx.fillStyle = "#ddddcc";
      ctx.fill();
    }

    ctx.restore();
  }

  private renderFullBowser(renderer: Renderer, sx: number, sy: number, z: number, dir: number, rageColor: number) {
    const ctx = renderer.ctx;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(dir, 1);

    // Tail
    ctx.beginPath();
    ctx.moveTo(-1 * z, -1 * z);
    ctx.quadraticCurveTo(-3 * z, -0.5 * z, -4 * z, -2 * z);
    ctx.quadraticCurveTo(-3.5 * z, -1 * z, -1 * z, -0.5 * z);
    ctx.fillStyle = "#44aa44";
    ctx.fill();

    // Legs
    ctx.fillStyle = "#ccbb44";
    ctx.fillRect(-1.5 * z, -0.3 * z, 1.2 * z, 1.5 * z);
    ctx.fillRect(0.5 * z, -0.3 * z, 1.2 * z, 1.5 * z);

    // Feet
    ctx.fillStyle = "#ccbb44";
    ctx.beginPath();
    ctx.ellipse(-0.9 * z, 1.2 * z, 1 * z, 0.4 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1.1 * z, 1.2 * z, 1 * z, 0.4 * z, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shell (back)
    ctx.beginPath();
    ctx.ellipse(0, -3 * z, 3 * z, 2.5 * z, 0, 0, Math.PI * 2);
    const shellGrad = ctx.createRadialGradient(0, -3 * z, 0, 0, -3 * z, 3 * z);
    shellGrad.addColorStop(0, "#44bb55");
    shellGrad.addColorStop(0.7, "#228833");
    shellGrad.addColorStop(1, "#115522");
    ctx.fillStyle = shellGrad;
    ctx.fill();
    ctx.strokeStyle = "#115522";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shell rim
    ctx.beginPath();
    ctx.ellipse(0, -1.2 * z, 2.8 * z, 0.5 * z, 0, 0, Math.PI);
    ctx.fillStyle = "#ddcc88";
    ctx.fill();

    // Spikes on shell
    const spikes = [
      { a: -0.8, r: 2.8 }, { a: -0.4, r: 2.5 }, { a: 0, r: 2.8 },
      { a: 0.4, r: 2.5 }, { a: 0.8, r: 2.8 },
    ];
    for (const sp of spikes) {
      const spX = Math.sin(sp.a) * sp.r * z;
      const spY = -3 * z - Math.cos(sp.a) * sp.r * z;
      ctx.beginPath();
      ctx.arc(spX, spY, 0.6 * z, 0, Math.PI * 2);
      ctx.fillStyle = "#ddddcc";
      ctx.fill();
      ctx.strokeStyle = "#aaaaaa";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Belly
    ctx.beginPath();
    ctx.ellipse(0.3 * z, -2 * z, 2 * z, 2.5 * z, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ddcc66";
    ctx.fill();
    // Belly segments
    for (let i = 0; i < 4; i++) {
      const segY = -3.5 * z + i * 1.2 * z;
      ctx.beginPath();
      ctx.moveTo(-1.2 * z, segY);
      ctx.lineTo(1.8 * z, segY);
      ctx.strokeStyle = "#ccbb55";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Arms
    ctx.fillStyle = `rgb(${Math.floor(204 + rageColor * 50)}, ${Math.floor(187 - rageColor * 50)}, 68)`;
    ctx.fillRect(-2.5 * z, -4 * z, 1 * z, 2 * z);
    ctx.fillRect(2 * z, -4 * z, 1 * z, 2 * z);
    // Claws
    ctx.fillStyle = "#ddddcc";
    for (const xoff of [-2.5, 2]) {
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.arc((xoff + 0.2 + c * 0.3) * z, -4.2 * z, 0.15 * z, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Head
    const headY = -5.5 * z;
    ctx.beginPath();
    ctx.arc(0.2 * z, headY, 1.8 * z, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${Math.floor(68 + rageColor * 100)}, ${Math.floor(170 - rageColor * 80)}, 68)`;
    ctx.fill();

    // Snout
    ctx.beginPath();
    ctx.ellipse(1.2 * z, headY + 0.4 * z, 1.2 * z, 0.8 * z, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ccbb66";
    ctx.fill();

    // Mouth
    const mouthOpen = this.jawOpen * 0.8;
    ctx.beginPath();
    ctx.moveTo(0.5 * z, headY + 0.8 * z);
    ctx.lineTo(2.2 * z, headY + 0.5 * z);
    ctx.lineTo(2.2 * z, headY + (0.8 + mouthOpen) * z);
    ctx.lineTo(0.5 * z, headY + (1 + mouthOpen) * z);
    ctx.closePath();
    ctx.fillStyle = "#881111";
    ctx.fill();

    // Teeth
    if (mouthOpen > 0.1) {
      for (let t = 0; t < 4; t++) {
        const tx = (0.7 + t * 0.4) * z;
        ctx.beginPath();
        ctx.moveTo(tx, headY + 0.8 * z);
        ctx.lineTo(tx + 0.15 * z, headY + (0.8 + mouthOpen * 0.5) * z);
        ctx.lineTo(tx - 0.15 * z, headY + (0.8 + mouthOpen * 0.5) * z);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    }

    // Eyes
    const eyeY = headY - 0.3 * z;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-0.3 * z, eyeY, 0.5 * z, 0.6 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.8 * z, eyeY, 0.5 * z, 0.6 * z, 0, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrows
    ctx.strokeStyle = `rgb(${Math.floor(200 + rageColor * 55)}, ${Math.floor(50 - rageColor * 50)}, 0)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-0.7 * z, eyeY - 0.7 * z);
    ctx.lineTo(0.1 * z, eyeY - 0.3 * z);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1.3 * z, eyeY - 0.7 * z);
    ctx.lineTo(0.5 * z, eyeY - 0.3 * z);
    ctx.stroke();

    // Pupils - red glow
    ctx.save();
    ctx.shadowColor = `rgba(255, 0, 0, ${this.eyeGlow})`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgb(${Math.floor(200 + rageColor * 55)}, ${Math.floor(40 - rageColor * 40)}, 0)`;
    ctx.beginPath();
    ctx.arc(-0.2 * z, eyeY, 0.25 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.9 * z, eyeY, 0.25 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Horns
    for (const hx of [-0.8, 1.0]) {
      ctx.beginPath();
      ctx.moveTo((hx - 0.3) * z, headY - 1.5 * z);
      ctx.lineTo(hx * z, headY - 2.8 * z);
      ctx.lineTo((hx + 0.3) * z, headY - 1.5 * z);
      ctx.closePath();
      ctx.fillStyle = "#ddcc88";
      ctx.fill();
    }

    // Red hair/mane
    ctx.fillStyle = "#cc3300";
    for (let i = 0; i < 5; i++) {
      const hairX = (-0.8 + i * 0.5) * z;
      const hairY = headY - 1.8 * z;
      ctx.beginPath();
      ctx.ellipse(hairX, hairY, 0.4 * z, 0.8 * z, 0.3 * (i - 2), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderFireBreath(renderer: Renderer) {
    const ctx = renderer.ctx;
    const originX = this.x + (this.facingRight ? 2 : -2);
    const originY = this.y + 4;
    const angle = this.fireBreathAngle;
    const length = 15;

    ctx.save();
    const osx = renderer.worldToScreenX(originX);
    const osy = renderer.worldToScreenY(originY);

    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const dist = t * length;
      const spread = t * 3;
      const fx = originX + Math.cos(angle) * dist;
      const fy = originY + Math.sin(angle) * dist;
      const fsx = renderer.worldToScreenX(fx);
      const fsy = renderer.worldToScreenY(fy);
      const sr = (0.5 + spread) * renderer.zoom;

      const flicker = Math.sin(this.breathPhase * 10 + i * 2) * 0.2 + 0.8;
      ctx.globalAlpha = (1 - t * 0.7) * flicker;

      const fireGrad = ctx.createRadialGradient(fsx, fsy, 0, fsx, fsy, sr);
      fireGrad.addColorStop(0, "#ffee44");
      fireGrad.addColorStop(0.3, "#ff8800");
      fireGrad.addColorStop(0.7, "#ff3300");
      fireGrad.addColorStop(1, "rgba(200, 30, 0, 0)");

      ctx.beginPath();
      ctx.arc(fsx, fsy, sr, 0, Math.PI * 2);
      ctx.fillStyle = fireGrad;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private renderHammers(renderer: Renderer) {
    const ctx = renderer.ctx;
    for (const h of this.hammers) {
      if (!h.active) continue;
      const sx = renderer.worldToScreenX(h.x);
      const sy = renderer.worldToScreenY(h.y);
      const z = renderer.zoom;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(h.rotation);

      // Handle
      ctx.fillStyle = "#884422";
      ctx.fillRect(-0.15 * z, -0.8 * z, 0.3 * z, 1.6 * z);

      // Head
      ctx.fillStyle = "#888888";
      ctx.fillRect(-0.5 * z, -1.0 * z, 1.0 * z, 0.5 * z);

      ctx.restore();
    }
  }

  private renderShockwave(renderer: Renderer) {
    const ctx = renderer.ctx;
    const progress = this.shockwave.progress;
    const radius = progress * 25;
    const alpha = 1 - progress;

    const centerX = renderer.worldToScreenX(this.shockwave.x);
    const groundScreen = renderer.worldToScreenY(this.groundY + 0.5);

    ctx.save();
    ctx.globalAlpha = alpha * 0.6;

    // Wave effect on both sides
    for (const side of [-1, 1]) {
      const waveX = centerX + side * radius * renderer.zoom;
      ctx.beginPath();
      ctx.arc(waveX, groundScreen, 1.5 * renderer.zoom, 0, Math.PI * 2);
      ctx.fillStyle = "#ffcc44";
      ctx.fill();
    }

    // Ground line
    ctx.strokeStyle = `rgba(255, 200, 50, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - radius * renderer.zoom, groundScreen);
    ctx.lineTo(centerX + radius * renderer.zoom, groundScreen);
    ctx.stroke();

    ctx.restore();
  }

  private renderDefeatExplosions(renderer: Renderer) {
    const ctx = renderer.ctx;
    for (let i = 0; i < this.defeatExplosions; i++) {
      const t = this.defeatTimer - i * 0.25;
      if (t < 0 || t > 1) continue;

      const progress = t / 1;
      const angle = i * 2.1 + i * i * 0.4;
      const dist = 3 + i * 0.8;
      const ex = this.x + Math.cos(angle) * dist;
      const ey = this.y + 2 + Math.sin(angle) * dist;

      const sx = renderer.worldToScreenX(ex);
      const sy = renderer.worldToScreenY(ey);
      const sr = (1.5 + progress * 3) * renderer.zoom;

      ctx.save();
      ctx.globalAlpha = 1 - progress;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.2, "#ffee44");
      grad.addColorStop(0.5, "#ff6600");
      grad.addColorStop(1, "rgba(200, 20, 0, 0)");
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  protected getHitRadius(): number {
    return 4;
  }

  protected getDamageRadius(): number {
    return 3;
  }
}
