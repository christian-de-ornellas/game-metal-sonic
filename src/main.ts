import { Renderer } from "./core/Renderer";
import { InputManager } from "./core/InputManager";
import { GameState } from "./core/GameState";
import { Camera2D } from "./camera/Camera2D";
import { MetalSonicController, SonicState } from "./character/MetalSonicController";
import { drawMetalSonic } from "./character/MetalSonic";
import { drawPedroLucas } from "./character/PedroLucas";
import { HUD } from "./ui/HUD";
import { TitleScreen } from "./ui/TitleScreen";
import { ZoneSelect } from "./ui/ZoneSelect";
import { CharacterSelect, CharacterChoice } from "./ui/CharacterSelect";
import { ActClear } from "./ui/ActClear";
import { ParticleSystem } from "./core/ParticleSystem";
import { SpeedEffects } from "./core/SpeedEffects";
import { ScorePopup } from "./ui/ScorePopup";
import { TouchControls } from "./ui/TouchControls";
import { ZoneManager, GamePhase } from "./level/ZoneManager";
import { Zone, LevelEvents } from "./level/Zone";
import { EmeraldHillZone } from "./level/EmeraldHillZone";
import { ChemicalPlantZone } from "./level/ChemicalPlantZone";
import { CasinoNightZone } from "./level/CasinoNightZone";


