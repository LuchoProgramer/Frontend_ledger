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
