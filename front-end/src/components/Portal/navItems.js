import { LayoutDashboard, Building2, Briefcase, Users, UserCircle, Flag, Award, Search, BookmarkCheck } from 'lucide-react';
export const reclutadorNav = [{
  to: '/reclutador',
  label: 'Dashboard',
  icon: LayoutDashboard
}, {
  to: '/reclutador/empresa',
  label: 'Mi empresa',
  icon: Building2
}, {
  to: '/Reclutador/Vacantes',
  label: 'Mis vacantes',
  icon: Briefcase
}, {
  to: '/reclutador/candidatos',
  label: 'Candidatos',
  icon: Users
}, {
  to: '/reclutador/reportes',
  label: 'Reportes',
  icon: Flag
}, {
  to: '/reclutador/perfil',
  label: 'Mi perfil',
  icon: UserCircle
}];
export const postulantNav = [{
  to: '/postulante',
  label: 'Inicio',
  icon: LayoutDashboard
}, {
  to: '/postulante/vacantes',
  label: 'Buscar vacantes',
  icon: Search
}, {
  to: '/postulante/postulaciones',
  label: 'Mis postulaciones',
  icon: BookmarkCheck
}, {
  to: '/postulante/certificaciones',
  label: 'Certificaciones',
  icon: Award
}, {
  to: '/postulante/reportes',
  label: 'Reportes',
  icon: Flag
}, {
  to: '/postulante/perfil',
  label: 'Mi perfil',
  icon: UserCircle
}];
