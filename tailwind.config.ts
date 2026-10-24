import type { Config } from 'tailwindcss';

/**
 * Hong Kong Tourism palette: Victoria Harbour Teal (#005F73 / #0A9396),
 * crisp slate-white backgrounds, festive red/coral accents (#CA6702 / #EE9B00).
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#ffffff',
        mist: '#f1f5f9',
        blush: { DEFAULT: '#e2e8f0', 50: '#f8fafc', 100: '#f1f5f9', 300: '#e2e8f0', 500: '#94a3b8', 700: '#475569' },
        brand: {
          50: '#E6F4F5',
          100: '#C2E4E6',
          300: '#5FB8BB',
          400: '#2EA5A8',
          500: '#0A9396',
          600: '#007A86',
          700: '#005F73',
          800: '#004B5C',
          900: '#003845',
        },
        accent: {
          50: '#FDF3E1',
          100: '#FBE3B6',
          300: '#F5C566',
          500: '#EE9B00',
          600: '#CA6702',
          700: '#AE2012',
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
