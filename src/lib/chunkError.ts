// Detección de errores de carga de chunk (version skew tras deploy) y
// auto-recuperación con guard anti-loop. Lógica pura y testeable: el
// componente global-error inyecta storage/now/reload reales.

const CHUNK_MESSAGE_PATTERNS = [
  /loading chunk [\w-]+ failed/i,
  /loading css chunk/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i, // Safari
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: unknown }).name;
  if (name === 'ChunkLoadError') return true;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string') return false;
  return CHUNK_MESSAGE_PATTERNS.some((re) => re.test(message));
}

export const CHUNK_RELOAD_KEY = 'lx_chunk_reload_at';
export const RELOAD_GUARD_MS = 10_000; // no auto-recargar 2 veces en <10s

interface ReloadDeps {
  storage: Storage;
  now: number;
  reload: () => void;
}

/**
 * Si `error` es un ChunkLoadError y no recargamos dentro de la ventana de
 * guarda, registra el timestamp y recarga. Devuelve si recargó.
 * Si el storage falla (modo privado), recarga igual (preferimos recuperarnos).
 */
export function maybeReloadOnChunkError(error: unknown, deps: ReloadDeps): boolean {
  if (!isChunkLoadError(error)) return false;

  let last: number | null = null;
  try {
    const raw = deps.storage.getItem(CHUNK_RELOAD_KEY);
    last = raw === null ? null : Number(raw);
  } catch {
    last = null; // storage inaccesible → tratamos como si no hubiéramos recargado
  }

  if (last !== null && !Number.isNaN(last) && deps.now - last < RELOAD_GUARD_MS) {
    return false; // ya recargamos hace poco → no loopear
  }

  try {
    deps.storage.setItem(CHUNK_RELOAD_KEY, String(deps.now));
  } catch {
    // ignorar: igual recargamos
  }
  deps.reload();
  return true;
}
