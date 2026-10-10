
import { useEffect, useState } from 'react';
import { Navigate, Outlet, Routes, Route, useLocation } from 'react-router-dom';

// ── Páginas públicas ─────────────────────────────────────────
import Home        from './pages/Home.jsx';
import LoginAdmin  from './pages/Admin/LoginAdmin.jsx';
import Login from './pages/Ingresar.jsx';
import Registro from './pages/Registro.jsx';
import Verificacion from './pages/Verificacion.jsx';

// ── Admin ────────────────────────────────────────────────────
import AdminLayout    from './components/Admin/AdminLayout.jsx';
import Dashboard      from './pages/Admin/Dashboard.jsx';
import Empresas       from './pages/Admin/Empresas.jsx';
import EmpresaDetalle from './pages/Admin/Empresadetalle.jsx';
import Usuarios       from './pages/Admin/Usuarios.jsx';
import UsuarioPerfil  from './pages/Admin/Usuarioperfil.jsx';
import Vacantes       from './pages/Admin/Vacantes.jsx';
import VacanteDetalle from './pages/Admin/Vacantedetalle.jsx';
import Postulaciones  from './pages/Admin/Postulaciones.jsx';
import PostulacionDetalle from './pages/Admin/Postulaciondetalle.jsx';
import Discapacidades from './pages/Admin/Discapacidades.jsx';
import Reportes       from './pages/Admin/Reportes.jsx';
// import Configuracion from './pages/Admin/Configuracion.jsx';

// ── Reclutador ───────────────────────────────────────────────
import ReclutadorDashboard from './pages/Reclutador/Reclutadordashboard.jsx';
import VacantesReclutador from "./pages/Reclutador/Vacantes.jsx"; 
import Candidatos from './pages/Reclutador/candidatos.jsx';
import Perfil from './pages/Reclutador/perfil.jsx';
import Empresa from './pages/Reclutador/empresa.jsx';
import Reportesmios from './pages/Reclutador/reportesmios.jsx';
import VacanteDetalleReclutador from './pages/Reclutador/VacanteDetalleReclutador.jsx';


// ── Postulante ───────────────────────────────────────────────
import PostulanteDashboard from './pages/Postulante/Postulantedashboard.jsx';
import Formulario          from './pages/Postulante/formulario.jsx';
import Certificaciones from './pages/Postulante/certificaciones.jsx';
import VacantesPos from "./pages/Postulante/vacantes.jsx";
import Mispostulaciones from "./pages/Postulante/mispostulaciones.jsx";
import Misreportes from "./pages/Postulante/misreportes.jsx";
import EdicionPerfil from "./pages/Postulante/EdicionPerfil.jsx"
import ChatBubble from './components/ChatBot.jsx';
import { useSesion } from './hooks/Sesion/useSesion.js';
import { rutaPorRol } from './hooks/Sesion/apiSesion.js';
import { useFormularioPostulante } from './hooks/Postulante/useDomain.js';

function LoadingSesion() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#020617',
      color: '#cbd5e1',
      fontFamily: 'system-ui, sans-serif',
    }}>
      Validando sesion...
    </div>
  );
}

function PublicOnlyRoute({ children }) {
  const { user, auth, loading } = useSesion();

  if (loading) {
    return <LoadingSesion />;
  }

  if (auth && user) {
    return <Navigate to={rutaPorRol(user)} replace />;
  }

  return children;
}

