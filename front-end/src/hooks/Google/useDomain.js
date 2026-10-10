import useGoogle from "./useGoogle.js";

export function useGoogleDomain() {
  const {
    registrarGoogle,
    loginGoogle,
    completarPasswordGoogle,
    loading,
    error
  } = useGoogle();

  const registrarConGoogle = async ({ credential, tipo }) =>
    await registrarGoogle(credential, tipo);

  const loginConGoogle = async ({ credential }) =>
    await loginGoogle(credential);

  // =========================
  // NUEVO: completar password (protegido con credential)
  // =========================
  const completarPassword = async ({ id_usuario, password, credential }) =>
    await completarPasswordGoogle(id_usuario, password, credential);

  return {
    registrarConGoogle,
    loginConGoogle,
    completarPassword,
    loading,
    error
  };
}