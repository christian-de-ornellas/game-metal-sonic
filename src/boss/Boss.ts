import { Renderer } from "../core/Renderer";

export type BossPhase = "idle" | "attacking" | "vulnerable" | "defeated";

export abstract class Boss {
  hp: number;
  maxHp: number;
  phase: BossPhase = "idle";
  invulnerableTimer = 0;
  hitFlashTimer = 0;
  defeated = false;
  x: number;
  y: number;

  constructor(maxHp: number, x: number, y: number) {
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.x = x;
    this.y = y;
  }

  abstract update(dt: number, playerX: number, playerY: number): void;
  abstract render(renderer: Renderer): void;

  takeDamage(): boolean {
    if (!this.isVulnerable()) return false;
    this.hp--;
    this.invulnerableTimer = 1.0;
    this.hitFlashTimer = 0.3;
    if (this.hp <= 0) {
      this.hp = 0;
      this.phase = "defeated";
      this.defeated = true;
    }
    return true;
  }

  isVulnerable(): boolean {
    return this.invulnerableTimer <= 0 && this.phase !== "defeated";
  }

  protected updateTimers(dt: number) {
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
  }

  renderHealthBar(renderer: Renderer) {
    const ctx = renderer.ctx;
    const barWidth = 300;
    const barHeight = 20;
    const x = (renderer.width - barWidth) / 2;
    const y = 50;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

    // Empty bar
    ctx.fillStyle = "#330000";
    ctx.fillRect(x, y, barWidth, barHeight);

    // Health fill
    const fillWidth = (this.hp / this.maxHp) * barWidth;
    const healthPct = this.hp / this.maxHp;
    let color: string;
    if (healthPct > 0.5) color = "#00cc44";
    else if (healthPct > 0.25) color = "#ccaa00";
    else color = "#cc2200";

    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillWidth, barHeight);

    // Hit flash overlay
    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.hitFlashTimer / 0.3 * 0.6})`;
      ctx.fillRect(x, y, fillWidth, barHeight);
    }

    // Border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Boss name
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(this.getBossName(), renderer.width / 2, y - 8);
  }

  abstract getBossName(): string;

  /** Check if player spin/attack collides with boss hitbox */
  checkPlayerCollision(playerX: number, playerY: number, isAttacking: boolean): boolean {
    if (!isAttacking || !this.isVulnerable()) return false;
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.getHitRadius();
  }

  /** Check if boss body damages player */
  checkDamageToPlayer(playerX: number, playerY: number): boolean {
    if (this.defeated) return false;
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.getDamageRadius();
  }

  protected abstract getHitRadius(): number;
  protected abstract getDamageRadius(): number;
}
