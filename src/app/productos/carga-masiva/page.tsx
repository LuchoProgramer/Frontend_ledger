'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ApiClient } from '@/lib/api';
import { toast } from 'sonner';
import {
    CloudUpload,
    Download,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Package,
    Box
} from 'lucide-react';

export default function BulkUploadPage() {
    const router = useRouter();
    const api = new ApiClient();

    const [activeTab, setActiveTab] = useState<'productos' | 'presentaciones'>('productos');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        creados: number;
        actualizados: number;
        errores: string[];
    } | null>(null);

    const handleDownloadTemplate = async () => {
        if (activeTab === 'productos') {
            api.downloadProductsTemplate();
        } else {
            api.downloadPresentationsTemplate();
        }
        toast.success('Descarga iniciada');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null); // Reset results on new file
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error('Por favor selecciona un archivo');
            return;
        }

        setLoading(true);
        try {
            let response;
            if (activeTab === 'productos') {
                response = await api.uploadProductsExcel(file);
            } else {
                response = await api.uploadPresentationsExcel(file);
            }

            if (response.success) {
                setResult({
                    creados: response.creados,
                    actualizados: response.actualizados,
                    errores: response.errores
                });
                toast.success(`Proceso completado: ${response.creados} creados, ${response.actualizados} actualizados.`);
                if (response.errores.length > 0) {
                    toast.warning(`Atención: Hubo ${response.errores.length} errores.`);
                }
            } else {
                toast.error('Error en la carga masiva');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Carga Masiva</h1>
                        <p className="text-gray-500 text-sm">Gestiona la importación de datos desde Excel</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex space-x-1">
                    <button
                        onClick={() => { setActiveTab('productos'); setFile(null); setResult(null); }}
                        className={`
                            flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all
                            ${activeTab === 'productos'
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }
                        `}
                    >
                        <Package className="w-5 h-5" />
                        <span>Productos Base</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('presentaciones'); setFile(null); setResult(null); }}
                        className={`
                            flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all
                            ${activeTab === 'presentaciones'
                                ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }
                        `}
                    >
                        <Box className="w-5 h-5" />
                        <span>Presentaciones / Cajas</span>
                    </button>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 space-y-6">

                        {/* Instructions */}
                        <div className={`
                            border rounded-lg p-4 text-sm transition-colors
                            ${activeTab === 'productos' ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}
                        `}>
                            <h3 className="font-semibold mb-2 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {activeTab === 'productos' ? 'Instrucciones Productos:' : 'Instrucciones Presentaciones:'}
                            </h3>
                            <div className="pl-6 space-y-2">
                                <p>1. Descarga la plantilla oficial.</p>
                                {activeTab === 'productos' ? (
                                    <p>2. Define nombre, categoría, precio base y stock inicial. <br /><span className="text-xs opacity-75">(Esto creará automáticamente la presentación "Unidad")</span></p>
                                ) : (
                                    <p>2. Usa el <strong>Código de Producto</strong> para asignar nuevas presentaciones (Cajas, Packs, etc). <br /><span className="text-xs opacity-75">(Asegúrate que el producto base ya exista)</span></p>
                                )}
                                <p>3. Sube el archivo Excel para procesar.</p>
                            </div>
                        </div>

                        {/* Actions Area */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Step 1: Download */}
                            <div className="border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-3 hover:bg-gray-50 transition-colors">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTab === 'productos' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    <Download className="w-6 h-6" />
                                </div>
                                <h3 className="font-medium text-gray-900">1. Obtener Plantilla</h3>
                                <p className="text-sm text-gray-500">
                                    {activeTab === 'productos' ? 'Plantilla de Productos Base' : 'Plantilla de Presentaciones'}
                                </p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm flex items-center"
                                >
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    Descargar Excel
                                </button>
                            </div>

                            {/* Step 2: Upload */}
                            <div className="border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-3 hover:bg-gray-50 transition-colors">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTab === 'productos' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    <CloudUpload className="w-6 h-6" />
                                </div>
                                <h3 className="font-medium text-gray-900">2. Subir Archivo</h3>

                                {!file ? (
                                    <div className="w-full">
                                        <label className="cursor-pointer block">
                                            <span className="sr-only">Seleccionar archivo</span>
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls"
                                                onChange={handleFileChange}
                                                className={`
                                                    block w-full text-sm text-gray-500
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-full file:border-0
                                                    file:text-sm file:font-semibold
                                                    hover:file:opacity-80
                                                    ${activeTab === 'productos'
                                                        ? 'file:bg-indigo-50 file:text-indigo-700'
                                                        : 'file:bg-emerald-50 file:text-emerald-700'}
                                                `}
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border border-gray-200">
                                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                                            {file.name}
                                        </span>
                                        <button
                                            onClick={() => setFile(null)}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            X
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={handleUpload}
                                    disabled={!file || loading}
                                    className={`
                                        w-full px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm flex items-center justify-center transition-colors
                                        ${!file || loading
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : activeTab === 'productos'
                                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                                : 'bg-emerald-600 hover:bg-emerald-700'
                                        }
                                    `}
                                >
                                    {loading ? 'Procesando...' : 'Subir y Procesar'}
                                </button>
                            </div>
                        </div>

                        {/* Results Section */}
                        {result && (
                            <div className="border-t border-gray-200 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" /> Resultado de la carga
                                    <span className="ml-2 text-xs font-normal text-gray-500">
                                        ({activeTab === 'productos' ? 'Productos' : 'Presentaciones'})
                                    </span>
                                </h3>

                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                                        <div className="text-2xl font-bold text-green-700">{result.creados}</div>
                                        <div className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                                            {activeTab === 'productos' ? 'Nuevos' : 'Grupos Creados'}
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                                        <div className="text-2xl font-bold text-blue-700">{result.actualizados}</div>
                                        <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                                            {activeTab === 'productos' ? 'Actualizados' : 'Grupos Act.'}
                                        </div>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                                        <div className="text-2xl font-bold text-red-700">{result.errores.length}</div>
                                        <div className="text-xs font-semibold text-red-800 uppercase tracking-wide">Errores</div>
                                    </div>
                                </div>

                                {result.errores.length > 0 && (
                                    <div className="bg-red-50 rounded-lg p-4 border border-red-100 max-h-60 overflow-y-auto">
                                        <h4 className="text-sm font-bold text-red-800 mb-2">Detalle de errores:</h4>
                                        <ul className="space-y-1">
                                            {result.errores.map((err, idx) => (
                                                <li key={idx} className="text-xs text-red-700 font-mono bg-white/50 p-1 rounded">
                                                    • {err}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
