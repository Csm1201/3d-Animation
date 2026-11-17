/**
 * Numerical checks for the walk cycle. Run: npm run check
 *  - planted pivot (heel / sole / toe) never moves in world space -> no foot sliding
 *  - legs never need to over-extend (IK never clamps)
 *  - shoe never sinks below the floor
 *  - ankle has no jumps between frames (also sub-frame sampled)
 *  - same frame -> same pose (determinism)
 */
import {FLOOR_Y, DURATION_IN_FRAMES} from '../src/core/constants';
import {footState, getPose, rot, HEEL, TOE, Vec} from '../src/core/walkCycle';

const soleCorners: Vec[] = [HEEL, TOE, {x: -32, y: 10}, {x: 68, y: 12}];
let maxSlide = 0;
let maxReach = 0;
let minClear = Infinity;
let maxJump = 0;
let fails = 0;

for (const offset of [0, 0.5]) {
  let prev = footState(0, offset);
  for (let i = 1; i <= DURATION_IN_FRAMES * 10; i++) {
    const f = i / 10;
    const cur = footState(f, offset);
    // track: all ground-touching points of a planted foot keep world position
    if (prev.planted && cur.planted) {
      for (const c of soleCorners) {
        const a = rot(c, prev.angle);
        const b = rot(c, cur.angle);
        const pa = {x: prev.ankle.x + a.x, y: prev.ankle.y + a.y};
        const pb = {x: cur.ankle.x + b.x, y: cur.ankle.y + b.y};
        if (pa.y > FLOOR_Y - 0.5 && pb.y > FLOOR_Y - 0.5) {
          maxSlide = Math.max(maxSlide, Math.abs(pb.x - pa.x));
        }
      }
    }
    for (const c of soleCorners) {
      const r = rot(c, cur.angle);
      minClear = Math.min(minClear, FLOOR_Y - (cur.ankle.y + r.y));
    }
    maxJump = Math.max(maxJump, Math.hypot(cur.ankle.x - prev.ankle.x, cur.ankle.y - prev.ankle.y));
    prev = cur;
  }
}

for (let f = 0; f < DURATION_IN_FRAMES; f++) {
  const p = getPose(f);
  maxReach = Math.max(maxReach, p.nearLeg.reach, p.farLeg.reach);
  if (JSON.stringify(p) !== JSON.stringify(getPose(f))) fails++;
}

const report = (name: string, ok: boolean, val: string) => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(36)} ${val}`);
};
report('planted contact points slide', maxSlide < 0.01, `${maxSlide.toFixed(4)} px`);
report('max leg reach (must be < 1)', maxReach < 1, maxReach.toFixed(3));
report('min shoe clearance (>= -0.5)', minClear >= -0.5, `${minClear.toFixed(2)} px`);
report('max ankle move per 1/10 frame', maxJump < 6, `${maxJump.toFixed(2)} px`);
report('determinism', fails === 0, 'getPose(f) stable');
process.exit(fails ? 1 : 0);
