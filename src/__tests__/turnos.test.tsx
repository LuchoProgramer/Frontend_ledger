/**
 * Regression tests — Frontend Turnos
 *
 * Bug 1: facturas.map() usaba <> sin key prop como raíz de cada elemento.
 *        React no puede asignar key a JSXFragment (<>), causando crash de reconciliación.
 *        Fix: <React.Fragment key={f.id}>.
 *
 * Bug 3: getSucursales() devuelve { sucursales: [...] } pero el código hacía
 *        res.results → TypeError "b.map is not a function".
 *        Fix: setSucursales(res.sucursales || []).
 *
 * Estrategia: análisis estático del código fuente (fs.readFileSync).
 * Más confiable que RTL para detectar patrones de código específicos.
 */
import fs from 'fs'
import path from 'path'

// ── Bug 1 — Fragment key en /turnos/[id]/page.tsx ───────────────────────────

describe('Bug 1 — React.Fragment con key en lista de facturas', () => {
  const filePath = path.resolve(process.cwd(), 'src/app/turnos/[id]/page.tsx')
  let source: string

  beforeAll(() => {
    expect(fs.existsSync(filePath)).toBe(true)
    source = fs.readFileSync(filePath, 'utf-8')
  })

  test('test_bug_1_facturas_map_usa_react_fragment_con_key', () => {
    /**
     * Previene: usar <> como raíz de un .map() no soporta key prop.
     * Sin key, React no puede reconciliar la lista y produce warnings/crashes.
     * La corrección es <React.Fragment key={f.id}>.
     */
    expect(source).toContain('React.Fragment key={f.id}')
  })

  test('test_bug_1_no_usa_jsx_fragment_sin_key_como_raiz_de_map', () => {
    /**
     * Previene: el patrón prohibido es que el callback del .map() de facturas
     * retorne <> como primer elemento (sin posibilidad de pasar key).
     * Busca el patrón: facturas.map(callback) seguido de <> en el retorno.
     */
    const lineas = source.split('\n')
    let dentroMapFacturas = false
    let profundidad = 0

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i]
      if (linea.includes('facturas.map(')) {
        dentroMapFacturas = true
        profundidad = 0
      }
      if (dentroMapFacturas) {
        if (linea.includes('(')) profundidad++
        if (linea.includes(')')) profundidad--
        // Busca <> como primer tag después de return o =>
        if (/=>\s*\(\s*$|return\s*\(/.test(linea)) {
          const siguienteLinea = lineas[i + 1]?.trim()
          expect(siguienteLinea).not.toBe('<>')
        }
        if (profundidad <= 0 && linea.includes(')')) dentroMapFacturas = false
      }
    }
  })

  test('test_bug_1_react_esta_importado_para_usar_react_fragment', () => {
    /**
     * Previene: usar React.Fragment sin importar React en el scope del módulo.
     */
    const importaReact =
      source.includes("import React") ||
      source.includes("import * as React")
    expect(importaReact).toBe(true)
  })
})

// ── Bug 3 — Destructuring correcto de getSucursales() ───────────────────────

describe('Bug 3 — setSucursales usa res.sucursales, no res.results', () => {
  const filePath = path.resolve(process.cwd(), 'src/app/turnos/page.tsx')
  let source: string

  beforeAll(() => {
    expect(fs.existsSync(filePath)).toBe(true)
    source = fs.readFileSync(filePath, 'utf-8')
  })

  test('test_bug_3_usa_res_sucursales', () => {
    /**
     * Previene: el endpoint /api/auth/usuarios/sucursales/ devuelve
     * { sucursales: [...] }. Si el código accede a res.results, falla con
     * TypeError porque results es undefined y no tiene .map().
     */
    expect(source).toContain('res.sucursales')
  })

  test('test_bug_3_no_usa_set_sucursales_con_res_results', () => {
    /**
     * Previene el patrón incorrecto: setSucursales(res.results || ...).
     */
    expect(source).not.toMatch(
      /setSucursales\s*\(\s*res\.results/,
    )
  })

  test('test_bug_3_tiene_fallback_array_vacio', () => {
    /**
     * Previene: si la API devuelve una respuesta inesperada (res.sucursales
     * es undefined), el fallback || [] evita el crash en .map().
     */
    expect(source).toContain('res.sucursales || []')
  })
})

// Correr solo este archivo:
// cd /Users/luisviteri/Proyectos/Inventario/ledgerxpertz-frontend
// npx jest src/__tests__/turnos.test.tsx --no-coverage
