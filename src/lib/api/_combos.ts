import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function CombosMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    // ── POS — búsqueda de combos ──────────────────────────────────────────────

    async buscarCombos(q: string, sucursalId: number) {
      const params = new URLSearchParams({ q, sucursal_id: String(sucursalId) });
      return this.request<Array<{
        type: 'combo'; id: number; nombre: string; precio: number;
        items: { producto_id: number; presentacion_id: number; cantidad: number }[];
        slots: { id: number; nombre: string; cantidad: number; obligatorio: boolean; orden: number }[];
      }>>(`/api/combos/buscar/?${params}`);
    }

    async getComboOpciones(comboId: number, slotId: number, sucursalId: number) {
      const params = new URLSearchParams({ slot_id: String(slotId), sucursal_id: String(sucursalId) });
      return this.request<Array<{ id: number; nombre: string; codigo: string; stock: number }>>(
        `/api/combos/${comboId}/opciones_slot/?${params}`
      );
    }

    // ── Admin — CRUD de combos ────────────────────────────────────────────────

    async getCombos(params?: {
      page?: number; search?: string; sucursal?: number; activo?: boolean; page_size?: number;
    }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      if (params?.search) q.append('search', params.search);
      if (params?.sucursal) q.append('sucursal', params.sucursal.toString());
      if (params?.activo !== undefined) q.append('activo', params.activo.toString());
      return this.request<{
        count: number;
        results: Array<{
          id: number; nombre: string; descripcion: string; precio: string;
          activo: boolean; sucursal: number;
          items: Array<{ id: number; producto: number; producto_nombre: string; presentacion: number; presentacion_nombre: string; cantidad: string }>;
          slots: Array<{ id: number; nombre: string; cantidad: string; obligatorio: boolean; orden: number }>;
          created_at: string; updated_at: string;
        }>;
      }>(`/api/combos/${q.toString() ? `?${q}` : ''}`);
    }

    async getCombo(id: number) {
      return this.request<{
        id: number; nombre: string; descripcion: string; precio: string;
        activo: boolean; sucursal: number;
        items: Array<{ id: number; producto: number; producto_nombre: string; presentacion: number; presentacion_nombre: string; cantidad: string }>;
        slots: Array<{ id: number; nombre: string; cantidad: string; obligatorio: boolean; orden: number }>;
      }>(`/api/combos/${id}/`);
    }

    async crearCombo(data: {
      nombre: string; descripcion?: string; precio: string; sucursal: number; activo: boolean;
      items_write: Array<{ producto: number; presentacion: number; cantidad: string }>;
      slots_write?: Array<{ nombre: string; cantidad: string; obligatorio: boolean; orden: number; categorias: number[]; productos: number[] }>;
    }) {
      return this.request<{ id: number; nombre: string }>('/api/combos/', { method: 'POST', body: JSON.stringify(data) });
    }

    async actualizarCombo(id: number, data: {
      nombre?: string; descripcion?: string; precio?: string; sucursal?: number; activo?: boolean;
      items_write?: Array<{ producto: number; presentacion: number; cantidad: string }>;
      slots_write?: Array<{ nombre: string; cantidad: string; obligatorio: boolean; orden: number; categorias: number[]; productos: number[] }>;
    }) {
      return this.request<{ id: number; nombre: string }>(`/api/combos/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
    }

    async eliminarCombo(id: number) {
      return this.request<void>(`/api/combos/${id}/`, { method: 'DELETE' });
    }
  };
}
