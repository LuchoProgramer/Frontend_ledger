/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportarRetencionModal from '@/app/retenciones-recibidas/components/ImportarRetencionModal';

const CLAVE = '3107202607179135052900120010010000229472510564815';

describe('ImportarRetencionModal', () => {
  it('importa por clave de acceso cuando todo sale bien', async () => {
    const onImportar = jest.fn().mockResolvedValue(undefined);
    const onCrearManual = jest.fn();
    const onClose = jest.fn();
    render(<ImportarRetencionModal onImportar={onImportar} onCrearManual={onCrearManual} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('49 dígitos de la clave de acceso'), { target: { value: CLAVE } });
    fireEvent.click(screen.getByText('Importar'));

    await waitFor(() => expect(onImportar).toHaveBeenCalledWith(CLAVE));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onCrearManual).not.toHaveBeenCalled();
  });

  it('muestra el botón de carga manual solo cuando el error es 404', async () => {
    const onImportar = jest.fn().mockRejectedValue({ message: 'El SRI no tiene un comprobante autorizado con esa clave.', status: 404 });
    const onCrearManual = jest.fn();
    render(<ImportarRetencionModal onImportar={onImportar} onCrearManual={onCrearManual} onClose={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('49 dígitos de la clave de acceso'), { target: { value: CLAVE } });
    fireEvent.click(screen.getByText('Importar'));

    expect(await screen.findByText('Cargar los datos a mano')).toBeTruthy();
  });

  it('NO muestra el botón de carga manual si el error no es 404', async () => {
    const onImportar = jest.fn().mockRejectedValue({ message: 'Esta retención ya fue importada.', status: 409 });
    render(<ImportarRetencionModal onImportar={onImportar} onCrearManual={jest.fn()} onClose={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('49 dígitos de la clave de acceso'), { target: { value: CLAVE } });
    fireEvent.click(screen.getByText('Importar'));

    await screen.findByText('Esta retención ya fue importada.');
    expect(screen.queryByText('Cargar los datos a mano')).toBeNull();
  });

  it('click en "Cargar los datos a mano" abre el formulario manual con la clave precargada', async () => {
    const onImportar = jest.fn().mockRejectedValue({ message: 'no encontrado', status: 404 });
    render(<ImportarRetencionModal onImportar={onImportar} onCrearManual={jest.fn()} onClose={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('49 dígitos de la clave de acceso'), { target: { value: CLAVE } });
    fireEvent.click(screen.getByText('Importar'));
    fireEvent.click(await screen.findByText('Cargar los datos a mano'));

    expect(await screen.findByText('Número de documento')).toBeTruthy();
    const claveInput = screen.getByDisplayValue(CLAVE) as HTMLInputElement;
    expect(claveInput.readOnly).toBe(true);
  });

  it('envía el formulario manual con el payload correcto', async () => {
    const onImportar = jest.fn().mockRejectedValue({ message: 'no encontrado', status: 404 });
    const onCrearManual = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    render(<ImportarRetencionModal onImportar={onImportar} onCrearManual={onCrearManual} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('49 dígitos de la clave de acceso'), { target: { value: CLAVE } });
    fireEvent.click(screen.getByText('Importar'));
    fireEvent.click(await screen.findByText('Cargar los datos a mano'));

    fireEvent.change(await screen.findByLabelText('Número de documento'), { target: { value: '001-001-000022305' } });
    fireEvent.change(screen.getByLabelText('Fecha de emisión'), { target: { value: '2026-04-23' } });
    fireEvent.change(screen.getByLabelText('Período fiscal'), { target: { value: '04/2026' } });
    fireEvent.change(screen.getByLabelText('RUC del agente de retención'), { target: { value: '1791350529001' } });
    fireEvent.change(screen.getByLabelText('Razón social del agente de retención'), { target: { value: 'ECUAEMPAQUES S.A' } });
    fireEvent.change(screen.getByLabelText('Número de factura sustento'), { target: { value: '001-001-000000001' } });
    fireEvent.change(screen.getByLabelText('Código de retención'), { target: { value: '3440' } });
    fireEvent.change(screen.getByLabelText('Base imponible'), { target: { value: '1150.00' } });
    fireEvent.change(screen.getByLabelText('Porcentaje'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Valor retenido'), { target: { value: '34.50' } });

    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => expect(onCrearManual).toHaveBeenCalledWith({
      clave_acceso: CLAVE,
      numero_documento: '001-001-000022305',
      fecha_emision: '2026-04-23',
      periodo_fiscal: '04/2026',
      ruc_agente_retencion: '1791350529001',
      razon_social_agente_retencion: 'ECUAEMPAQUES S.A',
      numero_factura_sustento: '001-001-000000001',
      detalles: [{
        codigo_impuesto: '1', codigo_retencion: '3440',
        base_imponible: '1150.00', porcentaje_retener: '3', valor_retenido: '34.50',
      }],
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
