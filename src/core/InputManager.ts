export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  spin: boolean;
}

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private prevJump = false;
  private gamepadIndex: number | null = null;

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

  private isDown(key: string): boolean {
    return this.keys.get(key) === true;
  }

  getState(): InputState {
    let left = this.isDown("arrowleft") || this.isDown("a");
    let right = this.isDown("arrowright") || this.isDown("d");
    let up = this.isDown("arrowup") || this.isDown("w");
    let down = this.isDown("arrowdown") || this.isDown("s");
    let jump = this.isDown(" ") || this.isDown("z");

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

    const jumpPressed = jump && !this.prevJump;
    const jumpReleased = !jump && this.prevJump;
    this.prevJump = jump;

    return {
      left,
      right,
      up,
      down,
      jump,
      jumpPressed,
      jumpReleased,
      spin: down && jumpPressed,
    };
  }
}
