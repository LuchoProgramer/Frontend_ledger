// ── Tipos públicos ──────────────────────────────────────────────────────────

export interface CartItemInput {
  precio_pvp: string;  // string, NUNCA number — evita float
  cantidad: number;
  tasa_iva: string;    // "0" | "12" | "15" (porcentaje como string)
}

export interface LineaOutput {
  subtotal:   string;
  valor_iva:  string;
  total:      string;
}

export interface TotalesResult {
  subtotal_sin_iva: string;
  total_iva:        string;
  total_con_iva:    string;
  lineas:           LineaOutput[];
}

// ── Fallback JS — mismo algoritmo que Rust, para los ~100ms de carga inicial

export function calcularTotalesJS(items: CartItemInput[]): TotalesResult {
  let subtotalAcum = 0;
  let ivaAcum      = 0;
  let totalAcum    = 0;
  const lineas: LineaOutput[] = [];

  for (const item of items) {
    const pvp  = parseFloat(item.precio_pvp);
    const cant = item.cantidad;
    const tasa = parseFloat(item.tasa_iva);

    const total = Math.round(cant * pvp * 100) / 100;

    let subtotal: number;
    let valorIva: number;

    if (tasa > 0) {
      const factor  = 1 + tasa / 100;
      const sub6    = Math.round((total / factor) * 1_000_000) / 1_000_000;
      const iva6    = Math.round((total - sub6) * 1_000_000) / 1_000_000;
      const sub2    = Math.round(sub6 * 100) / 100;
      const iva2    = Math.round(iva6 * 100) / 100;
      subtotal  = sub2;
      valorIva  = (Math.round((sub2 + iva2) * 100) / 100) !== total ? total - sub2 : iva2;
    } else {
      subtotal = total;
      valorIva = 0;
    }

    subtotalAcum += subtotal;
    ivaAcum      += valorIva;
    totalAcum    += total;

    lineas.push({
      subtotal:  subtotal.toFixed(2),
      valor_iva: valorIva.toFixed(2),
      total:     total.toFixed(2),
    });
  }

  return {
    subtotal_sin_iva: subtotalAcum.toFixed(2),
    total_iva:        ivaAcum.toFixed(2),
    total_con_iva:    totalAcum.toFixed(2),
    lineas,
  };
}

// ── Singleton WASM ──────────────────────────────────────────────────────────

class SriCalculator {
  private calcFn: ((json: string) => string) | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.calcFn) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Dynamic import del glue generado por wasm-pack
        const mod = await import('./calculos_sri_wasm.js') as {
          default: (wasmPath: string) => Promise<any>;
          calcular_carrito: (json: string) => string;
        };
        await mod.default('/calculos_sri_wasm_bg.wasm');
        this.calcFn = mod.calcular_carrito;
      } catch (e) {
        console.warn('[SriCalculator] WASM no disponible, usando fallback JS:', e);
      }
    })();

    return this.initPromise;
  }

  calcularCarrito(items: CartItemInput[]): TotalesResult {
    if (this.calcFn) {
      try {
        return JSON.parse(this.calcFn(JSON.stringify({ items }))) as TotalesResult;
      } catch {
        // Si el WASM falla en runtime, fallback transparente
      }
    }
    return calcularTotalesJS(items);
  }
}

export const sriCalculator = new SriCalculator();
