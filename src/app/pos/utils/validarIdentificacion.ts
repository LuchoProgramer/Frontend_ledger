function validarCedula(cedula: string): boolean {
  if (cedula.length !== 10) return false;
  const provincia = parseInt(cedula.substring(0, 2), 10);
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;
  if (parseInt(cedula[2], 10) >= 6) return false;
  const coefs = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let v = parseInt(cedula[i], 10) * coefs[i];
    if (v >= 10) v -= 9;
    suma += v;
  }
  const dig = suma % 10 === 0 ? 0 : 10 - (suma % 10);
  return dig === parseInt(cedula[9], 10);
}

function validarRuc(ruc: string): boolean {
  if (ruc.length !== 13) return false;
  const tercero = parseInt(ruc[2], 10);
  if (tercero < 6) {
    return validarCedula(ruc.substring(0, 10)) && ruc.substring(10) === '001';
  }
  if (tercero === 6) {
    // Empresa pública: módulo 11, verificador en pos 8
    const coefs = [3, 2, 7, 6, 5, 4, 3, 2];
    const suma = coefs.reduce((acc, c, i) => acc + parseInt(ruc[i], 10) * c, 0);
    const r = suma % 11;
    const dig = r === 0 ? 0 : r === 1 ? 1 : 11 - r;
    return dig === parseInt(ruc[8], 10);
  }
  if (tercero === 9) {
    // Empresa privada: módulo 11, verificador en pos 9
    const coefs = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    const suma = coefs.reduce((acc, c, i) => acc + parseInt(ruc[i], 10) * c, 0);
    const r = suma % 11;
    const dig = r === 0 ? 0 : r === 1 ? 1 : 11 - r;
    return dig === parseInt(ruc[9], 10);
  }
  return false;
}

export function validarIdentificacion(
  tipo: string,
  id: string
): { valido: boolean; completo: boolean } {
  if (tipo === '06' || tipo === '07') return { valido: true, completo: id.length > 0 };
  const digits = id.replace(/\D/g, '');
  if (tipo === '05') {
    if (digits.length < 10) return { valido: false, completo: false };
    return { valido: validarCedula(digits), completo: true };
  }
  if (tipo === '04') {
    if (digits.length < 13) return { valido: false, completo: false };
    return { valido: validarRuc(digits), completo: true };
  }
  return { valido: true, completo: true };
}
