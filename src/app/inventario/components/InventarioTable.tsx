'use client';

import Link from 'next/link';
import type { InventarioItem } from '@/lib/types/inventario';

interface Props {
  inventario: InventarioItem[];
  viewMode: 'detalle' | 'agrupado';
  expandedItems: number[];
  onToggleExpand: (id: number) => void;
}

export default function InventarioTable({ inventario, viewMode, expandedItems, onToggleExpand }: Props) {
  const getDisplayValues = (item: InventarioItem) => ({
    name: item.producto_nombre || (item as any).nombre,
    code: item.producto_codigo || (item as any).codigo_producto,
    stock: viewMode === 'agrupado' ? (item as any).stock_total_global : item.cantidad,
  });

  if (inventario.length === 0) {
    return (
      <p className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
        No se encontraron registros de inventario.
      </p>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Producto', 'Sucursal', 'Stock', 'Actualizado', 'Acciones'].map((h, i) => (
                      <th key={h} scope="col" className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventario.map((item) => {
                    const isGrouped = viewMode === 'agrupado';
                    const { name, code, stock } = getDisplayValues(item);
                    const isExpanded = expandedItems.includes(item.id);
                    return (
                      <>
                        <tr key={item.id} className={isExpanded && isGrouped ? 'bg-gray-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {isGrouped && (item as any).desglose?.length > 0 && (
                                <button onClick={() => onToggleExpand(item.id)} className="mr-2 text-gray-400 hover:text-gray-600">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'} />
                                  </svg>
                                </button>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{name}</div>
                                <div className="text-sm text-gray-500">{code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {isGrouped
                              ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Global ({(item as any).desglose?.length || 0} sucursales)</span>
                              : item.sucursal_nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${Number(stock) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {Number(stock).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.fecha_actualizacion ? new Date(item.fecha_actualizacion).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {!isGrouped && <Link href="/inventario/ajustes" className="text-indigo-600 hover:text-indigo-900 font-medium">Ajustar</Link>}
                          </td>
                        </tr>
                        {isGrouped && isExpanded && (item as any).desglose?.map((sub: any) => (
                          <tr key={`sub-${sub.id}`} className="bg-gray-50">
                            <td className="px-6 py-2 pl-14 whitespace-nowrap">
                              <span className="text-xs text-gray-400">└</span>
                              <span className="ml-1 text-sm text-gray-500">En {sub.sucursal_nombre}</span>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{sub.sucursal_nombre}</td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-700">{Number(sub.cantidad).toFixed(2)}</span>
                            </td>
                            <td colSpan={2} className="px-6 py-2" />
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {inventario.map((item) => {
          const isGrouped = viewMode === 'agrupado';
          const { name, code, stock } = getDisplayValues(item);
          const isExpanded = expandedItems.includes(item.id);
          return (
            <div key={item.id} className="bg-white shadow rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div onClick={() => isGrouped && onToggleExpand(item.id)} className={isGrouped ? 'cursor-pointer' : ''}>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    {name}
                    {isGrouped && <span className="ml-2 text-xs text-blue-600">{isExpanded ? '▲' : '▼'}</span>}
                  </h3>
                  <p className="text-sm font-mono text-gray-500 mt-1">{code}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${Number(stock) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    Stock: {Number(stock).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">{isGrouped ? 'Global' : item.sucursal_nombre}</span>
                </div>
              </div>
              {isGrouped && isExpanded && (
                <div className="mt-3 border-t pt-2 bg-gray-50 rounded p-2">
                  {(item as any).desglose?.map((sub: any) => (
                    <div key={sub.id} className="flex justify-between py-1 text-sm">
                      <span className="text-gray-600">{sub.sucursal_nombre}</span>
                      <span className="font-medium">{Number(sub.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center border-t pt-3 mt-3">
                <span className="text-xs text-gray-500">
                  Act: {item.fecha_actualizacion ? new Date(item.fecha_actualizacion).toLocaleDateString() : '-'}
                </span>
                {!isGrouped && (
                  <Link href="/inventario/ajustes" className="text-indigo-600 font-medium text-sm px-3 py-1 bg-indigo-50 rounded hover:bg-indigo-100">
                    Ajustar Stock
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
