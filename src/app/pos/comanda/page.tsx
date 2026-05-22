'use client';

import { useEffect, useState } from 'react';

interface ComandaItem {
  nombre: string;
  cantidad: number;
}

interface ComandaData {
  numero: string;
  fecha: string;
  items: ComandaItem[];
}

export default function ComandaCocina() {
  const [data, setData] = useState<ComandaData | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('posComanda');
    if (raw) setData(JSON.parse(raw));
  }, []);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (!data) {
    return (
      <div style={{ fontFamily: 'monospace', padding: 16, textAlign: 'center' }}>
        Sin datos de comanda.
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; background: white; font-weight: bold; color: #000; }
        .comanda { width: 72mm; padding: 4mm 2mm; }
        .center { text-align: center; }
        .titulo { font-size: 17px; font-weight: bold; letter-spacing: 2px; }
        .numero { font-size: 32px; font-weight: bold; }
        .hora { font-size: 13px; font-weight: bold; }
        .divider { border-top: 3px solid #000; margin: 5px 0; }
        .item { display: flex; align-items: baseline; gap: 6px; margin: 8px 0; }
        .qty { font-size: 26px; font-weight: bold; min-width: 32px; }
        .nombre { font-size: 17px; font-weight: bold; line-height: 1.2; }
        @media print {
          @page { size: 72mm auto; margin: 0; }
          body { width: 72mm; }
          .comanda { padding: 2mm 1mm; }
        }
      `}</style>

      <div className="comanda">
        <div className="center">
          <div className="titulo">— COCINA —</div>
          <div className="numero">#{data.numero}</div>
          <div className="hora">{data.fecha}</div>
        </div>

        <div className="divider" />

        {data.items.map((item, i) => (
          <div key={i} className="item">
            <span className="qty">{item.cantidad}x</span>
            <span className="nombre">{item.nombre}</span>
          </div>
        ))}

        <div className="divider" />
      </div>
    </>
  );
}
