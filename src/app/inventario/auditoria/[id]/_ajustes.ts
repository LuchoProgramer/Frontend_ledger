// Lógica pura de selección para "Aplicar ajustes" desde una auditoría.
// Una fila puede aplicarse al stock solo si fue contada, tiene diferencia y no
// fue aplicada antes. Espeja el guard del backend (AjusteAuditoriaService).

export interface AuditoriaItem {
  id: number;
  conteo_fisico: number | null;
  diferencia: number | null;
  revisado: boolean;
}

export function esAjustable(item: AuditoriaItem): boolean {
  return (
    item.conteo_fisico !== null &&
    item.conteo_fisico !== undefined &&
    !!item.diferencia && // distinto de 0, null y undefined
    !item.revisado
  );
}

export function idsAjustables(items: AuditoriaItem[]): number[] {
  return items.filter(esAjustable).map((i) => i.id);
}

// Mensajes para mostrar al usuario lo que el backend ya distingue pero la
// pantalla venía descartando en silencio: "no contado" (finalizar()) vs el
// motivo real de cada omisión al aplicar ajustes.

export function mensajeNoContados(noContados: Array<{ id: number; producto: string }>): string {
  if (noContados.length === 0) return '';
  const nombres = noContados.map((d) => d.producto).join(', ');
  const plural = noContados.length !== 1;
  return `⚠️ Quedaron ${noContados.length} producto${plural ? 's' : ''} sin contar: ${nombres}`;
}

export function mensajeOmitidos(omitidos: Array<{ id: number; motivo: string }>): string {
  if (omitidos.length === 0) return '';
  const porMotivo = new Map<string, number>();
  for (const o of omitidos) {
    porMotivo.set(o.motivo, (porMotivo.get(o.motivo) ?? 0) + 1);
  }
  const partes = [...porMotivo.entries()].map(([motivo, count]) => `${count} ${motivo}`);
  return `Omitidos: ${partes.join(', ')}`;
}
