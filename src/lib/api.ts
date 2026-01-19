/**
 * Cliente API para consumir el backend Django
 */

import { getApiUrl, getTenantFromHostname } from './tenant';
import type {
  UsuariosResponse,
  UsuarioDetailResponse,
  UsuarioFormData,
  GruposResponse,
  SucursalesResponse
} from './types/usuarios';
import type {
  SucursalesListResponse,
  SucursalResponse,
  SucursalFormData
} from './types/sucursales';
import type {
  ProductosListResponse,
  ProductoResponse,
  CategoriasResponse,
  PresentacionesResponse,
  ImpuestosResponse
} from './types/productos';
import type {
  Factura as FacturaVenta,
  FacturasResponse
} from './types/ventas';
import type { Factura } from './types'; // Rich detail type
import type {
  InventarioResponse,
  MovimientosResponse,
  AuditoriaItem,
  AuditoriaDetailResponse
} from './types/inventario';
import type {
  ProveedoresResponse
} from './types/proveedores';
import type {
  Compra,
  ComprasResponse,
  CreateCompraPayload
} from './types/compras';
import type {
  RetencionesResponse,
  CreateRetencionPayload
} from './types/retenciones';
import type {
  PlanCuenta,
  PlanCuentasResponse,
  CreatePlanCuentaPayload
} from './types/contabilidad';

export interface ApiError {
  message: string;
  status: number;
  data?: any;
}

export class ApiClient {
  private baseURL: string;
  private tenant: string;

  constructor(hostname?: string) {
    // Detectar tenant automáticamente del hostname
    this.tenant = getTenantFromHostname(hostname);
    // Obtener la URL del API para este tenant
    this.baseURL = getApiUrl(hostname);
  }

