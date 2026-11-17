import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {HEIGHT, WIDTH} from '../../core/constants';
import {Office} from './Office';
import {FallingSheet} from './Paper';
import {getCamera, getPose} from '../../core/walkCycle';
import {Worker} from './Worker';

export const OfficeWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const pose = getPose(frame);
  const cam = getCamera(frame);
  return (
    <AbsoluteFill style={{backgroundColor: '#e9e4d8'}}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <g transform={`translate(0 ${-cam.y})`}>
          <Office camX={cam.x} frame={frame} />
          {/* worker plane: s = 1, so world x maps 1:1 to screen x */}
          <g transform={`translate(${WIDTH / 2 - cam.x} 0)`}>
            <Worker pose={pose} frame={frame} />
            <FallingSheet frame={frame} />
          </g>
        </g>
        {/* soft vignette */}
        <defs>
          <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.6" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.28} />
          </radialGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#vig)" />
      </svg>
    </AbsoluteFill>
  );
};
