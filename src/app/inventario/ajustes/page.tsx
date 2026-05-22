'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { SlidersHorizontal, Layers } from 'lucide-react';
import { useAjustesWizard } from './hooks/useAjustesWizard';
import WizardProgress from './components/WizardProgress';
import StepSearch from './components/StepSearch';
import StepSucursal from './components/StepSucursal';
import StepForm from './components/StepForm';
import StepConfirm from './components/StepConfirm';
import StepReceipt from './components/StepReceipt';

export default function AjustesInventarioPage() {
  const { api, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const isAdmin = user.is_staff || user.is_superuser || (user.groups ?? []).includes('Administrador');
    if (!isAdmin) router.replace('/inventario');
  }, [user, router]);

  const wizard = useAjustesWizard({ api, username: user?.username, email: user?.email });

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="w-6 h-6 text-indigo-600 shrink-0" />
              <h1 className="text-2xl font-bold text-gray-900">Ajuste de Inventario</h1>
            </div>
            <Link href="/inventario/ajustes/lote"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors min-h-[44px]">
              <Layers className="w-4 h-4" /> Ajuste por Lote
            </Link>
          </div>
          <p className="text-sm text-gray-500 ml-9">Solo administradores · Los cambios quedan registrados en el kardex</p>
        </div>

        <WizardProgress step={wizard.step} />

        {wizard.step === 'search' && (
          <StepSearch
            searchTerm={wizard.searchTerm}
            setSearchTerm={wizard.setSearchTerm}
            debouncedSearch={wizard.debouncedSearch}
            searching={wizard.searching}
            searchResults={wizard.searchResults}
            onSelectProduct={wizard.handleSelectProduct}
          />
        )}

        {wizard.step === 'sucursal' && wizard.selectedProduct && (
          <StepSucursal
            selectedProduct={wizard.selectedProduct}
            sucursalesConStock={wizard.sucursalesConStock}
            onBack={wizard.goToSearch}
            onSelectSucursal={wizard.handleSelectSucursal}
          />
        )}

        {wizard.step === 'form' && wizard.selectedProduct && wizard.selectedSucursal && (
          <StepForm
            selectedProduct={wizard.selectedProduct}
            selectedSucursal={wizard.selectedSucursal}
            targetQty={wizard.targetQty}
            setTargetQty={wizard.setTargetQty}
            motivo={wizard.motivo}
            setMotivo={wizard.setMotivo}
            diff={wizard.diff}
            formError={wizard.formError}
            setFormError={wizard.setFormError}
            onBack={() => wizard.setStep('sucursal')}
            onReview={wizard.handleReviewAjuste}
          />
        )}

        {wizard.step === 'confirm' && wizard.selectedProduct && wizard.selectedSucursal && (
          <StepConfirm
            selectedProduct={wizard.selectedProduct}
            selectedSucursal={wizard.selectedSucursal}
            targetQtyNum={wizard.targetQtyNum}
            diff={wizard.diff}
            motivo={wizard.motivo}
            formError={wizard.formError}
            submitting={wizard.submitting}
            onBack={() => { wizard.setStep('form'); wizard.setFormError(''); }}
            onSubmit={wizard.handleSubmit}
          />
        )}

        {wizard.step === 'receipt' && wizard.receipt && (
          <StepReceipt receipt={wizard.receipt} onNuevoAjuste={wizard.handleNuevoAjuste} />
        )}

      </div>
    </DashboardLayout>
  );
}
