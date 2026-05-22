import type { Factura as FacturaVenta, FacturasResponse } from '../types/ventas';
import type { Factura } from '../types';
import type { RetencionesResponse, CreateRetencionPayload } from '../types/retenciones';
import type { ApiClientBase } from './_base';
import type { ApiError } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function VentasMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    // ── Facturas SRI ──────────────────────────────────────────────────────────

    async getFacturas(params?: { page?: number; estado_sri?: string; search?: string }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.estado_sri) q.append('estado_sri', params.estado_sri);
      if (params?.search) q.append('search', params.search);
      return this.request<FacturasResponse>(`/api/facturas/${q.toString() ? `?${q}` : ''}`);
    }

    async getFactura(id: number) {
      return this.request<Factura>(`/api/facturas/${id}/`);
    }

    async enviarSRI(id: number) {
      console.log('[enviarSRI] INICIO - ID:', id);
      try {
        const result = await this.request<any>(`/api/facturas/${id}/enviar_sri/`, { method: 'POST' });
        console.log('[enviarSRI] EXITO - Resultado:', result);
        return result;
      } catch (error) {
        console.error('[enviarSRI] ERROR:', error);
        throw error;
      }
    }

    async consultarSRI(id: number) {
      return this.request<any>(`/api/facturas/${id}/consultar_sri/`, { method: 'POST' });
    }

    async promocionarFacturaSRI(id: number) {
      return this.request<any>(`/api/facturas/${id}/promocionar_sri/`, { method: 'POST' });
    }

    async descargarXML(id: number): Promise<Blob> {
      const url = `${this.baseURL}/api/facturas/${id}/descargar_xml/`;
      const response = await fetch(url, {
        headers: { 'X-Tenant': this.tenant },
        credentials: 'include',
      });
      if (!response.ok) throw { message: 'Error al descargar XML', status: response.status } as ApiError;
      return response.blob();
    }

    // ── POS / Ventas ──────────────────────────────────────────────────────────

    async crearFacturaPOS(data: any) {
      return this.request<any>('/api/ventas/pos/', { method: 'POST', body: JSON.stringify(data) });
    }

    async getHistorialVentas(params: any = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          q.append(key, params[key].toString());
        }
      });
      q.append('_t', Date.now().toString());
      return this.request<any>(`/api/ventas/facturas/?${q.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    async getFacturacionStats() {
      return this.request<any>('/api/ventas/stats/');
    }

    async descargarFacturaPDF(facturaId: number, numeroAutorizacion?: string) {
      const filename = numeroAutorizacion
        ? `FACTURA-${numeroAutorizacion}.pdf`
        : `factura_${facturaId}.pdf`;
      return this.downloadFile(`/api/ventas/facturas/${facturaId}/pdf/`, filename);
    }

    async crearNotaCredito(data: any) {
      return this.request<any>('/api/ventas/notas-credito/nueva/', {
        method: 'POST', body: JSON.stringify(data),
      });
    }

    // ── Retenciones ───────────────────────────────────────────────────────────

    async getRetenciones(params: any = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) q.append(key, params[key].toString());
      });
      return this.request<RetencionesResponse>(`/api/ventas/retenciones/?${q.toString()}`);
    }

    async crearRetencion(data: CreateRetencionPayload) {
      return this.request<any>('/api/ventas/retenciones/nueva/', { method: 'POST', body: JSON.stringify(data) });
    }
  };
}