  /**
   * Construir URL completa para imágenes desde rutas relativas del backend
   * @param imagePath - Ruta relativa de la imagen (ej: /media/productos/imagen.jpg o productos/imagen.jpg)
   * @returns URL completa de la imagen
   */
  getImageUrl(imagePath?: string | null): string | null {
    if (!imagePath) return null;

    // Si ya es una URL completa, retornarla tal cual
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Obtener la URL base del backend desde variable de entorno
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.ledgerxpertz.com/api';

    // Remover /api del final si existe para obtener la URL raíz del backend
    const backendUrl = backendBaseUrl.replace(/\/api\/?$/, '');

    // Asegurar que imagePath empiece con /
    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

    return `${backendUrl}${path}`;
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie} `;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  /**
   * Método genérico para hacer requests a la API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string> || {}),
    };

    // Solo agregar X-Tenant si NO es el tenant público
    // El tenant público no necesita header porque usa el schema público de Django
    if (this.tenant !== 'public') {
      headers['X-Tenant'] = this.tenant;
    }

    // Agregar CSRF Token si existe en cookie
    const csrftoken = this.getCookie('csrftoken');
    if (csrftoken) {
      headers['X-CSRFToken'] = csrftoken;
    }

    console.log('[ApiClient] Request:', {
      url,
      tenant: this.tenant,
      endpoint,
      hasXTenant: this.tenant !== 'public',
      headers: Object.fromEntries(Object.entries(headers))
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Importante para enviar cookies de sesión
      });

      console.log('[ApiClient] Response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      // Intentar parsear el JSON primero
      let responseData;
      const contentType = response.headers.get('content-type');
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          // Si no es JSON, intentar obtener el texto
          const text = await response.text();
          console.warn('[ApiClient] Respuesta no-JSON recibida:', {
            url,
            status: response.status,
            contentType,
            textPreview: text.substring(0, 200)
          });
          responseData = { error: text || 'Respuesta no válida del servidor' };
        }
      } catch (parseError) {
        console.error('[ApiClient] Error parseando respuesta:', parseError);
        responseData = { error: 'Error parseando respuesta del servidor' };
      }

      if (!response.ok) {
        const errorMessage = responseData?.detail
          || responseData?.error
          || responseData?.message
          || response.statusText
          || 'Error en la petición';

        // Solo loguear como error si NO es 401 (no autenticado)
        // Los 401 son esperados cuando no hay sesión activa
        if (response.status !== 401) {
          console.error('[ApiClient] Request failed:', {
            url,
            status: response.status,
            errorMessage,
            responseData,
            contentType
          });
        } else {
          console.log('[ApiClient] No autenticado (401):', {
            url,
            endpoint
          });
        }

        throw {
          message: errorMessage,
          status: response.status,
          data: responseData,
        } as ApiError;
      }

      return responseData;
    } catch (error) {
      // Si el error ya tiene estructura de ApiError, re-lanzarlo
      if ((error as ApiError).status) {
        throw error;
      }

      // Si es un error genérico, darle estructura
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión con el servidor';
      throw {
        message: errorMessage,
        status: 0,
        data: error,
      } as ApiError;
    }
  }

  // ========== FACTURAS ==========

  async getFacturas(params?: {
    page?: number;
    estado_sri?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.estado_sri) queryParams.append('estado_sri', params.estado_sri);
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return this.request<FacturasResponse>(`/api/facturas/${query ? `?${query}` : ''}`);
  }

  async getFactura(id: number) {
    return this.request<Factura>(`/api/facturas/${id}/`);
  }

  async enviarSRI(id: number) {
    console.log('[enviarSRI] INICIO - ID:', id);
    try {
      const result = await this.request<any>(`/api/facturas/${id}/enviar_sri/`, {
        method: 'POST',
      });
      console.log('[enviarSRI] EXITO - Resultado:', result);
      return result;
    } catch (error) {
      console.error('[enviarSRI] ERROR:', error);
      throw error;
    }
  }

  async consultarSRI(id: number) {
    return this.request<any>(`/api/facturas/${id}/consultar_sri/`, {
      method: 'POST',
    });
  }

  async promocionarFacturaSRI(id: number) {
    return this.request<any>(`/api/facturas/${id}/promocionar_sri/`, {
      method: 'POST',
    });
  }

  async descargarXML(id: number): Promise<Blob> {
    const url = `${this.baseURL}/api/facturas/${id}/descargar_xml/`;
    const response = await fetch(url, {
      headers: {
        'X-Tenant': this.tenant,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw {
        message: 'Error al descargar XML',
        status: response.status,
      } as ApiError;
    }

    return response.blob();
  }

  // ========== CLIENTES ==========

  async getClientes(params?: { page?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return this.request<any>(`/api/clientes/${query ? `?${query}` : ''}`);
  }

  async getCliente(id: number) {
    return this.request<any>(`/api/clientes/${id}/`);
  }

  async crearCliente(data: any) {
    return this.request<any>('/api/clientes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========== EMPRESAS / REGISTRO ==========

  async registrarEmpresa(data: {
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
    representante_legal?: string;
    actividad_economica?: string;
    acepta_terminos: boolean;
    username: string;
    password?: string;
    confirm_password?: string;
  }) {
    return this.request<any>('/api/empresas/registro/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verificarRUC(ruc: string) {
    return this.request<{
      valido: boolean;
      existe: boolean;
      mensaje: string;
    }>('/api/empresas/verificar-ruc/', {
      method: 'POST',
      body: JSON.stringify({ ruc }),
    });
  }

  async getEstadisticasPublicas() {
    return this.request<{
      total_empresas: number;
      features: Array<{
        titulo: string;
        descripcion: string;
        icono: string;
      }>;
    }>('/api/empresas/estadisticas/');
  }

  async buscarEmpresas(termino: string) {
    return this.request<{
      success: boolean;
      data: {
        empresas: Array<{
          id: number;
          schema_name: string;
          nombre_comercial: string;
          razon_social: string;
          ruc: string;
          url_tenant: string;
        }>;
        total?: number;
        mensaje?: string;
      };
      error?: string;
    }>('/api/empresas/buscar/', {
      method: 'POST',
      body: JSON.stringify({ termino }),
    });
  }

  // ========== AUTENTICACIÓN ==========

  async login(username: string, password: string) {
    return this.request<{
      success: boolean;
      user?: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        is_staff: boolean;
        is_superuser: boolean;
        groups: string[];
      };
      error?: string;
    }>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout() {
    return this.request<{
      success: boolean;
      message?: string;
    }>('/api/auth/logout/', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    return this.request<{
      success: boolean;
      user?: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        is_staff: boolean;
        is_superuser: boolean;
        groups: string[];
      };
    }>('/api/auth/me/');
  }

  async getTurnoActivo() {
    try {
      console.log('Llamando a /api/auth/turno-activo/')
      console.log('BaseURL:', this.baseURL)
      console.log('Tenant:', this.tenant)

      const result = await this.request<{
        success: boolean;
        tiene_turno_activo: boolean;
        turno?: {
          id: number;
          hora_inicio: string;
          sucursal: string | null;
        };
      }>('/api/auth/turno-activo/');

      console.log('Respuesta exitosa de turno-activo:', result)
      return result
    } catch (error: any) {
      console.error('Error en getTurnoActivo:', {
        error,
        type: typeof error,
        message: error?.message || 'Sin mensaje',
        status: error?.status,
        data: error?.data,
        keys: Object.keys(error || {}),
        stringified: JSON.stringify(error),
        isApiError: !!(error?.status !== undefined)
      })

      // Retornar un objeto de error estructurado en lugar de lanzar
      return {
        success: false,
        tiene_turno_activo: false,
        error: error?.message || error?.data?.error || 'Error desconocido al verificar turno'
      }
    }
  }

  async getCsrfToken() {
    return this.request<{
      success: boolean;
      message?: string;
    }>('/api/auth/csrf/');
  }

  // ========== GESTIÓN DE USUARIOS ==========

  async getUsuarios(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    grupo?: number;
    sucursal?: number;
    is_active?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.grupo) queryParams.append('grupo', params.grupo.toString());
    if (params?.sucursal) queryParams.append('sucursal', params.sucursal.toString());
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

    const query = queryParams.toString();
    return this.request<UsuariosResponse>(`/api/auth/usuarios/${query ? `?${query}` : ''}`);
  }

  async getUsuario(id: number) {
    return this.request<UsuarioDetailResponse>(`/api/auth/usuarios/${id}/`);
  }

  async crearUsuario(data: UsuarioFormData) {
    return this.request<UsuarioDetailResponse>('/api/auth/usuarios/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async actualizarUsuario(id: number, data: Partial<UsuarioFormData>) {
    return this.request<UsuarioDetailResponse>(`/api/auth/usuarios/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async eliminarUsuario(id: number) {
    return this.request<{ success: boolean; message: string }>(`/api/auth/usuarios/${id}/`, {
      method: 'DELETE',
    });
  }

