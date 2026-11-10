import {
  CAMERA_SPEED_ZOOM_FACTOR,
} from "../constants";

export class Camera2D {
  x = 0;
  y = 0;
  zoom = 1;

  private targetX = 0;
  private targetY = 0;
  private targetZoom = 1;

  // Zoom range (pixels per world unit)
  private baseZoom = 40;
  private minZoom = 22;

  // Level bounds
  levelLeft = 0;
  levelRight = 400;
  levelBottom = -20;
  levelTop = 60;

  // Lookahead
  private lookaheadX = 0;

  // Vertical tracking
  private groundedTargetY = 0;

  constructor(private screenWidth: number, private screenHeight: number) {
    this.updateBaseZoom();
  }

  private updateBaseZoom() {
    // Base zoom so that ~20 world units fit vertically
    this.baseZoom = this.screenHeight / 20;
    this.minZoom = this.screenHeight / 36;
  }

  resize(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.updateBaseZoom();
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    playerSpeed: number,
    facingRight: boolean,
    isGrounded: boolean = false,
    terrainY: number = playerY,
  ) {
    // Lookahead: camera leads in the direction of movement
    // Proportional to speed
    const lookaheadDist = 3 + playerSpeed * 0.3;
    const lookaheadTarget = facingRight ? lookaheadDist : -lookaheadDist;
    this.lookaheadX += (lookaheadTarget - this.lookaheadX) * Math.min(dt * 2, 1);

    this.targetX = playerX + this.lookaheadX;

    // Vertical tracking: when grounded, track terrain height to avoid jitter
    if (isGrounded) {
      this.groundedTargetY = terrainY + 2;
    }

    // Smooth vertical: use grounded target when grounded, player position when airborne
    const verticalTarget = isGrounded ? this.groundedTargetY : playerY + 2;
    this.targetY += (verticalTarget - this.targetY) * Math.min(dt * 3, 1);

    // Dynamic zoom: zoom out when going fast
    const speedRatio = Math.min(playerSpeed / 15, 1);
    const zoomTarget = this.baseZoom - speedRatio * (this.baseZoom - this.minZoom) * CAMERA_SPEED_ZOOM_FACTOR * 0.3;
    this.targetZoom = Math.max(zoomTarget, this.minZoom);

    // Smooth follow with lerp
    const followSpeed = 4;
    this.x += (this.targetX - this.x) * Math.min(dt * followSpeed, 1);
    this.y += (this.targetY - this.y) * Math.min(dt * followSpeed, 1);
    this.zoom += (this.targetZoom - this.zoom) * Math.min(dt * 3, 1);

    // Clamp to level bounds
    const halfW = (this.screenWidth / 2) / this.zoom;
    const halfH = (this.screenHeight / 2) / this.zoom;

    if (this.x - halfW < this.levelLeft) this.x = this.levelLeft + halfW;
    if (this.x + halfW > this.levelRight) this.x = this.levelRight - halfW;
    if (this.y - halfH < this.levelBottom) this.y = this.levelBottom + halfH;
    if (this.y + halfH > this.levelTop) this.y = this.levelTop - halfH;
  }

  /** Snap camera to position instantly (for respawn, etc.) */
  snapTo(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.groundedTargetY = y;
    this.lookaheadX = 0;
  }
}
