import { isChunkLoadError } from '@/lib/chunkError';

describe('isChunkLoadError', () => {
  it('detecta por name ChunkLoadError', () => {
    const e = new Error('whatever');
    e.name = 'ChunkLoadError';
    expect(isChunkLoadError(e)).toBe(true);
  });

  it('detecta "Loading chunk N failed"', () => {
    expect(isChunkLoadError(new Error('Loading chunk 537 failed.'))).toBe(true);
  });

  it('detecta "Failed to fetch dynamically imported module"', () => {
    expect(
      isChunkLoadError(
        new Error(
          'Failed to fetch dynamically imported module: https://x/_next/static/chunks/app/page-abc.js'
        )
      )
    ).toBe(true);
  });

  it('detecta el variante de Safari "importing a module script failed"', () => {
    expect(isChunkLoadError(new Error('importing a module script failed.'))).toBe(true);
  });

  it('NO marca errores normales', () => {
    expect(
      isChunkLoadError(new Error("Cannot read properties of undefined (reading 'x')"))
    ).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
