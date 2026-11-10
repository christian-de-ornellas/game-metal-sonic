import { Renderer } from "../core/Renderer";
import { GameState } from "../core/GameState";
import { TerrainBuilder, CASINO_NIGHT_THEME } from "./terrain/TerrainBuilder";
import { PlatformBuilder } from "./terrain/PlatformBuilder";
import { SpringBuilder, Spring } from "./terrain/SpringBuilder";
import { BumperBuilder } from "./terrain/BumperBuilder";
import { FlipperBuilder } from "./terrain/FlipperBuilder";
import { ParallaxBackground } from "./decoration/ParallaxBackground";
import { NeonSignBuilder } from "./decoration/NeonSignBuilder";
import { RingManager } from "../collectibles/RingManager";
import { PowerUpMonitor } from "../collectibles/PowerUpMonitor";
import { Badnik } from "../enemies/Badnik";
import { BuzzBomber } from "../enemies/BuzzBomber";
import { Crawl } from "../enemies/Crawl";
import { Flasher } from "../enemies/Flasher";
import { MetalSonicController } from "../character/MetalSonicController";
import { Zone, ZoneConfig, LevelEvents } from "./Zone";

interface Checkpoint {
  x: number;
  y: number;
  activated: boolean;
  spinAngle: number;
}

function casinoNightHeight(x: number): number {
  // Flat entrance (0..30)
  if (x < 30) return 0;

  // Half-pipe down (30..50, y→-5)
  if (x < 50) {
    const t = (x - 30) / 20;
    return -t * 5;
  }

  // Bottom (50..70)
  if (x < 70) {
    return -5 + Math.sin((x - 50) * 0.15) * 0.5;
  }

  // Half-pipe up (70..90)
  if (x < 90) {
    const t = (x - 70) / 20;
    return -5 + t * 5;
  }

  // Bumper section flat (90..150)
  if (x < 150) {
    return 0 + Math.sin((x - 90) * 0.1) * 1;
  }

  // Elevated floor (150..200, y=3)
  if (x < 200) {
    if (x < 160) {
      const t = (x - 150) / 10;
      return t * 3;
    }
    return 3 + Math.sin((x - 160) * 0.12) * 1;
  }

  // Descent (200..220)
  if (x < 220) {
    const t = (x - 200) / 20;
    return 3 - t * 5; // 3 → -2
  }

  // Low section (220..280)
  if (x < 280) {
    return -2 + Math.sin((x - 220) * 0.1) * 1.5;
  }

  // Ramp up (280..310)
  if (x < 310) {
    const t = (x - 280) / 30;
    return -2 + t * 4; // -2 → 2
  }

  // Final floor (310..400)
  return 2;
}

export class CasinoNightZone implements Zone {
  readonly config: ZoneConfig = {
    name: "CASINO NIGHT",
    act: 1,
    levelLength: 400,
    startPosition: { x: 5, y: 2 },
    cameraBounds: { left: -5, right: 410, bottom: -15, top: 40 },
  };

  terrainBuilder: TerrainBuilder;
  platformBuilder: PlatformBuilder;
  springBuilder: SpringBuilder;
  bumperBuilder: BumperBuilder;
  flipperBuilder: FlipperBuilder;
  parallaxBackground: ParallaxBackground;
  neonSigns: NeonSignBuilder;
  ringManager: RingManager;
  powerUps: PowerUpMonitor;
  enemies: Badnik[] = [];

  private time = 0;
  goalReached = false;
  private goalX = 395;
  private goalY = 0;
  private goalSpinAngle = 0;
  private goalSpinFast = false;

  private checkpoints: Checkpoint[] = [];

  constructor(private gameState: GameState) {
    this.terrainBuilder = new TerrainBuilder(casinoNightHeight, CASINO_NIGHT_THEME);
    this.platformBuilder = new PlatformBuilder();
    this.springBuilder = new SpringBuilder();
    this.bumperBuilder = new BumperBuilder();
    this.flipperBuilder = new FlipperBuilder();
    this.parallaxBackground = new ParallaxBackground(ParallaxBackground.casinoNightTheme());
    this.neonSigns = new NeonSignBuilder();
    this.ringManager = new RingManager(gameState);
    this.powerUps = new PowerUpMonitor(gameState);
  }

