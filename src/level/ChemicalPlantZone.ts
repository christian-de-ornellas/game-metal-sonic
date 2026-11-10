import { Renderer } from "../core/Renderer";
import { GameState } from "../core/GameState";
import { TerrainBuilder, CHEMICAL_PLANT_THEME } from "./terrain/TerrainBuilder";
import { PlatformBuilder } from "./terrain/PlatformBuilder";
import { SpringBuilder, Spring } from "./terrain/SpringBuilder";
import { ConveyorBuilder } from "./terrain/ConveyorBuilder";
import { ParallaxBackground } from "./decoration/ParallaxBackground";
import { ToxicWaterEffect } from "./decoration/ToxicWaterEffect";
import { RingManager } from "../collectibles/RingManager";
import { PowerUpMonitor } from "../collectibles/PowerUpMonitor";
import { Badnik } from "../enemies/Badnik";
import { BuzzBomber } from "../enemies/BuzzBomber";
import { Grabber } from "../enemies/Grabber";
import { Spiny } from "../enemies/Spiny";
import { MetalSonicController } from "../character/MetalSonicController";
import { Zone, ZoneConfig, LevelEvents } from "./Zone";

interface Checkpoint {
  x: number;
  y: number;
  activated: boolean;
  spinAngle: number;
}

function chemicalPlantHeight(x: number): number {
  // Flat start (0..25)
  if (x < 25) return 0;

  // Ramp up (25..40, y=0→6)
  if (x < 40) {
    const t = (x - 25) / 15;
    return t * 6;
  }

  // Elevated factory (40..80)
  if (x < 80) {
    return 6 + Math.sin((x - 40) * 0.15) * 1.5;
  }

  // Drop (80..95, y→-2)
  if (x < 95) {
    const t = (x - 80) / 15;
    return 6 - t * 8; // 6 → -2
  }

  // Toxic zone flat (95..140)
  if (x < 140) return -2;

  // Ramp up from toxic (140..160)
  if (x < 160) {
    const t = (x - 140) / 20;
    return -2 + t * 5; // -2 → 3
  }

  // Mid factory (160..220)
  if (x < 220) {
    return 3 + Math.sin((x - 160) * 0.1) * 2;
  }

  // Speed descent (220..250)
  if (x < 250) {
    const t = (x - 220) / 30;
    return 3 - t * 4; // 3 → -1
  }

  // Low floor (250..300)
  if (x < 300) {
    return -1 + Math.sin((x - 250) * 0.12) * 1;
  }

  // Final ramp (300..330)
  if (x < 330) {
    const t = (x - 300) / 30;
    return -1 + t * 2; // -1 → 1
  }

  // Sprint (330..400)
  return 1;
}

export class ChemicalPlantZone implements Zone {
  readonly config: ZoneConfig = {
    name: "CHEMICAL PLANT",
    act: 1,
    levelLength: 400,
    startPosition: { x: 5, y: 2 },
    cameraBounds: { left: -5, right: 410, bottom: -15, top: 40 },
  };

