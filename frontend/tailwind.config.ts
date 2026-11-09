import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#443592',
        secondary: '#6B5B95',
        lavender: { DEFAULT: '#EFEEF6', deep: '#D9D6E8' },
        gold: { DEFAULT: '#EFCB7B', bright: '#F4D03F' },
        blush: '#D99BA4',
        ink: '#0b0b0b',
        surface: '#F9FAFB',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(68, 53, 146, 0.25)',
        glow: '0 8px 30px -6px rgba(68, 53, 146, 0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: { '0%, 80%, 100%': { opacity: '0.25' }, '40%': { opacity: '1' } },
      },
      animation: {
        'fade-up': 'fade-up 0.3s ease-out both',
        blink: 'blink 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}

export default config
