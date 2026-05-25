/**
 * Regression tests — Frontend POS
 *
 * Bug 8 (frontend): getPresentaciones() se llamaba sin sucursal_id,
 *   devolviendo precios de TODAS las sucursales mezclados.
 *   Caso real: cajero de sucursal B veía precio $0.05 (de A) en vez de $0.30.
 *   Fix: getPresentaciones(productoId, turno?.sucursal) — pasa la sucursal del turno.
 *
 * Estrategia: análisis estático. Más fiable que RTL para detectar
 * si un argumento está siendo omitido en una llamada a función.
 */
import fs from 'fs'
import path from 'path'

describe('Bug 8 — getPresentaciones pasa sucursal_id al API', () => {
  const posFilePath = path.resolve(process.cwd(), 'src/app/pos/hooks/usePOSCart.ts')
  const apiFilePath = path.resolve(process.cwd(), 'src/lib/api/_productos.ts')

  let posSource: string
  let apiSource: string

  beforeAll(() => {
    expect(fs.existsSync(posFilePath)).toBe(true)
    expect(fs.existsSync(apiFilePath)).toBe(true)
    posSource = fs.readFileSync(posFilePath, 'utf-8')
    apiSource = fs.readFileSync(apiFilePath, 'utf-8')
  })

  test('test_bug_8_api_get_presentaciones_acepta_parametro_sucursal_id', () => {
    /**
     * Previene: si alguien elimina el parámetro sucursalId de getPresentaciones()
     * en api.ts, el filtrado desaparece silenciosamente — la API recibe el request
     * sin ?sucursal_id= y devuelve precios de todas las sucursales.
     */
    expect(apiSource).toContain('sucursalId')
  })

  test('test_bug_8_api_incluye_sucursal_id_en_la_query_string', () => {
    /**
     * Previene: tener el parámetro pero no usarlo en la URL construida.
     * La URL debe incluir ?sucursal_id= cuando sucursalId está presente.
     */
    expect(apiSource).toContain('sucursal_id=${sucursalId}')
  })

  test('test_bug_8_pos_llama_get_presentaciones_con_sucursal_del_turno', () => {
    /**
     * Previene: llamar getPresentaciones(producto.id) sin el segundo argumento.
     * El POS debe pasar el ID de la sucursal del turno activo.
     * Regex busca getPresentaciones con dos argumentos donde el segundo
     * es sucursalId.
     */
    const patronConSucursal = /getPresentaciones\([^,)]+,\s*sucursalId/g
    const matches = posSource.match(patronConSucursal)

    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(1)
  })

  test('test_bug_8_no_existen_llamadas_a_get_presentaciones_sin_sucursal', () => {
    /**
     * Previene: una llamada sin sucursal que haya quedado sin actualizar.
     * Busca getPresentaciones con un solo argumento en líneas no comentadas.
     * Si existe, ese path de código mostraría precios incorrectos al cajero.
     */
    const lineas = posSource
      .split('\n')
      .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'))

    const lineasConBug = lineas.filter(l =>
      /getPresentaciones\(\s*[\w.?[\]]+\s*\)/.test(l)
    )

    expect(lineasConBug).toHaveLength(0)
  })
})

// Correr solo este archivo:
// cd /Users/luisviteri/Proyectos/Inventario/ledgerxpertz-frontend
// npx jest src/__tests__/pos.test.tsx --no-coverage
