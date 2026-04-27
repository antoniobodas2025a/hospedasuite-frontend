'use client';

import { useState } from 'react';
import { Building2, Key, Trash2, Edit, X, Save, Lock, AlertTriangle, DollarSign, Rocket } from 'lucide-react';
import { godModeAccess, deleteHotelAction, updateTenantAction, forceChangePasswordAction } from '@/app/actions/super-admin';
import { injectDemoDataAction } from '@/app/actions/seeding';

// Importamos el tipo del HQ para tipar las props
import { HotelFinancialRecord } from '@/app/actions/hq';

interface TenantManagerProps {
  hotels: any[];
  hqData?: HotelFinancialRecord[]; // Inyectado desde el nuevo layout
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
        // Fallback por si el navegador bloquea el portapapeles
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

  // 🚀 INYECCIÓN GTM: Gatillo de Demostración (Seeding)
  const handleSeed = async (id: string, name: string) => {
    if (!confirm(`⚠️ ¿Inyectar datos de demostración sintéticos en [${name}]?`)) return;
    setIsProcessing(true);
    const res = await injectDemoDataAction(id);
    setIsProcessing(false);
    if (res.success) {
      alert('✅ Demostración lista. El hotel ha sido poblado.');
    } else {
      alert('❌ Error de Inyección: ' + res.error);
    }
  };

  // Función auxiliar para buscar la deuda de un hotel
  const getHotelDebt = (hotelId: string) => {
    const record = hqData.find(h => h.hotel_id === hotelId);
    return record ? record.total_debt : 0;
  };

  return (
    <>
      <div className='overflow-x-auto'>
        <table className='w-full text-left'>
          <thead className='bg-black/20 text-[10px] uppercase text-white/40 font-bold tracking-widest'>
            <tr>
              <th className='p-6'>Hotel / ID</th>
              <th className='p-6'>Estado</th>
              <th className='p-6'>Dueño / Plan</th>
              <th className='p-6'>Factura (Mes)</th>
              <th className='p-6 text-right'>Control Global</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-white/5 text-sm'>
            {hotels?.map((hotel) => (
              <tr key={hotel.id} className='hover:bg-white/5 transition-colors group'>
                <td className='p-6'>
                  <div className='font-bold text-white text-base flex items-center gap-2 tracking-tight'>
                    <Building2 size={16} className='text-blue-400' /> {hotel.name}
                  </div>
                  <div className='text-white/30 text-[10px] font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity select-all'>
                    {hotel.id}
                  </div>
                </td>
                <td className='p-6'>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase border tracking-widest ${
                      hotel.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : hotel.status === 'suspended' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {hotel.status}
                  </span>
                </td>
                <td className='p-6'>
                  <div className='text-white/80 flex items-center gap-2 text-xs'>
                    {hotel.email}
                    {!hotel.owner_id && <span title="Hotel Mock" className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[9px]">MOCK</span>}
                  </div>
                  <div className='text-blue-400/80 text-[10px] mt-1 font-bold uppercase tracking-widest bg-blue-500/10 w-fit px-2 py-0.5 rounded border border-blue-500/20'>
                    {hotel.subscription_plan || 'NO ASIGNADO'}
                  </div>
                </td>
                <td className='p-6'>
                  <div className="font-bold text-emerald-400 tabular-nums flex items-center gap-1">
                    <DollarSign size={14} />
                    {getHotelDebt(hotel.id).toLocaleString()}
                  </div>
                </td>
                <td className='p-6 flex justify-end gap-3 items-center'>
                  
                  {/* 🚀 BOTÓN GTM SEEDING INYECTADO */}
                  <button onClick={() => handleSeed(hotel.id, hotel.name)} disabled={isProcessing} className='p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-all border border-indigo-500/20 disabled:opacity-50' title='Inyectar Matriz de Demostración'>
                    <Rocket size={16} />
                  </button>

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
          <div className="bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
                <Edit className="text-blue-500"/> Gestionar: {editingHotel.name}
              </h2>
              <button onClick={() => setEditingHotel(null)} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8">
              
              {/* Bloque 1: Edición Comercial */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Ajustes Comerciales</h3>
                <form id="update-tenant-form" onSubmit={handleUpdateTenant} className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1 block ml-2">Nombre del Hotel</label>
                    <input name="name" defaultValue={editingHotel.name} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-medium focus:border-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1 block ml-2">Estado Operativo</label>
                      <select name="status" defaultValue={editingHotel.status} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-medium focus:border-blue-500 outline-none">
                        <option value="active" className="text-black">Activo (Facturando)</option>
                        <option value="suspended" className="text-black">Suspendido (Impago)</option>
                        <option value="maintenance" className="text-black">En Configuración</option>
                      </select>
                    </div>
                    {/* 🛡️ CORRECCIÓN DE PLANES EN MODAL */}
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1 block ml-2">Plan de Suscripción</label>
                      <select name="plan" defaultValue={editingHotel.subscription_plan} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-medium focus:border-blue-500 outline-none">
                        <option value="micro" className="text-black">Micro</option>
                        <option value="standard" className="text-black">Estándar</option>
                        <option value="pro" className="text-black">Pro</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 w-full">
                      <Save size={18} /> Actualizar Perfil
                    </button>
                  </div>
                </form>
              </div>

              {/* Bloque 2: Seguridad Inteligente */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Lock size={16}/> Zona de Seguridad
                </h3>
                
                {!editingHotel.owner_id ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-amber-400 text-sm font-bold">Datos de Prueba (Mock Data)</p>
                      <p className="text-amber-400/70 text-xs mt-1">
                        Este hotel no posee un usuario real en el sistema de Auth. No se le puede cambiar la contraseña.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleChangePassword} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-red-400/70 mb-1 block ml-2">Forzar Nueva Contraseña</label>
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
                        Ejecutar
                      </button>
                    </form>
                    <p className="text-[11px] text-red-400/50 mt-3 ml-2 font-medium">Al ejecutar esto, desconectarás al dueño de todos sus dispositivos activos.</p>
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