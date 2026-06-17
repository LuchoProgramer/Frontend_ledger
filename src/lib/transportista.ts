// Espejo de facturacion/utils/transportista.py (Tabla 6 SRI v2.32).
// El backend es la autoridad final; esto da validación inmediata en el form.
export interface ResultadoTransportista {
  valido: boolean;
  normalizado?: string;
  mensaje?: string;
}

const MENSAJE =
  'La identificación del transportista debe ser RUC (13 dígitos), cédula (10 dígitos) o consumidor final (9999999999999).';

export function validarTransportista(identificacion: string): ResultadoTransportista {
  const ident = (identificacion ?? '').trim();
  if (ident === '9999999999' || ident === '9999999999999') {
    return { valido: true, normalizado: '9999999999999' };
  }
  if (/^\d{13}$/.test(ident)) return { valido: true, normalizado: ident };
  if (/^\d{10}$/.test(ident)) return { valido: true, normalizado: ident };
  return { valido: false, mensaje: MENSAJE };
}
