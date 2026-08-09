export interface Cliente {
  id: number;
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  saldo_pendiente: string;
  limite_credito: string | null;
}

export interface ClienteFormData {
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  direccion: string;
  telefono: string;
  email: string;
}

export interface MovimientoCuenta {
  id: number;
  tipo: 'CARGO' | 'ABONO';
  monto: string;
  factura_id: number | null;
  metodo_pago: string | null;
  created_at: string;
}

export interface ClientesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Cliente[];
}
