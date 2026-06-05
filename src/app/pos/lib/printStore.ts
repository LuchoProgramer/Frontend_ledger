// Persistencia de tickets de impresión por venta (un id único por venta).
// Evita el "ticket cruzado": cada recibo/comanda lee SU propia venta.

const RECIBO_PREFIX = 'posRecibo:';
const COMANDA_PREFIX = 'posComanda:';
const INDEX_KEY = 'posPrintIndex';
const KEEP = 15;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function readIndex(storage: StorageLike): string[] {
  const raw = storage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function readKey<T>(key: string, storage: StorageLike): T | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function savePrintData(
  ventaId: string,
  recibo: object,
  comanda: object,
  storage: StorageLike = localStorage,
): void {
  storage.setItem(RECIBO_PREFIX + ventaId, JSON.stringify(recibo));
  storage.setItem(COMANDA_PREFIX + ventaId, JSON.stringify(comanda));

  const index = readIndex(storage).filter((id) => id !== ventaId);
  index.push(ventaId);
  while (index.length > KEEP) {
    const old = index.shift()!;
    storage.removeItem(RECIBO_PREFIX + old);
    storage.removeItem(COMANDA_PREFIX + old);
  }
  storage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function loadRecibo<T = unknown>(ventaId: string, storage: StorageLike = localStorage): T | null {
  return readKey<T>(RECIBO_PREFIX + ventaId, storage);
}

export function loadComanda<T = unknown>(ventaId: string, storage: StorageLike = localStorage): T | null {
  return readKey<T>(COMANDA_PREFIX + ventaId, storage);
}
