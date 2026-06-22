import type {
  PlanCuenta,
  PlanCuentasResponse,
  CreatePlanCuentaPayload,
} from '../types/contabilidad';
import type { AuditoriaDetailResponse } from '../types/inventario';
import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function ContabilidadMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    // ── Contabilidad ──────────────────────────────────────────────────────────

    async getAsientos(params?: {
      page?: number; search?: string; start_date?: string; end_date?: string;
    }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.search) q.append('search', params.search);
      if (params?.start_date) q.append('start_date', params.start_date);
      if (params?.end_date) q.append('end_date', params.end_date);
      return this.request<any>(`/api/contabilidad/asientos/${q.toString() ? `?${q}` : ''}`);
    }

    async getPlanCuentas(params?: { search?: string; page?: number; page_size?: number }) {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      return this.request<PlanCuentasResponse>(`/api/auth/contabilidad/plan-cuentas/${q.toString() ? `?${q}` : ''}`);
    }

    async crearCuentaContable(data: CreatePlanCuentaPayload) {
      return this.request<PlanCuenta>('/api/auth/contabilidad/plan-cuentas/', {
        method: 'POST', body: JSON.stringify(data),
      });
    }

    async actualizarCuentaContable(id: number, data: Partial<CreatePlanCuentaPayload>) {
      return this.request<PlanCuenta>(`/api/auth/contabilidad/plan-cuentas/${id}/`, {
        method: 'PUT', body: JSON.stringify(data),
      });
    }

    async eliminarCuentaContable(id: number) {
      return this.request<any>(`/api/auth/contabilidad/plan-cuentas/${id}/`, { method: 'DELETE' });
    }

    // ── Auditoría de Inventario (conteo físico) ───────────────────────────────

    async getAuditorias(params?: { page?: number; search?: string }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      return this.request<any>(`/api/conteo/auditorias/?${q.toString()}`);
    }

    async getAuditoria(id: number) {
      return this.request<AuditoriaDetailResponse>(`/api/conteo/auditorias/${id}/`);
    }

    async createAuditoria(data: {
      tipo: 'INICIO_TURNO' | 'FIN_TURNO' | 'ALEATORIO';
      productos?: number[]; aleatorio_cantidad?: number; categoria_id?: number;
    }) {
      return this.request<AuditoriaDetailResponse>('/api/conteo/auditorias/', {
        method: 'POST', body: JSON.stringify(data),
      });
    }

    async updateAuditoriaCount(id: number, items: Array<{ id: number; cantidad_fisica: number }>) {
      return this.request<any>(`/api/conteo/auditorias/${id}/registrar_conteo/`, {
        method: 'POST', body: JSON.stringify({ detalles: items }),
      });
    }

    async finalizeAuditoria(id: number) {
      return this.request<AuditoriaDetailResponse>(`/api/conteo/auditorias/${id}/finalizar/`, {
        method: 'POST',
      });
    }

    // Aplica al stock las diferencias de los detalles seleccionados (solo admin).
    async aplicarAjustesAuditoria(id: number, detalleIds: number[]) {
      return this.request<{
        estado: string;
        ajustados: Array<{ id: number; producto: string; diferencia: string }>;
        omitidos: Array<{ id: number; motivo: string }>;
      }>(`/api/conteo/auditorias/${id}/aplicar_ajustes/`, {
        method: 'POST', body: JSON.stringify({ detalle_ids: detalleIds }),
      });
    }
  };
}
