'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiClient } from '@/lib/api';
import Link from 'next/link';

interface FormData {
  schema_name: string;
  nombre_comercial: string;
  razon_social: string;
  ruc: string;
  confirmar_ruc: string;
  direccion: string;
  telefono: string;
  correo_electronico: string;
  obligado_contabilidad: boolean;
  tipo_contribuyente: string;
  representante_legal: string;
  actividad_economica: string;
  acepta_terminos: boolean;
  username: string;
  password?: string;
  confirm_password?: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [verificandoRUC, setVerificandoRUC] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    schema_name: '',
    nombre_comercial: '',
    razon_social: '',
    ruc: '',
    confirmar_ruc: '',
    direccion: '',
    telefono: '',
    correo_electronico: '',
    obligado_contabilidad: false,
    tipo_contribuyente: 'CONTRIBUYENTE_RISE',
    representante_legal: '',
    actividad_economica: '',
    acepta_terminos: false,
    username: 'admin', // Default placeholder, user can change
    password: '',
    confirm_password: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Limpiar error del campo al editar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Verificar RUC en tiempo real cuando se complete
  const handleRUCBlur = async () => {
    const ruc = formData.ruc.trim();

    if (ruc.length === 13) {
      setVerificandoRUC(true);
      try {
        const api = getApiClient();
        const response = await api.verificarRUC(ruc);

        if (!response.valido) {
          setErrors((prev) => ({ ...prev, ruc: response.mensaje }));
        }
      } catch (error) {
        console.error('Error verificando RUC:', error);
      } finally {
        setVerificandoRUC(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (formData.password !== formData.confirm_password) {
      setErrors({ confirm_password: 'Las contraseñas no coinciden' });
      setLoading(false);
      return;
    }

    try {
      const api = getApiClient(); // Usará localhost:8000 desde .env.local
      const response = await api.registrarEmpresa(formData);

      if (response.success) {
        // Redirigir a página de éxito
        router.push(`/registro/exitoso?empresa=${response.empresa.schema_name}&url=${response.empresa.url_acceso}`);
      } else {
        setErrors(response.errores || {});
      }
    } catch (error: any) {
      console.error('Error al registrar empresa:', error);

      if (error.data?.errores) {
        setErrors(error.data.errores);
      } else {
        setErrors({
          general: error.message || 'Error al registrar la empresa. Por favor, intente nuevamente.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">LX</span>
            </div>
            <span className="text-2xl font-bold text-gray-800">LedgerXpertz</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Registrar Nueva Empresa
          </h1>
          <p className="text-gray-600 mt-2">
            Complete el formulario para crear su cuenta empresarial
          </p>
        </div>

        {/* Formulario */}
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Schema Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Identificador de Empresa *
              </label>
              <input
                type="text"
                name="schema_name"
                value={formData.schema_name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.schema_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="miempresa"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Solo letras minúsculas, números y guiones bajos. Ej: miempresa_ec
              </p>
              {errors.schema_name && (
                <p className="mt-1 text-sm text-red-600">{errors.schema_name}</p>
              )}
            </div>

            {/* Información Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Comercial *
                </label>
                <input
                  type="text"
                  name="nombre_comercial"
                  value={formData.nombre_comercial}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.nombre_comercial ? 'border-red-500' : 'border-gray-300'
                    }`}
                  required
                />
                {errors.nombre_comercial && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombre_comercial}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razón Social *
                </label>
                <input
                  type="text"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.razon_social ? 'border-red-500' : 'border-gray-300'
                    }`}
                  required
                />
                {errors.razon_social && (
                  <p className="mt-1 text-sm text-red-600">{errors.razon_social}</p>
                )}
              </div>
            </div>

            {/* RUC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RUC (13 dígitos) *
                </label>
                <input
                  type="text"
                  name="ruc"
                  value={formData.ruc}
                  onChange={handleChange}
                  onBlur={handleRUCBlur}
                  maxLength={13}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.ruc ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="1234567890001"
                  required
                />
                {verificandoRUC && (
                  <p className="mt-1 text-sm text-blue-600">Verificando RUC...</p>
                )}
                {errors.ruc && (
                  <p className="mt-1 text-sm text-red-600">{errors.ruc}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar RUC *
                </label>
                <input
                  type="text"
                  name="confirmar_ruc"
                  value={formData.confirmar_ruc}
                  onChange={handleChange}
                  maxLength={13}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.confirmar_ruc ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="1234567890001"
                  required
                />
                {errors.confirmar_ruc && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmar_ruc}</p>
                )}
              </div>
            </div>

            {/* Contacto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección *
              </label>
              <textarea
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                rows={2}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.direccion ? 'border-red-500' : 'border-gray-300'
                  }`}
                required
              />
              {errors.direccion && (
                <p className="mt-1 text-sm text-red-600">{errors.direccion}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.telefono ? 'border-red-500' : 'border-gray-300'
                    }`}
                  required
                />
                {errors.telefono && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  name="correo_electronico"
                  value={formData.correo_electronico}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.correo_electronico ? 'border-red-500' : 'border-gray-300'
                    }`}
                  required
                />
                {errors.correo_electronico && (
                  <p className="mt-1 text-sm text-red-600">{errors.correo_electronico}</p>
                )}
              </div>
            </div>

            {/* Información Tributaria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Contribuyente *
                </label>
                <select
                  name="tipo_contribuyente"
                  value={formData.tipo_contribuyente}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="CONTRIBUYENTE_RISE">RISE</option>
                  <option value="CONTRIBUYENTE_ESPECIAL">Contribuyente Especial</option>
                  <option value="CONTRIBUYENTE_NEGOCIO_POPULAR">Negocio Popular</option>
                  <option value="CONTRIBUYENTE_REGIMEN_GENERAL">Régimen General</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="obligado_contabilidad"
                  checked={formData.obligado_contabilidad}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Obligado a llevar contabilidad
                </label>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Representante Legal
                </label>
                <input
                  type="text"
                  name="representante_legal"
                  value={formData.representante_legal}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actividad Económica
                </label>
                <input
                  type="text"
                  name="actividad_economica"
                  value={formData.actividad_economica}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Credenciales de Administrador */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Credenciales de Administrador</h3>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de Usuario *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Ej: admin, jperez, gerencia"
                  required
                  minLength={3}
                  pattern="[a-zA-Z0-9_.\-]+"
                  title="Solo letras, números, guiones y puntos"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Este será el usuario principal para ingresar al sistema.
                </p>
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={(formData as any).password || ''}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Contraseña *
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={(formData as any).confirm_password || ''}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.confirm_password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    required
                    minLength={8}
                    placeholder="Repita la contraseña"
                  />
                  {errors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Términos */}
            <div className="border-t pt-6">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="acepta_terminos"
                  checked={formData.acepta_terminos}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-1"
                  required
                />
                <label className="ml-2 text-sm text-gray-700">
                  Acepto los{' '}
                  <a href="/terminos" className="text-indigo-600 hover:underline">
                    términos y condiciones
                  </a>{' '}
                  del servicio
                </label>
              </div>
              {errors.acepta_terminos && (
                <p className="mt-1 text-sm text-red-600 ml-6">{errors.acepta_terminos}</p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-6">
              <Link
                href="/"
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition text-center"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registrando...' : 'Registrar Empresa'}
              </button>
            </div>
          </form>
        </div>

        {/* Info adicional */}
        <div className="max-w-3xl mx-auto mt-8 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
