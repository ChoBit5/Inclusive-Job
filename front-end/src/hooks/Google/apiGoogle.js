import { BACKEND_BASE_URL } from '../../config/app.js';

const GOOGLE_API = {
  registro: `${BACKEND_BASE_URL}/Modelo/Google/registro_google.php`,
  login:    `${BACKEND_BASE_URL}/Modelo/Google/login_google.php`,
  completar_password: `${BACKEND_BASE_URL}/Modelo/Google/pass_google.php`,
};

export default GOOGLE_API;
