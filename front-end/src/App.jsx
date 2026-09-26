
import { Outlet, Routes, Route } from 'react-router-dom';

// ── Páginas públicas ─────────────────────────────────────────
import Home        from './pages/Home.jsx';
import LoginAdmin  from './pages/Admin/LoginAdmin.jsx';
import Vista from './pages/Reclutador/vista.jsx';
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
      <Route path="/" element={<Home />} />
      <Route path="/login-admin" element={<LoginAdmin />} />
      <Route path="/login" element={<Login />} />
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
      <Route element={<Outlet />}>
        <Route path="/Vista" element={<Vista />} />
      <Route path="/reclutador" element={<ReclutadorDashboard />} />
      <Route path="/reclutador/reportes" element={<Reportesmios />} />
      <Route path="/reclutador/vacantes/nueva" element={<VacantesReclutador />} /> 
      <Route path="/reclutador/vacantes" element={<VacantesReclutador />} /> {}
      <Route path="/reclutador/candidatos" element={<Candidatos />} />
      <Route path="/reclutador/perfil" element={<Perfil />} />
      <Route path="/reclutador/empresa" element={<Empresa />} />
      <Route path="/reclutador/Candidatos" element={<Candidatos />} />
      <Route path="/reclutador/Empresa" element={<Empresa />} />
      <Route path="/reclutador/vacantes/:id" element={<VacanteDetalleReclutador />} />
      </Route>

      {/* <Route path="/reclutador/empresa"      element={<ReclutadorEmpresa />} /> */}
  

      {/* ================================================================
          POSTULANTE  
          ================================================================ */}
      <Route element={<Outlet />}>
        <Route element={<Outlet />}>
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
