'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Usuario, UsuarioFormData, Group, SucursalSimple } from '@/lib/types/usuarios';
import PortalModal from '@/components/ui/PortalModal';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [grupos, setGrupos] = useState<Group[]>([]);
  const [sucursales, setSucursales] = useState<SucursalSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUsuario, setCurrentUsuario] = useState<Usuario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<UsuarioFormData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_active: true,
    is_staff: false,
    is_superuser: false,
    grupos: [],
    sucursales: []
  });

  const client = getApiClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, gruposRes, sucursalesRes] = await Promise.all([
        client.getUsuarios(),
        client.getGrupos(),
        client.getSucursalesList()
      ]);

      setUsuarios(usersRes.results);
      setGrupos(gruposRes.grupos);
      // getSucursalesList returns { results: Sucursal[], ... } or { data: Sucursal[], ... }
      setSucursales(sucursalesRes.results || sucursalesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentUsuario) {
        // Update
        const { password, ...updateData } = formData;
        const payload = password ? formData : updateData; // Send password only if changed

        await client.actualizarUsuario(currentUsuario.id, payload);
        alert('Usuario actualizado');
      } else {
        // Create
        await client.crearUsuario(formData);
        alert('Usuario creado');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error al guardar');
    }
  };

  const openModal = (usuario?: Usuario) => {
    if (usuario) {
      setCurrentUsuario(usuario);
      setFormData({
        username: usuario.username,
        email: usuario.email,
        password: '', // Don't show existing password
        first_name: usuario.first_name,
        last_name: usuario.last_name,
        is_active: usuario.is_active,
        is_staff: usuario.is_staff,
        is_superuser: usuario.is_superuser,
        grupos: usuario.grupos.map(g => g.id),
        sucursales: usuario.sucursales.map(s => s.id)
      });
    } else {
      setCurrentUsuario(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        is_active: true,
        is_staff: false,
        is_superuser: false,
        grupos: [],
        sucursales: []
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar usuario?')) return;
    try {
      await client.eliminarUsuario(id);
      fetchData();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const handleGroupChange = (groupId: number) => {
    setFormData(prev => {
      const exists = prev.grupos.includes(groupId);
      return {
        ...prev,
        grupos: exists
          ? prev.grupos.filter(id => id !== groupId)
          : [...prev.grupos, groupId]
      };
    });
  };

  const handleSucursalChange = (sucursalId: number) => {
    setFormData(prev => {
      const exists = prev.sucursales.includes(sucursalId);
      return {
        ...prev,
        sucursales: exists
          ? prev.sucursales.filter(id => id !== sucursalId)
          : [...prev.sucursales, sucursalId]
      };
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Nuevo Usuario
          </button>
        </div>

        {loading ? (
          <div>Cargando...</div>
        ) : (
          <>
            {/* Desktop View (Table) */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuarios.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.grupos.map(g => g.name).join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.sucursales_count} asignadas
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {user.is_staff && (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openModal(user)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {usuarios.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow p-4 space-y-4">
                  {/* Header: User Info */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{user.username}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Body: Details */}
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Nombre:</span> {user.first_name} {user.last_name}</p>
                    <p><span className="font-medium">Roles:</span> {user.grupos.map(g => g.name).join(', ')}</p>
                    <p><span className="font-medium">Sucursales:</span> {user.sucursales_count} asignadas</p>
                    {user.is_staff && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800">
                        Administrador del Sistema
                      </span>
                    )}
                  </div>

                  {/* Footer: Actions */}
                  <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => openModal(user)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded hover:bg-indigo-100 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded hover:bg-red-100 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* MODAL */}
        <PortalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {currentUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    disabled={!!currentUsuario} // Username immutable usually
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Apellido</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {currentUsuario ? 'Contraseña (dejar en blanco para mantener)' : 'Contraseña'}
                </label>
                <input
                  type="password"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required={!currentUsuario}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Grupos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded">
                    {grupos.map(grupo => (
                      <div key={grupo.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.grupos.includes(grupo.id)}
                          onChange={() => handleGroupChange(grupo.id)}
                          className="mr-2"
                        />
                        <span>{grupo.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sucursales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sucursales Asignadas</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded">
                    {sucursales.map(sucursal => (
                      <div key={sucursal.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.sucursales.includes(sucursal.id)}
                          onChange={() => handleSucursalChange(sucursal.id)}
                          className="mr-2"
                        />
                        <span>{sucursal.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Activo</label>
              </div>

              <div className="flex space-x-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_staff}
                    onChange={e => setFormData({ ...formData, is_staff: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Es Administrador (Acceso al sistema)</label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_superuser}
                    onChange={e => setFormData({ ...formData, is_superuser: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Superusuario (Control total)</label>
                </div>
              </div>

            </form>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={(e) => handleSubmit(e as any)}
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              Guardar
            </button>
          </div>
        </PortalModal>
      </div>
    </DashboardLayout >
  );
}
