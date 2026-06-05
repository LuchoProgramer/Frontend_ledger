import { savePrintData, loadRecibo, loadComanda } from '@/app/pos/lib/printStore';

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    _map: m,
  };
}

describe('printStore', () => {
  it('guarda y recupera el recibo y la comanda de la misma venta', () => {
    const s = memStorage();
    savePrintData('uuid-1', { total: 6 }, { numero: 'A', total: 6 }, s);
    expect(loadRecibo('uuid-1', s)).toEqual({ total: 6 });
    expect(loadComanda('uuid-1', s)).toEqual({ numero: 'A', total: 6 });
  });

  it('NO cruza datos entre ventas distintas', () => {
    const s = memStorage();
    savePrintData('uuid-cervezas', { total: 6 }, { total: 6 }, s);
    savePrintData('uuid-combo', { total: 11.99 }, { total: 11.99 }, s);
    // pedir la venta vieja devuelve SUS datos, no los de la nueva
    expect(loadRecibo('uuid-cervezas', s)).toEqual({ total: 6 });
    expect(loadComanda('uuid-cervezas', s)).toEqual({ total: 6 });
  });

  it('devuelve null para un id desconocido', () => {
    const s = memStorage();
    expect(loadRecibo('no-existe', s)).toBeNull();
  });

  it('devuelve null si el JSON está corrupto', () => {
    const s = memStorage();
    s.setItem('posRecibo:rota', '{no-json');
    expect(loadRecibo('rota', s)).toBeNull();
  });

  it('poda: conserva solo las últimas 15 ventas', () => {
    const s = memStorage();
    for (let i = 0; i < 17; i++) {
      savePrintData('v' + i, { n: i }, { n: i }, s);
    }
    // las 2 más viejas (v0, v1) deben haberse eliminado
    expect(loadRecibo('v0', s)).toBeNull();
    expect(loadRecibo('v1', s)).toBeNull();
    // la más reciente y la 15ª más reciente siguen
    expect(loadRecibo('v16', s)).toEqual({ n: 16 });
    expect(loadRecibo('v2', s)).toEqual({ n: 2 });
  });
});
