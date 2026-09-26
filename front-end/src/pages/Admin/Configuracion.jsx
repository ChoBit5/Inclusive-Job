import { Globe, Bell, Shield, Database } from 'lucide-react';
import { PageHeader, Button } from '../../components/Admin/UI';
function ConfigSection({
  icon: Icon,
  title,
  description,
  children
}) {
  return <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-white font-semibold">{title}</h2>
          <p className="text-slate-400 text-xs">{description}</p>
        </div>
      </div>
      {children}
    </section>;
}
function Toggle({
  label,
  description,
  defaultChecked = false
}) {
  return <div className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-slate-400 text-xs mt-0.5">{description}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer" aria-label={label}>
        <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
        <div className="w-10 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
      </label>
    </div>;
}
export default function Configuracion() {
  return <div className="space-y-6">
      <PageHeader title="Configuración" description="Ajusta los parámetros generales de la plataforma" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConfigSection icon={Globe} title="General" description="Configuración general de la plataforma">
          <div className="space-y-1">
            <Toggle label="Modo mantenimiento" description="Desactiva el acceso público a la plataforma" />
            <Toggle label="Registro abierto" description="Permite el registro de nuevos usuarios" defaultChecked />
            <Toggle label="Publicación automática" description="Aprobar vacantes sin revisión manual" />
          </div>
        </ConfigSection>

        <ConfigSection icon={Bell} title="Notificaciones" description="Gestiona las alertas del sistema">
          <div className="space-y-1">
            <Toggle label="Alertas de nuevos reportes" defaultChecked />
            <Toggle label="Notificación de empresas pendientes" defaultChecked />
            <Toggle label="Resumen diario por correo" />
            <Toggle label="Alertas de actividad inusual" defaultChecked />
          </div>
        </ConfigSection>

        <ConfigSection icon={Shield} title="Seguridad" description="Políticas de acceso y autenticación">
          <div className="space-y-1">
            <Toggle label="Autenticación de dos factores" />
            <Toggle label="Bloqueo por intentos fallidos" defaultChecked />
            <Toggle label="Expiración de sesión (30 min)" defaultChecked />
          </div>
        </ConfigSection>

        <ConfigSection icon={Database} title="Datos" description="Gestión y respaldo de información">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-white text-sm font-medium">Exportar datos</p>
                <p className="text-slate-400 text-xs">Descarga un reporte completo en CSV</p>
              </div>
              <Button variant="secondary" size="sm">Exportar</Button>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-slate-700/30">
              <div>
                <p className="text-white text-sm font-medium">Respaldar base de datos</p>
                <p className="text-slate-400 text-xs">Último respaldo: hace 2 horas</p>
              </div>
              <Button variant="secondary" size="sm">Respaldar</Button>
            </div>
          </div>
        </ConfigSection>
      </div>

      <div className="flex justify-end">
        <Button variant="primary">Guardar cambios</Button>
      </div>
    </div>;
}
