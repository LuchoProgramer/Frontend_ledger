'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

const METODO_PAGO_LABEL: Record<string, string> = {
    '01': 'Efectivo',
    '16': 'Tarjeta débito',
    '19': 'Tarjeta crédito',
    '18': 'Tarjeta prepago',
    '20': 'Transferencia',
    '17': 'Dinero electrónico',
};

function DiffBadge({ diff }: { diff: number }) {
    if (Math.abs(diff) < 0.01) {
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">✓ Cuadra</span>;
    }
    if (diff > 0) {
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">+${diff.toFixed(2)} sobrante</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">-${Math.abs(diff).toFixed(2)} faltante</span>;
}

export default function TurnoCierrePage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [detallesCache, setDetallesCache] = useState<Record<number, any[]>>({});

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [authLoading, user, router]);

    useEffect(() => {
        if (params.id) {
            getApiClient().getTurnoCierre(Number(params.id))
                .then(setData)
                .catch(() => setData(null))
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-6 text-center text-gray-500">Cargando reporte...</div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="p-6 text-center text-red-600">No se encontró el turno.</div>
            </DashboardLayout>
        );
    }

    const { turno, cierre, resumen, facturas } = data;

    const handleRowClick = async (facturaId: number) => {
        if (expandedId === facturaId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(facturaId);
        if (!detallesCache[facturaId]) {
            try {
                const detail = await getApiClient().getFactura(facturaId);
                setDetallesCache(prev => ({ ...prev, [facturaId]: detail.detalles || [] }));
            } catch {
                setDetallesCache(prev => ({ ...prev, [facturaId]: [] }));
            }
        }
    };
    const totalDeclarado = Number(turno.total_efectivo || 0) + Number(turno.otros_metodos_pago || 0);
    const diff = cierre ? Number(cierre.diferencia_total) : 0;

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 max-w-4xl mx-auto">

                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="text-indigo-600 hover:text-indigo-800 text-sm mb-3 flex items-center gap-1"
                    >
                        ← Volver a turnos
                    </button>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Reporte de Cierre — {turno.usuario_nombre}
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">
                                {turno.sucursal_nombre} · {new Date(turno.inicio_turno).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <DiffBadge diff={diff} />
                    </div>
                </div>

                {/* Resumen rápido */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Apertura</div>
                        <div className="font-medium">{new Date(turno.inicio_turno).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Cierre</div>
                        <div className="font-medium">
                            {turno.fin_turno ? new Date(turno.fin_turno).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500">Transacciones</div>
                        <div className="font-bold text-gray-900">{resumen.total_transacciones}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Ticket promedio</div>
                        <div className="font-bold text-gray-900">${Number(resumen.ticket_promedio).toFixed(2)}</div>
                    </div>
                </div>

                {/* Desglose por método de pago */}
                {cierre ? (
                    <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                            Desglose por método de pago
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 text-left border-b border-gray-100">
                                        <th className="pb-2 font-medium">Método</th>
                                        <th className="pb-2 text-right font-medium">Sistema</th>
                                        <th className="pb-2 text-right font-medium">Declarado</th>
                                        <th className="pb-2 text-right font-medium">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {[
                                        { label: 'Efectivo', sis: cierre.efectivo_sistema, dec: cierre.efectivo_declarado },
                                        { label: 'Tarjeta', sis: cierre.tarjeta_sistema, dec: cierre.tarjeta_declarada },
                                        { label: 'Transferencia', sis: cierre.transferencia_sistema, dec: cierre.transferencia_declarada },
                                    ].map(({ label, sis, dec }) => {
                                        const d = Number(dec) - Number(sis);
                                        return (
                                            <tr key={label}>
                                                <td className="py-3 font-medium text-gray-800">{label}</td>
                                                <td className="py-3 text-right text-gray-600">${Number(sis).toFixed(2)}</td>
                                                <td className="py-3 text-right font-medium text-gray-900">${Number(dec).toFixed(2)}</td>
                                                <td className={`py-3 text-right font-semibold ${Math.abs(d) < 0.01 ? 'text-gray-400' : d > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                    {Math.abs(d) < 0.01 ? '—' : `${d > 0 ? '+' : ''}$${d.toFixed(2)}`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {Number(cierre.salidas_caja) > 0 && (
                                        <tr>
                                            <td className="py-3 text-gray-500 italic">Salidas de caja</td>
                                            <td colSpan={2} className="py-3 text-right text-red-500">-${Number(cierre.salidas_caja).toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="border-t-2 border-gray-200">
                                    <tr>
                                        <td className="pt-3 font-bold text-gray-900">Total</td>
                                        <td className="pt-3 text-right font-bold text-gray-900">${Number(resumen.total_sistema).toFixed(2)}</td>
                                        <td className="pt-3 text-right font-bold text-gray-900">${totalDeclarado.toFixed(2)}</td>
                                        <td className="pt-3 text-right">
                                            <DiffBadge diff={diff} />
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-800">
                        Este turno no tiene cierre de caja registrado.
                    </div>
                )}

                {/* Lista de facturas */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Transacciones del turno
                        </h2>
                        <span className="text-xs text-gray-500">{facturas.length} facturas</span>
                    </div>

                    {facturas.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">Sin transacciones registradas</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                                        <th className="px-5 py-3">Comprobante</th>
                                        <th className="px-5 py-3">Cliente</th>
                                        <th className="px-5 py-3">Método</th>
                                        <th className="px-5 py-3 text-right">Total</th>
                                        <th className="px-5 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {facturas.map((f: any) => (
                                        <React.Fragment key={f.id}>
                                            <tr
                                                onClick={() => handleRowClick(f.id)}
                                                className="hover:bg-gray-50 cursor-pointer select-none"
                                            >
                                                <td className="px-5 py-3 font-mono text-xs text-gray-600">
                                                    <span className="mr-1 text-gray-400">{expandedId === f.id ? '▼' : '▶'}</span>
                                                    {f.es_interno ? `NOTA-${f.id}` : f.numero_autorizacion}
                                                </td>
                                                <td className="px-5 py-3 text-gray-700 max-w-[160px] truncate">{f.cliente}</td>
                                                <td className="px-5 py-3 text-gray-600">
                                                    {METODO_PAGO_LABEL[f.metodo_pago] || f.metodo_pago}
                                                </td>
                                                <td className="px-5 py-3 text-right font-medium text-gray-900">
                                                    ${Number(f.total_con_impuestos).toFixed(2)}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                                        f.estado === 'AUTORIZADO' ? 'bg-green-100 text-green-700' :
                                                        f.es_interno ? 'bg-gray-100 text-gray-600' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {f.es_interno ? 'Interna' : f.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                            {expandedId === f.id && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={5} className="px-8 py-3">
                                                        {!detallesCache[f.id] ? (
                                                            <p className="text-xs text-gray-400">Cargando...</p>
                                                        ) : detallesCache[f.id].length === 0 ? (
                                                            <p className="text-xs text-gray-400">Sin productos</p>
                                                        ) : (
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="text-gray-500 border-b border-gray-200">
                                                                        <th className="pb-1 text-left font-medium">Producto</th>
                                                                        <th className="pb-1 text-right font-medium">Cant.</th>
                                                                        <th className="pb-1 text-right font-medium">P. Unit.</th>
                                                                        <th className="pb-1 text-right font-medium">Subtotal</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {detallesCache[f.id].map((d: any) => (
                                                                        <tr key={d.id}>
                                                                            <td className="py-1 text-gray-700">{d.producto_nombre}</td>
                                                                            <td className="py-1 text-right text-gray-600">{d.cantidad}</td>
                                                                            <td className="py-1 text-right text-gray-600">${Number(d.precio_unitario).toFixed(2)}</td>
                                                                            <td className="py-1 text-right font-medium text-gray-800">${Number(d.subtotal).toFixed(2)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
}
