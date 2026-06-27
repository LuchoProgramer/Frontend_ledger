import {
  isChunkLoadError,
  maybeReloadOnChunkError,
  RELOAD_GUARD_MS,
  CHUNK_RELOAD_KEY,
} from '@/lib/chunkError';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
    _data: data,
  } as unknown as Storage & { _data: Record<string, string> };
}

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

describe('maybeReloadOnChunkError', () => {
  it('recarga ante chunk error si no hubo reload reciente', () => {
    const storage = fakeStorage();
    const reload = jest.fn();
    const chunkErr = new Error('Loading chunk 1 failed.');
    const did = maybeReloadOnChunkError(chunkErr, { storage, now: 1_000_000, reload });
    expect(did).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem(CHUNK_RELOAD_KEY)).toBe('1000000');
  });

  it('NO recarga si ya recargó dentro de la ventana de guarda (anti-loop)', () => {
    const storage = fakeStorage({ [CHUNK_RELOAD_KEY]: String(1_000_000) });
    const reload = jest.fn();
    const chunkErr = new Error('Loading chunk 1 failed.');
    const did = maybeReloadOnChunkError(chunkErr, {
      storage,
      now: 1_000_000 + RELOAD_GUARD_MS - 1,
      reload,
    });
    expect(did).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('vuelve a recargar si pasó la ventana de guarda', () => {
    const storage = fakeStorage({ [CHUNK_RELOAD_KEY]: String(1_000_000) });
    const reload = jest.fn();
    const did = maybeReloadOnChunkError(new Error('Loading chunk 1 failed.'), {
      storage,
      now: 1_000_000 + RELOAD_GUARD_MS + 1,
      reload,
    });
    expect(did).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('NO recarga ante un error que no es de chunk', () => {
    const reload = jest.fn();
    const did = maybeReloadOnChunkError(new Error('boom'), {
      storage: fakeStorage(),
      now: 1,
      reload,
    });
    expect(did).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('no explota si storage lanza (modo privado)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    const reload = jest.fn();
    const did = maybeReloadOnChunkError(new Error('Loading chunk 1 failed.'), {
      storage: throwing,
      now: 1,
      reload,
    });
    expect(did).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
