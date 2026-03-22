/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Dosis"', 'sans-serif'],
        body:    ['"Dosis"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      fontWeight: { display: '700' },
      colors: {
        // Using rgb(var(--f*) / <alpha-value>) so Tailwind opacity modifiers work
        // e.g. bg-forest-900/40 → rgb(var(--f900) / 0.4)
        // CSS vars must be defined as space-separated R G B channels (no rgb() wrapper)
        forest: {
          50:  'rgb(var(--f50)  / <alpha-value>)',
          100: 'rgb(var(--f100) / <alpha-value>)',
          200: 'rgb(var(--f200) / <alpha-value>)',
          300: 'rgb(var(--f300) / <alpha-value>)',
          400: 'rgb(var(--f400) / <alpha-value>)',
          500: 'rgb(var(--f500) / <alpha-value>)',
          600: 'rgb(var(--f600) / <alpha-value>)',
          700: 'rgb(var(--f700) / <alpha-value>)',
          800: 'rgb(var(--f800) / <alpha-value>)',
          900: 'rgb(var(--f900) / <alpha-value>)',
          950: 'rgb(var(--f950) / <alpha-value>)',
        },
        bark: {
          50:  '#faf6f1', 100: '#f2ead8', 200: '#e3d2b0', 300: '#d0b47f',
          400: '#c0955a', 500: '#ad7c3f', 600: '#966535', 700: '#7c4e2d',
          800: '#663f29', 900: '#553526', 950: '#2e1b12',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
