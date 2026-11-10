import { Renderer } from "../core/Renderer";
import { GameState } from "../core/GameState";
import { TerrainBuilder, emeraldHillHeight, EMERALD_HILL_THEME } from "./terrain/TerrainBuilder";

import { BridgeBuilder } from "./terrain/BridgeBuilder";
import { PlatformBuilder } from "./terrain/PlatformBuilder";
import { SpringBuilder, Spring } from "./terrain/SpringBuilder";
import { ParallaxBackground } from "./decoration/ParallaxBackground";
import { PalmTreeBuilder } from "./decoration/PalmTreeBuilder";
import { WaterEffect } from "./decoration/WaterEffect";
import { RingManager } from "../collectibles/RingManager";
import { PowerUpMonitor } from "../collectibles/PowerUpMonitor";
import { Badnik } from "../enemies/Badnik";
import { BuzzBomber } from "../enemies/BuzzBomber";
import { Coconuts } from "../enemies/Coconuts";
import { MetalSonicController } from "../character/MetalSonicController";
import { Zone, ZoneConfig, LevelEvents } from "./Zone";

interface Checkpoint {
  x: number;
  y: number;
  activated: boolean;
  spinAngle: number;
}

export class EmeraldHillZone implements Zone {
  readonly config: ZoneConfig = {
    name: "EMERALD HILL",
    act: 1,
    levelLength: 400,
    startPosition: { x: 5, y: 2 },
    cameraBounds: { left: -5, right: 410, bottom: -15, top: 40 },
  };

  terrainBuilder: TerrainBuilder;

  bridgeBuilder: BridgeBuilder;
  platformBuilder: PlatformBuilder;
  springBuilder: SpringBuilder;
  parallaxBackground: ParallaxBackground;
  palmTreeBuilder: PalmTreeBuilder;
  waterEffect: WaterEffect;
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
    this.terrainBuilder = new TerrainBuilder(emeraldHillHeight, EMERALD_HILL_THEME);