  build() {
    const getH = (x: number) => casinoNightHeight(x);

    // Bumpers in the bumper section (x: 95-145)
    this.bumperBuilder.addBumper(100, 3, 0.8);
    this.bumperBuilder.addBumper(110, 4, 0.8);
    this.bumperBuilder.addBumper(105, 5.5, 0.7);
    this.bumperBuilder.addBumper(120, 3.5, 0.8);
    this.bumperBuilder.addBumper(115, 5, 0.7);
    this.bumperBuilder.addBumper(130, 4, 0.8);
    this.bumperBuilder.addBumper(125, 5.5, 0.7);
    this.bumperBuilder.addBumper(140, 3, 0.8);
    this.bumperBuilder.addBumper(135, 5, 0.7);

    // Bumpers in low section
    this.bumperBuilder.addBumper(235, 1, 0.8);
    this.bumperBuilder.addBumper(250, 2, 0.7);
    this.bumperBuilder.addBumper(265, 1, 0.8);

    // Flippers at bottom of half-pipes
    this.flipperBuilder.addFlipper(55, getH(55), 3, 0.3, "left");
    this.flipperBuilder.addFlipper(65, getH(65), 3, 0.3, "right");

    // Flippers in low section
    this.flipperBuilder.addFlipper(230, getH(230), 3, 0.3, "left");
    this.flipperBuilder.addFlipper(270, getH(270), 3, 0.3, "right");

    // Platforms
    this.platformBuilder.addPlatform(105, 7, 3, 0.5, 0, 1, 2, 1.0, 0);
    this.platformBuilder.addPlatform(175, 7, 3, 0.5, 1, 0, 3, 0.8, Math.PI / 3);
    this.platformBuilder.addPlatform(245, 3, 3, 0.5, 0, 1, 2, 1.2, Math.PI);

    // Springs
    this.springBuilder.addSpring(25, getH(25), 18);
    this.springBuilder.addSpring(88, getH(88), 24, Math.PI / 2, "red");
    this.springBuilder.addSpring(148, getH(148), 20, Math.PI / 3, "yellow");
    this.springBuilder.addSpring(218, getH(218), 24, Math.PI / 2, "red");
    this.springBuilder.addSpring(305, getH(305), 18);
    this.springBuilder.addSpring(370, getH(370), 24, Math.PI / 2, "red");

    // Neon signs (replace palm trees)
    this.neonSigns.addSignLine(10, 85, 8, getH);
    this.neonSigns.addSignLine(150, 200, 5, getH);
    this.neonSigns.addSignLine(310, 390, 8, getH);

    // Checkpoints
    this.checkpoints.push({ x: 90, y: getH(90), activated: false, spinAngle: 0 });
    this.checkpoints.push({ x: 200, y: getH(200), activated: false, spinAngle: 0 });
    this.checkpoints.push({ x: 340, y: getH(340), activated: false, spinAngle: 0 });

    // Rings
    this.buildRings(getH);

    // Power-ups
    this.powerUps.addMonitor(100, getH(100) + 2, "invincibility");
    this.powerUps.addMonitor(200, getH(200) + 2, "shield");
    this.powerUps.addMonitor(340, getH(340) + 2, "speed_shoes");

    // Enemies
    this.spawnEnemies(getH);

    // Goal post
    this.goalY = getH(this.goalX);
  }

  private buildRings(getH: (x: number) => number) {
    // Entrance
    this.ringManager.addLine(5, 1, 25, 1, 8);

    // Half-pipe rings
    for (let x = 32; x < 48; x += 3) {
      this.ringManager.addRing(x, getH(x) + 1.5);
    }

    // Bottom of half-pipe
    this.ringManager.addLine(52, -3.5, 68, -3.5, 8);

    // Rising out of half-pipe
    for (let x = 72; x < 88; x += 3) {
      this.ringManager.addRing(x, getH(x) + 1.5);
    }

    // Bumper section - floating rings among bumpers
    for (let x = 95; x < 145; x += 7) {
      this.ringManager.addRing(x, 2);
      this.ringManager.addRing(x + 3, 4);
    }
    // High rings above bumpers
    this.ringManager.addLine(100, 7, 140, 7, 8);

    // Elevated section
    for (let x = 155; x < 195; x += 5) {
      this.ringManager.addRing(x, getH(x) + 1.2);
    }

    // Low section zigzag
    for (let i = 0; i < 15; i++) {
      const x = 225 + i * 3.5;
      const zigzag = (i % 2 === 0) ? getH(x) + 1 : getH(x) + 2.5;
      this.ringManager.addRing(x, zigzag);
    }

    // Final section
    for (let x = 315; x < 390; x += 4) {
      this.ringManager.addRing(x, getH(x) + 1 + (Math.floor(x / 4) % 2) * 1.5);
    }
  }

  private spawnEnemies(getH: (x: number) => number) {
    // BuzzBombers
    this.enemies.push(new BuzzBomber(20, 4, 8));
    this.enemies.push(new BuzzBomber(170, 7, 10));
    this.enemies.push(new BuzzBomber(300, 5, 12));
    this.enemies.push(new BuzzBomber(375, 5, 8));

    // Crawl (armored, shield on top)
    this.enemies.push(new Crawl(35, 12, getH));
    this.enemies.push(new Crawl(160, 10, getH));
    this.enemies.push(new Crawl(290, 10, getH));
    this.enemies.push(new Crawl(360, 8, getH));

    // Flasher (invulnerability cycling)
    this.enemies.push(new Flasher(80, 3));
    this.enemies.push(new Flasher(125, 6));
    this.enemies.push(new Flasher(240, 2));
    this.enemies.push(new Flasher(350, 5));
  }

