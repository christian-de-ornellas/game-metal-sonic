import { Renderer } from "./core/Renderer";
import { InputManager } from "./core/InputManager";
import { GameState } from "./core/GameState";
import { AudioManager } from "./core/AudioManager";
import { SaveManager } from "./core/SaveManager";
import { Camera2D } from "./camera/Camera2D";
import { MetalSonicController, SonicState } from "./character/MetalSonicController";
import { drawMetalSonic } from "./character/MetalSonic";
import { drawPedroLucas } from "./character/PedroLucas";
import { drawChristian } from "./character/Christian";
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
import { ScreenTransition } from "./ui/ScreenTransition";
import { PauseMenu } from "./ui/PauseMenu";
import { Tutorial } from "./ui/Tutorial";
import { OrientationOverlay } from "./ui/OrientationOverlay";
import { RoboTinic } from "./boss/RoboTinic";
import { RoboTinicArena } from "./boss/RoboTinicArena";
import { BowserBoss } from "./boss/BowserBoss";
import { BowserArena } from "./boss/BowserArena";
import { MarioAlly } from "./boss/MarioAlly";
import { Boss } from "./boss/Boss";
import { PlayerProjectileSystem } from "./boss/PlayerProjectile";
import { BossCinematic } from "./boss/BossCinematic";
import { EndingCinematic } from "./ui/EndingCinematic";
import { ROBO_TINIC_SCORE, BOWSER_SCORE, BOSS_DEFEAT_DELAY } from "./constants";


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
  const audio = new AudioManager();
  const save = new SaveManager();
  const transition = new ScreenTransition();
  const tutorial = new Tutorial();
  const orientationOverlay = new OrientationOverlay();

  // Restore saved settings
  audio.volume = save.volume;
  audio.muted = save.muted;

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
  let selectedCharacter: CharacterChoice = (save.lastCharacter as CharacterChoice) || "metal_sonic";
  let paused = false;
  let prevRingCount = 0;

  // Boss battle state
  let currentBoss: Boss | null = null;
  let roboTinicArena: RoboTinicArena | null = null;
  let bowserArena: BowserArena | null = null;
  let marioAlly: MarioAlly | null = null;
  const projectiles = new PlayerProjectileSystem();
  let bossDefeatTimer = 0;
  let attackModeTimer = 0;
  let bossCinematic: BossCinematic | null = null;
  let endingCinematic: EndingCinematic | null = null;

  // Super form activation tracking
  let wasSuperLastFrame = false;

  // Pause menu
  const pauseMenu = new PauseMenu(
    () => { paused = false; gameState.paused = false; pauseMenu.deactivate(); },
    () => {
      paused = false;
      gameState.paused = false;
      pauseMenu.deactivate();
      phase = "title";
      gameState.titleScreen = true;
      titleScreen.visible = true;
      titleScreen.showReturnToTitle();
      level = null;
      controller = null;
      currentBoss = null;
      roboTinicArena = null;
      bowserArena = null;
      marioAlly = null;
      bossCinematic = null;
      endingCinematic = null;
      audio.stopBossMusic();
      audio.stopAllBossLoops();
      touchControls.bossMode = false;
      gameWon = false;
    },
  );

  // Pause keyboard handler (works even when input is polled)
  window.addEventListener("keydown", (e) => {
    // Handle ending cinematic input
    if (phase === "ending" && endingCinematic) {
      endingCinematic.handleInput();
      return;
    }

    if (paused) {
      e.preventDefault();
      pauseMenu.handleKey(e.key.toLowerCase(), audio);
      return;
    }
    const isBossPhase = phase === "boss_robo_tinic" || phase === "boss_bowser";
    if ((e.key === "Escape" || e.key === "p" || e.key === "P") && (phase === "playing" || isBossPhase) && !gameState.gameOver) {
      e.preventDefault();
      paused = true;
      gameState.paused = true;
      pauseMenu.reset();
      pauseMenu.activate(canvas, audio);
    }
  });

  // Auto-pause on visibility change
  document.addEventListener("visibilitychange", () => {
    const isBossPhase = phase === "boss_robo_tinic" || phase === "boss_bowser";
    if (document.hidden && (phase === "playing" || isBossPhase) && !gameState.gameOver && !paused) {
      paused = true;
      gameState.paused = true;
      pauseMenu.reset();
      pauseMenu.activate(canvas, audio);
    }
  });

  // Resume audio context on first user interaction
  const resumeAudio = () => { audio.resume(); };
  window.addEventListener("click", resumeAudio, { once: true });
  window.addEventListener("touchstart", resumeAudio, { once: true });
  window.addEventListener("keydown", resumeAudio, { once: true });

  // Fullscreen toggle via touch controls
  const tryFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Orientation overlay dismiss
  canvas.addEventListener("click", () => {
    if (orientationOverlay.isShowing) orientationOverlay.dismiss();
  });
  canvas.addEventListener("touchstart", () => {
    if (orientationOverlay.isShowing) orientationOverlay.dismiss();
  }, { passive: true });

  function loadZone(index: number) {
    level = zoneManager.loadZone(index);
    const startPos = level.getStartPosition();
    controller = new MetalSonicController(gameState, startPos.x, startPos.y);

    const bounds = level.config.cameraBounds;
    camera.levelLeft = bounds.left;
    camera.levelRight = bounds.right;
    camera.levelBottom = bounds.bottom;
    camera.levelTop = bounds.top;
    camera.snapTo(startPos.x, startPos.y + 2);

    hud.showZoneName(`${level.config.name} - ACT ${level.config.act}`);

    phase = "playing";
    gameWon = false;
    prevRingCount = 0;
    touchControls.bossMode = false;

    // Start tutorial on first play
    if (!save.tutorialSeen) {
      tutorial.start(touchControls.isTouchDevice);
      save.tutorialSeen = true;
    }
  }

  // Zone select screen
  const zoneSelect = new ZoneSelect((index: number) => {
    gameState.reset();
    transition.fadeToBlack(0.3, () => loadZone(index));
  });

  // Character select screen
  const characterSelect = new CharacterSelect((character: CharacterChoice) => {
    selectedCharacter = character;
    save.lastCharacter = character;
    audio.menuConfirm();
    const action = characterSelect.currentPendingAction;
    if (action === "zone_select") {
      phase = "zone_select";
      zoneSelect.show();
    } else {
      gameState.reset();
      transition.fadeToBlack(0.3, () => loadZone(0));
    }
  });

  // Title screen
  const titleScreen = new TitleScreen(
    (_zoneIndex: number) => {
      audio.menuConfirm();
      gameState.titleScreen = false;
      phase = "character_select";
      characterSelect.show("start");
    },
    () => {
      audio.menuConfirm();
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

  // Particle scale for mobile performance
  const getParticleScale = () => touchControls.isTouchDevice ? 0.5 : 1;

  function handleEnemyCollision() {
    if (!level || !controller) return;
    const ps = getParticleScale();

    for (const enemy of level.enemies) {
      if (!enemy.alive) continue;

      if (enemy.canBeDestroyed(controller.x, controller.y, controller.isAttacking())) {
        particles.emit({
          x: enemy.x, y: enemy.y,
          count: Math.ceil(15 * ps),
          speedMin: 3, speedMax: 8,
          angleMin: 0, angleMax: Math.PI * 2,
          life: 0.6,
          size: 0.15,
          sizeEnd: 0.02,
          r: 255, g: 160, b: 40,
          alpha: 1, alphaEnd: 0,
          gravity: -8, friction: 1,
        });
        particles.emit({
          x: enemy.x, y: enemy.y,
          count: Math.ceil(8 * ps),
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
        audio.enemyDestroy();

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
    screenTintR = 255;
    screenTintG = 30;
    screenTintB = 30;
    screenTintAlpha = 0.25;
    screenTintDecayRate = 3;
    audio.damage();
  }

  function applyBossDamage(sourceX: number) {
    if (!controller) return;
    controller.takeDamage(sourceX);
    shakeAmount = 5;
    shakeDuration = 0.2;
    screenTintR = 255;
    screenTintG = 30;
    screenTintB = 30;
    screenTintAlpha = 0.25;
    screenTintDecayRate = 3;
  }

  function handleParticleEffects(dt: number, levelEvents: LevelEvents) {
    if (!controller) return;

    // Reduce particle counts on mobile/tablet for performance
    const pScale = touchControls.isTouchDevice ? 0.5 : 1;

    const isGrounded = controller.state !== SonicState.IN_AIR &&
                       controller.state !== SonicState.JUMPING &&
                       controller.state !== SonicState.HURT;
    const wasAirborne = prevState === SonicState.IN_AIR ||
                        prevState === SonicState.JUMPING;

    // Landing dust
    if (isGrounded && wasAirborne) {
      particles.emit({
        x: controller.x, y: controller.y,
        count: Math.ceil(8 * pScale),
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
        count: Math.ceil(5 * pScale),
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
        count: Math.ceil(12 * pScale),
        speedMin: 3, speedMax: 8,
        angleMin: Math.PI * 0.1, angleMax: Math.PI * 0.9,
        life: 0.6,
        size: 0.18,
        sizeEnd: 0.03,
        r: 140, g: 120, b: 80,
        alpha: 0.8, alphaEnd: 0,
        gravity: -8, friction: 2,
      });
      audio.spinDashRelease();
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
        count: Math.ceil(4 * pScale),
        speedMin: 2, speedMax: 5,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.4,
        size: 0.1,
        sizeEnd: 0.02,
        r: 255, g: 220, b: 50,
        alpha: 0.9, alphaEnd: 0,
        gravity: 3, friction: 2,
      });
      screenTintR = 255;
      screenTintG = 220;
      screenTintB = 50;
      screenTintAlpha = 0.08;
      screenTintDecayRate = 4;
      audio.ring();
    }

    // Check for life up (100 rings)
    if (gameState.rings < prevRingCount && prevRingCount > 0 && gameState.lives > 0) {
      // Rings went down but not from damage — likely 100 ring life up
      // (rings reset to rings - 100 in addRings)
    }
    if (gameState.rings >= 0 && prevRingCount >= 0) {
      // Detect 100-ring life up: rings decreased without damage
      const ringsGainedNet = gameState.rings - prevRingCount;
      if (ringsGainedNet < 0 && controller.state !== SonicState.HURT) {
        audio.lifeUp();
      }
    }
    prevRingCount = gameState.rings;

    // Spring hit effects
    if (levelEvents.springHit) {
      particles.emit({
        x: levelEvents.springHit.x, y: levelEvents.springHit.y + 0.5,
        count: Math.ceil(6 * pScale),
        speedMin: 2, speedMax: 6,
        angleMin: Math.PI * 0.2, angleMax: Math.PI * 0.8,
        life: 0.5,
        size: 0.1,
        sizeEnd: 0.02,
        r: 255, g: 255, b: 100,
        alpha: 0.8, alphaEnd: 0,
        gravity: -5, friction: 1,
      });
      audio.spring();
    }

    // Bumper hit effects
    if (levelEvents.bumperHit) {
      const bh = levelEvents.bumperHit;
      particles.emit({
        x: bh.x, y: bh.y,
        count: Math.ceil(10 * pScale),
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
      audio.bumper();
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

    // Invincibility stars (skip during super form — super has its own particles)
    if (gameState.invincible && !gameState.superForm && gameState.invincibilityTimer > 2 && Math.random() < dt * 20) {
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

    // Super form golden sparkles (more intense than invincibility stars)
    if (gameState.superForm && Math.random() < dt * 35) {
      const angle = Math.random() * Math.PI * 2;
      particles.emit({
        x: controller.x + Math.cos(angle) * 1.0,
        y: controller.y + 0.5 + Math.sin(angle) * 1.0,
        count: 1,
        speedMin: 1, speedMax: 4,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.5,
        size: 0.1,
        sizeEnd: 0.02,
        r: 255, g: 220, b: 50,
        alpha: 1, alphaEnd: 0,
        gravity: 2, friction: 1,
      });
    }

    // Super form fade-out sparkles (dimmer, slower)
    if (!gameState.superForm && gameState.superFormFadeOut > 0 && Math.random() < dt * 15) {
      const angle = Math.random() * Math.PI * 2;
      particles.emit({
        x: controller.x + Math.cos(angle) * 0.8,
        y: controller.y + 0.5 + Math.sin(angle) * 0.8,
        count: 1,
        speedMin: 0.5, speedMax: 2,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.4,
        size: 0.07,
        sizeEnd: 0.01,
        r: 255, g: 200, b: 30,
        alpha: gameState.superFormFadeOut / 1.5, alphaEnd: 0,
        gravity: 1, friction: 1,
      });
    }
  }

  // === BOSS BATTLE FUNCTIONS ===

  function wireBossSoundEvents(boss: Boss) {
    boss.onSoundEvent = (event: string) => {
      switch (event) {
        case "bossRoar": audio.bossRoar(); break;
        case "laserCharge": audio.laserCharge(); break;
        case "laserFire": audio.laserFire(); break;
        case "bombDrop": audio.bombDrop(); break;
        case "bossImpact": audio.bossImpact(); break;
        case "fireBreath": audio.fireBreath(); break;
        case "stopFireBreath": audio.stopFireBreath(); break;
        case "shellSpin": audio.shellSpin(); break;
        case "stopShellSpin": audio.stopShellSpin(); break;
        case "hammerThrow": audio.hammerThrow(); break;
        case "warningAlarm": audio.warningAlarm(); break;
      }
    };
  }

  function createBossCinematic(bossName: string): BossCinematic {
    const cinematic = new BossCinematic();

    cinematic.onPlaySound = (sound: string) => {
      switch (sound) {
        case "bossIntro": audio.bossIntro(); break;
        case "phaseTransition": audio.phaseTransition(); break;
        case "bossDefeat": audio.bossDefeat(); break;
        case "stopBossMusic": audio.stopBossMusic(); audio.stopAllBossLoops(); break;
      }
    };

    cinematic.onIntroComplete = () => {
      audio.startBossMusic(1);
    };

    cinematic.onPhaseTransitionComplete = () => {
      // Music intensity already updated at transition start
    };

    cinematic.startIntro(bossName);
    return cinematic;
  }

  function startBossRoboTinic() {
    roboTinicArena = new RoboTinicArena();
    const boss = new RoboTinic(roboTinicArena.leftWall, roboTinicArena.rightWall);
    currentBoss = boss;
    wireBossSoundEvents(boss);
    projectiles.clear();
    bossDefeatTimer = 0;

    controller = new MetalSonicController(gameState, -15, roboTinicArena.groundY);
    gameState.resetForNewZone();

    camera.levelLeft = roboTinicArena.leftWall - 5;
    camera.levelRight = roboTinicArena.rightWall + 5;
    camera.levelBottom = -10;
    camera.levelTop = 25;
    camera.snapTo(0, 8);

    hud.showZoneName("BOSS: ROBO TINIC");
    touchControls.bossMode = true;
    phase = "boss_robo_tinic";
    level = null;

    bossCinematic = createBossCinematic("ROBO TINIC");
  }

  function startBossBowser() {
    bowserArena = new BowserArena();
    const boss = new BowserBoss(bowserArena.leftWall, bowserArena.rightWall, bowserArena.groundY);
    currentBoss = boss;
    wireBossSoundEvents(boss);
    marioAlly = new MarioAlly(-10, bowserArena.groundY);
    projectiles.clear();
    bossDefeatTimer = 0;

    controller = new MetalSonicController(gameState, -15, bowserArena.groundY);
    gameState.resetForNewZone();

    camera.levelLeft = bowserArena.leftWall - 5;
    camera.levelRight = bowserArena.rightWall + 5;
    camera.levelBottom = -10;
    camera.levelTop = 25;
    camera.snapTo(0, 8);

    hud.showZoneName("BOSS: BOWSER");
    touchControls.bossMode = true;
    phase = "boss_bowser";
    level = null;

    bossCinematic = createBossCinematic("BOWSER");
  }

  function startEnding() {
    touchControls.bossMode = false;
    bossCinematic = null;
    audio.stopBossMusic();
    audio.stopAllBossLoops();
    endingCinematic = new EndingCinematic(
      gameState.score,
      gameState.time,
      gameState.totalRingsCollected,
      gameState.bossesDefeated,
      () => {
        phase = "title";
        gameState.titleScreen = true;
        titleScreen.visible = true;
        titleScreen.showReturnToTitle();
        level = null;
        controller = null;
        currentBoss = null;
        roboTinicArena = null;
        bowserArena = null;
        marioAlly = null;
        bossCinematic = null;
        endingCinematic = null;
        gameWon = false;
      },
    );
    phase = "ending";
  }

  function updateBossBattle(dt: number) {
    if (!controller || !currentBoss) return;

    // Update cinematic
    if (bossCinematic && bossCinematic.isActive()) {
      bossCinematic.update(dt, currentBoss.x, currentBoss.y);
      // Cinematic callback (onDefeatComplete) may have nullified currentBoss
      if (!currentBoss) return;
      const speedMul = bossCinematic.getGameSpeedMultiplier();
      if (speedMul === 0) {
        // Fully paused (intro) - only update cinematic, skip gameplay
        return;
      }
      // Apply slow-motion
      dt *= speedMul;
    }

    gameState.update(dt);
    input.setTouchState(touchControls.getState());
    const inputState = input.getState();

    const arena = phase === "boss_robo_tinic" ? roboTinicArena! : bowserArena!;
    const getEffectiveHeight = (x: number) => arena.getEffectiveHeight(x);

    controller.conveyorForce = 0;
    controller.update(dt, inputState, getEffectiveHeight);

    // Detect super form activation in boss battles
    if (gameState.superForm && !wasSuperLastFrame) {
      particles.emit({
        x: controller.x, y: controller.y + 0.5,
        count: 30,
        speedMin: 3, speedMax: 10,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.8,
        size: 0.15,
        sizeEnd: 0.03,
        r: 255, g: 220, b: 50,
        alpha: 1, alphaEnd: 0,
        gravity: -3, friction: 1,
      });
      screenTintR = 255;
      screenTintG = 220;
      screenTintB = 50;
      screenTintAlpha = 0.35;
      screenTintDecayRate = 2;
      shakeAmount = 6;
      shakeDuration = 0.3;
      audio.superTransform();
      controller.animator.setExpression("excited", 2);
    }
    wasSuperLastFrame = gameState.superForm;

    // Scared expression when falling fast in boss battles
    if (controller.verticalSpeed < -12 &&
        (controller.state === SonicState.IN_AIR || controller.state === SonicState.JUMPING)) {
      if (controller.animator.expression !== "scared") {
        controller.animator.setExpression("scared", 0);
      }
    } else if (controller.animator.expression === "scared" && controller.verticalSpeed >= -12) {
      controller.animator.setExpression("normal", 0);
    }

    // Clamp player to arena
    controller.x = arena.clampPlayerX(controller.x);

    // Fire projectiles
    if (inputState.attackPressed) {
      projectiles.fire(controller.x, controller.y, controller.facingRight);
      controller.setAttackMode(true);
      attackModeTimer = 0.3;
    }
    if (attackModeTimer > 0) {
      attackModeTimer -= dt;
      if (attackModeTimer <= 0) {
        controller.setAttackMode(false);
      }
    }

    // Update arena
    arena.update(dt);

    // Update boss
    currentBoss.update(dt, controller.x, controller.y);

    // Update projectiles (check boss collision)
    const projResult = projectiles.update(dt, currentBoss);
    if (projResult.hit) {
      particles.emit({
        x: projResult.hitX, y: projResult.hitY,
        count: 12, speedMin: 3, speedMax: 8,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.5, size: 0.12, sizeEnd: 0.02,
        r: 100, g: 200, b: 255, alpha: 1, alphaEnd: 0,
        gravity: -5, friction: 1,
      });
      shakeAmount = 4;
      shakeDuration = 0.15;
      scorePopup.add(projResult.hitX, projResult.hitY + 1, "HIT!");

      // Check for phase transition from projectile hit
      const phaseChange = currentBoss.consumePhaseChange();
      if (phaseChange.changed && bossCinematic) {
        audio.setBossMusicIntensity(phaseChange.newPhase);
        bossCinematic.startPhaseTransition(phaseChange.newPhase);
      }
    }

    // Player spin attack on boss
    if (currentBoss.checkPlayerCollision(controller.x, controller.y, controller.isAttacking())) {
      currentBoss.takeDamage();
      controller.verticalSpeed = 10;
      particles.emit({
        x: currentBoss.x, y: currentBoss.y + 1,
        count: 15, speedMin: 3, speedMax: 8,
        angleMin: 0, angleMax: Math.PI * 2,
        life: 0.5, size: 0.15, sizeEnd: 0.02,
        r: 255, g: 200, b: 50, alpha: 1, alphaEnd: 0,
        gravity: -5, friction: 1,
      });
      shakeAmount = 5;
      shakeDuration = 0.2;
      scorePopup.add(currentBoss.x, currentBoss.y + 2, "HIT!");

      // Check for phase transition
      const phaseChange = currentBoss.consumePhaseChange();
      if (phaseChange.changed && bossCinematic) {
        audio.setBossMusicIntensity(phaseChange.newPhase);
        bossCinematic.startPhaseTransition(phaseChange.newPhase);
      }
    }

    // Boss damages player (body collision)
    if (!gameState.invincible && currentBoss.checkDamageToPlayer(controller.x, controller.y) &&
        !controller.isAttacking() && controller.state !== SonicState.HURT) {
      applyBossDamage(currentBoss.x);
    }

    // Boss-specific hazards
    if (phase === "boss_robo_tinic" && currentBoss instanceof RoboTinic) {
      const boss = currentBoss as RoboTinic;
      if (boss.isBombNear(controller.x, controller.y) && controller.state !== SonicState.HURT && !gameState.invincible) {
        applyBossDamage(controller.x);
      }
      if (boss.isLaserHitting(controller.x, controller.y) && controller.state !== SonicState.HURT && !gameState.invincible) {
        applyBossDamage(currentBoss.x);
      }
    }

    if (phase === "boss_bowser" && currentBoss instanceof BowserBoss) {
      const bowser = currentBoss as BowserBoss;
      bowserArena!.setLavaRise(bowser.getLavaRise());

      const bossShake = bowser.getScreenShake();
      if (bossShake > 0) {
        shakeAmount = bossShake;
        shakeDuration = 0.2;
      }

      if (bowser.isFireHitting(controller.x, controller.y) && controller.state !== SonicState.HURT && !gameState.invincible) {
        applyBossDamage(currentBoss.x);
      }
      if (bowser.isShockwaveHitting(controller.x, controller.y) && controller.state !== SonicState.HURT && !gameState.invincible) {
        applyBossDamage(currentBoss.x);
      }
      if (bowser.isHammerNear(controller.x, controller.y) && controller.state !== SonicState.HURT && !gameState.invincible) {
        applyBossDamage(controller.x);
      }

      if (marioAlly) {
        marioAlly.update(dt, bowser.x, bowser.y, bowser.isGroundPoundVulnerable(),
          bowserArena!.effectiveLeft, bowserArena!.effectiveRight);

        if (marioAlly.checkBossHit(bowser.x, bowser.y) && bowser.isVulnerable()) {
          bowser.takeDamage();
          particles.emit({
            x: bowser.x, y: bowser.y + 3,
            count: 10, speedMin: 2, speedMax: 6,
            angleMin: 0, angleMax: Math.PI * 2,
            life: 0.4, size: 0.1, sizeEnd: 0.02,
            r: 255, g: 255, b: 100, alpha: 1, alphaEnd: 0,
            gravity: -3, friction: 1,
          });

          const phaseChange = bowser.consumePhaseChange();
          if (phaseChange.changed && bossCinematic) {
            audio.setBossMusicIntensity(phaseChange.newPhase);
            bossCinematic.startPhaseTransition(phaseChange.newPhase);
          }
        }

        if (bowser.checkDamageToPlayer(marioAlly.x, marioAlly.y)) {
          marioAlly.takeDamage(bowser.x);
        }
      }
    }

    // Update effects
    particles.update(dt);
    scorePopup.update(dt);

    // Camera
    const isGrounded = controller.state !== SonicState.IN_AIR &&
                       controller.state !== SonicState.JUMPING &&
                       controller.state !== SonicState.HURT;
    camera.update(dt, controller.x, controller.y, controller.getSpeed(),
      controller.facingRight, isGrounded, arena.groundY);

    if (shakeDuration > 0) shakeDuration -= dt;
    if (screenTintAlpha > 0) {
      screenTintAlpha -= dt * screenTintDecayRate;
      if (screenTintAlpha < 0) screenTintAlpha = 0;
    }

    // Boss defeated check
    if (currentBoss && currentBoss.defeated) {
      if (bossDefeatTimer === 0) {
        // Just defeated: trigger victory + cinematic
        controller.setVictoryMode(true);
        controller.animator.setExpression("excited", 10);
        if (bossCinematic) {
          bossCinematic.onDefeatComplete = () => {
            if (!currentBoss) return;
            const isRobo = currentBoss instanceof RoboTinic;
            gameState.bossesDefeated++;
            gameState.addScore(isRobo ? ROBO_TINIC_SCORE : BOWSER_SCORE);
            scorePopup.add(0, 10, `+${isRobo ? ROBO_TINIC_SCORE : BOWSER_SCORE}`);

            if (isRobo) {
              transition.fadeToBlack(0.5, () => startBossBowser());
            } else {
              transition.fadeToBlack(0.8, () => startEnding());
            }
            currentBoss = null;
          };
          bossCinematic.startDefeat();
        }
      }
      bossDefeatTimer += dt;

      // Fallback: if no cinematic, use old behavior
      if (currentBoss && (!bossCinematic || !bossCinematic.isActive())) {
        const isRobo = currentBoss instanceof RoboTinic;
        const isDone = isRobo
          ? (currentBoss as RoboTinic).isDefeatedAnimationDone()
          : (currentBoss as BowserBoss).isDefeatedAnimationDone();

        if (isDone && bossDefeatTimer > BOSS_DEFEAT_DELAY) {
          gameState.bossesDefeated++;
          gameState.addScore(isRobo ? ROBO_TINIC_SCORE : BOWSER_SCORE);
          scorePopup.add(0, 10, `+${isRobo ? ROBO_TINIC_SCORE : BOWSER_SCORE}`);

          if (isRobo) {
            transition.fadeToBlack(0.5, () => startBossBowser());
          } else {
            transition.fadeToBlack(0.8, () => startEnding());
          }
          currentBoss = null;
        }
      }
    }

    prevState = controller.state;

    if (gameState.gameOver) {
      phase = "game_over";
      titleScreen.showGameOver();
      touchControls.bossMode = false;
    }
  }

  function renderBossBattle(dt: number) {
    if (!controller) return;

    const arena = phase === "boss_robo_tinic" ? roboTinicArena : bowserArena;
    if (!arena) return;

    let camX = camera.x;
    let camY = camera.y;

    // Apply cinematic shake
    let totalShake = 0;
    if (shakeDuration > 0) totalShake += shakeAmount;
    if (bossCinematic && bossCinematic.isActive()) totalShake += bossCinematic.getShake();
    if (totalShake > 0) {
      camX += (Math.random() - 0.5) * totalShake;
      camY += (Math.random() - 0.5) * totalShake;
    }

    // Apply cinematic zoom
    let zoomMultiplier = 1;
    if (bossCinematic && bossCinematic.isActive()) {
      zoomMultiplier = bossCinematic.getCameraZoomMultiplier();
    }
    renderer.setCamera(camX, camY, camera.zoom * zoomMultiplier);

    arena.render(renderer);

    if (marioAlly && phase === "boss_bowser") {
      marioAlly.render(renderer);
    }

    if (currentBoss) {
      currentBoss.render(renderer);
    }

    particles.render(renderer);
    projectiles.render(renderer);

    const invincibilityFlicker = gameState.invincible ?
      Math.sin(gameState.invincibilityTimer * 15) > 0 : true;
    const bossSuperFade = gameState.superFormFadeOut > 0 ? gameState.superFormFadeOut / 1.5 : 0;
    const drawCharacter = selectedCharacter === "pedro_lucas" ? drawPedroLucas : selectedCharacter === "christian" ? drawChristian : drawMetalSonic;
    drawCharacter(
      renderer,
      controller.x,
      controller.y + 0.8,
      controller.facingRight,
      controller.animator,
      controller.isSpinning(),
      gameState.invincible,
      invincibilityFlicker,
      gameState.superForm,
      bossSuperFade,
    );

    scorePopup.render(renderer);

    if (screenTintAlpha > 0.001) {
      const ctx = renderer.ctx;
      ctx.globalAlpha = screenTintAlpha;
      ctx.fillStyle = `rgb(${screenTintR},${screenTintG},${screenTintB})`;
      ctx.fillRect(0, 0, renderer.width, renderer.height);
      ctx.globalAlpha = 1;
    }

    // Cinematic screen flash
    if (bossCinematic && bossCinematic.isActive()) {
      const flash = bossCinematic.getScreenFlash();
      if (flash && flash.alpha > 0.001) {
        const ctx = renderer.ctx;
        ctx.globalAlpha = flash.alpha;
        ctx.fillStyle = `rgb(${flash.r},${flash.g},${flash.b})`;
        ctx.fillRect(0, 0, renderer.width, renderer.height);
        ctx.globalAlpha = 1;
      }
    }

    if (currentBoss) {
      currentBoss.renderHealthBar(renderer);
    }

    hud.render(renderer, controller.getSpeed(), controller.x, dt);

    if (touchControls.isTouchDevice) {
      touchControls.render(renderer);
    }

    // Cinematic overlay (text, particles, effects) - on top of everything
    if (bossCinematic && bossCinematic.isActive()) {
      bossCinematic.render(renderer);
    }
  }

  // Track spin dash charge for sound
  let prevSpinDashCharge = 0;

  function gameLoop(now: number) {
    try {
    const rawDt = (now - lastTime) / 1000;
    // Clamp delta time to prevent physics explosion after tab switch
    const dt = Math.min(rawDt, 1 / 30);
    lastTime = now;

    // Resize if needed
    if (renderer.width !== window.innerWidth || renderer.height !== window.innerHeight) {
      renderer.resize();
      camera.resize(renderer.width, renderer.height);
    }

    // Update orientation overlay
    orientationOverlay.update();

    // Update transition
    transition.update(dt);

    // If orientation overlay is showing, skip game updates and render overlay
    if (orientationOverlay.isShowing) {
      renderer.clear();
      orientationOverlay.render(renderer);
      requestAnimationFrame(gameLoop);
      return;
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

    // Tutorial
    tutorial.update(dt);

    // Handle fullscreen touch
    const touchState = touchControls.getState();
    if (touchState.fullscreenTap) {
      tryFullscreen();
    }

    // Handle pause via touch
    const isBossPhaseTouch = phase === "boss_robo_tinic" || phase === "boss_bowser";
    if (touchState.pauseTap && (phase === "playing" || isBossPhaseTouch) && !gameState.gameOver && !paused) {
      paused = true;
      gameState.paused = true;
      pauseMenu.reset();
      pauseMenu.activate(canvas, audio);
    }

    if (phase === "playing" && level && controller && !gameState.gameOver && !paused) {
      // Update game state timers
      gameState.update(dt);

      // Player input (merge touch controls)
      input.setTouchState(touchState);
      const inputState = input.getState();

      // Terrain height function that includes bridges and platforms
      const getEffectiveHeight = (x: number) =>
        level!.getEffectiveHeight(x, controller!.y, controller!.verticalSpeed);

      // Apply conveyor force from previous frame
      controller.conveyorForce = 0;

      // Spin dash charge sound
      if (controller.state === SonicState.SPIN_DASH) {
        const charge = controller.getSpinDashChargeRatio();
        if (charge > prevSpinDashCharge + 0.15) {
          audio.spinDashCharge();
          prevSpinDashCharge = charge;
        }
      } else {
        prevSpinDashCharge = 0;
      }

      // Jump sound
      if (inputState.jumpPressed && controller.state !== SonicState.SPIN_DASH) {
        const wasGrounded = controller.state === SonicState.IDLE ||
                            controller.state === SonicState.RUNNING ||
                            controller.state === SonicState.SPINNING;
        if (wasGrounded) {
          audio.jump();
        }
      }

      // Update player
      controller.update(dt, inputState, getEffectiveHeight);

      // Detect super form activation
      if (gameState.superForm && !wasSuperLastFrame) {
        // Golden burst particles
        particles.emit({
          x: controller.x, y: controller.y + 0.5,
          count: 30,
          speedMin: 3, speedMax: 10,
          angleMin: 0, angleMax: Math.PI * 2,
          life: 0.8,
          size: 0.15,
          sizeEnd: 0.03,
          r: 255, g: 220, b: 50,
          alpha: 1, alphaEnd: 0,
          gravity: -3, friction: 1,
        });
        // Screen flash (gold tint)
        screenTintR = 255;
        screenTintG = 220;
        screenTintB = 50;
        screenTintAlpha = 0.35;
        screenTintDecayRate = 2;
        // Screen shake
        shakeAmount = 6;
        shakeDuration = 0.3;
        // Sound
        audio.superTransform();
        // Expression
        controller.animator.setExpression("excited", 2);
      }
      wasSuperLastFrame = gameState.superForm;

      // Scared expression when falling fast
      if (controller.verticalSpeed < -12 &&
          (controller.state === SonicState.IN_AIR || controller.state === SonicState.JUMPING)) {
        if (controller.animator.expression !== "scared") {
          controller.animator.setExpression("scared", 0);
        }
      } else if (controller.animator.expression === "scared" && controller.verticalSpeed >= -12) {
        controller.animator.setExpression("normal", 0);
      }

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
      speedEffects.update(dt, controller.x, controller.y, controller.getSpeed(), controller.isSpinning(), gameState.superForm);
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

      // Check goal reached -> trigger ACT CLEAR
      if (levelEvents.goalReached && !gameState.actClearPending) {
        gameState.actClearPending = true;

        // Victory pose
        controller.setVictoryMode(true);
        controller.animator.setExpression("excited", 5);

        // Save best scores/times
        save.setHighScore(zoneManager.zoneIndex, gameState.score);
        save.setBestTime(zoneManager.zoneIndex, gameState.time);

        audio.actClear();

        // Iris wipe transition to act clear
        const screenX = renderer.worldToScreenX(controller.x);
        const screenY = renderer.worldToScreenY(controller.y);

        actClear = new ActClear(
          level.config.name,
          level.config.act,
          gameState.time,
          gameState.rings,
          () => {
            controller!.setVictoryMode(false);
            gameState.addScore(actClear!.getTotalBonus());

            if (zoneManager.hasNextZone()) {
              transition.irisWipe(screenX, screenY, 0.4, () => {
                const nextZone = zoneManager.advanceToNextZone();
                if (nextZone) {
                  level = nextZone;
                  const startPos = level!.getStartPosition();
                  controller = new MetalSonicController(gameState, startPos.x, startPos.y);

                  const bounds = level!.config.cameraBounds;
                  camera.levelLeft = bounds.left;
                  camera.levelRight = bounds.right;
                  camera.levelBottom = bounds.bottom;
                  camera.levelTop = bounds.top;
                  camera.snapTo(startPos.x, startPos.y + 2);

                  hud.showZoneName(`${level!.config.name} - ACT ${level!.config.act}`);
                  prevState = SonicState.IDLE;
                  prevRingCount = 0;
                }
                actClear = null;
                gameState.actClearPending = false;
                phase = "playing";
              });
            } else {
              // All zones done -> start Boss 1: Robo Tinic
              actClear = null;
              gameState.actClearPending = false;
              transition.fadeToBlack(0.5, () => startBossRoboTinic());
            }
          },
        );
        phase = "act_clear";
      }

      // Track previous state
      prevState = controller.state;

      // Game over
      if (gameState.gameOver) {
        phase = "game_over";
        audio.gameOver();
        titleScreen.showGameOver();
      }
    } else if (phase === "act_clear" && actClear) {
      particles.update(dt);
      scorePopup.update(dt);
    } else if ((phase === "boss_robo_tinic" || phase === "boss_bowser") && !paused) {
      // Boss battle update
      updateBossBattle(dt);
    } else if (phase === "ending" && endingCinematic) {
      // Ending cinematic update
      endingCinematic.update(dt);
    }

    // === RENDER ===
    renderer.clear();

    if (phase === "ending" && endingCinematic) {
      // Ending cinematic has its own full-screen render
      endingCinematic.render(renderer);
    } else if ((phase === "boss_robo_tinic" || phase === "boss_bowser") && controller) {
      // Boss battle render
      renderBossBattle(dt);
    } else if (level && controller) {
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
      speedEffects.render(renderer, controller.x, controller.y, controller.groundSpeed, level.getTime(), gameState.superForm);

      // Render particles (world space)
      particles.render(renderer);

      // Render player
      const invincibilityFlicker = gameState.invincible ?
        Math.sin(gameState.invincibilityTimer * 15) > 0 : true;
      const superFade = gameState.superFormFadeOut > 0 ? gameState.superFormFadeOut / 1.5 : 0;

      const drawCharacter = selectedCharacter === "pedro_lucas" ? drawPedroLucas : selectedCharacter === "christian" ? drawChristian : drawMetalSonic;
      drawCharacter(
        renderer,
        controller.x,
        controller.y + 0.8,
        controller.facingRight,
        controller.animator,
        controller.isSpinning(),
        gameState.invincible,
        invincibilityFlicker,
        gameState.superForm,
        superFade,
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

      // Subtle golden screen tint during super form
      if (gameState.superForm) {
        const ctx = renderer.ctx;
        const pulseAlpha = 0.02 + Math.sin(performance.now() * 0.003) * 0.01;
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = "rgb(255,220,50)";
        ctx.fillRect(0, 0, renderer.width, renderer.height);
        ctx.globalAlpha = 1;
      }

      // HUD (screen space, not affected by camera)
      hud.render(renderer, controller.getSpeed(), controller.x, dt);

      // Tutorial overlay
      tutorial.render(renderer);

      // Touch controls overlay (only on touch devices during gameplay)
      if (touchControls.isTouchDevice && phase === "playing") {
        touchControls.render(renderer);
      }
    }

    // Act clear overlay
    if (actClear) {
      actClear.render(renderer);
    }

    // Game won overlay (should no longer trigger, but keep as fallback)
    if (gameWon) {
      const ctx = renderer.ctx;
      const rw = renderer.width;
      const rh = renderer.height;
      const scale = Math.min(rw / 800, rh / 600, 1);

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, rw, rh);

      renderer.drawScreenText(
        "CONGRATULATIONS!",
        rw / 2, rh / 2 - 60 * scale,
        "#ffcc00", 48 * scale, "center", "#664400"
      );

      renderer.drawScreenText(
        `FINAL SCORE: ${gameState.score}`,
        rw / 2, rh / 2 + 10 * scale,
        "#ffffff", 32 * scale, "center", "black"
      );
      renderer.drawScreenText(
        "ALL ZONES CLEARED!",
        rw / 2, rh / 2 + 55 * scale,
        "#44ff44", 24 * scale, "center", "#004400"
      );
    }

    // Pause overlay
    if (paused) {
      pauseMenu.render(renderer);
    }

    // Zone select overlay
    zoneSelect.render(renderer);

    // Character select overlay
    characterSelect.render(renderer);

    // Title screen overlay
    titleScreen.render(renderer);

    // Screen transition (always on top)
    transition.render(renderer);

    } catch (e) {
      console.error("Game loop error:", e);
    }
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

main();
