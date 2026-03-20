'use client';

import { useState } from 'react';
import { Building2, Key, Trash2, Edit, X, Save, Lock, AlertTriangle } from 'lucide-react';
import { godModeAccess, deleteHotelAction, updateTenantAction, forceChangePasswordAction } from '@/app/actions/super-admin';

export default function TenantManager({ hotels }: { hotels: any[] }) {
  const [editingHotel, setEditingHotel] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleGodMode = async (email: string) => {
    setIsProcessing(true);
    const res = await godModeAccess(email);
    setIsProcessing(false);
    if (res.success && res.url) {
      window.open(res.url, '_blank');
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
    if (res.success) {
      setEditingHotel(null);
    } else {
      alert("Error actualizando: " + res.error);
    }
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

  return (
    <>
      <div className='overflow-x-auto'>
        <table className='w-full text-left'>
          <thead className='bg-black/20 text-xs uppercase text-white/40 font-bold tracking-wider'>
            <tr>
              <th className='p-6'>Hotel / ID</th>
              <th className='p-6'>Estado</th>
              <th className='p-6'>Dueño / Plan</th>
              <th className='p-6 text-right'>Control Global</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-white/5 text-sm'>
            {hotels?.map((hotel) => (
              <tr key={hotel.id} className='hover:bg-white/5 transition-colors group'>
                <td className='p-6'>
                  <div className='font-bold text-white text-base flex items-center gap-2'>
                    <Building2 size={16} className='text-blue-400' /> {hotel.name}
                  </div>
                  <div className='text-white/30 text-xs font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity select-all'>
                    {hotel.id}
                  </div>
                </td>
                <td className='p-6'>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      hotel.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : hotel.status === 'suspended' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {hotel.status}
                  </span>
                </td>
                <td className='p-6'>
                  <div className='text-white/80 flex items-center gap-2'>
                    {hotel.email}
                    {/* 🚨 FIX: Badge visual rápido si no hay dueño */}
                    {!hotel.owner_id && <span title="Hotel Mock del Script" className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">MOCK</span>}
                  </div>
                  <div className='text-white/30 text-xs mt-0.5 font-mono'>{hotel.subscription_plan || 'Sin Plan'}</div>
                </td>
                <td className='p-6 flex justify-end gap-3 items-center'>
                  
                  <button onClick={() => setEditingHotel(hotel)} className='p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all border border-blue-500/20' title='Editar Tenant'>
                    <Edit size={16} />
                  </button>

                  <button onClick={() => handleGodMode(hotel.email)} disabled={isProcessing || !hotel.owner_id} className='px-4 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg transition-all text-xs font-bold flex items-center gap-2 border border-purple-500/20 disabled:opacity-20 disabled:cursor-not-allowed' title='Generar Magic Link y Acceder'>
                    <Key size={14} /> MODO DIOS
                  </button>

                  <button onClick={() => handleDelete(hotel.id, hotel.owner_id)} disabled={isProcessing} className='p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-red-500/20 disabled:opacity-50'>
                    <Trash2 size={16} />
                  </button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDICIÓN Y SEGURIDAD */}
      {editingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="text-blue-500"/> Gestionar: {editingHotel.name}
              </h2>
              <button onClick={() => setEditingHotel(null)} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8">
              
              {/* Bloque 1: Edición Comercial */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white/50 uppercase mb-4">Ajustes Comerciales</h3>
                <form id="update-tenant-form" onSubmit={handleUpdateTenant} className="space-y-4">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Nombre del Hotel</label>
                    <input name="name" defaultValue={editingHotel.name} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Estado Operativo</label>
                      <select name="status" defaultValue={editingHotel.status} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none">
                        <option value="active" className="text-black">Activo (Facturando)</option>
                        <option value="suspended" className="text-black">Suspendido (Falta de Pago)</option>
                        <option value="maintenance" className="text-black">En Configuración</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Plan de Suscripción</label>
                      <select name="plan" defaultValue={editingHotel.subscription_plan} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none">
                        <option value="PRO_AI" className="text-black">PRO AI</option>
                        <option value="GROWTH" className="text-black">GROWTH</option>
                        <option value="CORPORATE" className="text-black">CORPORATE</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg flex items-center gap-2 text-sm disabled:opacity-50">
                      <Save size={16} /> Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>

              {/* Bloque 2: Seguridad Inteligente (Adaptativa) */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-red-400 uppercase mb-4 flex items-center gap-2">
                  <Lock size={16}/> Zona de Seguridad (Forzar Credenciales)
                </h3>
                
                {/* 🚨 FIX QA: Detección de Datos Huérfanos */}
                {!editingHotel.owner_id ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-amber-400 text-sm font-bold">Datos de Prueba (Mock Data)</p>
                      <p className="text-amber-400/70 text-xs mt-1">
                        Este hotel fue creado por el script de desarrollo y no posee un usuario real en el sistema de Auth. No se le puede cambiar la contraseña ni generar Modo Dios.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleChangePassword} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-red-400/70 mb-1 block">Nueva Contraseña del Dueño</label>
                        <input 
                          type="text" 
                          placeholder="Escribe la nueva clave..." 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required 
                          className="w-full bg-black/40 border border-red-500/20 rounded-xl p-3 text-white focus:border-red-500 outline-none" 
                        />
                      </div>
                      <button type="submit" disabled={isProcessing} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg text-sm disabled:opacity-50">
                        Ejecutar Cambio
                      </button>
                    </form>
                    <p className="text-xs text-red-400/50 mt-3">Al ejecutar esto, desconectarás al dueño de todos sus dispositivos activos.</p>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}