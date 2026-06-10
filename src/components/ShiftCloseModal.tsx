'use client';

import { useState } from 'react';
import PortalModal from './ui/PortalModal';

interface ShiftCloseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: ShiftCloseData) => Promise<void>;
    controlCaja?: boolean;
    systemTotals?: { // Opcional: Para mostrar lo que el sistema espera (si quieres ser transparente)
        expectedCash: number;
        expectedCard: number;
        expectedTransfer: number;
    };
}

export interface ShiftCloseData {
    efectivo_total: number;
    tarjeta_total: number;
    transferencia_total: number;
    salidas_caja: number;
    observaciones: string;
    efectivo_a_dejar?: number;
}

export default function ShiftCloseModal({ isOpen, onClose, onConfirm, controlCaja, systemTotals }: ShiftCloseModalProps) {
    const tenant = typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : '';
    const hasCashControl = controlCaja ?? ['persepolis'].includes(tenant);

    const [data, setData] = useState<ShiftCloseData>({
        efectivo_total: 0,
        tarjeta_total: 0,
        transferencia_total: 0,
        salidas_caja: 0,
        observaciones: '',
        efectivo_a_dejar: hasCashControl ? 35.00 : 0
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (field: keyof ShiftCloseData, value: string) => {
        if (field === 'observaciones') {
            setData(prev => ({ ...prev, [field]: value }));
        } else {
            setData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
        }
    };

    const handleSubmit = async () => {
        if (!confirm('¿Estás seguro de cerrar el turno con estos valores? Esta acción es irreversible.')) return;

        setLoading(true);
        try {
            await onConfirm(data);
            onClose(); // Cerrar modal tras éxito
        } catch (error) {
            console.error(error);
            // El manejo de error debe hacerlo el padre o mostrar un toast aquí
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const totalDeclarado = data.efectivo_total + data.tarjeta_total + data.transferencia_total - data.salidas_caja;

    return (
        <PortalModal isOpen={isOpen} onClose={onClose}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-w-lg w-full rounded-lg shadow-xl">
                <div className="mb-6 border-b pb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                         Cerrar Turno de Caja
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Por favor, ingrese los valores finales del arqueo físico.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Efectivo */}
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700 w-1/3">
                            💵 Efectivo Real
                        </label>
                        <div className="w-2/3 relative">
                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                placeholder="0.00"
                                value={data.efectivo_total || ''}
                                onChange={(e) => handleChange('efectivo_total', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Efectivo a Dejar en Caja */}
                    {hasCashControl && (
                        <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-md border border-indigo-100">
                            <label className="block text-sm font-semibold text-indigo-900 w-1/3">
                                Dejar en Caja ($)
                            </label>
                            <div className="w-2/3 relative">
                                <span className="absolute left-3 top-2 text-indigo-600 font-bold">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="pl-8 block w-full rounded-md border-indigo-300 text-indigo-900 font-bold focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    placeholder="35.00"
                                    value={data.efectivo_a_dejar || ''}
                                    onChange={(e) => handleChange('efectivo_a_dejar', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Tarjetas */}
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700 w-1/3">
                            💳 Tarjetas (Vouchers)
                        </label>
                        <div className="w-2/3 relative">
                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                placeholder="0.00"
                                value={data.tarjeta_total || ''}
                                onChange={(e) => handleChange('tarjeta_total', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Transferencias */}
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700 w-1/3">
                            🏦 Transferencias
                        </label>
                        <div className="w-2/3 relative">
                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                placeholder="0.00"
                                value={data.transferencia_total || ''}
                                onChange={(e) => handleChange('transferencia_total', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Salidas / Gastos */}
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-red-700 w-1/3">
                            📤 Gastos / Retiros
                        </label>
                        <div className="w-2/3 relative">
                            <span className="absolute left-3 top-2 text-red-400">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="pl-8 block w-full rounded-md border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border bg-red-50"
                                placeholder="0.00"
                                value={data.salidas_caja || ''}
                                onChange={(e) => handleChange('salidas_caja', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Total Declarado */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <span className="text-lg font-bold text-gray-900">Total Declarado:</span>
                        <span className="text-xl font-bold text-indigo-600">${totalDeclarado.toFixed(2)}</span>
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observaciones / Novedades
                        </label>
                        <textarea
                            rows={3}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2"
                            placeholder="Ej: Faltante de $0.05 por redondeo..."
                            value={data.observaciones}
                            onChange={(e) => handleChange('observaciones', e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? 'Cerrando...' : 'Confirmar Cierre'}
                    </button>
                </div>
            </div>
        </PortalModal>
    );
}
