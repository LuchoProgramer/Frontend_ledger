'use client'

import { useState } from 'react'
import { buscarEmpresas } from '@/lib/api'

interface Empresa {
  id: number
  schema_name: string
  nombre_comercial: string
  razon_social: string
  ruc: string
  url_tenant: string
}

interface BuscarEmpresaModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BuscarEmpresaModal({ isOpen, onClose }: BuscarEmpresaModalProps) {
  const [termino, setTermino] = useState('')
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (termino.trim().length < 3) {
      setError('Debe ingresar al menos 3 caracteres')
      return
    }

    setLoading(true)
    setError('')
    setMensaje('')
    setEmpresas([])

    try {
      const response = await buscarEmpresas(termino.trim())

      if (response.success) {
        setEmpresas(response.data.empresas)
        if (response.data.empresas.length === 0) {
          setMensaje(response.data.mensaje || 'No se encontraron empresas')
        }
      } else {
        setError(response.error || 'Error al buscar empresas')
      }
    } catch (err) {
      setError('Error de conexión. Por favor intente nuevamente.')
      console.error('Error buscando empresas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeleccionarEmpresa = (empresa: Empresa) => {
    // Convertir schema_name a formato de subdominio válido
    // PostgreSQL permite guiones bajos, pero los subdominios HTTP no
    // yanett_pruebas → yanett-pruebas
    const subdomain = empresa.schema_name.replace(/_/g, '-')

    // Redirigir al tenant seleccionado
    window.location.href = `http://${subdomain}.localhost:3000/login`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Buscar mi Empresa</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-blue-100">
            Ingresa tu RUC o nombre de empresa para acceder
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Formulario de búsqueda */}
          <form onSubmit={handleBuscar} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={termino}
                onChange={(e) => setTermino(e.target.value)}
                placeholder="Ingresa RUC o nombre de empresa..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || termino.trim().length < 3}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {termino.trim().length > 0 && termino.trim().length < 3 && (
              <p className="mt-2 text-sm text-gray-600">
                Ingresa al menos 3 caracteres para buscar
              </p>
            )}
          </form>

          {/* Mensajes de error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Mensaje cuando no hay resultados */}
          {mensaje && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700">{mensaje}</p>
            </div>
          )}

          {/* Lista de resultados */}
          {empresas.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-3">
                {empresas.length} {empresas.length === 1 ? 'empresa encontrada' : 'empresas encontradas'}
              </p>
              {empresas.map((empresa) => (
                <button
                  key={empresa.id}
                  onClick={() => handleSeleccionarEmpresa(empresa)}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                        {empresa.nombre_comercial}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {empresa.razon_social}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        RUC: {empresa.ruc}
                      </p>
                    </div>
                    <div className="ml-4">
                      <svg
                        className="w-6 h-6 text-gray-400 group-hover:text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Ayuda */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>💡 Tip:</strong> Puedes buscar por:
            </p>
            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>RUC completo o parcial (ej: 0992...)</li>
              <li>Nombre comercial de tu empresa</li>
              <li>Razón social</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            ¿No encuentras tu empresa?{' '}
            <a href="/registro" className="text-blue-600 hover:text-blue-700 font-medium">
              Regístrala aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
