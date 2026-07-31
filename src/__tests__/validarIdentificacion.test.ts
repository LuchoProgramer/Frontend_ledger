/**
 * Validación de identificación en el POS.
 *
 * El caso que motivó estos tests: el validador rechazaba cédulas con el tercer
 * dígito ≥6 siguiendo el algoritmo clásico, pero **el SRI no aplica esa regla**.
 * El cajero no podía facturarle a un cliente con una cédula perfectamente válida.
 * Verificado end-to-end en el proyecto hermano (2026-06-10): factura con
 * `1762866877` → AUTORIZADA por el SRI.
 */
import { validarIdentificacion } from '@/app/pos/utils/validarIdentificacion';

describe('validarIdentificacion — cédula (05)', () => {
  it('acepta una cédula con tercer dígito ≥6 que el SRI sí autoriza', () => {
    // 1762866877: tercer dígito = 6, dígito verificador módulo 10 correcto.
    expect(validarIdentificacion('05', '1762866877')).toEqual({
      valido: true,
      completo: true,
    });
  });

  it('acepta una cédula clásica (tercer dígito <6)', () => {
    expect(validarIdentificacion('05', '1709271447').valido).toBe(true);
  });

  it('sigue rechazando un dígito verificador incorrecto', () => {
    // Misma cédula con el último dígito cambiado.
    expect(validarIdentificacion('05', '1762866878').valido).toBe(false);
  });

  it('sigue rechazando una provincia inexistente', () => {
    expect(validarIdentificacion('05', '9999999999').valido).toBe(false);
  });

  it('no marca como completa una cédula a medio escribir', () => {
    expect(validarIdentificacion('05', '17628')).toEqual({
      valido: false,
      completo: false,
    });
  });
});

describe('validarIdentificacion — otros tipos', () => {
  it('RUC de persona natural sigue exigiendo cédula válida + 001', () => {
    expect(validarIdentificacion('04', '1709271447001').valido).toBe(true);
    expect(validarIdentificacion('04', '1709271447002').valido).toBe(false);
  });

  it('pasaporte (06) y consumidor final (07) son alfanuméricos libres', () => {
    expect(validarIdentificacion('06', 'AB123456').valido).toBe(true);
    expect(validarIdentificacion('07', '9999999999999').valido).toBe(true);
  });
});
