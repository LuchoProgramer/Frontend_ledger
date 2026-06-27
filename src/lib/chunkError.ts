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
