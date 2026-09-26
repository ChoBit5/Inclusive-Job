import { useState, useEffect, useRef } from "react";
import PortalLayout from "../../components/Portal/Portallayout";
import { postulantTheme } from "../../components/Portal/portalTheme";
import { postulantNav } from "../../components/Portal/Navitems";
import { usePerfilPostulante } from "../../data/interface.js";
const t = postulantTheme;
const TABS = ["info", "skills", "accesibilidad"];
const TAB_LABELS = {
  info: "Yo",
  skills: "Skills",
  accesibilidad: "Accesibilidad"
};
const PAISES_LADA = [{
  code: "+52",
  name: "México"
}, {
  code: "+1",
  name: "Estados Unidos"
}, {
  code: "+34",
  name: "España"
}, {
  code: "+54",
  name: "Argentina"
}, {
  code: "+56",
  name: "Chile"
}, {
  code: "+57",
  name: "Colombia"
}, {
  code: "+51",
  name: "Perú"
}, {
  code: "+58",
  name: "Venezuela"
}, {
  code: "+502",
  name: "Guatemala"
}, {
  code: "+503",
  name: "El Salvador"
}, {
  code: "+504",
  name: "Honduras"
}, {
  code: "+505",
  name: "Nicaragua"
}, {
  code: "+506",
  name: "Costa Rica"
}, {
  code: "+507",
  name: "Panamá"
}, {
  code: "+591",
  name: "Bolivia"
}, {
  code: "+593",
  name: "Ecuador"
}, {
  code: "+595",
  name: "Paraguay"
}, {
  code: "+598",
  name: "Uruguay"
}];
function getDefaultLada() {
  return "+52";
}
function splitPhoneWithLada(phone = "") {
  const clean = String(phone).trim().replace(/[^\d+]/g, "");
  if (!clean) return {
    lada: getDefaultLada(),
    number: ""
  };
  const ladas = [...PAISES_LADA].sort((a, b) => b.code.length - a.code.length);
  if (clean.startsWith("+")) {
    const lada = ladas.find(pais => clean.startsWith(pais.code))?.code;
    if (lada) return {
      lada,
      number: clean.slice(lada.length).replace(/\D/g, "")
    };
  }
  const digits = clean.replace(/\D/g, "");
  if (digits.length > 10) {
    const lada = ladas.find(pais => {
      const ladaDigits = pais.code.replace(/\D/g, "");
      return digits.startsWith(ladaDigits) && digits.length > ladaDigits.length;
    });
    if (lada) {
      const ladaDigits = lada.code.replace(/\D/g, "");
      return {
        lada: lada.code,
        number: digits.slice(ladaDigits.length)
      };
    }
  }
  return {
    lada: getDefaultLada(),
    number: digits
  };
}
function joinPhone(lada, number) {
  const cleanLada = String(lada || "").replace(/\D/g, "");
  const cleanNumber = String(number || "").replace(/\D/g, "");
  return cleanNumber ? `${cleanLada}${cleanNumber}` : "";
}
function getInitials(name) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function parseSkills(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function parseDescDisc(raw) {
  if (!raw) return {
    nota: "",
    porcentaje: ""
  };
  const parts = raw.split(" | ");
  if (parts.length === 2) return {
    nota: parts[0],
    porcentaje: parts[1].replace("%", "")
  };
  if (/^\d+%$/.test(raw.trim())) return {
    nota: "",
    porcentaje: raw.replace("%", "")
  };
  return {
    nota: raw,
    porcentaje: ""
  };
}
function normalizeDiscapacidadOption(option) {
  if (typeof option === "string") {
    return {
      id: option,
      nombre: option,
      descripcion: ""
    };
  }
  const id = String(option?.id_tipo_discapacidad ?? option?.id ?? option?.value ?? option?.nombre_discapacidad ?? "");
  return {
    id,
    nombre: option?.nombre_discapacidad ?? option?.nombre ?? option?.label ?? id,
    descripcion: option?.descripcion ?? ""
  };
}
export default function PerfilPostulante() {
  const {
    obtenerPerfil,
    actualizarPerfil,
    backendUrl
  } = usePerfilPostulante();
  const [perfil, setPerfil] = useState({
    nombre: "",
    nombres: "",
    apellidos: "",
    rol: "",
    email: "",
    tel: "",
    foto_perfil: null,
    experiencia: "",
    skills: [],
    discapacidad: [],
    nota: "",
    porcentaje: "",
    portafolio: "",
    esfuerzo: false
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState("info");
  const [newSkill, setNewSkill] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [selectedLada, setSelectedLada] = useState(getDefaultLada());
  const [phoneNumber, setPhoneNumber] = useState("");
  const [catalogoDiscapacidades, setCatalogoDiscapacidades] = useState([]);
  const editRef = useRef(null);
  const headRef = useRef(null);
  const modalRef = useRef(null);
  const fotoInputRef = useRef(null);
  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const data = await obtenerPerfil();
        if (!data.success) {
          window.location.href = "/login";
          return;
        }
        const skills = parseSkills(data.habilidades);
        const discObj = parseDescDisc(data.descripcion_discapacidad);
        const catalogo = (data.catalogo_discapacidades || []).map(normalizeDiscapacidadOption).filter(op => op.id);
        const discapacidadIds = Array.isArray(data.discapacidad_ids) && data.discapacidad_ids.length > 0 ? data.discapacidad_ids.map(String) : (data.discapacidad || []).map(nombre => {
          const found = catalogo.find(op => op.nombre === nombre);
          return found ? found.id : nombre;
        });
        const telefono = data.telefono || "";
        setCatalogoDiscapacidades(catalogo);
        setPerfil({
          nombre: ((data.nombres || "") + " " + (data.apellidos || "")).trim() || "Sin nombre",
          nombres: data.nombres || "",
          apellidos: data.apellidos || "",
          rol: data.rol || "",
          email: data.correo || "",
          tel: telefono,
          foto_perfil: data.foto_perfil ? `${backendUrl}/${data.foto_perfil}` : null,
          experiencia: data.experiencia || "",
          skills,
          discapacidad: discapacidadIds,
          nota: discObj.nota,
          porcentaje: discObj.porcentaje,
          portafolio: data.portafolio_url || "",
          esfuerzo: !!data.esfuerzo_fisico_posible
        });
        setLoading(false);
      } catch (err) {
        console.error("Error al obtener perfil:", err);
        setError("No se pudo cargar el perfil. Intenta de nuevo.");
        setLoading(false);
      }
    };
    fetchPerfil();
  }, [backendUrl, obtenerPerfil]);
  useEffect(() => {
    if (!open) return;
    setTimeout(() => headRef.current?.focus(), 50);
    function handleKey(e) {
      if (e.key === "Escape") {
        cerrar();
        return;
      }
      if (e.key !== "Tab") return;
      const els = modalRef.current?.querySelectorAll('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (!els?.length) return;
      if (e.shiftKey && document.activeElement === els[0]) {
        e.preventDefault();
        els[els.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === els[els.length - 1]) {
        e.preventDefault();
        els[0].focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);
  function abrir() {
    setSaveError(null);
    setFotoFile(null);
    setFotoPreview(null);
    const parsedPhone = splitPhoneWithLada(perfil.tel);
    setSelectedLada(parsedPhone.lada);
    setPhoneNumber(parsedPhone.number);
    setDraft({
      ...perfil,
      tel: joinPhone(parsedPhone.lada, parsedPhone.number),
      skills: [...perfil.skills],
      discapacidad: [...perfil.discapacidad]
    });
    setTab("info");
    setOpen(true);
  }
  function cerrar() {
    if (saving) return;
    setOpen(false);
    setSaveError(null);
    setFotoFile(null);
    setFotoPreview(null);
    setTimeout(() => editRef.current?.focus(), 50);
  }
  function handleLadaChange(e) {
    const lada = e.target.value;
    setSelectedLada(lada);
    if (draft) {
      setDraft(prev => ({
        ...prev,
        tel: joinPhone(lada, phoneNumber)
      }));
    }
  }
  function handlePhoneNumberChange(e) {
    const numero = e.target.value.replace(/\D/g, "");
    setPhoneNumber(numero);
    if (draft) {
      setDraft(prev => ({
        ...prev,
        tel: joinPhone(selectedLada, numero)
      }));
    }
  }
  async function guardar() {
    setSaving(true);
    setSaveError(null);
    const nombres = (draft.nombres || "").trim();
    const apellidos = (draft.apellidos || "").trim();
    const telefonoCompleto = joinPhone(selectedLada, phoneNumber);
    if (phoneNumber && phoneNumber.length !== 10) {
      setSaveError("El teléfono debe tener exactamente 10 dígitos, sin contar la LADA.");
      setSaving(false);
      return;
    }
    const fd = new FormData();
    fd.append("nombres", nombres);
    fd.append("apellidos", apellidos);
    fd.append("telefono", telefonoCompleto);
    fd.append("experiencia", draft.experiencia);
    fd.append("skills", JSON.stringify(draft.skills));
    fd.append("discapacidad", JSON.stringify(draft.discapacidad));
    fd.append("nota", draft.nota);
    fd.append("porcentaje", draft.porcentaje);
    fd.append("portafolio_url", draft.portafolio);
    fd.append("esfuerzo_fisico_posible", draft.esfuerzo ? "1" : "0");
    if (fotoFile) fd.append("fotoPerfil", fotoFile);
    try {
      const data = await actualizarPerfil(fd);
      if (!data.ok) {
        setSaveError(data.msg || "Error al guardar. Intenta de nuevo.");
        setSaving(false);
        return;
      }
      setPerfil(prev => ({
        ...draft,
        tel: telefonoCompleto,
        nombre: (nombres + " " + apellidos).trim(),
        nombres,
        apellidos,
        foto_perfil: data.foto_perfil || prev.foto_perfil
      }));
      setFotoFile(null);
      setFotoPreview(null);
      setSaving(false);
      cerrar();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error al guardar:", err);
      setSaveError("No se pudo conectar con el servidor.");
      setSaving(false);
    }
  }
  function addSkill() {
    const v = newSkill.trim();
    if (v && !draft.skills.includes(v)) setDraft(d => ({
      ...d,
      skills: [...d.skills, v]
    }));
    setNewSkill("");
  }
  function delSkill(i) {
    setDraft(d => ({
      ...d,
      skills: d.skills.filter((_, j) => j !== i)
    }));
  }
  function togDisc(x) {
    setDraft(d => ({
      ...d,
      discapacidad: d.discapacidad.includes(x) ? d.discapacidad.filter(v => v !== x) : [...d.discapacidad, x]
    }));
  }
  const user = {
    nombre: perfil.nombre,
    rol: perfil.rol
  };
  if (loading) return <PortalLayout theme={t} navItems={postulantNav} user={{
    nombre: "…",
    rol: ""
  }} pageTitle="Mi Perfil">
      <div style={{
      textAlign: "center",
      padding: "40px 0",
      color: t.textSecondary
    }}>Cargando perfil…</div>
    </PortalLayout>;
  if (error) return <PortalLayout theme={t} navItems={postulantNav} user={{
    nombre: "Error",
    rol: ""
  }} pageTitle="Mi Perfil">
      <div style={{
      textAlign: "center",
      padding: "40px 0",
      color: "#ef4444"
    }}>{error}</div>
    </PortalLayout>;
  const AvatarImg = ({
    preview = false
  }) => {
    const src = preview ? fotoPreview || perfil.foto_perfil : perfil.foto_perfil;
    return src ? <img src={src} alt="Foto de perfil" style={{
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }} /> : <span>{getInitials(perfil.nombre)}</span>;
  };
  const displayPhone = () => {
    if (!perfil.tel) return "—";
    return perfil.tel;
  };
  const getDiscapacidadNombre = idOrName => {
    const key = String(idOrName);
    return catalogoDiscapacidades.find(op => op.id === key)?.nombre || key;
  };
  return <PortalLayout theme={t} navItems={postulantNav} user={user} pageTitle="Mi Perfil" notifications={0} headerActions={<button ref={editRef} onClick={abrir} aria-label={`Editar perfil de ${perfil.nombre}`} aria-haspopup="dialog" style={{
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: t.gradient,
    border: "none",
    borderRadius: "10px",
    padding: "8px 16px",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: `0 4px 14px ${t.accentGlow}`
  }}>
          ✏️ Editar perfil
        </button>}>

      <div style={{
      maxWidth: "1000px",
      margin: "0 auto"
    }}>

        
        <div aria-live="polite" aria-atomic="true">
          {saved && <div role="status" style={{
          marginBottom: "16px",
          background: "rgba(16,185,129,0.1)",
          color: "#059669",
          fontSize: "13px",
          padding: "10px 16px",
          borderRadius: "12px",
          border: "1px solid rgba(16,185,129,0.25)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
              ✓ Perfil guardado correctamente
            </div>}
        </div>

        
        <div style={{
        background: t.bgSurface,
        border: `1px solid ${t.border}`,
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.04)"
      }}>

          
          <div style={{
          background: t.accent,
          padding: "24px 28px 20px"
        }}>
            <div style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "16px"
          }}>
              <div aria-hidden="true" style={{
              width: "72px",
              height: "72px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
              flexShrink: 0,
              border: "2px solid rgba(255,255,255,0.3)",
              overflow: "hidden"
            }}>
                <AvatarImg />
              </div>
              <div>
                <h1 style={{
                margin: 0,
                color: "#fff",
                fontSize: "20px",
                fontWeight: 700
              }}>{perfil.nombre}</h1>
                <p style={{
                margin: "2px 0 0",
                color: "rgba(255,255,255,0.8)",
                fontSize: "14px"
              }}>{perfil.rol}</p>
              </div>
            </div>
            {perfil.discapacidad.length > 0 && <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginTop: "16px"
          }}>
                {perfil.discapacidad.map(d => <span key={d} style={{
              fontSize: "12px",
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              padding: "3px 12px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}>
                    {getDiscapacidadNombre(d)}
                  </span>)}
              </div>}
          </div>

          
          <div style={{
          borderBottom: `1px solid ${t.border}`,
          padding: "12px 28px",
          display: "flex",
          flexWrap: "wrap",
          gap: "16px 24px"
        }}>
            {[["📧", "Correo", perfil.email], ["📱", "Teléfono", displayPhone()], ["🔗", "Portafolio", perfil.portafolio]].map(([ic, label, val]) => <span key={label} style={{
            fontSize: "12px",
            color: t.textSecondary,
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
                <span aria-hidden="true">{ic}</span>
                <span className="sr-only">{label}: </span>
                {val || "—"}
              </span>)}
          </div>

          
          <div style={{
          padding: "24px 28px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px"
        }}>

            <section aria-labelledby="s-exp" style={{
            gridColumn: "1 / -1"
          }}>
              <h2 id="s-exp" style={{
              fontSize: "11px",
              fontWeight: 600,
              color: t.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              margin: "0 0 6px"
            }}>Experiencia</h2>
              <p style={{
              fontSize: "14px",
              color: t.textPrimary,
              lineHeight: 1.6,
              margin: 0
            }}>
                {perfil.experiencia || "Aún no has escrito tu experiencia."}
              </p>
            </section>

            <section aria-labelledby="s-skills">
              <h2 id="s-skills" style={{
              fontSize: "11px",
              fontWeight: 600,
              color: t.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              margin: "0 0 6px"
            }}>Habilidades</h2>
              {perfil.skills.length > 0 ? <ul style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              listStyle: "none",
              padding: 0,
              margin: 0
            }}>
                  {perfil.skills.map(s => <li key={s} style={{
                fontSize: "12px",
                padding: "3px 12px",
                borderRadius: "999px",
                background: t.accentSoft,
                color: t.accent,
                border: `1px solid ${t.accentBorder}`
              }}>{s}</li>)}
                </ul> : <p style={{
              fontSize: "13px",
              color: t.textMuted,
              margin: 0
            }}>Sin habilidades aún.</p>}
            </section>

            <section aria-labelledby="s-ef">
              <h2 id="s-ef" style={{
              fontSize: "11px",
              fontWeight: 600,
              color: t.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              margin: "0 0 6px"
            }}>Esfuerzo físico</h2>
              <span style={{
              fontSize: "13px",
              color: t.textPrimary
            }}>
                {perfil.esfuerzo ? "✅ Puede realizar esfuerzo físico" : "❌ No puede realizar esfuerzo físico"}
              </span>
            </section>

            {(perfil.discapacidad.length > 0 || perfil.nota || perfil.porcentaje) && <section aria-labelledby="s-acc" style={{
            gridColumn: "1 / -1",
            borderRadius: "12px",
            padding: "16px",
            border: `1px solid ${t.accentBorder}`,
            background: t.accentSoft
          }}>
                <h2 id="s-acc" style={{
              fontSize: "11px",
              fontWeight: 600,
              color: t.accent,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              margin: "0 0 12px"
            }}>Accesibilidad</h2>
                <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px"
            }}>
                  {perfil.discapacidad.length > 0 && <div>
                      <p style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: t.accent,
                  margin: "0 0 4px"
                }}>Tipo de discapacidad</p>
                      <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px"
                }}>
                        {perfil.discapacidad.map(d => <span key={d} style={{
                    fontSize: "12px",
                    padding: "2px 10px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.6)",
                    color: t.textPrimary,
                    border: `1px solid ${t.accentBorder}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                            {getDiscapacidadNombre(d)}
                          </span>)}
                      </div>
                    </div>}
                  {perfil.porcentaje && <div>
                      <p style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: t.accent,
                  margin: "0 0 4px"
                }}>Porcentaje de discapacidad</p>
                      <span style={{
                  fontSize: "13px",
                  color: t.textPrimary
                }}>{perfil.porcentaje}%</span>
                    </div>}
                  {perfil.nota && <div style={{
                gridColumn: "1 / -1",
                borderRadius: "8px",
                padding: "12px",
                background: "rgba(255,255,255,0.5)",
                border: `1px solid ${t.accentBorder}`
              }}>
                      <p style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: t.accent,
                  margin: "0 0 4px"
                }}>Nota para el empleador</p>
                      <p style={{
                  fontSize: "12px",
                  color: t.textPrimary,
                  fontStyle: "italic",
                  margin: 0,
                  lineHeight: 1.5
                }}>"{perfil.nota}"</p>
                    </div>}
                </div>
              </section>}
          </div>
        </div>
      </div>

      
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && cerrar()}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="mtitle" style={{
        background: t.bgSurface,
        borderRadius: "20px",
        width: "100%",
        maxWidth: "480px",
        maxHeight: "88vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${t.border}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
      }}>

            
            <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0
        }}>
              <h2 id="mtitle" ref={headRef} tabIndex={-1} style={{
            fontSize: "16px",
            fontWeight: 700,
            color: t.textPrimary,
            margin: 0,
            outline: "none"
          }}>Editar perfil</h2>
              <button onClick={cerrar} disabled={saving} aria-label="Cerrar modal" style={{
            background: "transparent",
            border: "none",
            fontSize: "24px",
            color: t.textMuted,
            cursor: saving ? "not-allowed" : "pointer",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px"
          }}>×</button>
            </div>

            
            <div role="tablist" aria-label="Secciones del perfil" style={{
          display: "flex",
          padding: "0 16px",
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0
        }}>
              {TABS.map(tabKey => <button key={tabKey} role="tab" aria-selected={tab === tabKey} onClick={() => setTab(tabKey)} onKeyDown={e => {
            const i = TABS.indexOf(tabKey);
            if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length]);else if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length]);
          }} style={{
            fontSize: "12px",
            padding: "10px 12px",
            borderBottom: `2px solid ${tab === tabKey ? t.accent : "transparent"}`,
            background: "transparent",
            color: tab === tabKey ? t.accent : t.textMuted,
            fontWeight: tab === tabKey ? 600 : 400,
            cursor: "pointer",
            outline: "none"
          }}>
                  {TAB_LABELS[tabKey]}
                </button>)}
            </div>

            
            <div style={{
          overflowY: "auto",
          flex: 1,
          padding: "16px 20px"
        }}>

              
              {tab === "info" && <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>

                  
                  <div style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "12px",
              background: t.bgElevated,
              borderRadius: "12px",
              border: `1px solid ${t.border}`
            }}>
                    <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "10px",
                overflow: "hidden",
                border: `2px solid ${t.border}`,
                flexShrink: 0,
                background: t.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: 700,
                color: t.accent
              }}>
                      {fotoPreview ? <img src={fotoPreview} alt="Preview" style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }} /> : perfil.foto_perfil ? <img src={perfil.foto_perfil} alt="Foto actual" style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }} /> : getInitials(`${draft.nombres} ${draft.apellidos}`)}
                    </div>
                    <div>
                      <button type="button" onClick={() => fotoInputRef.current?.click()} style={{
                  background: t.accentSoft,
                  border: `1px solid ${t.accentBorder}`,
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: t.accent,
                  cursor: "pointer"
                }}>
                        📷 {perfil.foto_perfil ? "Cambiar foto" : "Subir foto"}
                      </button>
                      <p style={{
                  fontSize: "11px",
                  color: t.textMuted,
                  margin: "4px 0 0"
                }}>JPG, PNG o WEBP · máx 5 MB</p>
                      {fotoPreview && <button type="button" onClick={() => {
                  setFotoFile(null);
                  setFotoPreview(null);
                }} style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "11px",
                  color: "#dc2626",
                  cursor: "pointer",
                  padding: 0,
                  marginTop: "4px"
                }}>
                          × Quitar selección
                        </button>}
                    </div>
                    <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{
                display: "none"
              }} onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFotoFile(file);
                setFotoPreview(URL.createObjectURL(file));
              }} />
                  </div>

                  
                  <div style={{
              display: "flex",
              gap: "8px"
            }}>
                    <div style={{
                flex: 1
              }}>
                      <label htmlFor="f-nombres" style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: t.textSecondary,
                  display: "block",
                  marginBottom: "4px"
                }}>Nombre(s)</label>
                      <input id="f-nombres" type="text" style={{
                  width: "100%",
                  border: `1px solid ${t.border}`,
                  borderRadius: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  background: t.bgElevated,
                  color: t.textPrimary,
                  outline: "none",
                  boxSizing: "border-box"
                }} value={draft.nombres} onChange={e => setDraft(d => ({
                  ...d,
                  nombres: e.target.value
                }))} />
                    </div>
                    <div style={{
                flex: 1
              }}>
                      <label htmlFor="f-apellidos" style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: t.textSecondary,
                  display: "block",
                  marginBottom: "4px"
                }}>Apellido(s)</label>
                      <input id="f-apellidos" type="text" style={{
                  width: "100%",
                  border: `1px solid ${t.border}`,
                  borderRadius: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  background: t.bgElevated,
                  color: t.textPrimary,
                  outline: "none",
                  boxSizing: "border-box"
                }} value={draft.apellidos} onChange={e => setDraft(d => ({
                  ...d,
                  apellidos: e.target.value
                }))} />
                    </div>
                  </div>

                  
                  <div>
                    <label htmlFor="f-telefono" style={{
                fontSize: "12px",
                fontWeight: 500,
                color: t.textSecondary,
                display: "block",
                marginBottom: "4px"
              }}>Teléfono</label>
                    <div style={{
                display: "flex",
                gap: "8px"
              }}>
                      <select value={selectedLada} onChange={handleLadaChange} style={{
                  width: "112px",
                  border: `1px solid ${t.border}`,
                  borderRadius: "10px",
                  padding: "8px 6px",
                  fontSize: "13px",
                  background: t.bgElevated,
                  color: t.textPrimary,
                  outline: "none",
                  cursor: "pointer"
                }}>
                        {PAISES_LADA.map(pais => <option key={pais.code} value={pais.code}>
                            {pais.code} · {pais.name}
                          </option>)}
                      </select>
                      <input id="f-telefono" type="tel" inputMode="numeric" placeholder="10 dígitos" style={{
                  flex: 1,
                  minWidth: 0,
                  border: `1px solid ${t.border}`,
                  borderRadius: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  background: t.bgElevated,
                  color: t.textPrimary,
                  outline: "none",
                  boxSizing: "border-box"
                }} value={phoneNumber} onChange={handlePhoneNumberChange} maxLength="10" />
                    </div>
                    <p style={{
                fontSize: "11px",
                color: t.textMuted,
                marginTop: "4px"
              }}>
                      Selecciona la LADA y escribe solo tu número. Se guardará como {joinPhone(selectedLada, phoneNumber) || `${selectedLada} + número`}.
                    </p>
                  </div>

                  
                  <div>
                    <label htmlFor="f-portafolio" style={{
                fontSize: "12px",
                fontWeight: 500,
                color: t.textSecondary,
                display: "block",
                marginBottom: "4px"
              }}>URL Portafolio</label>
                    <input id="f-portafolio" type="url" style={{
                width: "100%",
                border: `1px solid ${t.border}`,
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "13px",
                background: t.bgElevated,
                color: t.textPrimary,
                outline: "none",
                boxSizing: "border-box"
              }} value={draft.portafolio} onChange={e => setDraft(d => ({
                ...d,
                portafolio: e.target.value
              }))} />
                  </div>

                  <div>
                    <label htmlFor="f-exp" style={{
                fontSize: "12px",
                fontWeight: 500,
                color: t.textSecondary,
                display: "block",
                marginBottom: "4px"
              }}>Experiencia</label>
                    <textarea id="f-exp" rows={4} placeholder="Describe tu experiencia laboral, proyectos, logros…" style={{
                width: "100%",
                border: `1px solid ${t.border}`,
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "13px",
                background: t.bgElevated,
                color: t.textPrimary,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box"
              }} value={draft.experiencia} onChange={e => setDraft(d => ({
                ...d,
                experiencia: e.target.value
              }))} />
                  </div>

                  <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
                    <button type="button" role="checkbox" aria-checked={draft.esfuerzo} onClick={() => setDraft(d => ({
                ...d,
                esfuerzo: !d.esfuerzo
              }))} style={{
                width: "20px",
                height: "20px",
                borderRadius: "6px",
                border: `2px solid ${draft.esfuerzo ? t.accent : t.border}`,
                background: draft.esfuerzo ? t.accent : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0
              }}>
                      {draft.esfuerzo && <span style={{
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700
                }}>✓</span>}
                    </button>
                    <label onClick={() => setDraft(d => ({
                ...d,
                esfuerzo: !d.esfuerzo
              }))} style={{
                fontSize: "13px",
                color: t.textPrimary,
                cursor: "pointer",
                userSelect: "none"
              }}>
                      Puedo realizar esfuerzo físico
                    </label>
                  </div>
                </div>}

              
              {tab === "skills" && <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
                  <p style={{
              fontSize: "12px",
              color: t.textMuted,
              margin: 0
            }}>Toca × para quitar una habilidad.</p>
                  <ul style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              minHeight: "36px",
              listStyle: "none",
              padding: 0,
              margin: 0
            }}>
                    {draft.skills.map((s, i) => <li key={s} style={{
                fontSize: "12px",
                padding: "3px 10px",
                borderRadius: "999px",
                background: t.accentSoft,
                color: t.accent,
                border: `1px solid ${t.accentBorder}`,
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                        {s}
                        <button onClick={() => delSkill(i)} aria-label={`Quitar ${s}`} style={{
                  background: "transparent",
                  border: "none",
                  color: t.accent,
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "0 2px"
                }}>×</button>
                      </li>)}
                  </ul>
                  <div style={{
              display: "flex",
              gap: "8px"
            }}>
                    <input type="text" placeholder="Ej: TypeScript" style={{
                flex: 1,
                border: `1px solid ${t.border}`,
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "13px",
                background: t.bgElevated,
                color: t.textPrimary,
                outline: "none"
              }} value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                    <button onClick={addSkill} style={{
                background: t.gradient,
                border: "none",
                borderRadius: "10px",
                padding: "8px 16px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}>
                      + Agregar
                    </button>
                  </div>
                  <p style={{
              fontSize: "11px",
              color: t.textMuted,
              margin: 0
            }}>También puedes presionar Enter.</p>
                </div>}

              
              {tab === "accesibilidad" && <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
                  <fieldset style={{
              border: "none",
              padding: 0,
              margin: 0
            }}>
                    <legend style={{
                fontSize: "12px",
                fontWeight: 600,
                color: t.textSecondary,
                marginBottom: "8px"
              }}>
                      Tipo de discapacidad <span style={{
                  fontWeight: 400,
                  color: t.textMuted
                }}>(puedes elegir varias)</span>
                    </legend>
                    <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "8px"
              }}>
                      {catalogoDiscapacidades.length === 0 && <p style={{
                  gridColumn: "1 / -1",
                  fontSize: "12px",
                  color: t.textMuted,
                  margin: 0
                }}>
                          No se encontraron tipos de discapacidad registrados.
                        </p>}
                      {catalogoDiscapacidades.map(op => {
                  const sel = draft.discapacidad.includes(op.id);
                  return <button key={op.id} type="button" role="checkbox" aria-checked={sel} onClick={() => togDisc(op.id)} style={{
                    textAlign: "left",
                    fontSize: "12px",
                    padding: "10px 12px",
                    borderRadius: "14px",
                    border: `1px solid ${sel ? t.accent : t.accentBorder}`,
                    background: sel ? t.accent : t.accentSoft,
                    color: sel ? "#fff" : t.textPrimary,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                    boxShadow: sel ? `0 8px 20px ${t.accentGlow}` : "0 2px 8px rgba(15,23,42,0.04)",
                    transition: "all 0.2s"
                  }}>
                            <span style={{
                      fontWeight: 700
                    }}>{op.nombre}</span>
                            {op.descripcion && <span style={{
                      color: sel ? "rgba(255,255,255,0.82)" : t.textMuted,
                      lineHeight: 1.35
                    }}>
                                {op.descripcion}
                              </span>}
                          </button>;
                })}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="f-pct" style={{
                fontSize: "12px",
                fontWeight: 600,
                color: t.textSecondary,
                display: "block",
                marginBottom: "4px"
              }}>
                      Porcentaje de discapacidad <span style={{
                  fontWeight: 400,
                  color: t.textMuted
                }}>(opcional)</span>
                    </label>
                    <input id="f-pct" type="number" min="0" max="100" placeholder="Ej: 40" style={{
                width: "100%",
                border: `1px solid ${t.border}`,
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "13px",
                background: t.bgElevated,
                color: t.textPrimary,
                outline: "none",
                boxSizing: "border-box"
              }} value={draft.porcentaje} onChange={e => setDraft(d => ({
                ...d,
                porcentaje: e.target.value
              }))} />
                    <p style={{
                fontSize: "11px",
                color: t.textMuted,
                marginTop: "4px"
              }}>Lo indica tu certificado del IMSS o SEP.</p>
                  </div>

                  <div>
                    <label htmlFor="f-nota" style={{
                fontSize: "12px",
                fontWeight: 600,
                color: t.textSecondary,
                display: "block",
                marginBottom: "4px"
              }}>
                      Nota para el empleador <span style={{
                  fontWeight: 400,
                  color: t.textMuted
                }}>(opcional)</span>
                    </label>
                    <textarea id="f-nota" rows={3} placeholder="Ej: Uso lector de pantalla, me manejo bien con teclado…" style={{
                width: "100%",
                border: `1px solid ${t.border}`,
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "13px",
                background: t.bgElevated,
                color: t.textPrimary,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box"
              }} value={draft.nota} onChange={e => setDraft(d => ({
                ...d,
                nota: e.target.value
              }))} />
                  </div>
                </div>}
            </div>

            
            <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "12px 20px",
          borderTop: `1px solid ${t.border}`,
          flexShrink: 0
        }}>
              {saveError && <div role="alert" style={{
            fontSize: "12px",
            color: "#dc2626",
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: "8px",
            padding: "8px 12px"
          }}>
                  ⚠️ {saveError}
                </div>}
              <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px"
          }}>
                <button onClick={cerrar} disabled={saving} style={{
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: "10px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              color: t.textSecondary,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1
            }}>
                  Cancelar
                </button>
                <button onClick={guardar} disabled={saving} aria-busy={saving} style={{
              background: t.gradient,
              border: "none",
              borderRadius: "10px",
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: `0 4px 12px ${t.accentGlow}`,
              opacity: saving ? 0.8 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
                  {saving ? <>
                      <span aria-hidden="true" style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite"
                }} />
                      Guardando…
                    </> : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PortalLayout>;
}
