import React, { useMemo } from 'react';

interface FloatingPawsProps {
  count?: number;
  color?: string;
  opacity?: number;
}

const pawPath = 'M256 224c-79.41 0-192 122.76-192 200.25 0 34.9 26.81 55.75 71.74 55.75 55.02 0 79.59-29.18 120.26-29.18 39.87 0 65.24 29.18 120.26 29.18 44.93 0 71.74-20.85 71.74-55.75C448 346.76 335.41 224 256 224zm-147.28-12.61c-10.4-34.65-42.44-57.09-71.56-50.13-29.12 6.96-44.29 40.69-33.89 75.34 10.4 34.65 42.44 57.09 71.56 50.13 29.12-6.96 44.29-40.69 33.89-75.34zm84.72-20.78c30.94-8.14 46.42-49.94 34.58-93.36s-46.52-72.01-77.46-63.87-46.42 49.94-34.58 93.36c11.84 43.42 46.52 72.01 77.46 63.87zm281.28-1.47c-29.12-6.96-61.16 15.48-71.56 50.13-10.4 34.65 4.77 68.38 33.89 75.34 29.12 6.96 61.16-15.48 71.56-50.13 10.4-34.65-4.77-68.38-33.89-75.34zm-156.18 19.39c30.94 8.14 65.62-20.45 77.46-63.87 11.84-43.42-3.64-85.21-34.58-93.36s-65.62 20.45-77.46 63.87c-11.84 43.42 3.64 85.22 34.58 93.36z';

const FloatingPaws: React.FC<FloatingPawsProps> = ({ count = 6, color = '#F97316', opacity = 0.05 }) => {
  const paws = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${10 + (i * 80 / count) + Math.sin(i * 2.5) * 10}%`,
      top: `${5 + (i * 85 / count)}%`,
      size: 28 + (i % 3) * 12,
      delay: i * 1.2,
      duration: 6 + (i % 3) * 2,
      rotate: (i * 37) % 360,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {paws.map((paw) => (
        <svg
          key={paw.id}
          viewBox="0 0 512 512"
          className="absolute animate-float-paw"
          style={{
            left: paw.left,
            top: paw.top,
            width: paw.size,
            height: paw.size,
            opacity,
            animationDelay: `${paw.delay}s`,
            animationDuration: `${paw.duration}s`,
            transform: `rotate(${paw.rotate}deg)`,
          }}
        >
          <path d={pawPath} fill={color} />
        </svg>
      ))}
    </div>
  );
};

export default FloatingPaws;
