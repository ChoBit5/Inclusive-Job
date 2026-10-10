import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
import { keys } from './config/keys.js';

if (keys.google.clientId === 'PEGA_AQUI_TU_KEY') {
  console.warn('Google Client ID pendiente: pega tu key en src/config/keys.js para activar login con Google.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <GoogleOAuthProvider clientId={keys.google.clientId}>
      <App />
    </GoogleOAuthProvider>
  </BrowserRouter>,
);