function ProtectedPortalLayout({ allowedRoles }) {
  const location = useLocation();
  const { loading, allowed } = useSesion({ allowedRoles, required: true });

  if (loading) {
    return <LoadingSesion />;
  }

  if (!allowed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function PostulanteFormularioGate() {
  const { obtenerEstadoFormulario } = useFormularioPostulante();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [requiereFormulario, setRequiereFormulario] = useState(false);

  useEffect(() => {
    let activo = true;

    const consultarFormulario = async () => {
      setChecking(true);

      try {
        const data = await obtenerEstadoFormulario();

        if (!activo) return;

        if (!data.httpOk || data.success === false) {
          setRequiereFormulario(false);
          return;
        }

        setRequiereFormulario(Boolean(data.requiere_formulario || !data.completado));
      } catch {
        if (activo) {
          setRequiereFormulario(false);
        }
      } finally {
        if (activo) {
          setChecking(false);
        }
      }
    };

    consultarFormulario();

    return () => {
      activo = false;
    };
  }, [location.pathname, obtenerEstadoFormulario]);

  if (checking) {
    return <LoadingSesion />;
  }

  if (requiereFormulario && location.pathname !== '/formulario') {
    return <Navigate to="/formulario" replace state={{ from: location }} />;
  }

  if (!requiereFormulario && location.pathname === '/formulario') {
    return <Navigate to="/postulante" replace />;
  }

  return <Outlet />;
}
function PostulanteChatLayout() {
  return (
    <>
      <Outlet />
      <ChatBubble />
    </>
  );
}

function App() {
  return (
    <Routes>

      {/* ── Públicas ── */}
      <Route path="/" element={<PublicOnlyRoute><Home /></PublicOnlyRoute>} />
      <Route path="/login-admin" element={<PublicOnlyRoute><LoginAdmin /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path='/registro' element={<Registro/>}/>
      <Route path="/verificacion" element={<Verificacion />} />

      {/* ================================================================
          ADMIN 
          ================================================================ */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index                 element={<Dashboard />} />
        <Route path="empresas"       element={<Empresas />} />
        <Route path="empresas/:id"   element={<EmpresaDetalle />} />
        <Route path="usuarios"       element={<Usuarios />} />
        <Route path="usuarios/:id"   element={<UsuarioPerfil />} />
        <Route path="vacantes"       element={<Vacantes />} />
        <Route path="vacantes/:id"   element={<VacanteDetalle />} />
        <Route path="postulaciones"  element={<Postulaciones />} />
        <Route path="postulaciones/:id" element={<PostulacionDetalle />} />
        <Route path="discapacidades" element={<Discapacidades />} />
        <Route path="reportes"       element={<Reportes />} />
        {/* <Route path="configuracion" element={<Configuracion />} /> */}
      </Route>

      {/* ================================================================
          RECLUTADOR 
          ================================================================ */}
      <Route element={<ProtectedPortalLayout allowedRoles={['reclutador']} />}>
      <Route path="/reclutador" element={<ReclutadorDashboard />} />
      <Route path="/reclutador/reportes" element={<Reportesmios />} />
      <Route path="/reclutador/vacantes/nueva" element={<VacantesReclutador />} /> 
      <Route path="/reclutador/vacantes" element={<VacantesReclutador />} /> {}
      <Route path="/reclutador/candidatos" element={<Candidatos />} />
      <Route path="/reclutador/perfil" element={<Perfil />} />
      <Route path="/reclutador/empresa" element={<Empresa />} />
      <Route path="/reclutador/vacantes/:id" element={<VacanteDetalleReclutador />} />
      </Route>

      {/* <Route path="/reclutador/empresa"      element={<ReclutadorEmpresa />} /> */}
  

      {/* ================================================================
          POSTULANTE  
          ================================================================ */}
      <Route element={<ProtectedPortalLayout allowedRoles={['postulante']} />}>
        <Route element={<PostulanteFormularioGate />}>
          <Route path="/formulario" element={<Formulario />} />
          <Route element={<PostulanteChatLayout />}>
            <Route path="/postulante" element={<PostulanteDashboard />} />
            <Route path="/postulante/certificaciones" element={<Certificaciones />} />
            <Route path="/postulante/vacantes" element={<VacantesPos />} />
            <Route path="/postulante/postulaciones" element={<Mispostulaciones />} />
            <Route path="/postulante/reportes" element={<Misreportes />} />
            <Route path="/postulante/perfil" element={<EdicionPerfil />} />
          </Route>

        </Route>
      </Route>
      {/* <Route path="/postulante/vacantes"        element={<PostulanteVacantes />} /> */}
    


    </Routes>


  );
}

export default App;
