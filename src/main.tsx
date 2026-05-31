import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ConfigError from './components/ConfigError.tsx';
import { isSupabaseConfigured } from './lib/config.ts';
import './index.css';

// Check if required environment variables are configured
if (!isSupabaseConfigured()) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ConfigError />
    </StrictMode>
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
