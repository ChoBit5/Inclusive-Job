import { useState } from "react";
import GOOGLE_API from "./apiGoogle.js";

export default function useGoogle() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callGoogle = async (endpoint, body) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Error en autenticación Google");
      }

      return data;

    } catch (err) {
      setError(err.message);
      throw err;

    } finally {
      setLoading(false);
    }
  };

  // =========================
  // GOOGLE REGISTER
  // =========================
  const registrarGoogle = (credential, tipo) =>
    callGoogle(GOOGLE_API.registro, { credential, tipo });

  // =========================
  // GOOGLE LOGIN
  // =========================
  const loginGoogle = (credential) =>
    callGoogle(GOOGLE_API.login, { credential });

  // =========================
  // NUEVO: completar password Google (protegido con credential)
  // =========================
  const completarPasswordGoogle = (id_usuario, password, credential) =>
    callGoogle(GOOGLE_API.completar_password, {
      id_usuario,
      password,
      credential
    });

  return {
    registrarGoogle,
    loginGoogle,
    completarPasswordGoogle,
    loading,
    error
  };
}