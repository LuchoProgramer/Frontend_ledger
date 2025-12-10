/**
 * Tipos TypeScript para la API
 */

export interface Cliente {
  id: number;
  ruc: string;
  razon_social: string;
  direccion: string;
  telefono: string;
  email: string;
}

export interface DetalleFactura {
  id: number;
  producto_nombre: string;
  codigo_principal: string;
  cantidad: string;
  precio_unitario: string;
  descuento: string;
  total: string;
}

export interface Factura {
  id: number;
  numero_autorizacion: string | null;
  clave_acceso: string | null;
  cliente: Cliente;
  fecha_emision: string;
  subtotal: string;
  iva: string;
  total: string;
  estado_sri: string;
  detalles: DetalleFactura[];
  puede_enviar_sri: boolean;
  tiene_xml_firmado: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type FacturaList = PaginatedResponse<Factura>;
export type ClienteList = PaginatedResponse<Cliente>;
