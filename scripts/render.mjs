// Render a film to renders/<name>.mp4 in a format every phone and PC can play.
//
//   npm run render:sleep          (or render:3d, render:flat)
//   node scripts/render.mjs <CompositionId> <file-name> [extra remotion flags]
//
// Step 1 renders with Remotion. Step 2 re-encodes with Remotion's bundled ffmpeg
// to standard H.264 (yuv420p, TV range, fast start). Remotion's JPEG frames otherwise
// produce "yuvj420p", which some phones and players refuse to open.
import {spawnSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';

const [id, name, ...extra] = process.argv.slice(2);
if (!id || !name) {
  console.error('Usage: node scripts/render.mjs <CompositionId> <file-name> [remotion flags]');
  process.exit(1);
}
mkdirSync('renders', {recursive: true});
const raw = `renders/.${name}.raw.mp4`;
const out = `renders/${name}.mp4`;

const run = (args) => {
  const r = spawnSync('npx', args, {stdio: 'inherit', shell: process.platform === 'win32'});
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run(['remotion', 'render', id, raw, ...extra]);
run([
  'remotion', 'ffmpeg', '-v', 'error', '-y', '-i', raw,
  '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-crf', '18', '-preset', 'slow',
  '-color_range', 'tv', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out,
]);
rmSync(raw, {force: true});
console.log(`Done: ${out}`);
