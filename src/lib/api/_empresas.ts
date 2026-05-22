import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function EmpresasMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async registrarEmpresa(data: {
      schema_name: string; nombre_comercial: string; razon_social: string;
      ruc: string; confirmar_ruc: string; direccion: string; telefono: string;
      correo_electronico: string; obligado_contabilidad: boolean;
      tipo_contribuyente: string; representante_legal?: string;
      actividad_economica?: string; acepta_terminos: boolean;
      username: string; password?: string; confirm_password?: string;
    }) {
      return this.request<any>('/api/empresas/registro/', { method: 'POST', body: JSON.stringify(data) });
    }

    async verificarRUC(ruc: string) {
      return this.request<{ valido: boolean; existe: boolean; mensaje: string }>(
        '/api/empresas/verificar-ruc/',
        { method: 'POST', body: JSON.stringify({ ruc }) }
      );
    }

    async getEstadisticasPublicas() {
      return this.request<{
        total_empresas: number;
        features: Array<{ titulo: string; descripcion: string; icono: string }>;
      }>('/api/empresas/estadisticas/');
    }

    async buscarEmpresas(termino: string) {
      return this.request<{
        success: boolean;
        data: {
          empresas: Array<{
            id: number; schema_name: string; nombre_comercial: string;
            razon_social: string; ruc: string; url_tenant: string;
          }>;
          total?: number; mensaje?: string;
        };
        error?: string;
      }>('/api/empresas/buscar/', { method: 'POST', body: JSON.stringify({ termino }) });
    }

    // ── Configuración ─────────────────────────────────────────────────────────

    async getConfiguracion() {
      return this.request<any>('/api/auth/configuracion/');
    }

    async updateConfiguracion(data: any) {
      return this.request<any>('/api/auth/configuracion/', { method: 'PUT', body: JSON.stringify(data) });
    }

    async subirCertificado(formData: FormData) {
      return this.request<any>('/api/auth/configuracion/certificado/', { method: 'POST', body: formData });
    }
  };
}
