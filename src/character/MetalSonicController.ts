import { InputState } from "../core/InputManager";
import { MetalSonicAnimator, AnimationState } from "./MetalSonicAnimator";
import { GameState } from "../core/GameState";
import {
  ACCELERATION, DECELERATION, FRICTION, TOP_SPEED,
  JUMP_FORCE, GRAVITY, AIR_ACCELERATION,
  SPIN_DASH_BASE, SPIN_DASH_CHARGE_RATE, SPIN_DASH_MAX,
  HURT_KNOCKBACK, HURT_JUMP, HURT_DURATION, INVINCIBILITY_DURATION,
  SLOPE_FACTOR_UP, SLOPE_FACTOR_DOWN,
  JUMP_BUFFER_WINDOW, COYOTE_TIME,
  AIR_DRAG_THRESHOLD, AIR_DRAG_MIN_SPEED,
} from "../constants";

export type TerrainQueryFn = (x: number) => number;

export enum SonicState {
  IDLE,
  RUNNING,
  JUMPING,
  SPINNING,
  SPIN_DASH,
  IN_AIR,
  HURT,
}

export class MetalSonicController {
  x = 0;
  y = 0;
  state = SonicState.IDLE;
  groundSpeed = 0;
  verticalSpeed = 0;
  facingRight = true;
  animator = new MetalSonicAnimator();
  conveyorForce = 0; // set externally by zone

  private spinDashCharge = 0;
  private hurtTimer = 0;
  private holdingDownInAir = false;

  // Input buffering & coyote time
  private jumpBufferTimer = 0;
  private coyoteTimer = 0;
  private wasGroundedLastFrame = true;

  // New animation triggers
  private wasAirborneLastFrame = false;
  private skidding = false;
  private victoryMode = false;
  private attackMode = false;

  // Loop state
  private inLoop = false;
  private loopAngle = 0;
  private loopStartAngle = 0;
  private loopAngleTraversed = 0;
  private loopCenterX = 0;
  private loopCenterY = 0;
  private loopRadius = 0;
  private loopGroundY = 0;
  loopCooldown = 0; // public so LoopBuilder can read it

  constructor(
    private gameState: GameState,
    startX: number,
    startY: number,
  ) {
    this.x = startX;
    this.y = startY;
  }

  getSpeed(): number {
    return Math.abs(this.groundSpeed);
  }

  isAttacking(): boolean {
    return this.state === SonicState.SPINNING ||
           this.state === SonicState.JUMPING;
  }

  isSpinning(): boolean {
    return this.state === SonicState.SPINNING ||
           this.state === SonicState.SPIN_DASH;
  }

  getSpinDashChargeRatio(): number {
    if (this.state !== SonicState.SPIN_DASH) return 0;
    return (this.spinDashCharge - SPIN_DASH_BASE) / (SPIN_DASH_MAX - SPIN_DASH_BASE);
  }

  springLaunch(vx: number, vy: number) {
    this.groundSpeed = vx;
    this.verticalSpeed = vy;
    this.state = SonicState.IN_AIR;
    if (vx !== 0) this.facingRight = vx > 0;
  }

  setVictoryMode(active: boolean) {
    this.victoryMode = active;
  }

  setAttackMode(active: boolean) {
    this.attackMode = active;
  }

  takeDamage(sourceX?: number) {
    if (this.gameState.invincible) return;
    if (this.state === SonicState.HURT) return;

    if (this.gameState.shield) {
      this.gameState.shield = false;
      this.gameState.invincible = true;
      this.gameState.invincibilityTimer = INVINCIBILITY_DURATION;
      return;
    }

    // Knockback direction based on enemy position
    let knockbackDir = this.facingRight ? -1 : 1;
    if (sourceX !== undefined) {
      knockbackDir = this.x < sourceX ? -1 : 1;
    }

    if (this.gameState.rings > 0) {
      this.gameState.loseRings();
      this.state = SonicState.HURT;
      this.hurtTimer = HURT_DURATION;
      this.groundSpeed = knockbackDir * HURT_KNOCKBACK;
      this.verticalSpeed = HURT_JUMP;
      this.gameState.invincible = true;
      this.gameState.invincibilityTimer = INVINCIBILITY_DURATION;
    } else {
      this.state = SonicState.HURT;
      this.hurtTimer = HURT_DURATION;
      this.verticalSpeed = HURT_JUMP * 1.5;
      this.groundSpeed = knockbackDir * HURT_KNOCKBACK;
      if (!this.gameState.loseLife()) {
        this.gameState.gameOver = true;
      }
    }
  }

