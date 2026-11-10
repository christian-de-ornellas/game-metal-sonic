export type AnimationState = "idle" | "running" | "spinning" | "hurt" | "air" | "victory" | "attack" | "charging" | "landing" | "skidding";

export class MetalSonicAnimator {
  time = 0;
  currentState: AnimationState = "idle";

  // Limb angles (in radians)
  leftArmAngle = 0;
  rightArmAngle = 0;
  leftLegAngle = 0;
  rightLegAngle = 0;
  bodyLean = 0;
  breathOffset = 0;
  spinAngle = 0;
  flickerVisible = true;
  jetParticlePhase = 0;

  // Idle boredom animation
  idleTime = 0;
  idleBored = false;

  // Expression state (for Pedro Lucas)
  expression: "normal" | "determined" | "hurt" | "happy" | "excited" | "scared" | "sleeping" | "cocky" = "normal";
  private expressionTimer = 0;

  // New animation properties
  squashStretch = 1.0;
  landingTimer = 0;
  victoryBounce = 0;
  attackArmExtension = 0;
  chargeCrouch = 0;
  sleepZzz = 0;

  setState(state: AnimationState) {
    if (state !== this.currentState) {
      // Reset properties on state exit
      if (this.currentState === "landing") {
        this.squashStretch = 1.0;
        this.landingTimer = 0;
      }
      if (this.currentState === "charging") {
        this.chargeCrouch = 0;
      }
      if (this.currentState === "victory") {
        this.victoryBounce = 0;
      }
      if (this.currentState === "attack") {
        this.attackArmExtension = 0;
      }

      if (state !== "idle") {
        this.idleTime = 0;
        this.sleepZzz = 0;
      }
      this.idleBored = false;

      // Init on state enter
      if (state === "landing") {
        this.landingTimer = 0.15;
      }
    }
    this.currentState = state;
  }

  setExpression(expr: "normal" | "determined" | "hurt" | "happy" | "excited" | "scared" | "sleeping" | "cocky", duration: number = 0) {
    this.expression = expr;
    this.expressionTimer = duration;
  }

  update(dt: number, groundSpeed: number) {
    this.time += dt;

    // Expression timer
    if (this.expressionTimer > 0) {
      this.expressionTimer -= dt;
      if (this.expressionTimer <= 0) {
        this.expression = "normal";
      }
    }

    switch (this.currentState) {
      case "idle":
        this.idleTime += dt;
        this.idleBored = this.idleTime > 4;
        if (this.idleTime > 8) {
          if (this.expression !== "sleeping" && this.expressionTimer <= 0) {
            this.expression = "sleeping";
          }
          this.sleepZzz += dt;
        }
        this.animateIdle();
        break;
      case "running":
        this.animateRunning(groundSpeed);
        if (groundSpeed > 10 && this.expression === "normal") {
          this.expression = "determined";
        } else if (groundSpeed <= 10 && this.expression === "determined") {
          this.expression = "normal";
        }
        break;
      case "spinning":
        this.animateSpinning(dt);
        break;
      case "air":
        this.animateAir();
        break;
      case "hurt":
        this.animateHurt();
        if (this.expression !== "hurt") {
          this.setExpression("hurt", 1);
        }
        break;
      case "victory":
        this.animateVictory();
        break;
      case "attack":
        this.animateAttack();
        break;
      case "charging":
        this.animateCharging(dt);
        break;
      case "landing":
        this.animateLanding(dt);
        break;
      case "skidding":
        this.animateSkidding();
        break;
    }

    this.jetParticlePhase += dt * 10;
  }

  private animateIdle() {
    this.breathOffset = Math.sin(this.time * 2) * 0.5;
    this.flickerVisible = true;

    if (this.idleTime > 8) {
      // Sleeping animation
      this.bodyLean = 0.05;
      this.leftArmAngle = 0.3;
      this.rightArmAngle = 0.3;
      this.leftLegAngle = 0;
      this.rightLegAngle = 0;
      this.breathOffset = Math.sin(this.time * 1.2) * 1.0;
    } else if (this.idleBored) {
      const boredPhase = (this.idleTime - 4) * 2;
      this.rightLegAngle = Math.sin(boredPhase * 4) * 0.15 * Math.max(0, Math.sin(boredPhase * 0.5));
      this.leftLegAngle = 0;
      this.bodyLean = Math.sin(boredPhase * 0.7) * 0.05;
      this.leftArmAngle = Math.sin(boredPhase * 0.3) * 0.1 - 0.2;
      this.rightArmAngle = Math.sin(boredPhase * 0.3 + 1) * 0.1 + 0.2;
    } else {
      this.leftArmAngle = 0;
      this.rightArmAngle = 0;
      this.leftLegAngle = 0;
      this.rightLegAngle = 0;
      this.bodyLean = 0;
    }
  }

