# "I'm Walking Here" (2-second example clip)

**Format:** 1920×1080, 30 fps, 60 frames, no audio
**Source:** Scene 2 ("Sidewalk") of the Pedestrian #4812 animation, scene time 3.2 s → 5.2 s
**Setting:** Sunset beach-city street. Pastel buildings, neon signs, palm trees, sidewalk above a two-lane road.
**Hook (frame 1):** A pink sports car is already up on the sidewalk, **HONK!!** on screen, and the NPC is launching into a dive.

| Time | Frames | Shot | Action | On screen |
|---|---|---|---|---|
| 0.00–0.40 | 1–12 | **Hook**: wide, static | Open mid-action. The car has just mounted the curb and the NPC springs sideways. | Big **HONK!!** · yellow shout bubble: **"HEY! I'M WALKING HERE!"** |
| 0.40–1.20 | 13–36 | Wide, static | The NPC flies in a high arc, rotating flat, as the car plows along the sidewalk. Dust puffs kick up behind the tires. The NPC lands face-down. | Shout bubble holds · HONK fades · HUD: `EVENT: player is driving` |
| 1.20–2.00 | 37–60 | Wide, static | The car drops back onto the road and speeds off to the right. The NPC stays lying on the pavement. | Dust fades |

**Beat:** hook (car on sidewalk + HONK) → dive and landing → aftermath (lying there). There's no walk-in setup: the viewer understands "pedestrian almost got hit" from the first frame.

**Render plan (once approved):** load the HTML animation in headless Chromium, pause the clock, step it to each of the 60 timestamps, screenshot each frame, then encode with `ffmpeg -framerate 30 -c:v libx264 -pix_fmt yuv420p` to `out/npc-2s.mp4`.
