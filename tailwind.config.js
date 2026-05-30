/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modeltex brand colors
        petrol: {
          50: '#E6F2F5',
          100: '#CCE5EB',
          200: '#99CBD7',
          300: '#66B1C3',
          400: '#3397AF',
          500: '#0F7C9B',
          600: '#0F4C5C',
          700: '#0C3E4A',
          800: '#0B3948',
          900: '#082B36',
        },
        violet: {
          50: '#F5F3FF',
          100: '#EDE9FF',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#B8A4FF',
          500: '#9F7AEA',
          600: '#805AD5',
          700: '#6B46C1',
          800: '#553C9A',
          900: '#44337A',
        },
        crudo: {
          50: '#FAF8F2',
          100: '#F3EFE3',
          200: '#E8E0D5',
          300: '#DDD1C7',
          400: '#C8BCAD',
          500: '#B8A89D',
          600: '#9A8A7D',
          700: '#7C6E62',
          800: '#5E5247',
          900: '#40362D',
        },
      },
    },
  },
  plugins: [],
};
