'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import type { Cliente, ClienteFormData, MovimientoCuenta } from '@/lib/types/clientes';
import DashboardLayout from '@/components/DashboardLayout';
import PortalModal from '@/components/ui/PortalModal';
import { Users } from 'lucide-react';

const METODOS_PAGO: Record<string, string> = {
  '01': 'Efectivo', '19': 'Tarjeta de Crédito', '16': 'Tarjeta de Débito',
  '20': 'Transferencia / Otros', '17': 'Dinero Electrónico',
  '18': 'Tarjeta Prepago', '15': 'Compensación de Deudas', '21': 'Endoso de Títulos',
};

const FORM_INICIAL: ClienteFormData = {
  tipo_identificacion: '05', identificacion: '', razon_social: '',
  direccion: '', telefono: '', email: '',
};

export default function ClientesPage() {
  const { user, loading: authLoading } = useAuth();
  const puedeAcceder = !!user && (
    user.is_superuser || user.is_staff ||
    ['Administrador', 'Bodeguero', 'Vendedor'].some((r) => user.groups?.includes(r))
  );

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(FORM_INICIAL);
  const [limiteCredito, setLimiteCreditoInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [showAbonarModal, setShowAbonarModal] = useState(false);
  const [abonarCliente, setAbonarClienteState] = useState<Cliente | null>(null);
  const [abonarMonto, setAbonarMonto] = useState('');
  const [abonarMetodo, setAbonarMetodo] = useState('01');

  const [showMovimientosModal, setShowMovimientosModal] = useState(false);
  const [movimientos, setMovimientos] = useState<MovimientoCuenta[]>([]);

  const cargarClientes = useCallback(async () => {
    try {
      setLoading(true);
      const api = getApiClient();
      const data = await api.getClientes({ search: search || undefined });
      setClientes(data.results || []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (puedeAcceder) cargarClientes();
  }, [puedeAcceder, cargarClientes]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(FORM_INICIAL);
    setLimiteCreditoInput('');
    setShowFormModal(true);
    setError('');
  };

  const handleOpenEdit = (c: Cliente) => {
    setEditingId(c.id);
    setFormData({
      tipo_identificacion: c.tipo_identificacion, identificacion: c.identificacion,
      razon_social: c.razon_social, direccion: c.direccion || '',
      telefono: c.telefono || '', email: c.email || '',
    });
    setLimiteCreditoInput(c.limite_credito || '');
    setShowFormModal(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const api = getApiClient();
      let clienteId = editingId;
      if (editingId) {
        await api.actualizarCliente(editingId, formData);
      } else {
        const creado = await api.crearCliente(formData);
        clienteId = creado.id;
      }
      if (clienteId) {
        await api.setLimiteCredito(clienteId, limiteCredito ? limiteCredito : null);
      }
      setShowFormModal(false);
      cargarClientes();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAbonar = (c: Cliente) => {
    setAbonarClienteState(c);
    setAbonarMonto('');
    setAbonarMetodo('01');
    setShowAbonarModal(true);
    setError('');
  };

  const handleAbonar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abonarCliente) return;
    setSaving(true);
    setError('');
    try {
      const api = getApiClient();
      await api.abonarCliente(abonarCliente.id, { monto: abonarMonto, metodo_pago: abonarMetodo });
      setShowAbonarModal(false);
      cargarClientes();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el abono');
    } finally {
      setSaving(false);
    }
  };

  const handleVerMovimientos = async (c: Cliente) => {
    setShowMovimientosModal(true);
    setMovimientos([]);
    try {
      const api = getApiClient();
      const data = await api.getMovimientosCuenta(c.id);
      setMovimientos(data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el historial');
    }
  };

  if (authLoading) return null;
  if (!puedeAcceder) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          </div>
          <button onClick={handleOpenCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            + Nuevo Cliente
          </button>
        </div>

        <input
          type="text" placeholder="Buscar por nombre o identificación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full border rounded-lg px-3 py-2"
        />

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Identificación</th>
                <th>Razón Social</th>
                <th>Teléfono</th>
                <th>Saldo Pendiente</th>
                <th>Límite</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const saldo = parseFloat(c.saldo_pendiente);
                return (
                  <tr key={c.id} className="border-b">
                    <td className="py-2">{c.identificacion}</td>
                    <td>{c.razon_social}</td>
                    <td>{c.telefono}</td>
                    <td className={saldo > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                      ${c.saldo_pendiente}
                    </td>
                    <td>{c.limite_credito ? `$${c.limite_credito}` : 'Sin límite'}</td>
                    <td className="space-x-2">
                      <button onClick={() => handleOpenEdit(c)} className="text-indigo-600 text-xs">Editar</button>
                      {saldo > 0 && (
                        <button onClick={() => handleOpenAbonar(c)} className="text-green-600 text-xs">Abonar</button>
                      )}
                      <button onClick={() => handleVerMovimientos(c)} className="text-gray-600 text-xs">Movimientos</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <PortalModal isOpen={showFormModal} onClose={() => setShowFormModal(false)}>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg max-w-md mx-auto space-y-3">
            <h2 className="text-lg font-bold">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <select
              value={formData.tipo_identificacion}
              onChange={(e) => setFormData({ ...formData, tipo_identificacion: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="05">Cédula</option>
              <option value="04">RUC</option>
              <option value="06">Pasaporte</option>
            </select>
            <input
              type="text" required placeholder="Identificación"
              value={formData.identificacion}
              onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="text" required placeholder="Razón Social"
              value={formData.razon_social}
              onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="text" placeholder="Dirección"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="text" placeholder="Teléfono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="email" placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="number" step="0.01" placeholder="Límite de crédito (vacío = sin límite)"
              value={limiteCredito}
              onChange={(e) => setLimiteCreditoInput(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 border rounded-lg">
                Cancelar
              </button>
            </div>
          </form>
        </PortalModal>

        <PortalModal isOpen={showAbonarModal} onClose={() => setShowAbonarModal(false)}>
          <form onSubmit={handleAbonar} className="bg-white p-6 rounded-lg max-w-sm mx-auto space-y-3">
            <h2 className="text-lg font-bold">Abonar — {abonarCliente?.razon_social}</h2>
            <p className="text-sm text-gray-500">Saldo pendiente: ${abonarCliente?.saldo_pendiente}</p>
            <input
              type="number" step="0.01" required placeholder="Monto"
              value={abonarMonto}
              onChange={(e) => setAbonarMonto(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
            <select
              value={abonarMetodo}
              onChange={(e) => setAbonarMetodo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {Object.entries(METODOS_PAGO).map(([codigo, label]) => (
                <option key={codigo} value={codigo}>{label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                {saving ? 'Guardando...' : 'Registrar Abono'}
              </button>
              <button type="button" onClick={() => setShowAbonarModal(false)} className="px-4 py-2 border rounded-lg">
                Cancelar
              </button>
            </div>
          </form>
        </PortalModal>

        <PortalModal isOpen={showMovimientosModal} onClose={() => setShowMovimientosModal(false)}>
          <div className="bg-white p-6 rounded-lg max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-3">Historial de movimientos</h2>
            {movimientos.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin movimientos.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-1">Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="py-1">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className={m.tipo === 'CARGO' ? 'text-red-600' : 'text-green-600'}>{m.tipo}</td>
                      <td>${m.monto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => setShowMovimientosModal(false)} className="mt-4 px-4 py-2 border rounded-lg">
              Cerrar
            </button>
          </div>
        </PortalModal>
      </div>
    </DashboardLayout>
  );
}
