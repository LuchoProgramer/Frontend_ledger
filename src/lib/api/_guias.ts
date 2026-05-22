import type { ApiClientBase, ApiError } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function GuiasMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async getGuias(params?: {
      page?: number; search?: string; estado_sri?: string; start_date?: string; end_date?: string;
    }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.search) q.append('search', params.search);
      if (params?.estado_sri) q.append('estado_sri', params.estado_sri);
      if (params?.start_date) q.append('start_date', params.start_date);
      if (params?.end_date) q.append('end_date', params.end_date);
      return this.request<any>(`/api/guias/${q.toString() ? `?${q}` : ''}`);
    }

    async getGuia(id: number) {
      return this.request<any>(`/api/guias/${id}/`);
    }

    async crearGuia(data: any) {
      return this.request<any>('/api/guias/', { method: 'POST', body: JSON.stringify(data) });
    }

    async enviarGuiaSRI(id: number) {
      return this.request<any>(`/api/guias/${id}/enviar_sri/`, { method: 'POST' });
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
  };
}
