import React from 'react';

interface WaveDividerProps {
  topColor: string;
  bottomColor: string;
  variant?: 'wave1' | 'wave2' | 'wave3';
  flip?: boolean;
}

const wavePaths = {
  wave1: 'M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,85.3C672,75,768,85,864,96C960,107,1056,117,1152,112C1248,107,1344,85,1392,74.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
  wave2: 'M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,181.3C672,192,768,160,864,149.3C960,139,1056,149,1152,170.7C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
  wave3: 'M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,128C672,107,768,85,864,96C960,107,1056,149,1152,160C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
};

const WaveDivider: React.FC<WaveDividerProps> = ({ topColor, bottomColor, variant = 'wave1', flip = false }) => {
  return (
    <div
      className="w-full overflow-hidden leading-[0] relative"
      style={{ backgroundColor: bottomColor, marginTop: '-1px' }}
    >
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="w-full block"
        style={{
          height: 'clamp(60px, 8vw, 100px)',
          transform: flip ? 'scaleY(-1)' : undefined,
        }}
      >
        <path
          d={wavePaths[variant]}
          fill={topColor}
        />
      </svg>
    </div>
  );
};

export default WaveDivider;
