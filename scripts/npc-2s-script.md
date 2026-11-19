# "I'm Walking Here" (2-second example clip)

**Format:** 1920×1080, 30 fps, 60 frames, no audio
**Source:** Scene 2 ("Sidewalk") of the Pedestrian #4812 animation, scene time 2.8 s → 4.8 s
**Setting:** Sunset beach-city street. Pastel buildings, neon signs, palm trees, sidewalk above a two-lane road.

| Time | Frames | Shot | Action | On screen |
|---|---|---|---|---|
| 0.00–0.50 | 1–15 | Wide, static | Pedestrian #4812 strolls right along the sidewalk. A pink sports car enters from the left on the road, then swerves up the curb. | HUD: `09:16 PED #4812` / `EVENT: player is driving` |
| 0.50–1.10 | 16–33 | Wide, static | The NPC leaps sideways in a high arc, rotating flat, as the car plows along the sidewalk. Dust puffs kick up behind the tires. | Yellow shout bubble: **"HEY! I'M WALKING HERE!"** · big **HONK!!** pulses mid-screen |
| 1.10–2.00 | 34–60 | Wide, static | NPC lands face-down on the pavement. The car drops back onto the road and speeds off to the right. NPC stays lying there. | Shout bubble holds; dust fades |

**Beat:** setup (car appears) → near-miss (dive + HONK) → aftermath (lying on the sidewalk). The punchline line from the full animation ("...and I'll be standing in that exact spot again in 3 seconds") falls outside the 2 seconds, so the clip ends on the gag rather than the explanation.

**Render plan (once approved):** load the HTML animation in headless Chromium, pause the clock, step it to each of the 60 timestamps, screenshot each frame, then encode with `ffmpeg -framerate 30 -c:v libx264 -pix_fmt yuv420p` to `out/npc-2s.mp4`.
