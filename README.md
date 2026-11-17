# Office Walk shorts

Vertical (1080×1920, 60 fps, 5 s) animated shorts built with Remotion. They share one toy office-worker character and one walk cycle. The project also contains a browser review tool for leaving timestamped notes.

## Folder map

```
src/
  core/                 shared by every film
    constants.ts        size, fps, duration, perspective helpers, story beat (2.7 s)
    walkCycle.ts        THE walk cycle: hips, knees, feet, shoulders, elbows, head, camera
    random.ts           seeded random numbers (never use Math.random)
  character3d/          the 3D toy worker and stage, used by the 3D films
    Worker3D.tsx        clay/plastic worker; options: tired look, head droop, carry papers or mug
    Paper3D.tsx         paper stack on the forearm + the sheet that slips off
    stage.tsx           camera rig, daylight + soft shadows, contact shadows
    common.ts           metres conversion, 3D office camera, palette, materials, textures
  films/
    office-walk-flat/   OfficeWalk: the original flat 2D (SVG) version
    office-walk-3d/     OfficeWalk3D: pastel 3D office, blurred background layer
    sleep-experiment/   SleepExperiment: bird's-eye "sleep lab" diorama, microsleep at 2.7 s
  review/App.tsx        source of the review tool (live preview, notes, timeline)
  Root.tsx              registers the compositions
  index.ts              Remotion entry point
review-tool/            the published review page: index.html + built app.js
renders/                finished videos, ready to post
scripts/
  check-walk.ts         proves the walk has no foot sliding (npm run check)
  render.mjs            render + convert to a phone-friendly MP4
docs/
  niche-research.md     competitor and niche research for the channel
```

## Commands

Install once:

```bash
npm install
```

Open Remotion Studio to preview and edit:

```bash
npm run studio
```

Render a film into `renders/`:

```bash
npm run render:sleep
```

```bash
npm run render:3d
```

```bash
npm run render:flat
```

Check the walk cycle (no foot sliding, no over-stretched legs, deterministic):

```bash
npm run check
```

Rebuild the review tool after changing a film or `src/review/App.tsx`:

```bash
npm run build:review
```

## Links

- Review tool: https://claude.ai/artifact/JuvdH1X5Pobuv5D2ZWCsU9. Notes are saved with the page, and Claude can read them to apply fixes.
- Sleep Experiment test clip page: https://claude.ai/artifact/BS8BxvHD4kj3FL6gC2rJ9D
- Office Walk 3D video page: https://claude.ai/artifact/Rw1QgdBfRdvqRSEBGTXSuS

## How the walk avoids foot sliding

Feet are placed on the floor in world space first. A planted foot rolls on its heel, lies flat, then rolls on its toe, and the pivot point never moves. Each swing lands exactly one stride ahead, and stride = speed × cycle length. The knees are solved with two-bone IK so the legs reach the planted feet. The hip height follows an inverted-pendulum arc and drops when both feet are down, which lets the stance knee stay nearly straight. `npm run check` measures all of this.

## Adding a new film

1. Make a folder in `src/films/<name>/` with a component that calls `getPose(frame)` from `core/walkCycle` and draws `Worker3D` (see `SleepExperiment.tsx` as the template).
2. Register it in `src/Root.tsx` and add a `render:<name>` script in `package.json`.
3. Add it to the `COMPS` list in `src/review/App.tsx`, run `npm run build:review`, and republish the review tool.
