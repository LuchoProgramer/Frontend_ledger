// Validación de cantidades de ajuste de inventario.
// Los ajustes son por unidades enteras: un step decimal en el input permitió
// registrar 6.99/0.99 por un tick accidental del spinner (incidente 2026-07-05).

export function validarCantidadAjuste(
  value: string,
  opts?: { permitirCero?: boolean },
): string | null {
  const qty = parseFloat(value);
  if (isNaN(qty)) return 'Ingresa una cantidad válida.';
  if (qty < 0) return 'La cantidad no puede ser negativa.';
  if (qty === 0 && !opts?.permitirCero) return 'Ingresa una cantidad válida mayor a 0.';
  if (!Number.isInteger(qty)) {
    return `La cantidad debe ser un número entero, sin decimales (recibido: ${value}).`;
  }
  return null;
}
