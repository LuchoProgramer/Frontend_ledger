#!/bin/bash
# Post-build script para preparar OpenNext para Cloudflare Pages

echo "📦 Preparando output de OpenNext para Cloudflare Pages..."

# Cloudflare Pages busca _worker.js en la raíz del output directory
cp .open-next/worker.js .open-next/_worker.js

echo "✅ Worker copiado a .open-next/_worker.js"
echo "🚀 Listo para deploy en Cloudflare Pages"
