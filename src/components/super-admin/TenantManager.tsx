'use client';

import { useState } from 'react';
import { godModeAccess, deleteHotelAction, updateTenantAction, forceChangePasswordAction } from '@/app/actions/super-admin';
import { injectDemoDataAction } from '@/app/actions/seeding';
import type { HotelFinancialRecord } from '@/app/actions/hq';
import TenantTable from './TenantTable';
import TenantEditModal from './TenantEditModal';

interface TenantManagerProps {
  hotels: any[];
  hqData?: HotelFinancialRecord[];
}

export default function TenantManager({ hotels, hqData = [] }: TenantManagerProps) {
  const [editingHotel, setEditingHotel] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleGodMode = async (email: string) => {
    setIsProcessing(true);
    const res = await godModeAccess(email);
    setIsProcessing(false);
    if (res.success && res.url) {
      try {
        await navigator.clipboard.writeText(res.url);
        alert('🔑 ENLACE MAGICO COPIADO AL PORTAPAPELES.\n\n⚠️ ALERTA DE AISLAMIENTO: Para evitar destruir tu sesión de Super Administrador, abre una "Ventana de Incógnito" (Ctrl+Shift+N) y pega el enlace allí.');
      } catch (err) {
        prompt('Copia este enlace y pégalo en una Ventana de Incógnito:', res.url);
      }
    } else {
      alert("Error en Modo Dios: " + res.error);
    }
  };

  const handleDelete = async (id: string, ownerId: string) => {
    if (!confirm("⚠️ ADVERTENCIA: Esta acción es nuclear e irreversible. ¿Destruir hotel y todos sus datos?")) return;
    setIsProcessing(true);
    const res = await deleteHotelAction(id, ownerId);
    setIsProcessing(false);
    if (!res.success) alert("Error borrando: " + res.error);
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const updateData = {
      name: formData.get('name') as string,
      status: formData.get('status') as string,
      subscription_plan: formData.get('plan') as string,
    };
    const res = await updateTenantAction(editingHotel.id, updateData);
    if (res.success) setEditingHotel(null);
    else alert("Error actualizando: " + res.error);
    setIsProcessing(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("La contraseña debe tener mínimo 6 caracteres.");
    setIsProcessing(true);
    const res = await forceChangePasswordAction(editingHotel.owner_id, newPassword);
    setIsProcessing(false);
    if (res.success) {
      alert("✅ Contraseña actualizada exitosamente.");
      setNewPassword('');
    } else {
      alert("Error cambiando contraseña: " + res.error);
    }
  };

  const handleSeed = async (id: string, name: string) => {
    if (!confirm(`⚠️ ¿Inyectar datos de demostración sintéticos en [${name}]?`)) return;
    setIsProcessing(true);
    const res = await injectDemoDataAction(id);
    setIsProcessing(false);
    if (res.success) alert('✅ Demostración lista. El hotel ha sido poblado.');
    else alert('❌ Error de Inyección: ' + res.error);
  };

  return (
    <>
      <TenantTable hotels={hotels} hqData={hqData} isProcessing={isProcessing}
        onGodMode={handleGodMode} onDelete={handleDelete}
        onEdit={setEditingHotel} onSeed={handleSeed} />
      {editingHotel && (
        <TenantEditModal editingHotel={editingHotel} isProcessing={isProcessing}
          newPassword={newPassword} onClose={() => setEditingHotel(null)}
          onUpdateTenant={handleUpdateTenant} onChangePassword={handleChangePassword}
          onPasswordChange={setNewPassword} />
      )}
    </>
  );
}
