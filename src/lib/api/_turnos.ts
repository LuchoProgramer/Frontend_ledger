import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function TurnosMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async getTurnos() {
      return this.request<any>('/api/turnos/');
    }

    async getTurnosHistorico(params: any = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          q.append(key, params[key].toString());
        }
      });
      return this.request<any>(`/api/turnos/?${q.toString()}`);
    }

    async abrirTurno(sucursalId: number, montoInicial: number = 0) {
      return this.request<any>('/api/turnos/abrir/', {
        method: 'POST', body: JSON.stringify({ sucursal_id: sucursalId, monto_inicial: montoInicial }),
      });
    }

    async cerrarTurno(datos: {
      efectivo_total: number; tarjeta_total: number;
      transferencia_total: number; salidas_caja: number;
      efectivo_a_dejar?: number;
    }) {
      return this.request<any>('/api/turnos/cerrar/', { method: 'POST', body: JSON.stringify(datos) });
    }

    async verificarTurno() {
      return this.request<any>('/api/turnos/verificar/');
    }

    async getTurnoCierre(id: number) {
      return this.request<{
        turno: {
          id: number; usuario_nombre: string; sucursal_nombre: string;
          inicio_turno: string; fin_turno: string | null;
          total_ventas: string; total_efectivo: string;
          otros_metodos_pago: string; estado: string;
        };
        cierre: {
          efectivo_declarado: string; tarjeta_declarada: string;
          transferencia_declarada: string; salidas_caja: string;
          efectivo_sistema: string; tarjeta_sistema: string;
          transferencia_sistema: string; diferencia_total: string; fecha_cierre: string;
        } | null;
        resumen: { total_transacciones: number; ticket_promedio: string; total_sistema: string };
        facturas: {
          id: number; numero_autorizacion: string; total_con_impuestos: string;
          metodo_pago: string; fecha: string; cliente: string; estado: string; es_interno: boolean;
        }[];
      }>(`/api/turnos/${id}/cierre/`);
    }
  };
}
