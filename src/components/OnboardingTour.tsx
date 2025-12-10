'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '@/contexts/AuthContext';

export default function OnboardingTour() {
    const { user } = useAuth();

    useEffect(() => {
        // Solo mostrar si el usuario está autenticado
        if (!user) return;

        // Verificar si ya vio el tour
        const hasSeenTour = localStorage.getItem('onboarding_seen');
        if (hasSeenTour) return;

        const driverObj = driver({
            showProgress: true,
            animate: true,
            doneBtnText: '¡Entendido!',
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            steps: [
                {
                    element: '#dashboard-header-title',
                    popover: {
                        title: 'Bienvenido a LedgerXpertz',
                        description: 'Este es tu sistema integral de facturación e inventario. Aquí tienes un resumen rápido.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: 'aside nav',
                    popover: {
                        title: 'Menú Principal',
                        description: 'Aquí encontrarás todos los módulos del sistema: Ventas, Compras, Inventario y Facturación SRI.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#ai-chat-widget',
                    popover: {
                        title: 'Tu Copiloto IA',
                        description: '¿Tienes dudas sobre impuestos o cómo usar el sistema? Pregúntale a nuestro asistente inteligente en cualquier momento.',
                        side: 'left',
                        align: 'start'
                    }
                },
                {
                    element: '#user-profile-menu',
                    popover: {
                        title: 'Tu Perfil',
                        description: 'Gestiona tu cuenta, cambia tu contraseña y cierra sesión desde aquí.',
                        side: 'bottom',
                        align: 'end'
                    }
                }
            ],
            onDestroyed: () => {
                // Marcar como visto al finalizar o cerrar
                localStorage.setItem('onboarding_seen', 'true');
            }
        });

        // Pequeño delay para asegurar que la UI cargó
        const timer = setTimeout(() => {
            driverObj.drive();
        }, 1500);

        return () => clearTimeout(timer);
    }, [user]);

    return null; // Este componente no renderiza UI por sí mismo
}
