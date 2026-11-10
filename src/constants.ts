// Physics constants — per-second, world-unit scale
// (world: ~35 units visible on screen, level is 400 units long)
export const ACCELERATION = 7;          // units/s²
export const DECELERATION = 25;         // units/s² (braking when reversing)
export const FRICTION = 7;              // units/s² (natural slowdown)
export const TOP_SPEED = 15;            // units/s
export const JUMP_FORCE = 16;           // units/s initial vertical speed (~4u height)
export const GRAVITY = -32;             // units/s²
export const AIR_ACCELERATION = 5;      // units/s²
export const SLOPE_FACTOR_UP = 7;       // units/s² uphill decel
export const SLOPE_FACTOR_DOWN = 4.5;   // units/s² downhill accel
export const SPIN_DASH_BASE = 12;       // units/s (initial launch speed)
export const SPIN_DASH_CHARGE_RATE = 15;// units/s per second of holding
export const SPIN_DASH_MAX = 25;        // units/s (full charge)
export const HURT_KNOCKBACK = 6;
export const HURT_JUMP = 8;             // units/s (hurt bounce)
export const HURT_DURATION = 1.0;
export const INVINCIBILITY_DURATION = 2.0;
export const JUMP_BUFFER_WINDOW = 0.1;  // seconds to buffer a jump press
export const COYOTE_TIME = 0.08;        // seconds of grace after leaving ground
export const AIR_DRAG_THRESHOLD = 0.95; // decay multiplier per frame at high speed
export const AIR_DRAG_MIN_SPEED = 10;   // only apply air drag above this speed

// Ring
export const RING_COLLECT_RADIUS = 1.5;
export const RING_SCATTER_SPEED = 6.0;
export const RING_SCATTER_JUMP = 4.0;
export const RING_SCATTER_MAX = 32;
export const RING_DESPAWN_TIME = 4.0;

// Camera
export const CAMERA_BASE_RADIUS = 12;
export const CAMERA_MAX_RADIUS = 22;
export const CAMERA_HEIGHT_OFFSET = 3;
export const CAMERA_ROTATION_SPEED = 4;
export const CAMERA_SPEED_ZOOM_FACTOR = 1.5;

// Level
export const LEVEL_LENGTH = 400;
export const LEVEL_WIDTH = 30;
export const WATER_HEIGHT = -3;

// Enemy
export const ENEMY_DETECT_RADIUS = 20;
export const ENEMY_DAMAGE_RADIUS = 1.5;
export const BUZZBOMBER_SPEED = 3;
export const COCONUTS_THROW_INTERVAL = 2.5;
export const COCONUTS_THROW_SPEED = 8;

// Chemical Plant enemies
export const GRABBER_DROP_SPEED = 15;
export const SPINY_SPEED = 2;

// Casino Night enemies
export const CRAWL_SPEED = 1.5;
export const FLASHER_VULNERABLE_DURATION = 2;
export const FLASHER_INVULNERABLE_DURATION = 1.5;

// Gimmicks
export const BUMPER_POWER = 12;
export const FLIPPER_POWER = 18;

// Boss battles
export const BOSS_ARENA_WIDTH = 60;
export const BOSS_ARENA_GROUND_Y = 0;
export const ROBO_TINIC_HP = 8;
export const ROBO_TINIC_SCORE = 10000;
export const BOWSER_HP = 12;
export const BOWSER_SCORE = 20000;
export const BOSS_HIT_INVULN_TIME = 1.0;
export const BOSS_DEFEAT_DELAY = 2.0;

// Super Form
export const SUPER_FORM_DURATION = 13;        // seconds
export const SUPER_FORM_RING_COST = 50;       // rings consumed
export const SUPER_FORM_SPEED_MULT = 2.0;     // TOP_SPEED multiplier
export const SUPER_FORM_FADEOUT = 1.5;         // seconds of visual fade after super ends
