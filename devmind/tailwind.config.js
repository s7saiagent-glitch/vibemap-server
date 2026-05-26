/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dm: {
          bg:     '#09090f',
          panel:  '#0f1018',
          card:   '#13151f',
          border: '#1e2233',
          accent: '#22d3ee',
          think:  '#f59e0b',
          ok:     '#4ade80',
          err:    '#f87171',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        barBounce: {
          '0%, 100%': { height: '4px', opacity: '0.4' },
          '50%':      { height: '28px', opacity: '1' },
        },
        blink: {
          '0%, 80%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '40%':           { opacity: '1',   transform: 'scale(1)' },
        },
        msgIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        streamFade: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(34,211,238,0.3)' },
          '50%':      { boxShadow: '0 0 18px rgba(34,211,238,0.7)' },
        },
      },
      animation: {
        barBounce:  'barBounce var(--dur, 0.6s) ease-in-out var(--delay, 0s) infinite alternate',
        blink:      'blink 1.4s ease-in-out infinite',
        msgIn:      'msgIn 0.25s ease-out',
        streamFade: 'streamFade 0.2s ease-in',
        pulseGlow:  'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
