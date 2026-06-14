import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Beconnect brand palette
        primary:   { DEFAULT: '#F47920', dark: '#D96510', light: '#F69040', 50: '#FEF3E9' },
        secondary: { DEFAULT: '#1B3268', dark: '#122251', light: '#2A4A8A' },
        success:   { DEFAULT: '#16a34a', light: '#22c55e' },
        danger:    { DEFAULT: '#dc2626', light: '#ef4444' },
        warning:   { DEFAULT: '#d97706', light: '#f59e0b' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'ticker':       'ticker 35s linear infinite',
        'float':        'float 6s ease-in-out infinite',
        'float-slow':   'float 9s ease-in-out infinite',
        'fade-up':      'fadeUp 0.6s ease-out forwards',
        'fade-in':      'fadeIn 0.5s ease-out forwards',
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'ping-slow':    'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'bounce-x':     'bounceX 1.2s ease-in-out infinite',
      },
      keyframes: {
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-10px)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceX: {
          '0%,100%': { transform: 'translateX(0)' },
          '50%':     { transform: 'translateX(4px)' },
        },
      },
      boxShadow: {
        'glow':       '0 0 40px rgba(244,121,32,0.22)',
        'glow-lg':    '0 0 70px rgba(244,121,32,0.32)',
        'glow-amber': '0 0 40px rgba(244,121,32,0.35)',
        'card-lift':  '0 20px 48px rgba(0,0,0,0.10)',
      },
      backgroundImage: {
        'hero-grid': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='1' cy='1' r='1' fill='rgba(255,255,255,0.05)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}

export default config
