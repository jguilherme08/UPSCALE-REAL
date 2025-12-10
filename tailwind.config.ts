import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        surface: '#0f1117',
        panel: '#161925',
        accent: '#4fd1c5'
      },
      boxShadow: {
        card: '0 20px 80px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};

export default config;
