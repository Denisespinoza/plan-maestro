/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Plan Maestro brand colors
        bordo: {
          50:  '#F9EDEF',
          100: '#F2D8DC',
          200: '#E5B0B9',
          300: '#D88896',
          400: '#C85F72',
          500: '#8B1A2E',
          600: '#6B1E2E',
          700: '#561826',
          800: '#40121D',
          900: '#2B0C13',
        },
        dorado: {
          50:  '#FBF6E9',
          100: '#F7EDD3',
          200: '#EFDBA7',
          300: '#E6C87B',
          400: '#DCB44F',
          500: '#B8922A',
          600: '#9A7A22',
          700: '#7C621B',
          800: '#5D4914',
          900: '#3F310D',
        },
        plata: {
          50:  '#F8F9FA',
          100: '#F1F3F5',
          200: '#E2E6EA',
          300: '#CDD3DA',
          400: '#ADB5BD',
          500: '#868E96',
          600: '#495057',
          700: '#343A40',
          800: '#212529',
          900: '#0D1117',
        },
      },
    },
  },
  plugins: [],
};