  update(dt: number, playerX: number, playerY: number, controller: MetalSonicController): LevelEvents {
    this.time += dt;

    this.parallaxBackground.update(dt);
    this.platformBuilder.update(this.time);
    this.bumperBuilder.update(dt);
    this.flipperBuilder.update(dt);
    this.neonSigns.update(dt);
    this.springBuilder.update(dt);

    const springHit = this.springBuilder.checkCollision(controller);
    const ringCollected = this.ringManager.update(dt, playerX, playerY);

    this.powerUps.update(dt);
    this.powerUps.checkCollision(playerX, playerY, controller.isAttacking());

    // Bumper collision
    const bumperHit = this.bumperBuilder.checkCollision(controller);
    if (bumperHit) {
      this.gameState.addScore(bumperHit.score);
    }

    // Flipper collision
    this.flipperBuilder.checkCollision(controller);

    for (const enemy of this.enemies) {
      enemy.update(dt, playerX, playerY);
    }

    // Checkpoints
    for (const cp of this.checkpoints) {
      cp.spinAngle += dt * (cp.activated ? 2 : 0.5);
      if (!cp.activated) {
        const dx = playerX - cp.x;
        const dy = playerY - cp.y;
        if (Math.sqrt(dx * dx + dy * dy) < 2.5) {
          cp.activated = true;
          this.gameState.setCheckpoint(cp.x, cp.y + 1);
        }
      }
    }

    // Goal post
    this.goalSpinAngle += dt * (this.goalSpinFast ? 15 : 3);

    if (!this.goalReached) {
      const dx = playerX - this.goalX;
      const dy = playerY - this.goalY;
      if (Math.sqrt(dx * dx + dy * dy) < 3) {
        this.goalReached = true;
        this.goalSpinFast = true;
        this.gameState.addScore(1000);
      }
    }

    return { ringCollected, springHit, goalReached: this.goalReached, bumperHit };
  }

  getEffectiveHeight(x: number, y: number, vy: number): number {
    const terrainH = this.terrainBuilder.getHeight(x);

    const platH = this.platformBuilder.checkPlatformCollision(x, y, vy);
    if (platH !== null) {
      return Math.max(terrainH, platH);
    }

    return terrainH;
  }

  getStartPosition(): { x: number; y: number } {
    return { x: 5, y: casinoNightHeight(5) + 2 };
  }

  getTime(): number {
    return this.time;
  }

  render(r: Renderer) {
    this.parallaxBackground.render(r);
    this.neonSigns.render(r);
    this.terrainBuilder.render(r);
    this.platformBuilder.render(r);
    this.springBuilder.render(r);
    this.bumperBuilder.render(r);
    this.flipperBuilder.render(r);
    this.ringManager.render(r);
    this.powerUps.render(r);

    for (const enemy of this.enemies) {
      enemy.render(r);
    }

    this.renderCheckpoints(r);
    this.renderGoalPost(r);
  }

  private renderCheckpoints(r: Renderer) {
    const bounds = r.getVisibleBounds();
    const ctx = r.ctx;

    for (const cp of this.checkpoints) {
      if (cp.x < bounds.left - 3 || cp.x > bounds.right + 3) continue;

      const sx = r.worldToScreenX(cp.x);
      const baseY = r.worldToScreenY(cp.y);
      const poleH = 3.5 * r.zoom;

      ctx.fillStyle = "#cc3344";
      ctx.fillRect(sx - 1, baseY - poleH, 2, poleH);

      const scaleX = Math.cos(cp.spinAngle);
      const signW = 1 * r.zoom * Math.abs(scaleX);
      const signH = 1 * r.zoom;
      const signY = baseY - poleH + 0.3 * r.zoom;

      const color = cp.activated
        ? (scaleX > 0 ? "#ffcc00" : "#ffffff")
        : (scaleX > 0 ? "#888888" : "#666666");
      ctx.fillStyle = color;
      ctx.fillRect(sx - signW / 2, signY, signW, signH);

      ctx.strokeStyle = cp.activated ? "#cc8800" : "#555555";
      ctx.lineWidth = Math.max(1, 0.03 * r.zoom);
      ctx.strokeRect(sx - signW / 2, signY, signW, signH);
    }
  }

  private renderGoalPost(r: Renderer) {
    const bounds = r.getVisibleBounds();
    if (this.goalX < bounds.left - 5 || this.goalX > bounds.right + 5) return;

    const ctx = r.ctx;
    const sx = r.worldToScreenX(this.goalX);
    const baseY = r.worldToScreenY(this.goalY);
    const poleH = 5 * r.zoom;

    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(sx - 1.5, baseY - poleH, 3, poleH);

    ctx.beginPath();
    ctx.ellipse(sx, baseY, 0.5 * r.zoom, 0.15 * r.zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffcc00";
    ctx.fill();

    const scaleX = Math.cos(this.goalSpinAngle);
    const signW = 1.5 * r.zoom * Math.abs(scaleX);
    const signH = 1.5 * r.zoom;
    const signY = baseY - poleH + 0.5 * r.zoom;

    const signColor = scaleX > 0 ? "#ff44aa" : "#44aaff";
    ctx.fillStyle = signColor;
    ctx.fillRect(sx - signW / 2, signY, signW, signH);

    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = Math.max(1, 0.04 * r.zoom);
    ctx.strokeRect(sx - signW / 2, signY, signW, signH);
  }
}