function main() {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas not found");

  const renderer = new Renderer(canvas);
  const input = new InputManager();
  const touchControls = new TouchControls(canvas);
  const gameState = new GameState();
  const camera = new Camera2D(renderer.width, renderer.height);
  const hud = new HUD(gameState);
  const particles = new ParticleSystem();
  const speedEffects = new SpeedEffects();
  const scorePopup = new ScorePopup();

  // Zone Manager
  const zoneManager = new ZoneManager(gameState);
  zoneManager.registerZone((gs) => new EmeraldHillZone(gs));
  zoneManager.registerZone((gs) => new ChemicalPlantZone(gs));
  zoneManager.registerZone((gs) => new CasinoNightZone(gs));

  let level: Zone | null = null;
  let controller: MetalSonicController | null = null;
  let phase: GamePhase = "title";
  let actClear: ActClear | null = null;
  let gameWon = false;
  let selectedCharacter: CharacterChoice = "metal_sonic";

  function loadZone(index: number) {
    level = zoneManager.loadZone(index);
    const startPos = level.getStartPosition();
    controller = new MetalSonicController(gameState, startPos.x, startPos.y);

    // Camera bounds from zone config
    const bounds = level.config.cameraBounds;
    camera.levelLeft = bounds.left;
    camera.levelRight = bounds.right;
    camera.levelBottom = bounds.bottom;
    camera.levelTop = bounds.top;
    camera.snapTo(startPos.x, startPos.y + 2);

    // Show zone name in HUD
    hud.showZoneName(`${level.config.name} - ACT ${level.config.act}`);

    phase = "playing";
    gameWon = false;
  }

  // Zone select screen
  const zoneSelect = new ZoneSelect((index: number) => {
    gameState.reset();
    loadZone(index);
  });

  // Character select screen
  const characterSelect = new CharacterSelect((character: CharacterChoice) => {
    selectedCharacter = character;
    const action = characterSelect.currentPendingAction;
    if (action === "zone_select") {
      phase = "zone_select";
      zoneSelect.show();
    } else {
      gameState.reset();
      loadZone(0);
    }
  });

  // Title screen
  const titleScreen = new TitleScreen(
    (_zoneIndex: number) => {
      gameState.titleScreen = false;
      phase = "character_select";
      characterSelect.show("start");
    },
    () => {
      // Zone select callback → go through character select first
      gameState.titleScreen = false;
      phase = "character_select";
      characterSelect.show("zone_select");
    },
  );

  // Screen shake state
  let shakeAmount = 0;
  let shakeDuration = 0;

  // Screen tint (flash) state
  let screenTintR = 0;
  let screenTintG = 0;
  let screenTintB = 0;
  let screenTintAlpha = 0;
  let screenTintDecayRate = 4;

  // Previous state tracking for particle effects
  let prevState: SonicState = SonicState.IDLE;
  let lastTime = performance.now();

  function handleEnemyCollision() {
    if (!level || !controller) return;

    for (const enemy of level.enemies) {
      if (!enemy.alive) continue;

      if (enemy.canBeDestroyed(controller.x, controller.y, controller.isAttacking())) {
        // Enemy defeat particles
        particles.emit({
          x: enemy.x, y: enemy.y,
          count: 15,
          speedMin: 3, speedMax: 8,
          angleMin: 0, angleMax: Math.PI * 2,
          life: 0.6,
          size: 0.15,
          sizeEnd: 0.02,
          r: 255, g: 160, b: 40,
          alpha: 1, alphaEnd: 0,
          gravity: -8, friction: 1,
        });
        // White sparkles
        particles.emit({
          x: enemy.x, y: enemy.y,
          count: 8,
          speedMin: 2, speedMax: 6,
          angleMin: 0, angleMax: Math.PI * 2,
          life: 0.4,
          size: 0.06,
          sizeEnd: 0,
          r: 255, g: 255, b: 255,
          alpha: 1, alphaEnd: 0,
          gravity: 0, friction: 3,
        });

        enemy.destroy();
        gameState.addScore(100);
        scorePopup.add(enemy.x, enemy.y + 1, "+100");

        // Bounce up after destroying enemy
        if (controller.verticalSpeed < 0) {
          controller.verticalSpeed = 8;
        }
        continue;
      }

      if (enemy.canDamagePlayer(controller.x, controller.y)) {
        applyDamage(enemy.x);
        continue;
      }

      if (enemy.hasProjectileNear(controller.x, controller.y)) {
        applyDamage(enemy.x);
      }
    }
  }

  function applyDamage(sourceX: number) {
    if (!controller || !level) return;
    const ringsLost = gameState.rings;
    controller.takeDamage(sourceX);
    if (ringsLost > 0) {
      level.ringManager.scatterRings(controller.x, controller.y, ringsLost);
    }
    shakeAmount = 5;
    shakeDuration = 0.2;
    // Red damage flash
    screenTintR = 255;
    screenTintG = 30;
    screenTintB = 30;
    screenTintAlpha = 0.25;
    screenTintDecayRate = 3;
  }

  function handleParticleEffects(dt: number, levelEvents: LevelEvents) {
    if (!controller) return;

    const isGrounded = controller.state !== SonicState.IN_AIR &&
                       controller.state !== SonicState.JUMPING &&
                       controller.state !== SonicState.HURT;
    const wasAirborne = prevState === SonicState.IN_AIR ||
                        prevState === SonicState.JUMPING;

    // Landing dust
    if (isGrounded && wasAirborne) {
      particles.emit({
        x: controller.x, y: controller.y,
        count: 8,
        speedMin: 1, speedMax: 4,
        angleMin: Math.PI * 0.15, angleMax: Math.PI * 0.85,
        life: 0.5,
        size: 0.12,
        sizeEnd: 0.02,
        r: 140, g: 120, b: 80,
        alpha: 0.7, alphaEnd: 0,
        gravity: -5, friction: 2,
      });
    }

    // Start running dust
    const justStartedRunning = controller.state === SonicState.RUNNING &&
                                prevState === SonicState.IDLE;
    if (justStartedRunning) {
      particles.emit({
        x: controller.x, y: controller.y,
        count: 5,
        speedMin: 1, speedMax: 3,
        angleMin: Math.PI * 0.2, angleMax: Math.PI * 0.8,
        life: 0.4,
        size: 0.1,
        sizeEnd: 0.02,
        r: 140, g: 120, b: 80,
        alpha: 0.5, alphaEnd: 0,
        gravity: -3, friction: 3,
      });
    }

    // Spin dash release dust
    const justReleasedSpinDash = controller.state === SonicState.SPINNING &&
                                  prevState === SonicState.SPIN_DASH;
    if (justReleasedSpinDash) {
      particles.emit({
        x: controller.x, y: controller.y,
        count: 12,
        speedMin: 3, speedMax: 8,
        angleMin: Math.PI * 0.1, angleMax: Math.PI * 0.9,
        life: 0.6,
        size: 0.18,
        sizeEnd: 0.03,
        r: 140, g: 120, b: 80,
        alpha: 0.8, alphaEnd: 0,
        gravity: -8, friction: 2,
      });
    }

    // Spin dash charging particles (blue)
    if (controller.state === SonicState.SPIN_DASH) {
      const charge = controller.getSpinDashChargeRatio();
      if (Math.random() < charge * dt * 30) {
        particles.emit({
          x: controller.x, y: controller.y + 0.5,
          count: 1 + Math.floor(charge * 2),
          speedMin: 1, speedMax: 4 + charge * 3,
          angleMin: 0, angleMax: Math.PI * 2,
          life: 0.3,
          size: 0.08 + charge * 0.06,
          sizeEnd: 0,
          r: 60, g: 120, b: 255,
          alpha: 0.6 + charge * 0.3, alphaEnd: 0,
          gravity: 2, friction: 1,
        });
      }
      if (charge > 0.3) {
        shakeAmount = charge * 2;
        shakeDuration = 0.05;
      }
    }

    // Ring collect effects
    if (levelEvents.ringCollected) {
      particles.emit({
        x: controller.x, y: controller.y + 1,
        count: 4,
        speedMin: 2, speedMax: 5,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.4,
        size: 0.1,
        sizeEnd: 0.02,
        r: 255, g: 220, b: 50,
        alpha: 0.9, alphaEnd: 0,
        gravity: 3, friction: 2,
      });
      // Gold screen flash
      screenTintR = 255;
      screenTintG = 220;
      screenTintB = 50;
      screenTintAlpha = 0.08;
      screenTintDecayRate = 4;
    }

    // Spring hit effects
    if (levelEvents.springHit) {
      particles.emit({
        x: levelEvents.springHit.x, y: levelEvents.springHit.y + 0.5,
        count: 6,
        speedMin: 2, speedMax: 6,
        angleMin: Math.PI * 0.2, angleMax: Math.PI * 0.8,
        life: 0.5,
        size: 0.1,
        sizeEnd: 0.02,
        r: 255, g: 255, b: 100,
        alpha: 0.8, alphaEnd: 0,
        gravity: -5, friction: 1,
      });
    }

    // Bumper hit effects
    if (levelEvents.bumperHit) {
      const bh = levelEvents.bumperHit;
      particles.emit({
        x: bh.x, y: bh.y,
        count: 10,
        speedMin: 3, speedMax: 7,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.4,
        size: 0.1,
        sizeEnd: 0.02,
        r: 255, g: 100, b: 200,
        alpha: 0.9, alphaEnd: 0,
        gravity: 0, friction: 2,
      });
      scorePopup.add(bh.x, bh.y + 1, `+${bh.score}`);
    }

    // Speed shoes active particles
    if (gameState.speedBoost && isGrounded && Math.random() < dt * 15) {
      particles.emit({
        x: controller.x, y: controller.y + 0.5,
        count: 1,
        speedMin: 1, speedMax: 3,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.3,
        size: 0.06,
        sizeEnd: 0,
        r: 255, g: 220, b: 50,
        alpha: 0.7, alphaEnd: 0,
        gravity: 2, friction: 1,
      });
    }

    // Invincibility stars
    if (gameState.invincible && gameState.invincibilityTimer > 2 && Math.random() < dt * 20) {
      const angle = Math.random() * Math.PI * 2;
      particles.emit({
        x: controller.x + Math.cos(angle) * 0.8,
        y: controller.y + 0.5 + Math.sin(angle) * 0.8,
        count: 1,
        speedMin: 0.5, speedMax: 2,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.5,
        size: 0.08,
        sizeEnd: 0.02,
        r: 255, g: 255, b: 255,
        alpha: 1, alphaEnd: 0,
        gravity: 1, friction: 1,
      });
    }
  }

  function gameLoop(now: number) {
    const rawDt = (now - lastTime) / 1000;
    const dt = Math.min(rawDt, 1 / 30); // cap delta to prevent spiral
    lastTime = now;

    // Resize if needed
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      renderer.resize();
      camera.resize(renderer.width, renderer.height);
    }

    // Title screen
    titleScreen.update(dt);

    // Character select
    characterSelect.update(dt);

    // Zone select
    zoneSelect.update(dt);

    // Act clear
    if (actClear) {
      actClear.update(dt);
    }

    if (phase === "playing" && level && controller && !gameState.gameOver) {
      // Update game state timers
      gameState.update(dt);

      // Player input (merge touch controls)
      input.setTouchState(touchControls.getState());
      const inputState = input.getState();

      // Terrain height function that includes bridges and platforms
      const getEffectiveHeight = (x: number) =>
        level!.getEffectiveHeight(x, controller!.y, controller!.verticalSpeed);

      // Apply conveyor force from previous frame
      controller.conveyorForce = 0;

      // Update player
      controller.update(dt, inputState, getEffectiveHeight);

      // Update level (returns event info)
      const levelEvents = level.update(dt, controller.x, controller.y, controller);

      // Apply conveyor force for next frame
      if (levelEvents.conveyorForce) {
        controller.conveyorForce = levelEvents.conveyorForce;
      }

      // Particle effects
      handleParticleEffects(dt, levelEvents);

      // Enemy collision
      handleEnemyCollision();

      // Update effects
      particles.update(dt);
      speedEffects.update(dt, controller.x, controller.y, controller.getSpeed(), controller.isSpinning());
      scorePopup.update(dt);

      // Camera with improved vertical tracking
      const isGrounded = controller.state !== SonicState.IN_AIR &&
                         controller.state !== SonicState.JUMPING &&
                         controller.state !== SonicState.HURT;
      const terrainY = getEffectiveHeight(controller.x);
      camera.update(
        dt,
        controller.x,
        controller.y,
        controller.getSpeed(),
        controller.facingRight,
        isGrounded,
        terrainY,
      );

      // Screen shake
      if (shakeDuration > 0) {
        shakeDuration -= dt;
      }

      // Screen tint decay
      if (screenTintAlpha > 0) {
        screenTintAlpha -= dt * screenTintDecayRate;
        if (screenTintAlpha < 0) screenTintAlpha = 0;
      }

      // Check goal reached → trigger ACT CLEAR
      if (levelEvents.goalReached && !gameState.actClearPending) {
        gameState.actClearPending = true;
        actClear = new ActClear(
          level.config.name,
          level.config.act,
          gameState.time,
          gameState.rings,
          () => {
            // Add bonus to score
            gameState.addScore(actClear!.getTotalBonus());

            // Advance to next zone
            if (zoneManager.hasNextZone()) {
              const nextZone = zoneManager.advanceToNextZone();
              if (nextZone) {
                level = nextZone;
                const startPos = level.getStartPosition();
                controller = new MetalSonicController(gameState, startPos.x, startPos.y);

                const bounds = level.config.cameraBounds;
                camera.levelLeft = bounds.left;
                camera.levelRight = bounds.right;
                camera.levelBottom = bounds.bottom;
                camera.levelTop = bounds.top;
                camera.snapTo(startPos.x, startPos.y + 2);

                hud.showZoneName(`${level.config.name} - ACT ${level.config.act}`);
                prevState = SonicState.IDLE;
              }
            } else {
              // Game complete!
              gameWon = true;
            }
            actClear = null;
            gameState.actClearPending = false;
            phase = "playing";
          },
        );
        phase = "act_clear";
      }

      // Track previous state
      prevState = controller.state;

      // Game over
      if (gameState.gameOver) {
        phase = "game_over";
        titleScreen.showGameOver();
      }
    } else if (phase === "act_clear" && actClear) {
      // Still update particles and effects during act clear
      particles.update(dt);
      scorePopup.update(dt);
    }

    // === RENDER ===
    renderer.clear();

    if (level && controller) {
      // Apply camera (with shake)
      let camX = camera.x;
      let camY = camera.y;
      if (shakeDuration > 0) {
        camX += (Math.random() - 0.5) * shakeAmount;
        camY += (Math.random() - 0.5) * shakeAmount;
      }
      renderer.setCamera(camX, camY, camera.zoom);

      // Render level (background, terrain, objects)
      level.render(renderer);

      // Speed effects (between level and player)
      speedEffects.render(renderer, controller.x, controller.y, controller.groundSpeed, level.getTime());

      // Render particles (world space)
      particles.render(renderer);

      // Render player
      const invincibilityFlicker = gameState.invincible ?
        Math.sin(gameState.invincibilityTimer * 15) > 0 : true;

      const drawCharacter = selectedCharacter === "pedro_lucas" ? drawPedroLucas : drawMetalSonic;
      drawCharacter(
        renderer,
        controller.x,
        controller.y + 0.8, // offset so feet are on ground
        controller.facingRight,
        controller.animator,
        controller.isSpinning(),
        gameState.invincible,
        invincibilityFlicker,
      );

      // Score popups (world space)
      scorePopup.render(renderer);

      // Screen tint overlay
      if (screenTintAlpha > 0.001) {
        const ctx = renderer.ctx;
        ctx.globalAlpha = screenTintAlpha;
        ctx.fillStyle = `rgb(${screenTintR},${screenTintG},${screenTintB})`;
        ctx.fillRect(0, 0, renderer.width, renderer.height);
        ctx.globalAlpha = 1;
      }

      // HUD (screen space, not affected by camera)
      hud.render(renderer, controller.getSpeed());

      // Touch controls overlay (only on touch devices during gameplay)
      if (touchControls.isTouchDevice && phase === "playing") {
        touchControls.render(renderer);
      }
    }

    // Act clear overlay
    if (actClear) {
      actClear.render(renderer);
    }

    // Game won overlay
    if (gameWon) {
      const ctx = renderer.ctx;
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, renderer.width, renderer.height);

      ctx.save();
      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 15;
      renderer.drawScreenText(
        "CONGRATULATIONS!",
        renderer.width / 2, renderer.height / 2 - 60,
        "#ffcc00", 48, "center", "#664400"
      );
      ctx.restore();

      renderer.drawScreenText(
        `FINAL SCORE: ${gameState.score}`,
        renderer.width / 2, renderer.height / 2 + 10,
        "#ffffff", 32, "center", "black"
      );
      renderer.drawScreenText(
        "ALL ZONES CLEARED!",
        renderer.width / 2, renderer.height / 2 + 55,
        "#44ff44", 24, "center", "#004400"
      );
    }

    // Zone select overlay
    zoneSelect.render(renderer);

    // Character select overlay
    characterSelect.render(renderer);

    // Title screen overlay
    titleScreen.render(renderer);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

main();
