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

  setState(state: AnimationState) {
    if (state === this.currentState) return;
    this.currentState = state;
  }

  update(dt: number, groundSpeed: number) {
    this.time += dt;

    switch (this.currentState) {
      case "idle":
        this.animateIdle();
        break;
      case "running":
        this.animateRunning(groundSpeed);
        break;
      case "spinning":
        this.animateSpinning(dt);
        break;
      case "air":
        this.animateAir();
        break;
      case "hurt":
        this.animateHurt();
        break;
    }

    this.jetParticlePhase += dt * 10;
  }

  private animateIdle() {
    this.breathOffset = Math.sin(this.time * 2) * 0.5;
    this.leftArmAngle = 0;
    this.rightArmAngle = 0;
    this.leftLegAngle = 0;
    this.rightLegAngle = 0;
    this.bodyLean = 0;
    this.flickerVisible = true;
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