  private animateRunning(speed: number) {
    const freq = Math.min(speed * 3, 20);
    const amp = Math.min(speed * 0.12, 0.8);
    const t = this.time * freq;

    this.leftLegAngle = Math.sin(t) * amp;
    this.rightLegAngle = Math.sin(t + Math.PI) * amp;
    this.leftArmAngle = Math.sin(t + Math.PI) * amp * 0.6;
    this.rightArmAngle = Math.sin(t) * amp * 0.6;
    this.bodyLean = Math.min(speed * 0.04, 0.3);
    this.breathOffset = 0;
    this.flickerVisible = true;
  }

  private animateSpinning(dt: number) {
    this.spinAngle += dt * 25;
    this.flickerVisible = true;
  }

  private animateAir() {
    this.leftArmAngle = -0.4;
    this.rightArmAngle = -0.4;
    this.leftLegAngle = 0.3;
    this.rightLegAngle = 0.3;
    this.bodyLean = 0;
    this.breathOffset = 0;
    this.flickerVisible = true;
  }

  private animateHurt() {
    this.flickerVisible = Math.sin(this.time * 30) > 0;
    this.bodyLean = Math.sin(this.time * 15) * 0.3;
    this.leftArmAngle = 0.5;
    this.rightArmAngle = 0.5;
    this.leftLegAngle = 0;
    this.rightLegAngle = 0;
  }

  private animateVictory() {
    this.flickerVisible = true;
    this.victoryBounce += 0.05;
    const bounce = Math.sin(this.victoryBounce * 4) * 0.3;

    // Arms raised up
    this.leftArmAngle = -1.2 + bounce * 0.2;
    this.rightArmAngle = -1.2 - bounce * 0.2;
    // Slight leg bounce
    this.leftLegAngle = Math.sin(this.victoryBounce * 8) * 0.15;
    this.rightLegAngle = Math.sin(this.victoryBounce * 8 + Math.PI) * 0.15;
    this.bodyLean = 0;
    this.breathOffset = bounce * 2;

    if (this.expression !== "excited" && this.expressionTimer <= 0) {
      this.expression = "excited";
    }
  }

  private animateAttack() {
    this.flickerVisible = true;
    this.attackArmExtension = Math.min(this.attackArmExtension + 0.15, 1.0);

    // Right arm extended forward
    this.rightArmAngle = -0.8 * this.attackArmExtension;
    this.leftArmAngle = 0.3;
    // Body leans forward
    this.bodyLean = 0.2 * this.attackArmExtension;
    this.leftLegAngle = -0.1;
    this.rightLegAngle = 0.2;
    this.breathOffset = 0;

    if (this.expression !== "determined" && this.expressionTimer <= 0) {
      this.expression = "determined";
    }
  }

  private animateCharging(dt: number) {
    this.flickerVisible = true;
    this.chargeCrouch = Math.min(this.chargeCrouch + dt * 5, 1.0);

    // Crouched pose with trembling energy
    const tremble = Math.sin(this.time * 40) * 0.02 * this.chargeCrouch;
    this.squashStretch = 1.0 - 0.2 * this.chargeCrouch;
    this.bodyLean = tremble;
    this.leftArmAngle = 0.5 + tremble;
    this.rightArmAngle = 0.5 - tremble;
    this.leftLegAngle = 0.4 * this.chargeCrouch;
    this.rightLegAngle = 0.4 * this.chargeCrouch;
    this.breathOffset = 0;

    if (this.expression !== "cocky" && this.expressionTimer <= 0) {
      this.expression = "cocky";
    }
  }

  private animateLanding(dt: number) {
    this.flickerVisible = true;
    this.landingTimer -= dt;

    if (this.landingTimer > 0) {
      // Squash effect: compress vertically
      const t = 1.0 - (this.landingTimer / 0.15);
      this.squashStretch = 0.7 + 0.3 * t; // 0.7 → 1.0
    } else {
      this.squashStretch = 1.0;
    }

    this.leftArmAngle = 0.2;
    this.rightArmAngle = 0.2;
    this.leftLegAngle = 0.15;
    this.rightLegAngle = 0.15;
    this.bodyLean = 0;
    this.breathOffset = 0;
  }

  private animateSkidding() {
    this.flickerVisible = true;

    // Lean backward, arms forward for balance
    this.bodyLean = -0.25;
    this.leftArmAngle = -0.6;
    this.rightArmAngle = -0.6;
    this.leftLegAngle = 0.3;
    this.rightLegAngle = -0.1;
    this.breathOffset = 0;
  }
}
