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
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        agro: {
          green:  '#16a34a',
          dark:   '#14532d',
          light:  '#f0fdf4',
          earth:  '#92400e',
          sky:    '#0284c7',
          wheat:  '#d97706',
        },
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['var(--font-serif)', 'Instrument Serif', 'serif'],
      },
      backgroundImage: {
        'gradient-agro': 'linear-gradient(120deg, #14532d 0%, #1a6b3a 60%, #166534 100%)',
        'gradient-card': 'linear-gradient(140deg, #4ade80 0%, #16a34a 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #14532d 0%, #0f3d21 100%)',
      },
      boxShadow: {
        'card': '0 2px 10px rgba(20,30,15,0.04)',
        'card-lg': '0 10px 28px rgba(20,30,15,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
