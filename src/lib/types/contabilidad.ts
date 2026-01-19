export interface PlanCuenta {
    id: number;
    codigo: string;
    nombre: string;
    tipo: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'COSTO';
    nivel: number;
    padre: number | null;
    es_cuenta_movimiento: boolean;
    activo: boolean;
    children?: PlanCuenta[]; // Para la vista de árbol
}

export interface PlanCuentasResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: PlanCuenta[];
}

export interface CreatePlanCuentaPayload {
    codigo: string;
    nombre: string;
    tipo: string;
    padre?: number | null;
    es_cuenta_movimiento: boolean;
}
