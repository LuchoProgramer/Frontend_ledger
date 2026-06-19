import { getApiUrl, getTenantFromHostname } from '../tenant';

export interface ApiError {
  message: string;
  status: number;
  data?: any;
}

// Module-level refresh coordination shared across all ApiClient instances
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function drainQueue(error: unknown = null): void {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(undefined);
  });
  pendingQueue = [];
}

export class ApiClientBase {
  protected baseURL: string;
  protected tenant: string;

  constructor(hostname?: string) {
    this.tenant = getTenantFromHostname(hostname);
    this.baseURL = getApiUrl(hostname);
  }

  getImageUrl(imagePath?: string | null): string | null {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.ledgerxpertz.com/api';
    const backendUrl = backendBaseUrl.replace(/\/api\/?$/, '');
    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${backendUrl}${path}`;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.tenant !== 'public') {
      headers['X-Tenant'] = this.tenant;
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
        credentials: 'include',
      });

      console.log('[ApiClient] Response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          const text = await response.text();
          console.warn('[ApiClient] Respuesta no-JSON recibida:', {
            url, status: response.status, contentType, textPreview: text.substring(0, 200)
          });
          responseData = { error: text || 'Respuesta no válida del servidor' };
        }
      } catch (parseError) {
        console.error('[ApiClient] Error parseando respuesta:', parseError);
        responseData = { error: 'Error parseando respuesta del servidor' };
      }

      if (response.status === 401 && !isRetry
          && endpoint !== '/api/auth/refresh/'
          && endpoint !== '/api/auth/login/') {
        return this.refreshAndRetry<T>(endpoint, options);
      }

      if (!response.ok) {
        const errorMessage = responseData?.detail
          || responseData?.error
          || responseData?.message
          || response.statusText
          || 'Error en la petición';

        if (response.status !== 401) {
          console.error('[ApiClient] Request failed:', { url, status: response.status, errorMessage, responseData, contentType });
        } else {
          console.log('[ApiClient] No autenticado (401):', { url, endpoint });
        }

        throw { message: errorMessage, status: response.status, data: responseData } as ApiError;
      }

      return responseData;
    } catch (error) {
      if ((error as ApiError).status) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión con el servidor';
      throw { message: errorMessage, status: 0, data: error } as ApiError;
    }
  }

  private async refreshToken(): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.tenant !== 'public') headers['X-Tenant'] = this.tenant;

    const response = await fetch(`${this.baseURL}/api/auth/refresh/`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw { message: 'Sesión expirada', status: response.status } as ApiError;
    }
  }

  private async refreshAndRetry<T>(endpoint: string, options: RequestInit): Promise<T> {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        pendingQueue.push({ resolve: resolve as (value: unknown) => void, reject });
      }).then(() => this.request<T>(endpoint, options, true));
    }

    isRefreshing = true;
    try {
      await this.refreshToken();
      drainQueue();
      return this.request<T>(endpoint, options, true);
    } catch (error) {
      drainQueue(error);
      // Desloguear SOLO ante un rechazo de auth REAL del endpoint de refresh
      // (401/403 → refresh token inválido/expirado). Un error de red transitorio
      // —fetch lanzó (sin `status`), `status === 0`, u offline— NO debe matar una
      // sesión válida (el refresh token dura 7 días). Esto pasaba al volver de
      // minimizar el POS: la red de la tablet tardaba en despertar, el fetch del
      // refresh fallaba y se deslogueaba al cajero pese a tener sesión viva.
      const status = (error as ApiError)?.status;
      const esRechazoAuth = status === 401 || status === 403;
      if (esRechazoAuth && typeof window !== 'undefined') {
        localStorage.removeItem('user');
        const isLoginPage = window.location.pathname === '/login'
          || window.location.pathname.endsWith('/login');
        if (!isLoginPage) window.location.href = '/login';
      }
      throw error;
    } finally {
      isRefreshing = false;
    }
  }

  protected async downloadFile(endpoint: string, filename?: string): Promise<void> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {};
    if (this.tenant !== 'public') headers['X-Tenant'] = this.tenant;

    try {
      const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
      if (!response.ok) throw new Error(`Error descargando archivo: ${response.statusText}`);

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      if (!filename) {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
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
}
