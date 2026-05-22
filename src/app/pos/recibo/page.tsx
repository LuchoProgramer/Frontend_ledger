'use client';

import { useEffect, useState } from 'react';

interface ReciboItem {
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

interface ReciboPago {
  descripcion: string;
  total: number;
}

interface ReciboData {
  negocio: string;
  sucursal: string;
  fecha: string;
  items: ReciboItem[];
  subtotal: number;
  iva: number;
  total: number;
  pagos: ReciboPago[];
  cambio: number;
  numero_autorizacion: string;
  cliente: string;
}

export default function ReciboPOS() {
  const [data, setData] = useState<ReciboData | null>(null);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('posRecibo');
    if (raw) setData(JSON.parse(raw));
  }, []);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => {
        window.print();
        setPrinted(true);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [data]);

  // Also mark as printed when print dialog closes
  useEffect(() => {
    const handler = () => setPrinted(true);
    window.addEventListener('afterprint', handler);
    return () => window.removeEventListener('afterprint', handler);
  }, []);

  if (!data) {
    return (
      <div style={{ fontFamily: 'monospace', padding: '16px', textAlign: 'center' }}>
        Sin datos de recibo.
      </div>
    );
  }

  const fmt = (n: number) => n.toFixed(2);

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; font-weight: bold; color: #000; background: white; }
        .recibo { width: 72mm; padding: 4mm 2mm; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .negocio { font-size: 14px; font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 3px 0; }
        .divider-solid { border-top: 2px solid #000; margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; vertical-align: top; font-weight: bold; }
        td.right { text-align: right; white-space: nowrap; width: 48px; }
        .total-row td { font-weight: bold; font-size: 13px; }
        .auth { font-size: 9px; word-break: break-all; font-weight: bold; }
        .btn-comanda {
          display: block;
          width: 72mm;
          margin-top: 12px;
          padding: 10px;
          background: #f97316;
          color: white;
          font-family: sans-serif;
          font-size: 14px;
          font-weight: bold;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
        }
        .btn-comanda:active { background: #ea6c00; }
        @media print {
          @page { size: 72mm auto; margin: 0; }
          body { width: 72mm; }
          .recibo { padding: 2mm 1mm; }
          .btn-comanda { display: none; }
        }
      `}</style>

      <div className="recibo">
        <div className="center">
          <div className="negocio">{data.negocio}</div>
          <div>{data.sucursal}</div>
          <div>{data.fecha}</div>
        </div>

        <div className="divider-solid" />
        <div>Cliente: {data.cliente}</div>
        <div className="divider" />

        <table>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td>{item.cantidad}x {item.nombre}</td>
                <td className="right">${fmt(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="divider" />

        <table>
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="right">${fmt(data.subtotal)}</td>
            </tr>
            <tr>
              <td>IVA 15%</td>
              <td className="right">${fmt(data.iva)}</td>
            </tr>
            <tr className="total-row">
              <td>TOTAL</td>
              <td className="right">${fmt(data.total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="divider" />

        <table>
          <tbody>
            {data.pagos.map((p, i) => (
              <tr key={i}>
                <td>{p.descripcion}</td>
                <td className="right">${fmt(p.total)}</td>
              </tr>
            ))}
            {data.cambio > 0.005 && (
              <tr>
                <td>Cambio</td>
                <td className="right">${fmt(data.cambio)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="divider-solid" />
        <div className="center bold">Gracias por su compra</div>

        {data.numero_autorizacion && (
          <>
            <div className="divider" />
            <div className="auth center">Aut: {data.numero_autorizacion}</div>
          </>
        )}
      </div>

      {/* Botón visible solo en pantalla, oculto al imprimir */}
      <button
        className="btn-comanda"
        onClick={() => window.open('/pos/comanda', '_blank')}
      >
        Imprimir Comanda Cocina
      </button>
    </>
  );
}
