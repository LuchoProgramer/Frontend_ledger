'use client';

import { useEffect, useState } from 'react';
import { loadRecibo } from '../lib/printStore';
import { getTenant, TENANTS_CON_COMANDA_AUTOMATICA } from '@/lib/tenant';

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
  numero_pedido?: string;
  telefono_gerente?: string;
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsLoading(params.get('loading') === 'true');
    const id = params.get('id');
    if (id) {
      const d = loadRecibo<ReciboData>(id);
      if (d) setData(d);
    } else {
      const raw = localStorage.getItem('posRecibo');
      if (raw) {
        try {
          setData(JSON.parse(raw));
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (data && !isLoading) {
      const t = setTimeout(() => {
        window.print();
        setPrinted(true);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [data, isLoading]);

  // Also mark as printed when print dialog closes
  useEffect(() => {
    const handler = () => {
      setPrinted(true);
      const tenant = getTenant();
      if (TENANTS_CON_COMANDA_AUTOMATICA.includes(tenant)) {
        const id = new URLSearchParams(window.location.search).get('id');
        if (id) {
          window.location.href = `/pos/comanda?id=${id}`;
        }
      }
    };
    window.addEventListener('afterprint', handler);
    return () => window.removeEventListener('afterprint', handler);
  }, []);

  if (isLoading) {
    return (
      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '32px 16px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        color: '#4f46e5',
        background: 'white'
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #4f46e5',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Procesando Venta...</div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Por favor, espere. El recibo se generará automáticamente.</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ fontFamily: 'monospace', padding: '16px', textAlign: 'center', background: 'white' }}>
        Sin datos de recibo.
      </div>
    );
  }

  const fmt = (n: any) => {
    const val = parseFloat(n);
    return isNaN(val) ? '0.00' : val.toFixed(2);
  };

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
          {data.telefono_gerente && <div>Telf: {data.telefono_gerente}</div>}
          <div>{data.fecha}</div>
          {data.numero_pedido && <div style={{ fontSize: '13px', margin: '3px 0', fontWeight: 'bold' }}>PEDIDO: #{data.numero_pedido}</div>}
        </div>

        <div className="divider-solid" />
        <div>Cliente: {data.cliente}</div>
        <div className="divider" />

        <table>
          <tbody>
            {(data.items || []).map((item, i) => (
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
            {(data.pagos || []).map((p, i) => (
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

      {/* Botón visible solo en pantalla, oculto al imprimir y si no es automática */}
      {!TENANTS_CON_COMANDA_AUTOMATICA.includes(getTenant()) && (
        <button
          className="btn-comanda"
          onClick={() => {
            const id = new URLSearchParams(window.location.search).get('id');
            window.open(`/pos/comanda?id=${id}`, 'pos_comanda');
          }}
        >
          Imprimir Comanda Cocina
        </button>
      )}
    </>
  );
}