    this.bridgeBuilder = new BridgeBuilder();
    this.platformBuilder = new PlatformBuilder();
    this.springBuilder = new SpringBuilder();
    this.parallaxBackground = new ParallaxBackground(ParallaxBackground.emeraldHillTheme());
    this.palmTreeBuilder = new PalmTreeBuilder();
    this.waterEffect = new WaterEffect();
    this.ringManager = new RingManager(gameState);
    this.powerUps = new PowerUpMonitor(gameState);
  }

  build() {

    // Bridge over water section
    this.bridgeBuilder.addBridge(190, -3.5, 12, 2);

    // Water zone
    this.waterEffect.build(175, 60);

    // Moving platforms
    this.platformBuilder.buildDefaultPlatforms();

    // Springs
    const getH = (x: number) => this.terrainBuilder.getHeight(x);
    this.springBuilder.addSpring(25, getH(25), 18);                               // yellow, intro
    this.springBuilder.addSpring(105, getH(105), 18);                             // yellow, before loop
    this.springBuilder.addSpring(160, getH(160), 24, Math.PI / 2, "red");        // red, after loop
    this.springBuilder.addSpring(280, getH(280), 20, Math.PI / 3, "yellow");     // diagonal, post-bridge
    this.springBuilder.addSpring(350, getH(350), 24, Math.PI / 2, "red");        // red, final stretch
    this.springBuilder.addSpring(370, getH(370), 24, Math.PI / 2, "red");        // red, final stretch

    // Palm trees along level edges
    this.palmTreeBuilder.addTreeLine(10, 100, 12, getH);
    this.palmTreeBuilder.addTreeLine(260, 340, 8, getH);

    // Checkpoints
    this.checkpoints.push({ x: 130, y: getH(130), activated: false, spinAngle: 0 });
    this.checkpoints.push({ x: 250, y: getH(250), activated: false, spinAngle: 0 });
    this.checkpoints.push({ x: 350, y: getH(350), activated: false, spinAngle: 0 });

    // Rings
    this.ringManager.buildDefaultLayout(getH);

    // Power-ups
    this.powerUps.addMonitor(45, getH(45) + 2, "speed_shoes");
    this.powerUps.addMonitor(240, getH(240) + 2, "shield");
    this.powerUps.addMonitor(165, getH(165) + 2, "invincibility");
    this.powerUps.addMonitor(310, getH(310) + 2, "extra_life");

    // Enemies
    this.spawnEnemies();

    // Goal post
    this.goalY = this.terrainBuilder.getHeight(this.goalX);
  }

  private spawnEnemies() {
    // BuzzBombers in the hill area
    this.enemies.push(new BuzzBomber(40, 4, 8));   // intro early
    this.enemies.push(new BuzzBomber(50, 5, 12));
    this.enemies.push(new BuzzBomber(75, 6, 8));

    // Before loop
    this.enemies.push(new Coconuts(90, 2));
    this.enemies.push(new Coconuts(110, 1));        // before loop

    // After loop
    this.enemies.push(new BuzzBomber(155, 5, 10));  // post-loop
    this.enemies.push(new Coconuts(170, -2));        // descent to water

    // Bridge area
    this.enemies.push(new BuzzBomber(200, 0, 12));  // patrol over bridge

    // After bridge
    this.enemies.push(new BuzzBomber(270, 4, 10));
    this.enemies.push(new Coconuts(300, 1));
    this.enemies.push(new BuzzBomber(320, 5, 15));

    // Final stretch
    this.enemies.push(new Coconuts(335, 1));         // end of hills
    this.enemies.push(new Coconuts(360, 1));
    this.enemies.push(new BuzzBomber(350, 4, 10));   // final stretch
    this.enemies.push(new BuzzBomber(380, 3, 8));    // guarding goal
  }

  update(dt: number, playerX: number, playerY: number, controller: MetalSonicController): LevelEvents {
    this.time += dt;

    // Parallax
    this.parallaxBackground.update(dt);

    // Bridge physics
    this.bridgeBuilder.update(dt, playerX, playerY);

    // Platforms
    this.platformBuilder.update(this.time);

    // Water
    this.waterEffect.update(dt);

    // Springs
    this.springBuilder.update(dt);
    const springHit = this.springBuilder.checkCollision(controller);

    // Rings
    const ringCollected = this.ringManager.update(dt, playerX, playerY);

    // Power-ups
    this.powerUps.update(dt);
    this.powerUps.checkCollision(playerX, playerY, controller.isAttacking());

    // Enemies (skip distant enemies for performance)
    for (const enemy of this.enemies) {
      if (Math.abs(enemy.x - playerX) > 25 && Math.abs(enemy.y - playerY) > 15) continue;
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

    return { ringCollected, springHit, goalReached: this.goalReached };
  }

  /** Get effective terrain height at x, considering bridges and platforms */
  getEffectiveHeight(x: number, y: number, vy: number): number {
    const terrainH = this.terrainBuilder.getHeight(x);

    // Check bridge
    const bridgeH = this.bridgeBuilder.getBridgeHeight(x);
    if (bridgeH !== null && y >= bridgeH - 0.5 && y <= bridgeH + 1.5 && vy <= 0) {
      return Math.max(terrainH, bridgeH);
    }

    // Check platforms
    const platH = this.platformBuilder.checkPlatformCollision(x, y, vy);
    if (platH !== null) {
      return Math.max(terrainH, platH);
    }

    return terrainH;
  }

  getStartPosition(): { x: number; y: number } {
    return { x: 5, y: this.terrainBuilder.getHeight(5) + 2 };
  }

  getTime(): number {
    return this.time;
  }

  render(r: Renderer) {
    // Background (behind everything)
    this.parallaxBackground.render(r);

    // Back palm trees (behind terrain)
    this.palmTreeBuilder.render(r, this.time);

    // Terrain
    this.terrainBuilder.render(r);


    // Bridge
    this.bridgeBuilder.render(r);

    // Platforms
    this.platformBuilder.render(r);

    // Springs
    this.springBuilder.render(r);

    // Water (semi-transparent, in front of terrain)
    this.waterEffect.render(r);

    // Rings
    this.ringManager.render(r);

    // Power-ups
    this.powerUps.render(r);

    // Enemies (viewport culling)
    const enemyBounds = r.getVisibleBounds();
    for (const enemy of this.enemies) {
      if (enemy.x < enemyBounds.left - 3 || enemy.x > enemyBounds.right + 3) continue;
      enemy.render(r);
    }

    // Checkpoints
    this.renderCheckpoints(r);

    // Goal post
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

      // Pole
      ctx.fillStyle = "#4444cc";
      ctx.fillRect(sx - 1, baseY - poleH, 2, poleH);

      // Spinning sign plate
      const scaleX = Math.cos(cp.spinAngle);
      const signW = 1 * r.zoom * Math.abs(scaleX);
      const signH = 1 * r.zoom;
      const signY = baseY - poleH + 0.3 * r.zoom;

      const color = cp.activated
        ? (scaleX > 0 ? "#44aaff" : "#ffffff")
        : (scaleX > 0 ? "#888888" : "#666666");
      ctx.fillStyle = color;
      ctx.fillRect(sx - signW / 2, signY, signW, signH);

      // Border
      ctx.strokeStyle = cp.activated ? "#2266cc" : "#555555";
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

    // Pole
    ctx.fillStyle = "#cc2222";
    ctx.fillRect(sx - 1.5, baseY - poleH, 3, poleH);

    // Base
    ctx.beginPath();
    ctx.ellipse(sx, baseY, 0.5 * r.zoom, 0.15 * r.zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#cc2222";
    ctx.fill();

    // Spinning sign (simulated 3D rotation with scaleX)
    const scaleX = Math.cos(this.goalSpinAngle);
    const signW = 1.5 * r.zoom * Math.abs(scaleX);
    const signH = 1.5 * r.zoom;
    const signY = baseY - poleH + 0.5 * r.zoom;

    const signColor = scaleX > 0 ? "#ffcc00" : "#2244aa";
    ctx.fillStyle = signColor;
    ctx.fillRect(sx - signW / 2, signY, signW, signH);

    // Sign border
    ctx.strokeStyle = "#aa8800";
    ctx.lineWidth = Math.max(1, 0.04 * r.zoom);
    ctx.strokeRect(sx - signW / 2, signY, signW, signH);
  }
}
