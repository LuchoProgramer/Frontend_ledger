'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalModalProps {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
}

export default function PortalModal({ children, isOpen, onClose }: PortalModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    // Portal to document.body
    return createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-900/50 backdrop-blur-sm"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                {/* Centering trick */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal Content Wrapper */}
                <div
                    className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[10000]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    {/* Close Button */}
                    <div className="absolute top-0 right-0 pt-4 pr-4 block">
                        <button
                            type="button"
                            className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            onClick={onClose}
                        >
                            <span className="sr-only">Cerrar</span>
                            {/* Heroicon 24px/solid/x */}
                            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
