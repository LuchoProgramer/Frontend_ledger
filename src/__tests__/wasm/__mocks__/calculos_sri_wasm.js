// Mock del glue generado por wasm-pack. 
// En tests Jest solo probamos calcularTotalesJS (fallback puro TS).
// El WASM real se prueba via cargo test en Rust.
module.exports = {
  default: async () => {},
  calcular_carrito: () => '{}',
};
