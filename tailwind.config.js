/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand: warm orange — kept as the only star color.
        primary: '#F97316',
        secondary: '#0A8F61',
        // App backgrounds — slightly warmer than pure gray so the orange brand
        // mark doesn't feel cold against them.
        light: '#FCF8F3',
        cream: '#FDF6EC',
        dark: '#0F172A',
        orange: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        // Warm neutrals (Tailwind 'stone' values nudged toward orange).
        gray: {
          50:  '#FAF8F5',
          100: '#F3F0EA',
          200: '#E7E3DC',
          300: '#D3CEC4',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Tight scale used by the mobile UI — keep 14/16/18/20/24/30/36/48.
        'xs':   ['12px', { lineHeight: '16px' }],
        'sm':   ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg':   ['18px', { lineHeight: '26px' }],
        'xl':   ['20px', { lineHeight: '28px' }],
        '2xl':  ['24px', { lineHeight: '32px' }],
        '3xl':  ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        '4xl':  ['36px', { lineHeight: '40px', letterSpacing: '-0.025em' }],
        '5xl':  ['48px', { lineHeight: '52px', letterSpacing: '-0.03em' }],
      },
      boxShadow: {
        // Multi-layer soft elevation.
        'card':  '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
        'pop':   '0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px rgba(15, 23, 42, 0.08)',
        'lift':  '0 2px 4px rgba(15, 23, 42, 0.06), 0 16px 40px rgba(15, 23, 42, 0.10)',
        'inset-bottom': 'inset 0 -1px 0 rgba(15, 23, 42, 0.06)',
      },
      keyframes: {
        floatPaw: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-12px) rotate(3deg)' },
          '66%': { transform: 'translateY(6px) rotate(-2deg)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        slideInTop: {
          '0%': { transform: 'translateY(-12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'float-paw': 'floatPaw 6s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'slide-in-top': 'slideInTop 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 200ms ease-out',
      },
    },
  },
  plugins: [],
}
