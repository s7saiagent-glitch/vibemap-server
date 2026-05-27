import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'uni-dark': '#0A0E1A',
        'uni-darker': '#060912',
        'uni-card': '#111827',
        'uni-card2': '#0D1520',
        'uni-border': '#1F2937',
        'uni-border2': '#2D3748',
        'uni-gold': '#D4AF37',
        'uni-gold-light': '#F0D060',
        'uni-gold-dark': '#B8960C',
        'uni-blue': '#00D4FF',
        'uni-blue-dark': '#0099CC',
        'uni-purple': '#8B5CF6',
        'uni-green': '#10B981',
        'uni-red': '#EF4444',
        'uni-orange': '#F59E0B',
        'uni-text': '#E2E8F0',
        'uni-muted': '#94A3B8',
        'uni-subtle': '#64748B',
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
        latin: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #060912 0%, #0D1B2A 40%, #0A0E1A 70%, #060912 100%)',
        'gold-gradient': 'linear-gradient(135deg, #D4AF37, #F0D060)',
        'blue-gradient': 'linear-gradient(135deg, #00D4FF, #0099CC)',
        'card-gradient': 'linear-gradient(135deg, rgba(17,24,39,0.9), rgba(13,21,32,0.9))',
        'glow-gold': 'radial-gradient(circle at center, rgba(212,175,55,0.15) 0%, transparent 70%)',
        'glow-blue': 'radial-gradient(circle at center, rgba(0,212,255,0.15) 0%, transparent 70%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-slow': 'bounce 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'typing': 'typing 1.2s steps(3) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        glowPulse: {
          from: { boxShadow: '0 0 5px rgba(212,175,55,0.3), 0 0 10px rgba(212,175,55,0.2)' },
          to: { boxShadow: '0 0 20px rgba(212,175,55,0.6), 0 0 40px rgba(212,175,55,0.3)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        typing: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      boxShadow: {
        'gold': '0 0 20px rgba(212,175,55,0.3)',
        'gold-lg': '0 0 40px rgba(212,175,55,0.4)',
        'blue': '0 0 20px rgba(0,212,255,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'inner-gold': 'inset 0 1px 0 rgba(212,175,55,0.2)',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
