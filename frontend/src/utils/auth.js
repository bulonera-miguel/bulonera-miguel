// utils/auth.js
// Autenticación de acceso público al sistema Bulonera Miguel
// Esta capa es independiente del login interno del personal

const SYSTEM_PASSWORD = import.meta.env.VITE_ACCESO_PASSWORD || 'dev_access';
const AUTH_KEY = 'bulonera_acceso';

export const accesoLogin = (password) => {
  if (password === SYSTEM_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, 'autorizado');
    return true;
  }
  return false;
};

export const accesoLogout = () => {
  sessionStorage.removeItem(AUTH_KEY);
};

export const isAccesoAutorizado = () => {
  return sessionStorage.getItem(AUTH_KEY) === 'autorizado';
};
