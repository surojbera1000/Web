/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Telegram brand + UI palette
        tg: {
          blue: '#3390ec',
          'blue-dark': '#2b7cd3',
          send: '#62a0e9',
          // Light theme surfaces
          'bg-light': '#ffffff',
          'panel-light': '#ffffff',
          'sidebar-light': '#ffffff',
          'hover-light': '#f4f4f5',
          'active-light': '#e9f3ff',
          'chatbg-light': '#cfd9e3',
          'bubble-in-light': '#ffffff',
          'bubble-out-light': '#effdde',
          // Dark theme surfaces
          'bg-dark': '#0e1621',
          'panel-dark': '#17212b',
          'sidebar-dark': '#17212b',
          'hover-dark': '#202b36',
          'active-dark': '#2b5278',
          'chatbg-dark': '#0e1621',
          'bubble-in-dark': '#182533',
          'bubble-out-dark': '#2b5278',
          // text
          'text-secondary-light': '#707579',
          'text-secondary-dark': '#aaaaaa',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      keyframes: {
        'message-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'typing-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'message-in': 'message-in 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'typing-bounce': 'typing-bounce 1.2s infinite ease-in-out',
        'pulse-ring': 'pulse-ring 1.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
      },
    },
  },
  plugins: [],
};
