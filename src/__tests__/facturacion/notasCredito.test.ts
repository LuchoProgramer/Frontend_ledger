// La pantalla de Notas de Crédito lee DOS fuentes distintas:
//   - NC electrónicas  → modelo NotaCredito     (GET /api/notas-credito/)
//   - notas internas   → Factura tipo 04        (GET /api/ventas/facturas/?tipo_comprobante=04)
// Hasta 2026-07-28 solo leía la segunda, así que la primera NC electrónica real
// de la plataforma (001-002-000000001, AUT) no aparecía en ninguna pantalla.
import {
    normalizarElectronica,
    normalizarInterna,
    combinarNotas,
    formatearFecha,
} from '@/app/facturacion/notas-credito/_notasCredito';

const NC_ELECTRONICA = {
    id: 3,
    numero_autorizacion: '001-002-000000001',
    clave_acceso: '2807202604172569756700120010020000000011040704310',
    estado_sri: 'AUT',
    fecha_emision: '2026-07-28',
    total_con_impuestos: '1150.000000',
    cliente_nombre: 'ECUAEMPAQUES S.A.',
};

const NOTA_INTERNA = {
    id: 45,
    numero_autorizacion: 'NI-45',
    fecha_emision: '2026-07-27T17:40:45Z',
    total_con_impuestos: '230.00',
    cliente_nombre: 'Consumidor Final',
    estado: 'AUTORIZADA',
};

describe('normalizarElectronica', () => {
    it('marca la fila como electrónica y conserva el estado SRI', () => {
        const fila = normalizarElectronica(NC_ELECTRONICA);
        expect(fila.origen).toBe('ELECTRONICA');
        expect(fila.numero).toBe('001-002-000000001');
        expect(fila.cliente).toBe('ECUAEMPAQUES S.A.');
        expect(fila.total).toBe(1150);
        expect(fila.estadoSri).toBe('AUT');
    });

    it('usa una key única por origen: los ids se repiten entre las dos tablas', () => {
        const electronica = normalizarElectronica({ ...NC_ELECTRONICA, id: 7 });
        const interna = normalizarInterna({ ...NOTA_INTERNA, id: 7 });
        expect(electronica.key).not.toBe(interna.key);
    });
});

describe('normalizarInterna', () => {
    it('no inventa estado SRI: la nota interna nunca se envió', () => {
        const fila = normalizarInterna(NOTA_INTERNA);
        expect(fila.origen).toBe('INTERNA');
        expect(fila.estadoSri).toBeNull();
        expect(fila.numero).toBe('NI-45');
    });

    it('tolera cliente ausente', () => {
        const fila = normalizarInterna({ ...NOTA_INTERNA, cliente_nombre: undefined });
        expect(fila.cliente).toBe('—');
    });
});

describe('combinarNotas', () => {
    it('junta ambas fuentes ordenadas por fecha, más reciente primero', () => {
        const filas = combinarNotas([NC_ELECTRONICA], [NOTA_INTERNA]);
        expect(filas.map((f) => f.numero)).toEqual(['001-002-000000001', 'NI-45']);
    });

    it('funciona con cualquiera de las dos fuentes vacía', () => {
        expect(combinarNotas([], [NOTA_INTERNA])).toHaveLength(1);
        expect(combinarNotas([NC_ELECTRONICA], [])).toHaveLength(1);
        expect(combinarNotas([], [])).toEqual([]);
    });

    it('no descarta filas con ids repetidos entre fuentes', () => {
        const filas = combinarNotas(
            [{ ...NC_ELECTRONICA, id: 1 }],
            [{ ...NOTA_INTERNA, id: 1 }],
        );
        expect(filas).toHaveLength(2);
        expect(new Set(filas.map((f) => f.key)).size).toBe(2);
    });
});

describe('formatearFecha', () => {
    // `NotaCredito.fecha_emision` es DateField → llega como '2026-07-28'.
    // new Date() lo interpreta como medianoche UTC, y en Ecuador (UTC-5) eso
    // renderiza el día ANTERIOR: la NC emitida el 28 se veía como 27.
    it('una fecha sin hora se muestra tal cual, sin correrse un día', () => {
        expect(formatearFecha('2026-07-28')).toBe(
            new Date(2026, 6, 28).toLocaleDateString(),
        );
    });

    it('un timestamp con zona sí se convierte a hora local', () => {
        // Las notas internas vienen de un DateTimeField: acá convertir es lo
        // correcto, no el bug.
        expect(formatearFecha('2026-07-29T02:30:00Z')).toBe(
            new Date('2026-07-29T02:30:00Z').toLocaleDateString(),
        );
    });

    it('no revienta con fecha vacía', () => {
        expect(formatearFecha('')).toBe('—');
    });
});
