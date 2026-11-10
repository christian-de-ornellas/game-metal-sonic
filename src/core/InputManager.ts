import { TouchState } from "../ui/TouchControls";

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  spin: boolean;
  pause: boolean;
  attack: boolean;
  attackPressed: boolean;
}

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private prevJump = false;
  private prevAttack = false;
  private gamepadIndex: number | null = null;
  private touchState: TouchState = {
    left: false, right: false, down: false,
    jump: false, jumpPressed: false, jumpReleased: false,
    spinDash: false, spinDashPressed: false, spinDashReleased: false,
    fullscreenTap: false,
    attack: false, attackPressed: false,
  };
  private pausePressed = false;
  private prevPause = false;

  constructor() {
    window.addEventListener("keydown", (e) => {
      this.keys.set(e.key.toLowerCase(), true);
      if (e.key === " ") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => {
      this.keys.set(e.key.toLowerCase(), false);
    });

    window.addEventListener("gamepadconnected", (e) => {
      this.gamepadIndex = (e as GamepadEvent).gamepad.index;
    });
    window.addEventListener("gamepaddisconnected", () => {
      this.gamepadIndex = null;
    });
  }

  setTouchState(touch: TouchState) {
    this.touchState = touch;
  }

  private isDown(key: string): boolean {
    return this.keys.get(key) === true;
  }

  getState(): InputState {
    let left = this.isDown("arrowleft") || this.isDown("a") || this.touchState.left;
    let right = this.isDown("arrowright") || this.isDown("d") || this.touchState.right;
    let up = this.isDown("arrowup") || this.isDown("w");
    let down = this.isDown("arrowdown") || this.isDown("s") || this.touchState.down;
    let jump = this.isDown(" ") || this.isDown("z") || this.touchState.jump;

    // Gamepad
    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        const deadzone = 0.2;
        const lx = gp.axes[0] ?? 0;
        const ly = gp.axes[1] ?? 0;
        if (lx < -deadzone) left = true;
        if (lx > deadzone) right = true;
        if (ly < -deadzone) up = true;
        if (ly > deadzone) down = true;
        if (gp.buttons[0]?.pressed) jump = true;
      }
    }

    const kbJumpPressed = jump && !this.prevJump;
    const kbJumpReleased = !jump && this.prevJump;
    this.prevJump = jump;

    const jumpPressed = kbJumpPressed || this.touchState.jumpPressed;
    const jumpReleased = kbJumpReleased || this.touchState.jumpReleased;

    // Touch spin dash button: acts as down + jumpPressed simultaneously
    const touchSpinDash = this.touchState.spinDash;
    const touchSpinDashPressed = this.touchState.spinDashPressed;
    if (touchSpinDash) down = true;

    // Attack (X or C key, gamepad button 2, or touch attack)
    let attack = this.isDown("x") || this.isDown("c") || this.touchState.attack;
    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp && gp.buttons[2]?.pressed) attack = true;
    }
    const attackPressed = (attack && !this.prevAttack) || this.touchState.attackPressed;
    this.prevAttack = attack;

    // Pause detection (edge only)
    const pauseDown = this.isDown("escape") || this.isDown("p");
    this.pausePressed = pauseDown && !this.prevPause;
    this.prevPause = pauseDown;

    return {
      left,
      right,
      up,
      down,
      jump: jump || touchSpinDash,
      jumpPressed: jumpPressed || touchSpinDashPressed,
      jumpReleased,
      spin: (down && jumpPressed) || touchSpinDashPressed,
      pause: this.pausePressed,
      attack,
      attackPressed,
    };
  }
}
