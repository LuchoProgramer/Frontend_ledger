import { validarTransportista } from '@/lib/transportista';

describe('validarTransportista', () => {
  it('10 nueves → válido, normaliza a 13 nueves', () => {
    expect(validarTransportista('9999999999')).toEqual({ valido: true, normalizado: '9999999999999' });
  });
  it('13 nueves → válido', () => {
    expect(validarTransportista('9999999999999')).toEqual({ valido: true, normalizado: '9999999999999' });
  });
  it('RUC 13 dígitos → válido', () => {
    expect(validarTransportista('1709271447001')).toEqual({ valido: true, normalizado: '1709271447001' });
  });
  it('cédula 10 dígitos → válido', () => {
    expect(validarTransportista('1725697567')).toEqual({ valido: true, normalizado: '1725697567' });
  });
  it('recorta espacios', () => {
    expect(validarTransportista('  1725697567  ')).toEqual({ valido: true, normalizado: '1725697567' });
  });
  it('002 → inválido con mensaje', () => {
    const r = validarTransportista('002');
    expect(r.valido).toBe(false);
    expect(r.mensaje).toMatch(/RUC|cédula|cedula/i);
  });
  it('no numérico → inválido', () => {
    expect(validarTransportista('ABC1234567').valido).toBe(false);
  });
  it('vacío → inválido', () => {
    expect(validarTransportista('').valido).toBe(false);
  });
});
