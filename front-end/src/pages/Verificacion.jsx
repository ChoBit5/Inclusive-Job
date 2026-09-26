import { useRef, useState, useEffect } from "react";
import { useVerificacionPostulante } from "../data/interface.js";
export default function Verificacion({
  correoUsuario,
  codigoInicial,
  autoAbrir = false,
  onClose,
  onVerificado
}) {
  const {
    reenviarCodigo: solicitarNuevoCodigo,
    verificarCodigo: validarCodigo
  } = useVerificacionPostulante();
  const [openModal, setOpenModal] = useState(autoAbrir);
  const [digitos, setDigitos] = useState(["", "", "", "", "", ""]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({
    texto: "",
    tipo: ""
  });
  const [reenvio, setReenvio] = useState(false);
  const inputsRef = useRef([]);
  const yaEnviadoRef = useRef(false);
  const correo = correoUsuario;
  useEffect(() => {
    if (autoAbrir && correo && codigoInicial && !yaEnviadoRef.current) {
      yaEnviadoRef.current = true;
      setOpenModal(true);
      enviarPorCorreo(codigoInicial);
    }
  }, [autoAbrir, correo, codigoInicial]);
  const cerrarModal = () => {
    setOpenModal(false);
    if (onClose) onClose();
  };
  const abrirModal = async () => {
    if (!correo) {
      setMensaje({
        texto: "No se encontró el correo del registro. Vuelve a intentarlo.",
        tipo: "error"
      });
      return;
    }
    setOpenModal(true);
    setDigitos(["", "", "", "", "", ""]);
    setMensaje({
      texto: "",
      tipo: ""
    });
    if (codigoInicial) await enviarPorCorreo(codigoInicial);
  };
  const enviarPorCorreo = async codigo => {
    if (reenvio || !correo || !codigo) return;
    setCargando(true);
    setMensaje({
      texto: "",
      tipo: ""
    });
    try {
      await Promise.resolve(codigo);
      setMensaje({
        texto: "Código preparado para la demostración local.",
        tipo: "ok"
      });
      setReenvio(true);
      setTimeout(() => setReenvio(false), 60_000);
    } catch {
      setMensaje({
        texto: "Error de red. Verifica tu conexión.",
        tipo: "error"
      });
    } finally {
      setCargando(false);
    }
  };
  const reenviarCodigo = async () => {
    if (reenvio || !correo) return;
    setCargando(true);
    setMensaje({
      texto: "",
      tipo: ""
    });
    try {
      const data = await solicitarNuevoCodigo(correo);
      if (!data.success) {
        setMensaje({
          texto: data.mensaje || "No se pudo reenviar el código.",
          tipo: "error"
        });
        return;
      }
      await enviarPorCorreo(data.codigo);
    } catch {
      setMensaje({
        texto: "Error de red. Verifica tu conexión.",
        tipo: "error"
      });
    } finally {
      setCargando(false);
    }
  };
  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const nuevo = [...digitos];
    nuevo[index] = value;
    setDigitos(nuevo);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digitos[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };
  const handlePaste = e => {
    e.preventDefault();
    const pegado = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const nuevo = ["", "", "", "", "", ""];
    pegado.split("").forEach((c, i) => {
      nuevo[i] = c;
    });
    setDigitos(nuevo);
    const ultimo = Math.min(pegado.length, 5);
    inputsRef.current[ultimo]?.focus();
  };
  const verificarCodigo = async () => {
    const codigo = digitos.join("");
    if (codigo.length < 6) {
      setMensaje({
        texto: "Ingresa los 6 dígitos del código.",
        tipo: "error"
      });
      return;
    }
    setCargando(true);
    setMensaje({
      texto: "",
      tipo: ""
    });
    try {
      const data = await validarCodigo(correo, codigo);
      if (data.success) {
        setMensaje({
          texto: data.mensaje,
          tipo: "ok"
        });
        if (onVerificado) onVerificado(data);
        setTimeout(() => {
          setOpenModal(false);
          window.location.href = "/login";
        }, 2000);
      } else {
        setMensaje({
          texto: data.mensaje || "Código incorrecto.",
          tipo: "error"
        });
        setDigitos(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
      }
    } catch {
      setMensaje({
        texto: "Error de red. Verifica tu conexión.",
        tipo: "error"
      });
    } finally {
      setCargando(false);
    }
  };
  return <>
      
      {!autoAbrir && <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-slate-50 to-white flex items-center justify-center px-4 py-10">
          <button onClick={abrirModal} className="bg-indigo-800 text-white px-6 sm:px-8 py-3 rounded-xl shadow-lg hover:bg-indigo-700 hover:scale-[1.03] transition-all font-semibold text-sm sm:text-base">
            Verificación
          </button>
        </div>}

      {openModal && <div className="fixed inset-0 z-[999] flex items-center justify-center px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">

          <style>{`
            @keyframes fadeModal  { from { opacity:0 } to { opacity:1 } }
            @keyframes scaleSoft  { from { opacity:0; transform:translateY(10px) scale(.97) } to { opacity:1; transform:translateY(0) scale(1) } }
            @keyframes softFloat  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-3px) } }
          `}</style>

          <div onClick={cerrarModal} className="fixed inset-0 bg-indigo-950/35 backdrop-blur-md" style={{
        animation: "fadeModal .25s ease-out both"
      }} />

          <div className="hidden sm:block absolute w-[520px] h-[520px] bg-white/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 w-full max-w-md my-auto bg-white/75 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-[0_30px_80px_rgba(30,27,75,0.35)] border border-white/70 p-5 sm:p-8 overflow-hidden" style={{
        animation: "scaleSoft .35s ease-out both"
      }}>
            <button onClick={cerrarModal} className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/60 backdrop-blur-md border border-white/70 text-gray-500 hover:text-indigo-800 hover:bg-indigo-50/80 transition flex items-center justify-center shadow-sm">✕</button>

            <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-100/70 rounded-full pointer-events-none overflow-hidden" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-50/70 rounded-full pointer-events-none overflow-hidden" />

            <div className="relative z-10">

              <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/75 backdrop-blur-md rounded-2xl shadow-md border border-white/80 overflow-hidden mb-3 sm:mb-4">
                  <img src="/logo.webp" alt="Logo" className="w-full h-full object-cover" />
                </div>

                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-100/80 text-indigo-700 rounded-full flex items-center justify-center text-xl sm:text-2xl mb-3 sm:mb-4 shadow-sm ring-4 ring-white/50" style={{
              animation: "softFloat 5s ease-in-out infinite"
            }}>✉️</div>

                <h1 className="text-xl sm:text-2xl font-bold text-indigo-900">Verifica tu correo</h1>
                <p className="text-gray-600 text-xs sm:text-sm mt-2 sm:mt-3 leading-relaxed px-1">
                  Hemos enviado un código de verificación a tu correo electrónico.
                  Ingresa el código para activar tu cuenta.
                </p>
              </div>

              <div className="bg-indigo-50/70 backdrop-blur-md border border-white/70 rounded-2xl p-3 sm:p-4 mb-5 sm:mb-6 text-center shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Código enviado a:</p>
                <p className="text-xs sm:text-sm font-semibold text-indigo-800 break-all">{correo || "—"}</p>
              </div>

              {mensaje.texto && <div className={`mb-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm text-center font-medium transition-all ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                  {mensaje.tipo === "ok" ? "✅ " : "⚠️ "}{mensaje.texto}
                </div>}

              <div className="mb-5 sm:mb-6">
                <label className="block text-sm font-semibold text-gray-800 mb-3 text-center">
                  Código de verificación
                </label>

                <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-3" onPaste={handlePaste}>
                  {digitos.map((d, i) => <input key={i} ref={el => inputsRef.current[i] = el} type="text" inputMode="numeric" maxLength="1" value={d} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} disabled={cargando} className="w-9 h-10 xs:w-10 xs:h-11 sm:w-12 sm:h-12 text-center text-base sm:text-lg font-bold rounded-xl border border-white/80 bg-white/65 backdrop-blur-md text-indigo-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition shadow-sm hover:border-indigo-300 disabled:opacity-50" />)}
                </div>
              </div>

              <button onClick={verificarCodigo} disabled={cargando || digitos.join("").length < 6} className="w-full bg-gradient-to-r from-indigo-800 to-indigo-700 text-white py-2.5 sm:py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                {cargando ? "Verificando…" : "Verificar correo"}
              </button>

              <div className="text-center mt-5 sm:mt-6">
                <p className="text-xs sm:text-sm text-gray-500">¿No recibiste el código?</p>
                <button onClick={reenviarCodigo} disabled={reenvio || cargando} className="text-indigo-700 text-xs sm:text-sm font-semibold hover:text-indigo-900 hover:underline mt-1 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  {reenvio ? "Reenviar disponible en 60 s" : "Reenviar código"}
                </button>
              </div>

              <div className="mt-5 sm:mt-6 border-t border-white/70 pt-4 sm:pt-5 text-center">
                <button onClick={cerrarModal} className="text-xs sm:text-sm text-gray-500 hover:text-indigo-700 transition">
                  Cambiar correo electrónico
                </button>
              </div>

            </div>
          </div>
        </div>}
    </>;
}