  respawn(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.state = SonicState.IDLE;
    this.groundSpeed = 0;
    this.verticalSpeed = 0;
    this.hurtTimer = 0;
    this.inLoop = false;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
  }

  enterLoop(centerX: number, centerY: number, radius: number, groundY: number = 0) {
    if (this.loopCooldown > 0) return;
    this.inLoop = true;
    this.loopCenterX = centerX;
    this.loopCenterY = centerY;
    this.loopRadius = radius;
    this.loopGroundY = groundY;
    // Calculate current angle from position relative to center
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    this.loopAngle = Math.atan2(dy, dx);
    this.loopStartAngle = this.loopAngle;
    this.loopAngleTraversed = 0;
  }

  update(dt: number, input: InputState, getTerrainHeight: TerrainQueryFn) {
    if (this.gameState.paused || this.gameState.gameOver) return;

    // Loop physics
    if (this.inLoop) {
      this.updateLoop(dt, input);
      this.updateAnimation(dt);
      return;
    }

    // Decrement timers
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.loopCooldown > 0) this.loopCooldown -= dt;

    // Buffer jump input
    if (input.jumpPressed) {
      this.jumpBufferTimer = JUMP_BUFFER_WINDOW;
    }

    // Terrain collision
    const terrainY = getTerrainHeight(this.x);
    const isGrounded = this.y <= terrainY + 0.1 && this.verticalSpeed <= 0;

    // Coyote time: if we just left the ground without jumping, grant grace period
    if (this.wasGroundedLastFrame && !isGrounded &&
        this.state !== SonicState.JUMPING && this.state !== SonicState.HURT) {
      this.coyoteTimer = COYOTE_TIME;
    }
    this.wasGroundedLastFrame = isGrounded;

    const effectiveTopSpeed = this.gameState.speedBoost ? TOP_SPEED * 1.5 : TOP_SPEED;
    const jumpRequested = input.jumpPressed || this.jumpBufferTimer > 0;

