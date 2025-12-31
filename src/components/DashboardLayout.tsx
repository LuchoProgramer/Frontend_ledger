'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import AIChatWidget from './ui/AIChatWidget';
import OnboardingTour from './OnboardingTour';
import {
    Package,
    ShoppingCart,
    Truck,
    BarChart3,
    FileText,
    Settings,
    Users,
    Store,
    Lock,
    ClipboardList,
    Plus,
    Tag,
    History,
    TrendingUp,
    Briefcase,
    ShieldCheck,
    CreditCard,
    Receipt,
    Calculator,
    LayoutDashboard
} from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, loading: authLoading } = useAuth();
    const [tenant, setTenant] = useState<string>('cargando...');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Detectar tenant
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            if (parts.length > 2) {
                setTenant(parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
            } else {
                setTenant('Empresa');
            }
        }
    }, []);

    const hasRole = (roles: string[]) => {
        if (!user) return false;
        if (user.is_superuser || user.is_staff) return true;

        // Admin group check
        if (user.groups?.includes('Administrador')) return true;

        // Check required roles
        return roles.some(role => user.groups?.includes(role));
    };

    interface MenuItem {
        title: string;
        icon: React.ReactNode;
        allowedRoles?: string[];
        items: {
            name: string;
            href: string;
            icon: React.ReactNode;
        }[];
    }

    const menuItems: MenuItem[] = [
        {
            title: 'Productos',
            icon: <Package className="w-5 h-5" />,
            allowedRoles: ['Administrador', 'Bodeguero'],
            items: [
                { name: 'Listar Productos', href: '/productos', icon: <ClipboardList className="w-4 h-4" /> },
                { name: 'Agregar Producto', href: '/productos/nuevo', icon: <Plus className="w-4 h-4" /> },
                { name: 'Categorías', href: '/categorias', icon: <Tag className="w-4 h-4" /> },
            ]
        },
        {
            title: 'Ventas',
            icon: <ShoppingCart className="w-5 h-5" />,
            allowedRoles: ['Administrador', 'Vendedor'],
            items: [
                { name: 'Punto de Venta (POS)', href: '/pos', icon: <Store className="w-4 h-4" /> },
                { name: 'Historial de Ventas', href: '/ventas', icon: <History className="w-4 h-4" /> },
                { name: 'Historial de Cajas', href: '/turnos', icon: <Briefcase className="w-4 h-4" /> },
                { name: 'Reportes de Ventas', href: '/reportes', icon: <TrendingUp className="w-4 h-4" /> },
            ]
        },
        {
            title: 'Compras',
            icon: <Truck className="w-5 h-5" />,
            allowedRoles: ['Administrador', 'Bodeguero'],
            items: [
                { name: 'Registrar Compra', href: '/compras/nueva', icon: <Plus className="w-4 h-4" /> },
                { name: 'Historial de Compras', href: '/compras', icon: <ClipboardList className="w-4 h-4" /> },
                { name: 'Proveedores', href: '/proveedores', icon: <Users className="w-4 h-4" /> },
            ]
        },
        {
            title: 'Inventario',
            icon: <BarChart3 className="w-5 h-5" />,
            allowedRoles: ['Administrador', 'Bodeguero', 'Vendedor'],
            items: [
                { name: 'Gestión de Stock', href: '/inventario', icon: <Package className="w-4 h-4" /> },
                { name: 'Auditoría', href: '/inventario/auditoria', icon: <ShieldCheck className="w-4 h-4" /> },
            ]
        },
        {
            title: 'Facturación SRI',
            icon: <FileText className="w-5 h-5" />,
            allowedRoles: ['Administrador'],
            items: [
                { name: 'Dashboard SRI', href: '/facturacion', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'Notas de Crédito', href: '/facturacion/notas-credito', icon: <Receipt className="w-4 h-4" /> },
                { name: 'Retenciones', href: '/facturacion/retenciones', icon: <CreditCard className="w-4 h-4" /> },
                { name: 'Gestionar Impuestos', href: '/impuestos', icon: <Calculator className="w-4 h-4" /> },
            ]
        },
        {
            title: 'Configuración',
            icon: <Settings className="w-5 h-5" />,
            allowedRoles: ['Administrador'],
            items: [
                { name: 'Usuarios', href: '/usuarios', icon: <Users className="w-4 h-4" /> },
                { name: 'Sucursales', href: '/sucursales', icon: <Store className="w-4 h-4" /> },
                { name: 'Certificados Digitales', href: '/certificados', icon: <Lock className="w-4 h-4" /> },
                { name: 'Configuración General', href: '/configuracion', icon: <Settings className="w-4 h-4" /> },
            ]
        },
    ];

    const filteredMenuItems = menuItems.filter(section => {
        if (!section.allowedRoles) return true; // Public if undefined
        return hasRole(section.allowedRoles);
    });

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            {/* Hamburger Button (Mobile Only) */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            >
                                <span className="sr-only">Open menu</span>
                                {/* Icon menu */}
                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            <div className="flex items-center space-x-4 cursor-pointer" onClick={() => router.push('/')}>
                                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">LX</span>
                                </div>
                                <div>
                                    <h1 id="dashboard-header-title" className="text-xl font-bold text-gray-900 hidden md:block">LedgerXpertz</h1>
                                    <p className="text-xs text-gray-500 hidden md:block">{tenant}</p>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Menu - could be expanded but sticking to dashboard links for now */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/')}
                                className="hidden md:block px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
                            >
                                Dashboard
                            </button>
                            <div id="user-profile-menu" className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900">{user?.first_name || user?.username}</p>
                                <p className="text-xs text-gray-500">Administrador</p>
                            </div>
                            <button
                                onClick={logout}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                            >
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay & Panel */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    ></div>

                    {/* Menu Panel */}
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white transition ease-in-out duration-300 transform translate-x-0">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                            <button
                                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="sr-only">Close sidebar</span>
                                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Mobile Sidebar Content */}
                        <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                            <div className="flex-shrink-0 flex items-center px-4 mb-5">
                                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                                    <span className="text-white font-bold text-lg">LX</span>
                                </div>
                                <h1 className="text-xl font-bold text-gray-900">LedgerXpertz</h1>
                            </div>
                            <nav className="mt-5 px-2 space-y-8">
                                {filteredMenuItems.map((section) => (
                                    <div key={section.title}>
                                        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                                            <span className="mr-2">{section.icon}</span> {section.title}
                                        </h3>
                                        <div className="space-y-1">
                                            {section.items.map((item) => {
                                                const isActive = pathname === item.href;
                                                return (
                                                    <button
                                                        key={item.name}
                                                        onClick={() => router.push(item.href)}
                                                        className={`group flex items-center px-3 py-2 text-base font-medium rounded-md w-full ${isActive
                                                            ? 'bg-indigo-50 text-indigo-700'
                                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                                            }`}
                                                    >
                                                        <span className="mr-3 text-lg opacity-75">{item.icon}</span>
                                                        {item.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </div>
                    <div className="flex-shrink-0 w-14">{/* Force sidebar to shrink to fit close icon */}</div>
                </div>
            )}

            <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-6">
                {/* Desktop Sidebar (hidden on mobile) */}
                <aside className="hidden lg:block w-64 flex-shrink-0">
                    <nav className="space-y-6">
                        {filteredMenuItems.map((section) => (
                            <div key={section.title}>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                                    <span className="mr-2">{section.icon}</span> {section.title}
                                </h3>
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <button
                                                key={item.name}
                                                onClick={() => router.push(item.href)}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${isActive
                                                    ? 'bg-indigo-50 text-indigo-700'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <span className="mr-2 opacity-75">{item.icon}</span>
                                                {item.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Content Area */}
                <main className="flex-1 min-w-0">
                    {children}
                </main>
            </div>
            <div id="ai-chat-widget">
                <AIChatWidget />
            </div>
            <OnboardingTour />
        </div >
    );
}
