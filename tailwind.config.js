/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tg: {
          blue: '#3390ec',
          'blue-dark': '#2b7cd3',
          // Telegram dark theme surfaces
          bg: '#0e1621',
          panel: '#17212b',
          'panel-2': '#202b36',
          hover: '#202b36',
          active: '#2b5278',
          'bubble-in': '#182533',
          'bubble-out': '#2b5278',
          divider: '#0a1119',
          'text-secondary': '#7d8e9b',
          // Light theme
          'bg-light': '#ffffff',
          'panel-light': '#ffffff',
          'hover-light': '#f4f4f5',
          'active-light': '#e9f3ff',
          'bubble-in-light': '#ffffff',
          'bubble-out-light': '#effdde',
          'chatbg-light': '#cfd9e3',
          'text-secondary-light': '#707579',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'message-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in': { '0%': { transform: 'translateX(16px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'typing-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'message-in': 'message-in 0.22s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.22s ease-out',
        'typing-bounce': 'typing-bounce 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