    // Hurt state
    if (this.state === SonicState.HURT) {
      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0 && isGrounded) {
        this.state = SonicState.IDLE;
      }
      this.applyPhysics(dt, input, isGrounded, terrainY, getTerrainHeight, effectiveTopSpeed);
      this.updateAnimation(dt);
      return;
    }

    // Track if holding down in air for drop dash
    if (!isGrounded && input.down) {
      this.holdingDownInAir = true;
    }
    if (isGrounded) {
      this.holdingDownInAir = false;
    }

    // State transitions
    if (isGrounded) {
      switch (this.state) {
        case SonicState.IN_AIR:
        case SonicState.JUMPING:
          // Drop dash: if holding down during air, land in spinning state
          if (input.down && this.holdingDownInAir && Math.abs(this.groundSpeed) > 0.5) {
            this.state = SonicState.SPINNING;
            // Boost ground speed slightly
            this.groundSpeed *= 1.2;
          } else if (Math.abs(this.groundSpeed) > 0.1) {
            this.state = SonicState.RUNNING;
          } else {
            this.state = SonicState.IDLE;
          }
          this.verticalSpeed = 0;
          this.holdingDownInAir = false;
          break;

        case SonicState.IDLE:
          if (input.left || input.right) {
            this.state = SonicState.RUNNING;
          }
          if (input.down && jumpRequested) {
            this.state = SonicState.SPIN_DASH;
            this.spinDashCharge = SPIN_DASH_BASE;
            this.jumpBufferTimer = 0;
          }
          if (jumpRequested && !input.down) {
            this.state = SonicState.JUMPING;
            this.verticalSpeed = JUMP_FORCE;
            this.jumpBufferTimer = 0;
          }
          break;

        case SonicState.RUNNING:
          if (!input.left && !input.right && Math.abs(this.groundSpeed) < 0.1) {
            this.state = SonicState.IDLE;
            this.groundSpeed = 0;
          }
          if (input.down && jumpRequested) {
            this.state = SonicState.SPIN_DASH;
            this.spinDashCharge = SPIN_DASH_BASE;
            this.jumpBufferTimer = 0;
          }
          if (jumpRequested && !input.down) {
            this.state = SonicState.JUMPING;
            this.verticalSpeed = JUMP_FORCE;
            this.jumpBufferTimer = 0;
          }
          if (input.down && Math.abs(this.groundSpeed) > 1) {
            this.state = SonicState.SPINNING;
          }
          break;

        case SonicState.SPINNING:
          if (Math.abs(this.groundSpeed) < 0.5) {
            this.state = SonicState.IDLE;
            this.groundSpeed = 0;
          }
          if (jumpRequested) {
            this.state = SonicState.JUMPING;
            this.verticalSpeed = JUMP_FORCE;
            this.jumpBufferTimer = 0;
          }
          break;

        case SonicState.SPIN_DASH:
          if (input.jump) {
            this.spinDashCharge = Math.min(
              this.spinDashCharge + SPIN_DASH_CHARGE_RATE * dt,
              SPIN_DASH_MAX,
            );
          }
          if (!input.jump && !input.jumpPressed) {
            this.groundSpeed = this.facingRight ? this.spinDashCharge : -this.spinDashCharge;
            this.state = SonicState.SPINNING;
          }
          break;
      }
    } else {
      // Airborne: allow coyote time jump
      if (this.coyoteTimer > 0 && jumpRequested &&
          this.state !== SonicState.JUMPING) {
        this.state = SonicState.JUMPING;
        this.verticalSpeed = JUMP_FORCE;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
      } else {
        if (this.state !== SonicState.JUMPING) {
          this.state = SonicState.IN_AIR;
        }
        if (this.state === SonicState.JUMPING && input.jumpReleased && this.verticalSpeed > 0) {
          this.verticalSpeed *= 0.5;
        }
      }
    }

    // Recompute grounded after state transitions — jumping sets verticalSpeed > 0
    const physicsGrounded = this.y <= terrainY + 0.1 && this.verticalSpeed <= 0;
    this.applyPhysics(dt, input, physicsGrounded, terrainY, getTerrainHeight, effectiveTopSpeed);
    this.updateAnimation(dt);
  }

  private applyPhysics(
    dt: number,
    input: InputState,
    isGrounded: boolean,
    terrainY: number,
    getTerrainHeight: TerrainQueryFn,
    effectiveTopSpeed: number,
  ) {
    if (isGrounded && this.state !== SonicState.HURT) {
      // Ground physics
      let inputDir = 0;
      if (input.right) inputDir = 1;
      if (input.left) inputDir = -1;

      if (this.state === SonicState.SPIN_DASH) {
        inputDir = 0;
        // Exponential decay to stop quickly while charging
        this.groundSpeed *= Math.max(0, 1 - 5 * dt);
      }

      // Apply conveyor belt force
      if (this.conveyorForce !== 0) {
        this.groundSpeed += this.conveyorForce * dt;
      }

      if (inputDir !== 0) {
        if (Math.sign(inputDir) === Math.sign(this.groundSpeed) || this.groundSpeed === 0) {
          // Acceleration curve: faster at low speed, slower near top speed
          const speedRatio = Math.abs(this.groundSpeed) / effectiveTopSpeed;
          const accelCurve = 1 - speedRatio * 0.4;
          this.groundSpeed += inputDir * ACCELERATION * accelCurve * dt;
          this.skidding = false;
        } else {
          this.groundSpeed += inputDir * DECELERATION * dt;
          // Skidding: input opposes movement at high speed
          if (Math.abs(this.groundSpeed) > 3) {
            this.skidding = true;
          }
        }
      } else if (this.state !== SonicState.SPINNING && this.state !== SonicState.SPIN_DASH) {
        if (Math.abs(this.groundSpeed) > FRICTION * dt) {
          this.groundSpeed -= Math.sign(this.groundSpeed) * FRICTION * dt;
        } else {
          this.groundSpeed = 0;
        }
      } else if (this.state === SonicState.SPINNING) {
        this.groundSpeed -= Math.sign(this.groundSpeed) * FRICTION * 0.5 * dt;
      }

      // Clamp to top speed (acceleration won't exceed, but spin dash can)
      if (this.state !== SonicState.SPINNING && Math.abs(this.groundSpeed) > effectiveTopSpeed) {
        this.groundSpeed = Math.sign(this.groundSpeed) * effectiveTopSpeed;
      }

      // Slope factor from heightmap derivative
      const sampleDist = 0.5;
      const hLeft = getTerrainHeight(this.x - sampleDist);
      const hRight = getTerrainHeight(this.x + sampleDist);
      const slopeAngle = Math.atan2(hRight - hLeft, sampleDist * 2);

      if (Math.abs(slopeAngle) > 0.05) {
        const sinAngle = Math.sin(slopeAngle);
        const movingUphill = (this.groundSpeed > 0 && slopeAngle > 0) ||
                             (this.groundSpeed < 0 && slopeAngle < 0);
        if (movingUphill) {
          this.groundSpeed -= sinAngle * SLOPE_FACTOR_UP * dt;
        } else {
          this.groundSpeed += sinAngle * SLOPE_FACTOR_DOWN * dt;
        }
      }

      // Update facing
      if (Math.abs(this.groundSpeed) > 0.1) {
        this.facingRight = this.groundSpeed > 0;
      }

      this.verticalSpeed = 0;
      this.y = terrainY;
    } else {
      // Air physics
      if (this.state !== SonicState.HURT) {
        let inputDir = 0;
        if (input.right) inputDir = 1;
        if (input.left) inputDir = -1;
        this.groundSpeed += inputDir * AIR_ACCELERATION * dt;
        if (Math.abs(this.groundSpeed) > effectiveTopSpeed) {
          this.groundSpeed = Math.sign(this.groundSpeed) * effectiveTopSpeed;
        }
      }

      // Air drag: gentle decay at high horizontal speed
      if (Math.abs(this.groundSpeed) > AIR_DRAG_MIN_SPEED) {
        this.groundSpeed *= Math.pow(AIR_DRAG_THRESHOLD, dt * 60);
      }

      // Gravity (GRAVITY is negative in constants)
      this.verticalSpeed += GRAVITY * dt;
    }

    // Apply movement
    this.x += this.groundSpeed * dt;
    if (!isGrounded || this.state === SonicState.HURT) {
      this.y += this.verticalSpeed * dt;
    }

    // Snap to terrain when falling through
    const currentTerrain = getTerrainHeight(this.x);
    if (this.y < currentTerrain && this.verticalSpeed <= 0) {
      this.y = currentTerrain;
      this.verticalSpeed = 0;
    }

    // Death plane
    if (this.y < -30) {
      this.takeDamage();
      // Use checkpoint if available
      const cp = this.gameState.getCheckpoint();
      this.respawn(cp.x, cp.y);
    }
  }

  private exitLoop() {
    this.inLoop = false;
    this.loopCooldown = 0.5; // prevent immediate re-entry

    const speed = Math.abs(this.groundSpeed);

    if (this.loopAngleTraversed >= Math.PI * 2) {
      // Completed full revolution — exit running forward on the ground past the loop
      this.x = this.loopCenterX + this.loopRadius + 2;
      this.y = this.loopGroundY;
      this.groundSpeed = speed; // always positive (moving right/forward)
      this.verticalSpeed = 0;
      this.facingRight = true;
      this.state = speed > 0.5 ? SonicState.RUNNING : SonicState.IDLE;
    } else {
      // Fell off the loop (too slow) — exit with tangential velocity
      const tangentX = -Math.sin(this.loopAngle) * Math.sign(this.groundSpeed);
      const tangentY = Math.cos(this.loopAngle) * Math.sign(this.groundSpeed);
      this.groundSpeed = tangentX * speed;
      this.verticalSpeed = tangentY * speed;

      // If near the bottom of the loop, snap to ground and zero vertical
      if (this.y < this.loopCenterY - this.loopRadius * 0.5) {
        this.verticalSpeed = Math.max(this.verticalSpeed, 0);
      }

      this.state = SonicState.IN_AIR;
    }
  }

  private updateLoop(dt: number, input: InputState) {
    // Acceleration input (apply before movement for responsiveness)
    let inputDir = 0;
    if (input.right) inputDir = 1;
    if (input.left) inputDir = -1;
    if (inputDir !== 0) {
      this.groundSpeed += inputDir * ACCELERATION * dt;
    }

    // Gravity along loop tangent: tangential force = -g * cos(angle)
    // (cos gives the component of downward gravity along the tangent for CCW motion)
    const gravityEffect = -Math.cos(this.loopAngle) * Math.abs(GRAVITY) * 0.3 * dt;
    this.groundSpeed += gravityEffect;

    // Friction
    if (Math.abs(this.groundSpeed) > FRICTION * dt) {
      this.groundSpeed -= Math.sign(this.groundSpeed) * FRICTION * 0.3 * dt;
    }

    // Move along circular path
    const angularSpeed = this.groundSpeed / this.loopRadius;
    const angleDelta = angularSpeed * dt;
    this.loopAngle += angleDelta;
    this.loopAngleTraversed += Math.abs(angleDelta);

    // Update position
    this.x = this.loopCenterX + Math.cos(this.loopAngle) * this.loopRadius;
    this.y = this.loopCenterY + Math.sin(this.loopAngle) * this.loopRadius;

    // Exit: completed one full revolution
    if (this.loopAngleTraversed >= Math.PI * 2) {
      this.exitLoop();
      return;
    }

    // Exit: too slow to maintain the loop (fall off)
    if (Math.abs(this.groundSpeed) < 1.5) {
      this.exitLoop();
      return;
    }
  }

  private updateAnimation(dt: number) {
    const isAirborne = this.state === SonicState.JUMPING || this.state === SonicState.IN_AIR;
    const isGrounded = !isAirborne && this.state !== SonicState.HURT;

    // Detect skidding: input opposite to groundSpeed at high speed while running
    if (this.state === SonicState.RUNNING && Math.abs(this.groundSpeed) > 3) {
      // Skidding is set externally or detected via deceleration
      // Check if speed is decelerating rapidly (groundSpeed direction vs facing)
      this.skidding = false; // will be set below based on input context
    } else {
      this.skidding = false;
    }

    // Detect landing: was airborne last frame, now grounded
    let justLanded = false;
    if (this.wasAirborneLastFrame && isGrounded) {
      justLanded = true;
    }
    this.wasAirborneLastFrame = isAirborne;

    // Priority-based animation state
    let animState: AnimationState;
    if (this.victoryMode) {
      animState = "victory";
    } else if (this.attackMode) {
      animState = "attack";
    } else if (this.state === SonicState.HURT) {
      animState = "hurt";
    } else if (this.state === SonicState.RUNNING && this.skidding) {
      animState = "skidding";
    } else if (this.state === SonicState.RUNNING) {
      animState = "running";
    } else if (this.state === SonicState.SPIN_DASH) {
      animState = "charging";
    } else if (this.state === SonicState.SPINNING) {
      animState = "spinning";
    } else if (isAirborne) {
      animState = "air";
    } else if (justLanded && this.animator.currentState !== "landing") {
      animState = "landing";
    } else if (this.animator.currentState === "landing" && this.animator.landingTimer > 0) {
      animState = "landing";
    } else if (this.state === SonicState.IDLE) {
      animState = "idle";
    } else {
      animState = "idle";
    }

    this.animator.setState(animState);
    this.animator.update(dt, Math.abs(this.groundSpeed));
  }
}
