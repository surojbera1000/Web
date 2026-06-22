import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from '@/context/ThemeContext';
import { TelegramProvider } from '@/context/TelegramContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TelegramProvider>
        <App />
      </TelegramProvider>
    </ThemeProvider>
  </StrictMode>,
);
