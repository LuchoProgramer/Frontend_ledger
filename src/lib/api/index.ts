export type { ApiError } from './_base';
import { ApiClientBase } from './_base';
import { AuthMixin } from './_auth';
import { EmpresasMixin } from './_empresas';
import { SucursalesMixin } from './_sucursales';
import { ProductosMixin } from './_productos';
import { InventarioMixin } from './_inventario';
import { CombosMixin } from './_combos';
import { TurnosMixin } from './_turnos';
import { VentasMixin } from './_ventas';
import { TercerosMixin } from './_terceros';
import { ComprasMixin } from './_compras';
import { GuiasMixin } from './_guias';
import { ReportesMixin } from './_reportes';
import { ContabilidadMixin } from './_contabilidad';

// Compose all domain mixins into a single ApiClient class
const ComposedApiClient = ContabilidadMixin(
  ReportesMixin(
    GuiasMixin(
      ComprasMixin(
        TercerosMixin(
          VentasMixin(
            TurnosMixin(
              CombosMixin(
                InventarioMixin(
                  ProductosMixin(
                    SucursalesMixin(
                      EmpresasMixin(
                        AuthMixin(
                          ApiClientBase
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
);

export class ApiClient extends ComposedApiClient {}

export function getApiClient(hostname?: string): ApiClient {
  return new ApiClient(hostname);
}

// ── Convenience standalone functions ──────────────────────────────────────────

export async function buscarEmpresas(termino: string) {
  return getApiClient().buscarEmpresas(termino);
}

export async function login(username: string, password: string) {
  return getApiClient().login(username, password);
}

export async function logout() {
  return getApiClient().logout();
}

export async function getCurrentUser() {
  return getApiClient().getCurrentUser();
}

export async function getTurnoActivo() {
  return getApiClient().getTurnoActivo();
}
