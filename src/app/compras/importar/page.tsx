'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useImportCompra } from '@/lib/hooks/useImportCompra';
import { useComprasCatalogos } from '@/lib/hooks/useComprasCatalogos';
import ImportClaveStep from './ImportClaveStep';
import ImportMapeoTable from './ImportMapeoTable';
import CrearProductoInline from './CrearProductoInline';

export default function ImportarCompraPage() {
  const router = useRouter();

  const [codigoCreandoNuevo, setCodigoCreandoNuevo] = useState<string | null>(null);

  const {
    sucursales, categorias, impuestos, cargando: cargandoCatalogos, error: errorCatalogos,
  } = useComprasCatalogos();

  const {
    paso, lineas, error, buscando, confirmando, compraCreadaId,
    puedeConfirmar, totalResuelto, totalXML,
    buscar, actualizarLinea, confirmar,
  } = useImportCompra();

  useEffect(() => {
    if (compraCreadaId) {
      router.push(`/compras/${compraCreadaId}`);
    }
  }, [compraCreadaId, router]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Importar compra por clave de acceso</h1>

        {paso === 'buscar' && (
          <ImportClaveStep
            sucursales={sucursales}
            cargandoCatalogos={cargandoCatalogos}
            buscando={buscando}
            error={errorCatalogos || error}
            onBuscar={buscar}
          />
        )}

        {paso === 'mapear' && (
          <div className="flex flex-col gap-4">
            {codigoCreandoNuevo && (
              <CrearProductoInline
                categorias={categorias}
                impuestos={impuestos}
                onCancelar={() => setCodigoCreandoNuevo(null)}
                onGuardar={(nuevo) => {
                  actualizarLinea(codigoCreandoNuevo, { accion: 'crear', nuevoProducto: nuevo });
                  setCodigoCreandoNuevo(null);
                }}
              />
            )}
            <ImportMapeoTable
              lineas={lineas}
              totalResuelto={totalResuelto}
              totalXML={totalXML}
              puedeConfirmar={puedeConfirmar}
              confirmando={confirmando}
              onCambiarLinea={actualizarLinea}
              onCrearNuevo={setCodigoCreandoNuevo}
              onConfirmar={confirmar}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
