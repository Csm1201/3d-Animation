export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 60;
export const DURATION_IN_FRAMES = 5 * FPS; // 300

// ---- Scene perspective ---------------------------------------------------
// The floor is a plane seen in perspective. Every depth has a scale `s`:
// the back wall sits at S_WALL, the bottom edge of the frame at S_NEAR, and
// the plane the worker walks on is exactly s = 1, so he moves 1:1 with the
// floor under his feet.
export const CEILING_Y = 190; // where wall meets ceiling (screen y)
export const WALL_BASE_Y = 1200; // where wall meets floor (screen y)
export const S_WALL = 0.8;
export const S_NEAR = 1.25;

/** Screen y of the floor line at a given depth scale. */
export const depthY = (s: number) =>
  WALL_BASE_Y + ((s - S_WALL) / (S_NEAR - S_WALL)) * (HEIGHT - WALL_BASE_Y);

/** Screen x of a world x at a given depth scale for the current camera. */
export const screenX = (xw: number, s: number, camX: number) =>
  WIDTH / 2 + (xw - camX) * s;

/** Floor line where the worker's soles touch down (s = 1). */
export const FLOOR_Y = depthY(1); // 1520

// ---- Story beats -----------------------------------------------------------
export const SLIP_START_FRAME = Math.round(2.7 * FPS); // 162
