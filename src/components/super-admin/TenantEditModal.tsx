'use client';

import { useState } from 'react';
import { Edit, X, Save, Lock, AlertTriangle } from 'lucide-react';

interface TenantEditModalProps {
  editingHotel: any;
  isProcessing: boolean;
  newPassword: string;
  onClose: () => void;
  onUpdateTenant: (e: React.FormEvent) => void;
  onChangePassword: (e: React.FormEvent) => void;
  onPasswordChange: (value: string) => void;
}

export default function TenantEditModal({
  editingHotel,
  isProcessing,
  newPassword,
  onClose,
  onUpdateTenant,
  onChangePassword,
  onPasswordChange,
}: TenantEditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-[var(--radius-squircle-2xl)] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Edit className="text-blue-500"/> Gestionar: {editingHotel.name}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Bloque 1: Edición Comercial */}
          <div className="bg-white/5 border border-white/10 rounded-[var(--radius-squircle-2xl)] p-6">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Ajustes Comerciales</h3>
            <form id="update-tenant-form" onSubmit={onUpdateTenant} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1 block ml-2">Nombre del Hotel</label>
                <input name="name" defaultValue={editingHotel.name} required className="w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white font-medium focus:border-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1 block ml-2">Estado Operativo</label>
                  <select name="status" defaultValue={editingHotel.status} className="w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white font-medium focus:border-blue-500 outline-none">
                    <option value="active" className="text-black">Activo (Facturando)</option>
                    <option value="suspended" className="text-black">Suspendido (Impago)</option>
                    <option value="maintenance" className="text-black">En Configuración</option>
                  </select>
                </div>
                {/* 🛡️ CORRECCIÓN DE PLANES EN MODAL */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1 block ml-2">Plan de Suscripción</label>
                  <select name="plan" defaultValue={editingHotel.subscription_plan} className="w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white font-medium focus:border-blue-500 outline-none">
                    <option value="micro" className="text-black">Micro</option>
                    <option value="standard" className="text-black">Estándar</option>
                    <option value="pro" className="text-black">Pro</option>
                  </select>
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-[var(--radius-squircle-lg)] transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 w-full">
                  <Save size={18} /> Actualizar Perfil
                </button>
              </div>
            </form>
          </div>

          {/* Bloque 2: Seguridad Inteligente */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-[var(--radius-squircle-2xl)] p-6">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Lock size={16}/> Zona de Seguridad
            </h3>
            
            {!editingHotel.owner_id ? (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-[var(--radius-squircle-lg)] flex items-start gap-3">
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
                <form onSubmit={onChangePassword} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-red-400/70 mb-1 block ml-2">Forzar Nueva Contraseña</label>
                    <input 
                      type="text" 
                      placeholder="Escribe la nueva clave..." 
                      value={newPassword}
                      onChange={(e) => onPasswordChange(e.target.value)}
                      required 
                      className="w-full bg-black/40 border border-red-500/20 rounded-[var(--radius-squircle-lg)] p-3 text-white focus:border-red-500 outline-none" 
                    />
                  </div>
                  <button type="submit" disabled={isProcessing} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-[var(--radius-squircle-lg)] transition-all shadow-lg text-sm disabled:opacity-50">
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
  );
}
