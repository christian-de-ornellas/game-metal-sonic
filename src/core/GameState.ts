export class GameState {
  rings = 0;
  score = 0;
  lives = 3;
  time = 0;
  paused = false;
  gameOver = false;
  titleScreen = true;
  invincible = false;
  invincibilityTimer = 0;
  speedBoost = false;
  speedBoostTimer = 0;
  shield = false;
  zoneIndex = 0;
  actClearPending = false;
  bossesDefeated = 0;
  totalRingsCollected = 0;

  // Checkpoint
  private checkpointX = 5;
  private checkpointY = 2;

  addRings(count: number) {
    this.rings += count;
    this.score += count * 10;
    this.totalRingsCollected += count;
    if (this.rings >= 100) {
      this.rings -= 100;
      this.lives++;
    }
  }

  loseRings(): number {
    const lost = this.rings;
    this.rings = 0;
    return lost;
  }

  addScore(points: number) {
    this.score += points;
  }

  loseLife(): boolean {
    this.lives--;
    return this.lives >= 0;
  }

  setCheckpoint(x: number, y: number) {
    this.checkpointX = x;
    this.checkpointY = y;
  }

  getCheckpoint(): { x: number; y: number } {
    return { x: this.checkpointX, y: this.checkpointY };
  }

  resetForNewZone() {
    this.time = 0;
    this.rings = 0;
    this.invincible = false;
    this.invincibilityTimer = 0;
    this.speedBoost = false;
    this.speedBoostTimer = 0;
    this.shield = false;
    this.actClearPending = false;
    this.checkpointX = 5;
    this.checkpointY = 2;
  }

  reset() {
    this.rings = 0;
    this.score = 0;
    this.lives = 3;
    this.time = 0;
    this.paused = false;
    this.gameOver = false;
    this.invincible = false;
    this.invincibilityTimer = 0;
    this.speedBoost = false;
    this.speedBoostTimer = 0;
    this.shield = false;
    this.zoneIndex = 0;
    this.actClearPending = false;
    this.checkpointX = 5;
    this.checkpointY = 2;
    this.bossesDefeated = 0;
    this.totalRingsCollected = 0;
  }

  update(dt: number) {
    if (!this.paused && !this.gameOver && !this.titleScreen) {
      this.time += dt;
    }
    if (this.invincible) {
      this.invincibilityTimer -= dt;
      if (this.invincibilityTimer <= 0) {
        this.invincible = false;
      }
    }
    if (this.speedBoost) {
      this.speedBoostTimer -= dt;
      if (this.speedBoostTimer <= 0) {
        this.speedBoost = false;
      }
    }
  }
}
