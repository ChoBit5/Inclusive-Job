// Lógica pura del dashboard del admin (testeable con node --test).
// La vista importa de aquí sin cambios visuales.

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

// Mismas 9 filas y claves que Dashboard.jsx en origen; los iconos se
// inyectan para no importar react/lucide en los tests.
export function buildKpis(s, loading, icons = {}) {
  return [
    { label: 'Total usuarios', rawValue: s?.total_usuarios, icon: icons.Users, color: 'violet', trend: null, loading },
    { label: 'Postulantes', rawValue: s?.total_postulantes, icon: icons.UserCheck, color: 'blue', loading },
    { label: 'Reclutadores', rawValue: s?.total_reclutadores, icon: icons.UserCog, color: 'cyan', loading },
    { label: 'Empresas', rawValue: s?.total_empresas, icon: icons.Building2, color: 'emerald', loading },
    { label: 'Empresas pendientes', rawValue: s?.empresas_pendientes, icon: icons.AlertTriangle, color: 'amber', loading },
    { label: 'Vacantes activas', rawValue: s?.vacantes_activas, icon: icons.Briefcase, color: 'emerald', loading },
    { label: 'Vacantes cerradas', rawValue: s?.vacantes_cerradas, icon: icons.XCircle, color: 'red', loading },
    { label: 'Postulaciones', rawValue: s?.postulaciones_realizadas, icon: icons.FileText, color: 'violet', loading },
    { label: 'Reportes', rawValue: s?.reportes_recibidos, icon: icons.AlertTriangle, color: 'amber', loading },
  ];
}
