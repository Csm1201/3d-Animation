# You're the Ref, Short: "Jimmy vs the Gang" (script, draft 3: as built)

About 12.5 s, vertical, and it stands on its own. It takes the Night Shift lesson from "Workplace Safety with Jimmy" and makes it a whole Short. Jimmy, in his full referee kit, does the scuba dance in front of an armed gang, and it does not end well.

**Characters:**
- **Jimmy:** completely deadpan, with no lines; the dance does the talking.
- **The gang:** a fictional modern street crew of four, mixed skin tones, in tank tops, baggy jeans, gold chains, shades and backwards caps. Each stands still holding a drum-fed tommy gun at the hip, free hand at his side. No real gang names, colours or signs. They have no lines.
- No LeBron and no Epstein. "Mogs" is not used. There is no narrator.

**Violence:** cartoon only. The shot happens off-screen (a flash, a bang and pigeons), no gun is ever aimed at the camera, and the only blood is a small pool under Jimmy. No wound is shown.

| Time | Visual | On-screen text | Sound |
|---|---|---|---|
| 0.0-1.3 | **HOOK.** Mid-motion on frame 0: a low, close shot of Jimmy mid-scuba-dance (nose pinched, arm rippling, knees bouncing), with a mobster's tommy gun in the foreground. | BAD IDEA? | The scuba beat from frame 0. |
| 1.3-1.7 | VHS rewind wash over the alley. | ◀◀ 10 SECONDS EARLIER | Rewind whir. |
| 1.7-3.4 | From behind Jimmy: he strolls down the dark alley toward the gang, stops in front of them, and blows his whistle. Every head turns. | | Footsteps, then a sharp whistle "peep". |
| 3.4-4.4 | A low angle on the crew, glaring down, guns at their hips. | | A low, tense drone. |
| 4.4-6.2 | From behind the gang: Jimmy does the scuba dance straight at them, sinking lower and lower. | | The beat. |
| 6.2-8.0 | Close and low, between the mobsters, guns framing the shot: the dance continues, fully committed. | | The beat. |
| 8.0-9.0 | The music dies. The mobsters slowly look at each other. | | Record scratch, then silence. |
| 9.0-9.6 | The boss brings his gun up level at Jimmy (pointed away from the camera). Jimmy freezes mid-crouch, nose still pinched, eyes wide. | | Click-clack. |
| 9.6-10.2 | Outside the alley: a flash lights the brick wall and pigeons scatter off the roof. | | BANG, wing flaps. |
| 10.2-12.5 | Jimmy flat on his back in a small pool of blood, a halo spinning above him, his whistle rolling away. At 10.8 a red card flutters down from above and lands on his chest (11.3). Loops back to the hook. | | A twinkle, then a stamp as the card lands. |

## Fake comments

- "he committed to the bit 💀"
- "10/10 dance, 0/10 survival instincts"
- "the knees going lower every beat 😭"
- "why did he blow the whistle FIRST"

## Production notes

- **Music:** an original 150 bpm beat (`public/short-safety/scuba-beat.wav`), not the real "Scuba Juke" song, which is copyrighted. The real sound can be added on TikTok from its library.
- **Reused from the Workplace Safety Short:** the alley set, the gang and their tommy guns, the dance poses, the bang shot and the down shot (`src/films/youre-the-ref/ShortSafetyPreview.tsx`).
- **Code:** `src/films/youre-the-ref/ShortGang.tsx`, composition `RefGang`.
- **Self-review checks:**
  - Jimmy's face and nose pinch are readable on frame 0.
  - The guns never point at the camera.
  - The caption doesn't cover Jimmy.
  - The beat cuts cleanly on the scratch.
