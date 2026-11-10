import { Renderer } from "../core/Renderer";

type MarioState = "running" | "jumping" | "attacking" | "stunned" | "idle";

interface FloatingText {
  text: string;
  x: number;
  y: number;
  life: number;
}

const PHRASES = ["Let's-a go!", "Yahoo!", "Here we go!", "Mamma mia!", "Wahoo!"];

export class MarioAlly {
  x: number;
  y: number;
  private state: MarioState = "idle";
  private facingRight = true;
  private vx = 0;
  private vy = 0;
  private stateTimer = 0;
  private attackCooldown = 0;
  private stunTimer = 0;
  private runPhase = 0;
  private floatingTexts: FloatingText[] = [];
  private phraseTimer = 0;
  private groundY: number;

  constructor(x: number, groundY: number) {
    this.x = x;
    this.y = groundY;
    this.groundY = groundY;
  }

  update(dt: number, bossX: number, bossY: number, bossVulnerable: boolean, arenaLeft: number, arenaRight: number) {
    this.stateTimer += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.phraseTimer += dt;
    this.runPhase += dt * Math.abs(this.vx) * 2;

    // Update floating texts
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.y += dt * 2;
      t.life -= dt;
      return t.life > 0;
    });

    switch (this.state) {
      case "idle":
        this.updateIdle(dt, bossX);
        break;
      case "running":
        this.updateRunning(dt, bossX, bossY, bossVulnerable, arenaLeft, arenaRight);
        break;
      case "jumping":
        this.updateJumping(dt);
        break;
      case "attacking":
        this.updateAttacking(dt);
        break;
      case "stunned":
        this.updateStunned(dt);
        break;
    }

    // Clamp to arena
    this.x = Math.max(arenaLeft + 1, Math.min(arenaRight - 1, this.x));

    // Say phrases occasionally
    if (this.phraseTimer > 8 && this.state !== "stunned") {
      this.sayPhrase();
      this.phraseTimer = 0;
    }
  }

  private updateIdle(dt: number, bossX: number) {
    this.stateTimer += dt;
    if (this.stateTimer > 1) {
      this.state = "running";
      this.stateTimer = 0;
      this.facingRight = bossX > this.x;
    }
  }

  private updateRunning(dt: number, bossX: number, bossY: number, bossVulnerable: boolean, arenaLeft: number, arenaRight: number) {
    const dx = bossX - this.x;
    const targetDist = bossVulnerable ? 3 : 12;

    // Move toward or maintain distance from boss
    if (Math.abs(dx) > targetDist + 2) {
      this.vx += Math.sign(dx) * 20 * dt;
    } else if (Math.abs(dx) < targetDist - 2) {
      this.vx -= Math.sign(dx) * 15 * dt;
    } else {
      this.vx *= 0.9;
    }

    // Clamp speed
    this.vx = Math.max(-8, Math.min(8, this.vx));
    this.x += this.vx * dt;
    this.facingRight = this.vx > 0.5 ? true : this.vx < -0.5 ? false : this.facingRight;

    // Dodge fire breath: if boss is attacking and nearby, jump
    if (bossY < 5 && Math.abs(dx) < 15) {
      if (Math.random() < dt * 2) {
        this.jump();
      }
    }

    // Attack when boss is vulnerable and close enough
    if (bossVulnerable && Math.abs(dx) < 5 && this.attackCooldown <= 0) {
      this.state = "jumping";
      this.vy = 14;
      this.vx = Math.sign(dx) * 6;
      this.stateTimer = 0;
      this.attackCooldown = 5;
      this.sayPhrase();
    }

    // Keep on ground
    if (this.y <= this.groundY) {
      this.y = this.groundY;
    }
  }

  private updateJumping(dt: number) {
    this.vy -= 32 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y <= this.groundY) {
      this.y = this.groundY;
      this.vy = 0;
      this.state = "running";
      this.stateTimer = 0;
    }
  }

  private updateAttacking(dt: number) {
    this.vy -= 32 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y <= this.groundY) {
      this.y = this.groundY;
      this.vy = 0;
      this.state = "running";
      this.stateTimer = 0;
    }
  }

  private updateStunned(dt: number) {
    this.stunTimer -= dt;
    // Flash effect
    if (this.stunTimer <= 0) {
      this.state = "running";
      this.stateTimer = 0;
    }
    // Still apply gravity
    if (this.y > this.groundY) {
      this.vy -= 32 * dt;
      this.y += this.vy * dt;
      if (this.y <= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
      }
    }
  }

  private jump() {
    if (this.y <= this.groundY + 0.1) {
      this.state = "jumping";
      this.vy = 12;
      this.stateTimer = 0;
    }
  }

  takeDamage(sourceX: number) {
    this.state = "stunned";
    this.stunTimer = 2;
    this.vy = 6;
    this.vx = (this.x - sourceX) > 0 ? 5 : -5;
    this.stateTimer = 0;
  }

  /** Returns true if Mario just attacked the boss (hit detection) */
  checkBossHit(bossX: number, bossY: number): boolean {
    if (this.state !== "jumping" && this.state !== "attacking") return false;
    if (this.vy > 0) return false; // Only hit on way down
    const dx = this.x - bossX;
    const dy = this.y - bossY;
    if (Math.abs(dx) < 3 && dy > -1 && dy < 4) {
      this.vy = 10; // Bounce off
      this.state = "attacking";
      return true;
    }
    return false;
  }

  private sayPhrase() {
    const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    this.floatingTexts.push({
      text: phrase,
      x: this.x,
      y: this.y + 3,
      life: 2,
    });
  }

  render(renderer: Renderer) {
    const ctx = renderer.ctx;
    const sx = renderer.worldToScreenX(this.x);
    const sy = renderer.worldToScreenY(this.y + 0.8);
    const z = renderer.zoom;
    const dir = this.facingRight ? 1 : -1;

    const stunFlash = this.state === "stunned" && Math.sin(this.stunTimer * 15) > 0;
    if (stunFlash) {
      ctx.globalAlpha = 0.4;
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(dir, 1);

    // Legs
    const legSwing = this.state === "running" ? Math.sin(this.runPhase * 8) * 0.5 : 0;
    // Left leg
    ctx.fillStyle = "#2244aa";
    ctx.fillRect(-0.4 * z, 0.2 * z, 0.35 * z, 0.8 * z);
    // Right leg
    ctx.fillRect(0.05 * z, 0.2 * z + legSwing * 0.3 * z, 0.35 * z, 0.8 * z);
    // Shoes
    ctx.fillStyle = "#663300";
    ctx.fillRect(-0.5 * z, 1.0 * z, 0.5 * z, 0.2 * z);
    ctx.fillRect(0.0 * z, 1.0 * z + legSwing * 0.3 * z, 0.5 * z, 0.2 * z);

    // Body / overalls
    ctx.fillStyle = "#2244aa";
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.6 * z, 0.7 * z, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shirt
    ctx.fillStyle = "#cc2222";
    ctx.beginPath();
    ctx.ellipse(0, -0.3 * z, 0.55 * z, 0.4 * z, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    const armSwing = this.state === "running" ? Math.sin(this.runPhase * 8 + Math.PI) * 0.4 : 0;
    ctx.fillStyle = "#cc2222";
    ctx.fillRect(-0.8 * z, -0.4 * z + armSwing * 0.3 * z, 0.3 * z, 0.6 * z);
    ctx.fillRect(0.5 * z, -0.4 * z - armSwing * 0.3 * z, 0.3 * z, 0.6 * z);
    // Gloves
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-0.65 * z, 0.25 * z + armSwing * 0.3 * z, 0.2 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.65 * z, 0.25 * z - armSwing * 0.3 * z, 0.2 * z, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#ffcc88";
    ctx.beginPath();
    ctx.arc(0, -0.9 * z, 0.5 * z, 0, Math.PI * 2);
    ctx.fill();

    // Cap
    ctx.fillStyle = "#cc2222";
    ctx.beginPath();
    ctx.ellipse(0, -1.1 * z, 0.55 * z, 0.3 * z, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // Cap brim
    ctx.fillStyle = "#cc2222";
    ctx.fillRect(-0.1 * z, -1.15 * z, 0.7 * z, 0.15 * z);
    // M on cap
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0.05 * z, -1.2 * z, 0.18 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cc2222";
    ctx.font = `bold ${0.22 * z}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("M", 0.05 * z, -1.18 * z);

    // Eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-0.15 * z, -0.85 * z, 0.12 * z, 0.15 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.15 * z, -0.85 * z, 0.12 * z, 0.15 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = "#2244aa";
    ctx.beginPath();
    ctx.arc(-0.12 * z, -0.85 * z, 0.06 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.18 * z, -0.85 * z, 0.06 * z, 0, Math.PI * 2);
    ctx.fill();

    // Mustache
    ctx.fillStyle = "#443322";
    ctx.beginPath();
    ctx.ellipse(0.05 * z, -0.65 * z, 0.35 * z, 0.1 * z, 0, 0, Math.PI);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#ffaa66";
    ctx.beginPath();
    ctx.arc(0.1 * z, -0.72 * z, 0.12 * z, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;

    // Floating texts
    for (const ft of this.floatingTexts) {
      const ftsx = renderer.worldToScreenX(ft.x);
      const ftsy = renderer.worldToScreenY(ft.y);
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.life);
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ftsx, ftsy);
      ctx.fillText(ft.text, ftsx, ftsy);
      ctx.restore();
    }
  }
}
