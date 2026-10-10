import { useEffect, useState } from "react";
import { AlertCircle, Building, CheckCircle, Clock, FileText, Globe, MapPin, Phone, Save, Send, XCircle } from "lucide-react";
import PortalLayout from "../../components/Portal/Portallayout";
import { reclutadorTheme as t } from "../../components/Portal/portalTheme";
import { reclutadorNav } from "../../components/Portal/Navitems";
import BubleChat from "../Reclutador/ChatBot.jsx";
import { useActualizarEmpresaReclutador, useEmpresaReclutador } from "../../hooks/Reclutador/useDomain.js";
import { PAISES_LADA, getDefaultLada, joinPhone, normalizeRfc, splitPhoneWithLada, validateCompanyEmail, validateMexicanRfc } from "../../hooks/Reclutador/empresaHelpers.js";
const INITIAL_COMPANY = {
  nombre_empresa: "",
  rfc: "",
  correo_empresa: "",
  sitio_web: "",
  telefono_empresa: "",
  descripcion_empresa: "",
  direccion_empresa: "",
  empresa_validada: 0,
  estado_validacion: 0,
  empresa_rechazada: false,
  requiere_reenvio: false
};
export default function MiEmpresa() {
  const {
    data,
    loading,
    error
  } = useEmpresaReclutador();
  const {
    actualizarEmpresa,
    loading: isSaving
  } = useActualizarEmpresaReclutador();
  const [companyData, setCompanyData] = useState(INITIAL_COMPANY);
  const [mensaje, setMensaje] = useState({
    texto: "",
    tipo: ""
  });
  const [selectedLada, setSelectedLada] = useState(getDefaultLada());
  const [phoneNumber, setPhoneNumber] = useState("");
  useEffect(() => {
    if (data?.data) {
      const parsedPhone = splitPhoneWithLada(data.data.telefono_empresa);
      setSelectedLada(parsedPhone.lada);
      setPhoneNumber(parsedPhone.number);
      setCompanyData(prev => ({
        ...prev,
        ...data.data,
        rfc: data.data.rfc ?? data.data.rfc_empresa ?? "",
        telefono_empresa: joinPhone(parsedPhone.lada, parsedPhone.number)
      }));
    }
  }, [data]);
  useEffect(() => {
    if (error) setMensaje({
      texto: error,
      tipo: "error"
    });
  }, [error]);
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: name === "rfc" ? normalizeRfc(value) : value
    }));
  };
  const handleLadaChange = e => {
    const lada = e.target.value;
    setSelectedLada(lada);
    setCompanyData(prev => ({
      ...prev,
      telefono_empresa: joinPhone(lada, phoneNumber)
    }));
  };
  const handlePhoneNumberChange = e => {
    const numero = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(numero);
    setCompanyData(prev => ({
      ...prev,
      telefono_empresa: joinPhone(selectedLada, numero)
    }));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setMensaje({
      texto: "",
      tipo: ""
    });
    const telefonoCompleto = joinPhone(selectedLada, phoneNumber);
    const rfcError = validateMexicanRfc(companyData.rfc);
    const correoError = validateCompanyEmail(companyData.correo_empresa);
    if (rfcError) {
      setMensaje({
        texto: rfcError,
        tipo: "error"
      });
      return;
    }
    if (correoError) {
      setMensaje({
        texto: correoError,
        tipo: "error"
      });
      return;
    }
    if (!phoneNumber) {
      setMensaje({
        texto: "El numero de telefono es obligatorio.",
        tipo: "error"
      });
      return;
    }
    if (phoneNumber.length !== 10) {
      setMensaje({
        texto: "El telefono debe tener exactamente 10 digitos, sin contar la LADA.",
        tipo: "error"
      });
      return;
    }
    try {
      const payload = {
        ...companyData,
        rfc: normalizeRfc(companyData.rfc),
        rfc_empresa: normalizeRfc(companyData.rfc),
        telefono_empresa: telefonoCompleto
      };
      const result = await actualizarEmpresa(payload);
      setCompanyData(prev => ({
        ...prev,
        telefono_empresa: telefonoCompleto,
        empresa_validada: result.data?.empresa_validada ?? prev.empresa_validada,
        estado_validacion: result.data?.estado_validacion ?? result.data?.empresa_validada ?? prev.estado_validacion,
        empresa_rechazada: result.data?.empresa_rechazada ?? false,
        requiere_reenvio: result.data?.requiere_reenvio ?? false
      }));
      setMensaje({
        texto: result.data?.reenvio_revision ? "Datos reenviados correctamente. Tu empresa queda pendiente de nueva validacion." : result.data?.cambio_nombre ? "Informacion guardada. La empresa queda pendiente de validacion." : "Datos corporativos actualizados correctamente.",
        tipo: result.data?.reenvio_revision || result.data?.cambio_nombre ? "warning" : "success"
      });
      setTimeout(() => setMensaje({
        texto: "",
        tipo: ""
      }), 5000);
    } catch (err) {
      setMensaje({
        texto: err.message || "No se pudieron actualizar los datos corporativos.",
        tipo: "error"
      });
    }
  };
  if (loading) {
    return <PortalLayout theme={t} navItems={reclutadorNav} pageTitle="Mi Empresa">
        <div style={{
        color: t.textMuted,
        textAlign: "center",
        padding: 40
      }}>Cargando datos corporativos...</div>
      </PortalLayout>;
  }
  return <PortalLayout theme={t} navItems={reclutadorNav} pageTitle="Mi Empresa">
      <div style={{
      maxWidth: 850,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
        <StatusCard companyData={companyData} />
        {Number(companyData.estado_validacion ?? companyData.empresa_validada) === 2 && <RejectedNotice />}
        {mensaje.texto && <Message message={mensaje} />}

        <form onSubmit={handleSubmit} style={panelStyle}>
          <h3 style={panelTitleStyle}><Building size={18} /> Perfil e identidad de la empresa</h3>
          <div style={gridStyle}>
            <Field label="Nombre comercial o razon social *">
              <input name="nombre_empresa" value={companyData.nombre_empresa || ""} onChange={handleChange} required style={inputStyle} />
            </Field>
            <Field label="RFC">
              <IconInput icon={FileText}>
                <input name="rfc" value={companyData.rfc || ""} onChange={handleChange} required maxLength={13} placeholder="ABC123456T12" style={{
                ...inputStyle,
                paddingLeft: 34,
                textTransform: "uppercase"
              }} />
              </IconInput>
              <span style={{
              fontSize: 11,
              color: t.textMuted
            }}>
                12 o 13 caracteres, sin espacios ni guiones.
              </span>
            </Field>
            <Field label="Correo de empresa *">
              <input type="email" name="correo_empresa" value={companyData.correo_empresa || ""} onChange={handleChange} required maxLength={150} placeholder="contacto@empresa.com" style={inputStyle} />
            </Field>
            <Field label="Sitio web">
              <IconInput icon={Globe}>
                <input type="url" name="sitio_web" value={companyData.sitio_web || ""} onChange={handleChange} style={{
                ...inputStyle,
                paddingLeft: 34
              }} />
              </IconInput>
            </Field>
            <Field label="Numero de telefono *">
              <div style={{
              display: "flex",
              gap: 8
            }}>
                <select value={selectedLada} onChange={handleLadaChange} style={{
                ...inputStyle,
                width: 118,
                padding: "10px 8px",
                flexShrink: 0
              }}>
                  {PAISES_LADA.map(pais => <option key={pais.code} value={pais.code}>
                      {pais.code} · {pais.name}
                    </option>)}
                </select>
                <IconInput icon={Phone}>
                  <input type="tel" inputMode="numeric" placeholder="10 digitos" value={phoneNumber} onChange={handlePhoneNumberChange} maxLength={10} required style={{
                  ...inputStyle,
                  paddingLeft: 34
                }} />
                </IconInput>
              </div>
              <span style={{
              fontSize: 11,
              color: t.textMuted
            }}>
                Se guardara como {joinPhone(selectedLada, phoneNumber) || `${selectedLada} + numero`}.
              </span>
            </Field>
            <Field label="Direccion corporativa">
              <IconInput icon={MapPin}>
                <input name="direccion_empresa" value={companyData.direccion_empresa || ""} onChange={handleChange} style={{
                ...inputStyle,
                paddingLeft: 34
              }} />
              </IconInput>
            </Field>
            <Field label="Sobre la empresa" wide>
              <textarea name="descripcion_empresa" value={companyData.descripcion_empresa || ""} onChange={handleChange} rows={5} style={textareaStyle} />
            </Field>
          </div>

          <div style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 10
        }}>
            <button type="submit" disabled={isSaving} style={{
            ...btnSaveStyle,
            opacity: isSaving ? 0.7 : 1
          }}>
              {Number(companyData.estado_validacion ?? companyData.empresa_validada) === 2 ? <Send size={16} /> : <Save size={16} />}
              {isSaving ? "Guardando..." : Number(companyData.estado_validacion ?? companyData.empresa_validada) === 2 ? "Reenviar datos para revision" : "Actualizar datos"}
            </button>
          </div>
        </form>
      </div>
      <BubleChat />
    </PortalLayout>;
}
function StatusCard({
  companyData
}) {
  const estado = Number(companyData.estado_validacion ?? companyData.empresa_validada);
  if (!companyData.nombre_empresa?.trim()) {
    return <CardStatus color="#f59e0b" icon={AlertCircle} title="Empresa sin registrar" text="Ingresa tus datos corporativos para iniciar el alta." />;
  }
  if (estado === 1) {
    return <CardStatus color="#10b981" icon={CheckCircle} title="Organizacion validada" text="Tu cuenta puede publicar vacantes." />;
  }
  if (estado === 2) {
    return <CardStatus color="#ef4444" icon={XCircle} title="Empresa rechazada" text="El administrador rechazo los datos de tu empresa. Corrigelos y reenvialos para una nueva revision." />;
  }
  if (estado === 3) {
    return <CardStatus color="#64748b" icon={AlertCircle} title="Empresa suspendida" text="Tu empresa fue suspendida. Contacta a administracion antes de operar nuevamente." />;
  }
  return <CardStatus color="#3b82f6" icon={Clock} title="Validacion en curso" text="El equipo administrativo esta revisando tus datos comerciales." />;
}
function RejectedNotice() {
  return <div style={rejectedNoticeStyle}>
      <div style={rejectedIconStyle}>
        <XCircle size={22} />
      </div>
      <div>
        <h4 style={{
        margin: 0,
        color: "#991b1b",
        fontSize: 15,
        fontWeight: 800
      }}>
          Tu empresa fue rechazada
        </h4>
        <p style={{
        margin: "4px 0 0",
        color: "#7f1d1d",
        fontSize: 13,
        lineHeight: 1.5
      }}>
          Revisa y corrige los datos de tu empresa. Al guardar, la solicitud se enviara nuevamente al administrador y quedara pendiente de validacion.
        </p>
      </div>
    </div>;
}
function CardStatus({
  color,
  icon: Icon,
  title,
  text
}) {
  return <div style={{
    ...statusCardBase,
    background: `${color}14`,
    border: `1px solid ${color}`,
    color
  }}>
      <Icon size={24} />
      <div>
        <h4 style={{
        margin: 0,
        fontSize: 15
      }}>{title}</h4>
        <p style={{
        margin: "4px 0 0",
        fontSize: 13,
        color: t.textSecondary
      }}>{text}</p>
      </div>
    </div>;
}
function Field({
  label,
  children,
  wide = false
}) {
  return <label style={{
    ...inputGroupStyle,
    gridColumn: wide ? "1 / -1" : undefined
  }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>;
}
function IconInput({
  icon: Icon,
  children
}) {
  return <div style={{
    position: "relative",
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 0
  }}>
      <Icon size={14} style={{
      position: "absolute",
      left: 12,
      color: t.textMuted
    }} />
      {children}
    </div>;
}
function Message({
  message
}) {
  const color = message.tipo === "success" ? "#10b981" : message.tipo === "warning" ? "#f59e0b" : "#ef4444";
  return <div style={{
    ...alertBoxStyle,
    background: `${color}20`,
    border: `1px solid ${color}`,
    color
  }}>
      <AlertCircle size={18} />
      <span style={{
      fontSize: 14,
      fontWeight: 500
    }}>{message.texto}</span>
    </div>;
}
const statusCardBase = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: 18,
  borderRadius: 12,
  boxSizing: "border-box"
};
const panelStyle = {
  background: t.bgSurface,
  border: `1px solid ${t.border}`,
  borderRadius: 12,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 20
};
const panelTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
  color: t.accent,
  borderBottom: `1px solid ${t.border}`,
  paddingBottom: 12
};
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16
};
const inputGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};
const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: t.textSecondary
};
const inputStyle = {
  background: t.bgSurface,
  border: `1px solid ${t.border}`,
  color: t.textPrimary,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  width: "100%",
  boxSizing: "border-box"
};
const textareaStyle = {
  ...inputStyle,
  fontFamily: "inherit",
  lineHeight: "1.5",
  resize: "vertical"
};
const btnSaveStyle = {
  background: t.gradient,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer"
};
const alertBoxStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  borderRadius: 10,
  width: "100%",
  boxSizing: "border-box"
};
const rejectedNoticeStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: 16,
  borderRadius: 14,
  background: "linear-gradient(135deg, #fee2e2, #fff1f2)",
  border: "1px solid #fca5a5",
  boxShadow: "0 10px 24px rgba(239,68,68,0.12)"
};
const rejectedIconStyle = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: "#fecaca",
  color: "#dc2626",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
};
