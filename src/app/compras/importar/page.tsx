'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { useImportCompra } from '@/lib/hooks/useImportCompra';
import ImportClaveStep from './ImportClaveStep';
import ImportMapeoTable from './ImportMapeoTable';
import CrearProductoInline from './CrearProductoInline';

export default function ImportarCompraPage() {
  const router = useRouter();
  const apiClient = getApiClient();

  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [impuestos, setImpuestos] = useState<any[]>([]);
  const [codigoCreandoNuevo, setCodigoCreandoNuevo] = useState<string | null>(null);

  const {
    paso, lineas, error, buscando, confirmando, compraCreadaId,
    puedeConfirmar, totalResuelto, totalXML,
    buscar, actualizarLinea, confirmar,
  } = useImportCompra();

  useEffect(() => {
    (async () => {
      const [sucRes, catRes, impRes] = await Promise.all([
        apiClient.getSucursalesList({ page_size: 100 }),
        apiClient.getCategorias?.() ?? Promise.resolve({ data: [] }),
        apiClient.getImpuestos?.() ?? Promise.resolve({ data: [] }),
      ]);
      setSucursales(sucRes.results || []);
      setCategorias((catRes as any).data || (Array.isArray(catRes) ? catRes : []));
      setImpuestos((impRes as any).data || (Array.isArray(impRes) ? impRes : []));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            buscando={buscando}
            error={error}
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
