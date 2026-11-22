import {Episode6, EP6_FRAMES} from './films/youre-the-ref/Episode6';
import {SAFETY_PREVIEW_FRAMES, ShortSafetyPreview} from './films/youre-the-ref/ShortSafetyPreview';
import {SAFETY_FRAMES, ShortWorkplaceSafety} from './films/youre-the-ref/ShortWorkplaceSafety';
import {GANG_FRAMES, ShortGang} from './films/youre-the-ref/ShortGang';
import {Episode5, EP5_FRAMES} from './films/youre-the-ref/Episode5';
import {Ep5CastTest, EP5_CAST_FRAMES} from './films/youre-the-ref/Ep5Cast';
import {Episode4, EP4_FRAMES} from './films/youre-the-ref/Episode4';
import {Ep4SaveTest, EP4_SAVE_FRAMES} from './films/youre-the-ref/Ep4SaveTest';
import {IceWallFlight, ICE_FRAMES} from './films/ice-wall/IceWallFlight';
import React from 'react';
import {Composition} from 'remotion';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './core/constants';
import {OfficeWalk} from './films/office-walk-flat/OfficeWalk';
import {MODERN_WALK_FRAMES, ModernWalk} from './films/modern-walk-2d/ModernWalk';
import {PRACTICE_FPS, PRACTICE_FRAMES, PracticeBreak} from './films/youre-the-ref/PracticeBreak';
import {EP2_FPS, EP2_FRAMES, Episode2} from './films/youre-the-ref/Episode2';
import {EP3P_FRAMES, Ep3Practice} from './films/youre-the-ref/Ep3Practice';
import {EP3_FPS, EP3_FRAMES, Episode3} from './films/youre-the-ref/Episode3';
import {OfficeWalk3D} from './films/office-walk-3d/OfficeWalk3D';
import {SleepExperiment, SleepExperimentChase, SleepExperimentSide} from './films/sleep-experiment/SleepExperiment';
import {SCENE1_FRAMES, Scene1Trapped} from './films/sleep-experiment/scenes/Scene1Trapped';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="RefGang" component={ShortGang} durationInFrames={GANG_FRAMES} fps={30} width={WIDTH} height={HEIGHT} />
    <Composition id="RefWorkplaceSafety" component={ShortWorkplaceSafety} durationInFrames={SAFETY_FRAMES} fps={30} width={WIDTH} height={HEIGHT} />
    <Composition id="RefSafetyPreview" component={ShortSafetyPreview} durationInFrames={SAFETY_PREVIEW_FRAMES} fps={30} width={WIDTH} height={HEIGHT} />
    <Composition id="RefEpisode6" component={Episode6} durationInFrames={EP6_FRAMES} fps={30} width={WIDTH} height={HEIGHT} />
    <Composition id="RefEpisode5" component={Episode5} durationInFrames={EP5_FRAMES} fps={30} width={WIDTH} height={HEIGHT} />
    <Composition id="RefEp5Cast" component={Ep5CastTest} durationInFrames={EP5_CAST_FRAMES} fps={30} width={WIDTH} height={HEIGHT} />
    <Composition id="RefEpisode4" component={Episode4} durationInFrames={EP4_FRAMES} fps={30} width={WIDTH} height={HEIGHT} />
    <Composition id="RefEp4SaveTest" component={Ep4SaveTest} durationInFrames={EP4_SAVE_FRAMES} fps={30} width={WIDTH} height={HEIGHT} />
    <Composition id="IceWallFlight" component={IceWallFlight} durationInFrames={ICE_FRAMES} fps={30} width={WIDTH} height={HEIGHT} />
    <Composition
      id="RefEpisode3"
      component={Episode3}
      durationInFrames={EP3_FRAMES}
      fps={EP3_FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="RefEp3Practice"
      component={Ep3Practice}
      durationInFrames={EP3P_FRAMES}
      fps={30}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="RefEpisode2"
      component={Episode2}
      durationInFrames={EP2_FRAMES}
      fps={EP2_FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="RefPracticeBreak"
      component={PracticeBreak}
      durationInFrames={PRACTICE_FRAMES}
      fps={PRACTICE_FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="ModernWalk"
      component={ModernWalk}
      durationInFrames={MODERN_WALK_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="Scene1Trapped"
      component={Scene1Trapped}
      durationInFrames={SCENE1_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="SleepExperimentSide"
      component={SleepExperimentSide}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="SleepExperimentChase"
      component={SleepExperimentChase}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="SleepExperiment"
      component={SleepExperiment}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="OfficeWalk3D"
      component={OfficeWalk3D}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="OfficeWalk"
      component={OfficeWalk}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