  async getGrupos() {
    return this.request<GruposResponse>('/api/auth/usuarios/grupos/');
  }

  async getSucursales() {
    return this.request<SucursalesResponse>('/api/auth/usuarios/sucursales/');
  }

  // ========== GESTIÓN DE SUCURSALES ==========

  async getSucursalesList(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    es_matriz?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.es_matriz !== undefined) queryParams.append('es_matriz', params.es_matriz.toString());

    const query = queryParams.toString();
    return this.request<SucursalesListResponse>(`/api/auth/sucursales/${query ? `?${query}` : ''}`);
  }

  async getSucursal(id: number) {
    return this.request<SucursalResponse>(`/api/auth/sucursales/${id}/`);
  }

  async crearSucursal(data: SucursalFormData) {
    return this.request<SucursalResponse>('/api/auth/sucursales/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async actualizarSucursal(id: number, data: Partial<SucursalFormData>) {
    return this.request<SucursalResponse>(`/api/auth/sucursales/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async eliminarSucursal(id: number) {
    return this.request<{ success: boolean; message: string }>(`/api/auth/sucursales/${id}/`, {
      method: 'DELETE',
    });
  }

  // ========== GESTIÓN DE PRODUCTOS ==========

  async getProductos(params?: {
    page?: number;
    search?: string;
    categoria?: number;
    activo?: boolean;
    page_size?: number;
    sucursal?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.categoria) queryParams.append('categoria', params.categoria.toString());
    if (params?.activo !== undefined) queryParams.append('activo', params.activo.toString());
    if (params?.sucursal) queryParams.append('sucursal', params.sucursal.toString());

    const query = queryParams.toString();
    return this.request<ProductosListResponse>(`/api/auth/productos/${query ? `?${query}` : ''}`);
  }

  async getProducto(id: number) {
    return this.request<ProductoResponse>(`/api/auth/productos/${id}/`);
  }

  async eliminarProducto(id: number) {
    return this.request<{ success: boolean; message: string }>(`/api/auth/productos/${id}/`, {
      method: 'DELETE',
    });
  }

  async crearProducto(data: any) {
    return this.request<ProductoResponse>('/api/auth/productos/', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  async uploadProductsExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{
      success: boolean;
      creados: number;
      actualizados: number;
      errores: string[];
    }>('/core/productos/carga-masiva/', {
      method: 'POST',
      body: formData,
    });
  }


  async uploadPresentationsExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{
      success: boolean;
      creados: number;
      actualizados: number;
      errores: string[];
    }>('/core/productos/carga-masiva-presentaciones/', {
      method: 'POST',
      body: formData,
    });
  }

  downloadProductsTemplate() {
    window.open(`${this.baseURL}/core/productos/descargar-plantilla/`, '_blank');
  }

  downloadPresentationsTemplate() {
    window.open(`${this.baseURL}/core/productos/descargar-plantilla-presentaciones/`, '_blank');
  }

  async actualizarProducto(id: number, data: any) {
    return this.request<ProductoResponse>(`/api/auth/productos/${id}/`, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  // ========== CATALOGOS (Categorías e Impuestos) ==========

  async getCategorias() {
    return this.request<CategoriasResponse>('/api/auth/categorias/');
  }

  async crearCategoria(data: any) {
    return this.request<any>('/api/auth/categorias/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async actualizarCategoria(id: number, data: any) {
    return this.request<any>(`/api/auth/categorias/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async eliminarCategoria(id: number) {
    return this.request<any>(`/api/auth/categorias/${id}/`, {
      method: 'DELETE'
    });
  }

  async getImpuestos() {
    return this.request<ImpuestosResponse>('/api/auth/impuestos/');
  }

  async crearImpuesto(data: any) {
    return this.request<any>('/api/auth/impuestos/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async actualizarImpuesto(id: number, data: any) {
    return this.request<any>(`/api/auth/impuestos/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async eliminarImpuesto(id: number) {
    return this.request<any>(`/api/auth/impuestos/${id}/`, {
      method: 'DELETE'
    });
  }

  // ========== PRESENTACIONES ==========

  async getPresentaciones(productoId: number) {
    return this.request<PresentacionesResponse>(`/api/auth/productos/${productoId}/presentaciones/`);
  }

  async crearPresentacion(productoId: number, data: any) {
    return this.request<any>(`/api/auth/productos/${productoId}/presentaciones/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async actualizarPresentacion(productoId: number, presentacionId: number, data: any) {
    return this.request<any>(`/api/auth/productos/${productoId}/presentaciones/${presentacionId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async eliminarPresentacion(productoId: number, presentacionId: number) {
    return this.request<any>(`/api/auth/productos/${productoId}/presentaciones/${presentacionId}/`, {
      method: 'DELETE',
    });
  }

  // ========== PROVEEDORES ==========



  async crearProveedor(data: any) {
    return this.request<any>('/api/auth/proveedores/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async actualizarProveedor(id: number, data: any) {
    return this.request<any>(`/api/auth/proveedores/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async eliminarProveedor(id: number) {
    return this.request<any>(`/api/auth/proveedores/${id}/`, {
      method: 'DELETE',
    });
  }

  // ========== INVENTARIO ==========

  async getInventario(params?: {
    page?: number;
    search?: string;
    sucursal?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sucursal) queryParams.append('sucursal', params.sucursal.toString());

    const query = queryParams.toString();
    return this.request<InventarioResponse>(`/api/auth/inventario/${query ? `?${query}` : ''}`);
  }

  async ajusteInventario(data: {
    producto_id: number;
    sucursal_id: number;
    tipo: 'ENTRADA' | 'SALIDA';
    cantidad: number;
    motivo: string;
  }) {
    return this.request<any>('/api/auth/inventario/ajuste/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async transferenciaInventario(data: {
    producto_id: number;
    origen_id: number;
    destino_id: number;
    cantidad: number;
    generar_guia?: boolean;
    transportista?: {
      ruc: string;
      razon_social: string;
      placa?: string;
    };
  }) {
    return this.request<any>('/api/auth/inventario/transferencia/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadInventario(file: File, sucursalId: number) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sucursal_id', sucursalId.toString());

    return this.request<{
      success: boolean;
      message: string;
      errors: string[];
    }>('/api/auth/inventario/carga-masiva/', {
      method: 'POST',
      body: formData,
    });
  }

  async downloadPlantillaInventario(): Promise<Blob> {
    const url = `${this.baseURL}/api/auth/inventario/plantilla/`;
    const response = await fetch(url, {
      headers: { 'X-Tenant': this.tenant },
      credentials: 'include',
    });
    if (!response.ok) throw { message: 'Error descarga', status: response.status } as ApiError;
    return response.blob();
  }

  async getMovimientos(params?: {
    page?: number;
    producto?: number;
    sucursal?: number;
    tipo?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.producto) queryParams.append('producto', params.producto.toString());
    if (params?.sucursal) queryParams.append('sucursal', params.sucursal.toString());
    if (params?.tipo) queryParams.append('tipo', params.tipo);

    const query = queryParams.toString();
    return this.request<MovimientosResponse>(`/api/auth/inventario/movimientos/${query ? `?${query}` : ''}`);
  }

  // ========== AUDITORÍA (CONTEO) ==========

  async getAuditorias(params?: {
    page?: number;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());

    return this.request<any>(`/conteo/auditorias/?${queryParams.toString()}`);
  }

  async getAuditoria(id: number) {
    return this.request<AuditoriaDetailResponse>(`/conteo/auditorias/${id}/`);
  }

  async createAuditoria(data: {
    tipo: 'INICIO_TURNO' | 'FIN_TURNO' | 'ALEATORIO';
    productos?: number[];
    aleatorio_cantidad?: number;
    categoria_id?: number;
  }) {
    return this.request<AuditoriaDetailResponse>('/conteo/auditorias/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateAuditoriaCount(id: number, items: Array<{ id: number, cantidad_fisica: number }>) {
    return this.request<any>(`/conteo/auditorias/${id}/registrar_conteo/`, {
      method: 'POST',
      body: JSON.stringify({ detalles: items })
    });
  }

  async finalizeAuditoria(id: number) {
    return this.request<AuditoriaDetailResponse>(`/conteo/auditorias/${id}/finalizar/`, {
      method: 'POST',
    });
  }

  // ========== CONFIGURACIÓN ==========

  async getConfiguracion() {
    return this.request<any>('/api/auth/configuracion/');
  }

  async updateConfiguracion(data: any) {
    return this.request<any>('/api/auth/configuracion/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async subirCertificado(formData: FormData) {
    // Nota: No usamos 'Content-Type': 'application/json' aquí, dejar que el navegador ponga el boundary
    return this.request<any>('/api/auth/configuracion/certificado/', {
      method: 'POST',
      body: formData,
      headers: {}, // Sobreescribimos headers para quitar Content-Type json default si fuera necesario, 
      // pero nuestro request helper pone json por defecto.
      // Necesitamos modificar request helper o pasar un flag.
      // Modificaremos request helper para detectar FormData
    });
  }

  // ========== TURNOS ==========

  async getTurnos() {
    return this.request<any>('/api/turnos/');
  }

  async getTurnosHistorico(params: any = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        query.append(key, params[key].toString());
      }
    });
    return this.request<any>(`/api/turnos/?${query.toString()}`);
  }

  async abrirTurno(sucursalId: number) {
    return this.request<any>('/api/turnos/abrir/', {
      method: 'POST',
      body: JSON.stringify({ sucursal_id: sucursalId }),
    });
  }

  async cerrarTurno(datos: { efectivo_total: number; tarjeta_total: number; transferencia_total: number; salidas_caja: number }) {
    return this.request<any>('/api/turnos/cerrar/', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  }

  async verificarTurno() {
    return this.request<any>('/api/turnos/verificar/');
  }

  // Ventas / POS
  async crearFacturaPOS(data: any) {
    return this.request<any>('/api/ventas/pos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHistorialVentas(params: any = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        query.append(key, params[key].toString());
      }
    });

    // Agregar timestamp para evitar caché del navegador
    query.append('_t', Date.now().toString());

    return this.request<any>(`/api/ventas/facturas/?${query.toString()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  /**
   * Método para descargar archivos (PDF, XML, Excel)
   */
  private async downloadFile(endpoint: string, filename?: string): Promise<void> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {};
    if (this.tenant !== 'public') {
      headers['X-Tenant'] = this.tenant;
    }
    // Agregar CSRF Token si existe en cookie
    const csrftoken = this.getCookie('csrftoken');
    if (csrftoken) {
      headers['X-CSRFToken'] = csrftoken;
    }

    const config: RequestInit = {
      method: 'GET',
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`Error descargando archivo: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Crear URL temporal y disparar descarga
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Intentar sacar nombre del header Content-Disposition si no se provee
      if (!filename) {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
      }

      link.setAttribute('download', filename || 'descarga');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  async getFacturacionStats() {

    return this.request<any>('/api/ventas/stats/');
  }

  async descargarFacturaPDF(facturaId: number, numeroAutorizacion?: string) {
    const filename = numeroAutorizacion ? `FACTURA-${numeroAutorizacion}.pdf` : `factura_${facturaId}.pdf`;
    return this.downloadFile(`/api/ventas/facturas/${facturaId}/pdf/`, filename);
  }

  async crearNotaCredito(data: any) {
    return this.request<any>('/api/ventas/notas-credito/nueva/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ========== RETENCIONES ==========
  async getRetenciones(params: any = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        query.append(key, params[key].toString());
      }
    });
    return this.request<RetencionesResponse>(`/api/ventas/retenciones/?${query.toString()}`);
  }

  async crearRetencion(data: CreateRetencionPayload) {
    return this.request<any>('/api/ventas/retenciones/nueva/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ========== COMPRAS ==========
  async getCompras(params: any = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        query.append(key, params[key].toString());
      }
    });
    return this.request<ComprasResponse>(`/api/compras/?${query.toString()}`);
  }

  async createCompra(data: CreateCompraPayload) {
    return this.request<any>('/api/compras/nueva/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCompraDetail(id: number) {
    return this.request<any>(`/api/auth/compras/${id}/`);
  }

  async uploadCompraXML(file: File, sucursalId: number) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sucursal_id', sucursalId.toString());

    return this.request<{
      success: boolean;
      message: string;
      compra_id?: number;
      error?: string;
    }>('/api/auth/compras/xml/', {
      method: 'POST',
      body: formData,
    });
  }

  async getProveedores(params?: { search?: string; page_size?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    const query = queryParams.toString();
    return this.request<ProveedoresResponse>(`/api/auth/proveedores/${query ? `?${query}` : ''}`);
  }

  // ========== REPORTES ==========
  async getVentasChart(params: any = {}) {
    // Correctly serialize params
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) query.append(key, params[key]);
    });
    return this.request<any>(`/api/reportes/ventas-chart/?${query.toString()}`);
  }

  async getTopProductos(params: any = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) query.append(key, params[key]);
    });
    return this.request<any>(`/api/reportes/top-productos/?${query.toString()}`);
  }

  async getResumenGeneral(params: any = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      // @ts-ignore
      if (params[key] !== undefined) query.append(key, params[key]);
    });
    return this.request<any>(`/api/reportes/resumen/?${query.toString()}`);
  }

  async getSalesReport(params: any = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      // @ts-ignore
      if (params[key] !== undefined && params[key] !== '') query.append(key, params[key]);
    });
    return this.request<any>(`/api/reportes/ventas/?${query.toString()}`);
  }

  async exportSalesExcel(params: any = {}) {
    // Retorna blob
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') query.append(key, params[key]);
    });
    const response = await fetch(`${this.baseURL}/api/reportes/ventas/excel/?${query.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('Error downloading excel');
    return response.blob();
  }



  // ========== LOGÍSTICA (GUÍAS) ==========

  async getGuias(params?: {
    page?: number;
    search?: string;
    estado_sri?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.estado_sri) queryParams.append('estado_sri', params.estado_sri);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const query = queryParams.toString();
    return this.request<any>(`/api/guias/${query ? `?${query}` : ''}`);
  }

  async getGuia(id: number) {
    return this.request<any>(`/api/guias/${id}/`);
  }

  async crearGuia(data: any) {
    return this.request<any>('/api/guias/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async enviarGuiaSRI(id: number) {
    return this.request<any>(`/api/guias/${id}/enviar_sri/`, {
      method: 'POST',
    });
  }

  async descargarGuiaXML(id: number): Promise<Blob> {
    const url = `${this.baseURL}/api/guias/${id}/descargar_xml/`;
    const response = await fetch(url, {
      headers: { 'X-Tenant': this.tenant },
      credentials: 'include',
    });
    if (!response.ok) throw { message: 'Error descarga XML', status: response.status } as ApiError;
    return response.blob();
  }

  async descargarGuiaPDF(id: number, filename?: string) {
    if (!filename) filename = `guia_${id}.pdf`;
    const url = `${this.baseURL}/api/guias/${id}/descargar_pdf/`;

    try {
      const response = await fetch(url, {
        headers: { 'X-Tenant': this.tenant },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Error descargando PDF');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download PDF error:', error);
      throw error;
    }
  }

  // ========== CONTABILIDAD ==========

  async getAsientos(params?: {
    page?: number;
    search?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const query = queryParams.toString();
    return this.request<any>(`/api/contabilidad/asientos/${query ? `?${query}` : ''}`);
  }

  async getPlanCuentas(params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const query = queryParams.toString();
    // Use the Auth API path consistent with other secure endpoints
    return this.request<PlanCuentasResponse>(`/api/auth/contabilidad/plan-cuentas/${query ? `?${query}` : ''}`);
  }

  async crearCuentaContable(data: CreatePlanCuentaPayload) {
    return this.request<PlanCuenta>('/api/auth/contabilidad/plan-cuentas/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async actualizarCuentaContable(id: number, data: Partial<CreatePlanCuentaPayload>) {
    return this.request<PlanCuenta>(`/api/auth/contabilidad/plan-cuentas/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async eliminarCuentaContable(id: number) {
    return this.request<any>(`/api/auth/contabilidad/plan-cuentas/${id}/`, {
      method: 'DELETE',
    });
  }
}

/**
 * Hook para obtener el cliente API con detección automática de tenant
 * El tenant se detecta automáticamente del subdominio de la URL
 */
export function getApiClient(hostname?: string): ApiClient {
  return new ApiClient(hostname);
}

// ========== FUNCIONES DE CONVENIENCIA ==========

export async function buscarEmpresas(termino: string) {
  const client = getApiClient();
  return client.buscarEmpresas(termino);
}

export async function login(username: string, password: string) {
  const client = getApiClient();
  return client.login(username, password);
}

export async function logout() {
  const client = getApiClient();
  return client.logout();
}

export async function getCurrentUser() {
  const client = getApiClient();
  return client.getCurrentUser();
}

export async function getTurnoActivo() {
  const client = getApiClient();
  return client.getTurnoActivo();
}
