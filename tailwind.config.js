/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Dosis"', 'sans-serif'],
        body: ['"Dosis"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontWeight: {
        display: '700',
      },
      colors: {
        forest: {
          50: '#f0faf0',
          100: '#dcf5dc',
          200: '#b5eab5',
          300: '#80d580',
          400: '#4dba4d',
          500: '#2d9e2d',
          600: '#1f7e1f',
          700: '#196219',
          800: '#154f15',
          900: '#113f11',
          950: '#082208',
        },
        bark: {
          50: '#faf6f1',
          100: '#f2ead8',
          200: '#e3d2b0',
          300: '#d0b47f',
          400: '#c0955a',
          500: '#ad7c3f',
          600: '#966535',
          700: '#7c4e2d',
          800: '#663f29',
          900: '#553526',
          950: '#2e1b12',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
