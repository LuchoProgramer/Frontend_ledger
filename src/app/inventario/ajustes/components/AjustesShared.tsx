import { AlertCircle } from 'lucide-react';
import type { ProductoConStock } from '../_types';

export function ProductoBadge({ product }: { product: ProductoConStock }) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
      <p className="text-xs text-indigo-500 uppercase tracking-wide font-medium mb-0.5">Producto</p>
      <p className="font-semibold text-indigo-900">{product.nombre}</p>
      <p className="text-xs text-indigo-600 mt-0.5">
        {product.codigo_producto} · Stock total: {product.stock_total_global} uds
      </p>
    </div>
  );
}

export function ContextoBadge({ product, sucursal }: {
  product: ProductoConStock;
  sucursal: { nombre: string; currentStock: number };
}) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
      <p className="text-xs text-indigo-500 uppercase tracking-wide font-medium mb-0.5">{sucursal.nombre}</p>
      <p className="font-semibold text-indigo-900">{product.nombre}</p>
      <p className="text-sm text-indigo-700 mt-1">
        Stock actual: <span className="font-bold">{sucursal.currentStock} unidades</span>
      </p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

export function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 text-right">{children}</dd>
    </div>
  );
}
