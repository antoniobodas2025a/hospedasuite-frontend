'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, Building, CreditCard, Palette, Users, 
  Trash2, KeyRound, Plus, AlertCircle 
} from 'lucide-react';
import { useSettings, HotelSettings } from '@/hooks/useSettings';
import Image from 'next/image';
import { createStaffAction, deleteStaffAction } from '@/app/actions/staff';

// 🚨 SERIALIZACIÓN CORREGIDA: Usamos IDs de string para evitar errores en Next.js
const TABS = [
  { id: 'profile', label: 'Perfil del Hotel', iconName: 'building' },
  { id: 'fiscal', label: 'Fiscal y Pagos', iconName: 'credit-card' },
  { id: 'branding', label: 'Marca y Diseño', iconName: 'palette' },
  { id: 'staff', label: 'Equipo y Accesos', iconName: 'users' },
];

const TabIcon = ({ name }: { name: string }) => {
  const props = { size: 18, strokeWidth: 1.5 };
  switch (name) {
    case 'building': return <Building {...props} />;
    case 'credit-card': return <CreditCard {...props} />;
    case 'palette': return <Palette {...props} />;
    case 'users': return <Users {...props} />;
    default: return <AlertCircle {...props} />;
  }
};

export default function SettingsPanel({ initialData, initialStaff }: { initialData: HotelSettings, initialStaff: any[] }) {
  const { settings, setSettings, updateSettings, isSaving } = useSettings(initialData);
  const [activeTab, setActiveTab] = useState('profile');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', role: 'Recepcionista', pin_code: '' });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingStaff(true);
    const formData = new FormData();
    formData.append('name', staffForm.name);
    formData.append('role', staffForm.role);
    formData.append('pin_code', staffForm.pin_code);

    const res = await createStaffAction(formData);
    if (res.success) {
      alert('✅ Miembro del equipo agregado');
      setStaffForm({ name: '', role: 'Recepcionista', pin_code: '' });
    } else {
      alert('❌ Error: ' + res.error);
    }
    setIsCreatingStaff(false);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('¿Seguro que deseas revocar el acceso a este PIN?')) return;
    const res = await deleteStaffAction(id);
    if (!res.success) alert('Error: ' + res.error);
  };

  return (
    <div className='h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6'>
      <div className='w-full md:w-64 bg-white rounded-[2rem] border border-slate-100 p-4 h-fit shadow-sm'>
        <div className='mb-6 px-4 pt-2'>
          <h2 className='font-bold text-slate-800 text-lg'>Configuración</h2>
          <p className='text-xs text-slate-400'>Ajustes generales del sistema.</p>
        </div>
        <div className='space-y-2'>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <TabIcon name={tab.iconName} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className='flex-1 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm overflow-y-auto custom-scrollbar relative'>
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='space-y-6 max-w-2xl'>
            <h3 className='text-xl font-bold text-slate-800 border-b pb-4 mb-6'>Información Pública</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='md:col-span-2'>
                <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Nombre del Hotel</label>
                <input className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100' value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
              </div>
              <div className='md:col-span-2'>
                <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Dirección Física</label>
                <input className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none' value={settings.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'fiscal' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='space-y-6 max-w-2xl'>
            <h3 className='text-xl font-bold text-slate-800 border-b pb-4 mb-6'>Datos Fiscales</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Impuesto (%)</label>
                <input type='number' className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none' value={settings.tax_rate} onChange={(e) => setSettings({ ...settings, tax_rate: Number(e.target.value) })} />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'branding' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='space-y-6 max-w-2xl'>
            <h3 className='text-xl font-bold text-slate-800 border-b pb-4 mb-6'>Identidad Visual</h3>
            <div className='flex gap-8 items-start'>
              <div className='bg-slate-100 p-6 rounded-2xl border border-slate-200 flex flex-col items-center gap-4 w-48'>
                <div className='relative w-24 h-24'>
                  <Image src='/logo.png' alt='Logo' fill className='object-contain' />
                </div>
              </div>
              <div className='flex-1'>
                <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Color Primario</label>
                <input className='w-full p-4 bg-slate-50 rounded-2xl font-mono font-bold text-slate-800 outline-none' value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='space-y-6'>
            <h3 className='text-xl font-bold text-slate-800 border-b pb-4 mb-6'>Equipo y Accesos</h3>
            
            <form onSubmit={handleCreateStaff} className="bg-slate-50 border border-slate-100 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase ml-2 block mb-2">Nombre del Empleado</label>
                <input 
                  required 
                  className="w-full p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-hospeda-300 font-bold text-slate-800 placeholder:text-slate-300" 
                  placeholder="Ej: Maria López" 
                  value={staffForm.name} 
                  onChange={e => setStaffForm({...staffForm, name: e.target.value})} 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2 block mb-2">PIN (4 Dígitos)</label>
                <input 
                  required 
                  maxLength={4} 
                  className="w-full p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-hospeda-300 font-mono font-bold text-slate-800 text-center tracking-widest placeholder:text-slate-300" 
                  placeholder="1234" 
                  value={staffForm.pin_code} 
                  onChange={e => setStaffForm({...staffForm, pin_code: e.target.value})} 
                />
              </div>

              <button 
                type="submit" 
                disabled={isCreatingStaff} 
                className="bg-hospeda-900 hover:bg-black text-white font-bold p-4 rounded-2xl shadow-lg transition-colors h-[58px] disabled:opacity-50"
              >
                {isCreatingStaff ? 'Guardando...' : 'Agregar'}
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {initialStaff.map((person) => (
                <div key={person.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold text-slate-800">{person.name}</p>
                    <p className="text-xs text-slate-400">{person.role}</p>
                  </div>
                  <button onClick={() => handleDeleteStaff(person.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab !== 'staff' && (
          <motion.div className='absolute bottom-8 right-8' initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <button onClick={updateSettings} disabled={isSaving} className='px-8 py-4 bg-hospeda-900 text-white font-bold rounded-2xl shadow-xl flex items-center gap-3'>
              <Save size={20} strokeWidth={1.5} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}