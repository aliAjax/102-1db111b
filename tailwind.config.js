/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1200px',
      },
    },
    extend: {
      colors: {
        sage: {
          50: '#F5F7F2',
          100: '#E8EDE2',
          200: '#D4DAC9',
          300: '#B8C4A8',
          400: '#9CAF88',
          500: '#7D9469',
          600: '#5C6F4B',
          700: '#4A5A3D',
          800: '#3A4730',
          900: '#2D3726',
        },
        cream: {
          50: '#FDFCF9',
          100: '#F9F7F2',
          200: '#F5F2EB',
          300: '#EDE8DC',
          400: '#E2DBCA',
        },
        terracotta: {
          300: '#E8A87C',
          400: '#D88A5E',
          500: '#C46F42',
        },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