  terrainBuilder: TerrainBuilder;
  platformBuilder: PlatformBuilder;
  springBuilder: SpringBuilder;
  conveyorBuilder: ConveyorBuilder;
  parallaxBackground: ParallaxBackground;
  toxicWater: ToxicWaterEffect;
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
    this.terrainBuilder = new TerrainBuilder(chemicalPlantHeight, CHEMICAL_PLANT_THEME);
    this.platformBuilder = new PlatformBuilder();
    this.springBuilder = new SpringBuilder();
    this.conveyorBuilder = new ConveyorBuilder();
    this.parallaxBackground = new ParallaxBackground(ParallaxBackground.chemicalPlantTheme());
    this.toxicWater = new ToxicWaterEffect();
    this.ringManager = new RingManager(gameState);
    this.powerUps = new PowerUpMonitor(gameState);
  }

  build() {
    const getH = (x: number) => chemicalPlantHeight(x);

    // Toxic water zone (x: 90-145)
    this.toxicWater.build(90, 55, -4);

    // Conveyors
    this.conveyorBuilder.addConveyor(45, 75, getH(60), 4);   // forward on factory
    this.conveyorBuilder.addConveyor(165, 195, getH(180), -3); // backward mid factory
    this.conveyorBuilder.addConveyor(260, 290, getH(275), 5);  // speed boost low section

    // Platforms over toxic zone
    this.platformBuilder.addPlatform(100, 0, 3, 0.5, 0, 1, 2, 1.2, 0);
    this.platformBuilder.addPlatform(115, 1, 3, 0.5, 1, 0, 3, 0.8, Math.PI / 3);
    this.platformBuilder.addPlatform(130, 0, 3, 0.5, 0, 1, 2, 1.0, Math.PI);

    // Springs
    this.springBuilder.addSpring(20, getH(20), 18);                           // intro
    this.springBuilder.addSpring(88, getH(88), 24, Math.PI / 2, "red");      // before toxic
    this.springBuilder.addSpring(155, getH(155), 20, Math.PI / 3, "yellow"); // out of toxic
    this.springBuilder.addSpring(245, getH(245), 24, Math.PI / 2, "red");    // descent
    this.springBuilder.addSpring(330, getH(330), 18);                         // final

    // Checkpoints
    this.checkpoints.push({ x: 80, y: getH(80), activated: false, spinAngle: 0 });
    this.checkpoints.push({ x: 200, y: getH(200), activated: false, spinAngle: 0 });
    this.checkpoints.push({ x: 320, y: getH(320), activated: false, spinAngle: 0 });

    // Rings
    this.buildRings(getH);

    // Power-ups
    this.powerUps.addMonitor(50, getH(50) + 2, "speed_shoes");
    this.powerUps.addMonitor(150, getH(150) + 2, "rings_10");
    this.powerUps.addMonitor(300, getH(300) + 2, "extra_life");

    // Enemies
    this.spawnEnemies(getH);

    // Goal post
    this.goalY = getH(this.goalX);
  }

  private buildRings(getH: (x: number) => number) {
    // Intro rings
    this.ringManager.addLine(5, 1, 22, 1, 8);

    // Ramp up section
    for (let x = 28; x < 38; x += 3) {
      this.ringManager.addRing(x, getH(x) + 1.2);
    }

    // Factory section
    for (let x = 45; x < 75; x += 5) {
      this.ringManager.addRing(x, getH(x) + 1.5);
    }

    // Above toxic zone (on platforms path)
    this.ringManager.addLine(95, 1, 140, 1, 15);
    // High rings above toxic
    this.ringManager.addLine(100, 3, 135, 3, 8);

    // Mid factory
    for (let x = 165; x < 215; x += 6) {
      this.ringManager.addRing(x, getH(x) + 1.2);
    }

    // Speed descent zigzag
    for (let i = 0; i < 10; i++) {
      const x = 225 + i * 2.5;
      const zigzag = (i % 2 === 0) ? getH(x) + 1 : getH(x) + 2.5;
      this.ringManager.addRing(x, zigzag);
    }

    // Low section
    for (let x = 255; x < 295; x += 5) {
      this.ringManager.addRing(x, getH(x) + 1.2);
    }

    // Final sprint
    for (let i = 0; i < 15; i++) {
      const x = 335 + i * 3;
      this.ringManager.addRing(x, getH(x) + 1 + (i % 2) * 1.5);
    }
  }

  private spawnEnemies(getH: (x: number) => number) {
    // BuzzBombers
    this.enemies.push(new BuzzBomber(35, 10, 8));
    this.enemies.push(new BuzzBomber(60, 10, 10));
    this.enemies.push(new BuzzBomber(180, 7, 12));
    this.enemies.push(new BuzzBomber(270, 3, 10));
    this.enemies.push(new BuzzBomber(360, 5, 8));

    // Grabbers (ceiling enemies)
    this.enemies.push(new Grabber(55, getH(55) + 8, 6));
    this.enemies.push(new Grabber(70, getH(70) + 8, 7));
    this.enemies.push(new Grabber(175, getH(175) + 8, 6));
    this.enemies.push(new Grabber(210, getH(210) + 8, 7));

    // Spiny (ground patrol, indestructible by jump)
    this.enemies.push(new Spiny(48, 10, getH));
    this.enemies.push(new Spiny(190, 12, getH));
    this.enemies.push(new Spiny(280, 10, getH));
    this.enemies.push(new Spiny(350, 8, getH));
  }

  update(dt: number, playerX: number, playerY: number, controller: MetalSonicController): LevelEvents {
    this.time += dt;

    this.parallaxBackground.update(dt);
    this.platformBuilder.update(this.time);
    this.toxicWater.update(dt);
    this.conveyorBuilder.update(dt);
    this.springBuilder.update(dt);

    const springHit = this.springBuilder.checkCollision(controller);
    const ringCollected = this.ringManager.update(dt, playerX, playerY);

    this.powerUps.update(dt);
    this.powerUps.checkCollision(playerX, playerY, controller.isAttacking());

    for (const enemy of this.enemies) {
      enemy.update(dt, playerX, playerY);
    }

    // Toxic water damage
    if (this.toxicWater.isPlayerInWater(playerX, playerY)) {
      controller.takeDamage();
    }

    // Conveyor force
    const conveyorForce = this.conveyorBuilder.getConveyorForce(playerX, playerY);

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

    return { ringCollected, springHit, goalReached: this.goalReached, conveyorForce };
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
    return { x: 5, y: chemicalPlantHeight(5) + 2 };
  }

  getTime(): number {
    return this.time;
  }

  render(r: Renderer) {
    this.parallaxBackground.render(r);
    this.terrainBuilder.render(r);
    this.platformBuilder.render(r);
    this.springBuilder.render(r);
    this.conveyorBuilder.render(r);
    this.toxicWater.render(r);
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

      ctx.fillStyle = "#6666aa";
      ctx.fillRect(sx - 1, baseY - poleH, 2, poleH);

      const scaleX = Math.cos(cp.spinAngle);
      const signW = 1 * r.zoom * Math.abs(scaleX);
      const signH = 1 * r.zoom;
      const signY = baseY - poleH + 0.3 * r.zoom;

      const color = cp.activated
        ? (scaleX > 0 ? "#aa88ff" : "#ffffff")
        : (scaleX > 0 ? "#888888" : "#666666");
      ctx.fillStyle = color;
      ctx.fillRect(sx - signW / 2, signY, signW, signH);

      ctx.strokeStyle = cp.activated ? "#6644aa" : "#555555";
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

    ctx.fillStyle = "#8844cc";
    ctx.fillRect(sx - 1.5, baseY - poleH, 3, poleH);

    ctx.beginPath();
    ctx.ellipse(sx, baseY, 0.5 * r.zoom, 0.15 * r.zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#8844cc";
    ctx.fill();

    const scaleX = Math.cos(this.goalSpinAngle);
    const signW = 1.5 * r.zoom * Math.abs(scaleX);
    const signH = 1.5 * r.zoom;
    const signY = baseY - poleH + 0.5 * r.zoom;

    const signColor = scaleX > 0 ? "#ffcc00" : "#8844cc";
    ctx.fillStyle = signColor;
    ctx.fillRect(sx - signW / 2, signY, signW, signH);

    ctx.strokeStyle = "#aa8800";
    ctx.lineWidth = Math.max(1, 0.04 * r.zoom);
    ctx.strokeRect(sx - signW / 2, signY, signW, signH);
  }
}
