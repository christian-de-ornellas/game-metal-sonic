export type AnimationState = "idle" | "running" | "spinning" | "hurt" | "air";

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
  expression: "normal" | "determined" | "hurt" | "happy" = "normal";
  private expressionTimer = 0;

  setState(state: AnimationState) {
    if (state !== this.currentState) {
      if (state !== "idle") this.idleTime = 0;
      this.idleBored = false;
    }
    this.currentState = state;
  }

  setExpression(expr: "normal" | "determined" | "hurt" | "happy", duration: number = 0) {
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
        this.animateIdle();
        break;
      case "running":
        this.animateRunning(groundSpeed);
        // Expression based on speed
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
    }

    this.jetParticlePhase += dt * 10;
  }

  private animateIdle() {
    this.breathOffset = Math.sin(this.time * 2) * 0.5;
    this.flickerVisible = true;

    if (this.idleBored) {
      // Bored animation: tap foot, look around
      const boredPhase = (this.idleTime - 4) * 2;
      this.rightLegAngle = Math.sin(boredPhase * 4) * 0.15 * Math.max(0, Math.sin(boredPhase * 0.5));
      this.leftLegAngle = 0;
      // Head tilt (via body lean)
      this.bodyLean = Math.sin(boredPhase * 0.7) * 0.05;
      // Arms crossed look
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
}
