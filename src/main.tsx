import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initApiClient } from './services/apiClient';

// Initialize desktop API client asynchronously if running in Electron environment
initApiClient().catch((err) => {
  console.warn('API client init notice:', err);
});

createRoot(document.getElementById('root')!).render(<App />);
