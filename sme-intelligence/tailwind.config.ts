import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16211C',
        paper: '#FAF8F3',
        forest: {
          DEFAULT: '#0F2A1E',
          50: '#EAF3EE',
          100: '#CFE6D8',
          300: '#7FB89A',
          500: '#1B7A4D',
          600: '#166640',
          700: '#124F33',
          900: '#0F2A1E'
        },
        amber: {
          DEFAULT: '#E8A33D',
          100: '#FBEBCF',
          300: '#F0C077',
          500: '#E8A33D',
          700: '#B87A22'
        },
        risk: {
          DEFAULT: '#C0392B',
          100: '#F7DAD6'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      },
      borderRadius: {
        xl2: '1.25rem'
      }
    }
  },
  plugins: []
};

export default config;
