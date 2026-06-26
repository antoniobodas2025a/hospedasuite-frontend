'use client';

import { Building2, Key, Trash2, Edit, DollarSign, Rocket } from 'lucide-react';
import { HotelFinancialRecord } from '@/app/actions/hq';

interface TenantTableProps {
  hotels: any[];
  hqData: HotelFinancialRecord[];
  isProcessing: boolean;
  onGodMode: (email: string) => void;
  onDelete: (id: string, ownerId: string) => void;
  onEdit: (hotel: any) => void;
  onSeed: (id: string, name: string) => void;
}

export default function TenantTable({
  hotels,
  hqData,
  isProcessing,
  onGodMode,
  onDelete,
  onEdit,
  onSeed,
}: TenantTableProps) {
  // Función auxiliar para buscar la deuda de un hotel
  const getHotelDebt = (hotelId: string) => {
    const record = hqData.find((h) => h.hotel_id === hotelId);
    return record ? record.total_debt : 0;
  };

  return (
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
                <button onClick={() => onSeed(hotel.id, hotel.name)} disabled={isProcessing} className='p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-[var(--radius-squircle-md)] transition-all border border-indigo-500/20 disabled:opacity-50' title='Inyectar Matriz de Demostración'>
                  <Rocket size={16} />
                </button>

                <button onClick={() => onEdit(hotel)} className='p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-[var(--radius-squircle-md)] transition-all border border-blue-500/20' title='Editar Propiedad'>
                  <Edit size={16} />
                </button>

                <button onClick={() => onGodMode(hotel.email)} disabled={isProcessing || !hotel.owner_id} className='px-4 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white rounded-[var(--radius-squircle-md)] transition-all text-xs font-bold flex items-center gap-2 border border-purple-500/20 disabled:opacity-20 disabled:cursor-not-allowed' title='Generar Magic Link y Acceder'>
                  <Key size={14} /> MODO DIOS
                </button>

                <button onClick={() => onDelete(hotel.id, hotel.owner_id)} disabled={isProcessing} className='p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-[var(--radius-squircle-md)] transition-all border border-red-500/20 disabled:opacity-50'>
                  <Trash2 size={16} />
                </button>

              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
