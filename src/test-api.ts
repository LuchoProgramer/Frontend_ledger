// src/test-api.ts (Script de validación Post-Deploy)

/**
 * Script para probar la conectividad con el API de LedgerXpertz
 * Ideal para ejecutar después del deploy en Cloudflare Pages
 * 
 * Uso: npx tsx src/test-api.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ledgerxpertz.com/api';
const TENANT_TEST = 'public'; // O el tenant que quieras probar

async function testAPI() {
    console.log('🧪 Iniciando pruebas de conectividad API...');
    console.log(`📡 URL Objetivo: ${API_URL}`);
    console.log(`🏢 Tenant Header: ${TENANT_TEST}`);
    console.log('----------------------------------------');

    try {
        // 1. Prueba de Healthcheck / Root
        console.log('1️⃣  Probando endpoint público (Categorías)...');
        const start = Date.now();

        // Usamos node-fetch o fetch nativo de Node 18+
        const response = await fetch(`${API_URL}/auth/categorias/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant': TENANT_TEST,
                // Simulamos un User-Agent de navegador
                'User-Agent': 'Cloudflare-Migration-Test-Script/1.0',
            },
        });

        const duration = Date.now() - start;
        console.log(`   ⏱️  Latencia: ${duration}ms`);
        console.log(`   📊 Status Code: ${response.status} ${response.statusText}`);

        // Verificar CORS headers relevantes
        console.log('   🛡️  CORS Headers recibidos:');
        const corsHeaders = [
            'access-control-allow-origin',
            'access-control-allow-credentials',
            'access-control-allow-headers'
        ];

        let hasCors = false;
        response.headers.forEach((val, key) => {
            if (corsHeaders.includes(key.toLowerCase())) {
                console.log(`      - ${key}: ${val}`);
                hasCors = true;
            }
        });

        if (!hasCors) {
            console.warn('   ⚠️  ALERTA: No se detectaron headers CORS explícitos. (Normal si es request server-to-server, pero crítico para browser)');
        }

        if (response.ok) {
            const data = await response.json();
            console.log('   ✅ Respuesta JSON válida recibida.');
            // Opcional: mostrar un resumen de datos
            if (Array.isArray(data)) {
                console.log(`   📦 Datos recibidos: ${data.length} items`);
            }
            console.log('   ✅ PRUEBA 1 EXITOSA');
        } else {
            console.error('   ❌ PRUEBA 1 FALLIDA: Status no es OK');
            console.error(await response.text());
        }

    } catch (error) {
        console.error('❌ Error fatal en la prueba:');
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
            if ('cause' in error) console.error('   Causa probable: Error de red o DNS', (error as any).cause);
        } else {
            console.error(error);
        }
    }
}

// Ejecutar
testAPI();
