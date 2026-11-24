import type { Config } from 'tailwindcss';

/**
 * Light-orange interface palette with Tableau Casual tones for chart series.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#fffcf7',
        mist: '#fff3e0',
        blush: { DEFAULT: '#fbe2c3', 50: '#fffaf3', 100: '#fff3e0', 300: '#fbe2c3', 500: '#d9b58a', 700: '#746657' },
        brand: {
          50: '#FFF8EE',
          100: '#FCEBD0',
          300: '#F6C98F',
          400: '#F5B968',
          500: '#F28E2B',
          600: '#D9821F',
          700: '#C36B12',
          800: '#A85A10',
          900: '#8C4B0F',
        },
        accent: {
          50: '#FBEAEA',
          100: '#F7D6D5',
          300: '#EF9E9B',
          500: '#E15759',
          600: '#C94649',
          700: '#A93638',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
