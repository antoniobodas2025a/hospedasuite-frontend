'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Plus,
  Coffee,
  Minus,
  CreditCard,
  BedDouble,
  Search,
} from 'lucide-react';
import { usePOS, MenuItem, RoomOption } from '@/hooks/usePOS';
import EmptyState from '@/components/ui/EmptyState';

interface POSPanelProps {
  initialItems: MenuItem[];
  rooms: RoomOption[];
  hotelId: string;
}

const CATEGORIES = ['General', 'Bebidas', 'Comidas', 'Servicios'];

export default function POSPanel({ initialItems, rooms, hotelId }: POSPanelProps) {
  const {
    menuItems,
    cart,
    addToCart,
    adjustQuantity,
    cartTotal,
    selectedRoomId,
    setSelectedRoomId,
    createOrder,
    isProductModalOpen,
    setIsProductModalOpen,
    productForm,
    setProductForm,
    createProduct,
  } = usePOS(initialItems, rooms, hotelId);

  const [activeCategory, setActiveCategory] = useState('General');

  const filteredItems = menuItems.filter((i) => 
    activeCategory === 'General' ? true : i.category === activeCategory
  );

  return (
    <div className='h-[calc(100vh-8rem)] flex gap-6 pb-4'>
      
      {/* SECCIÓN IZQUIERDA: CATÁLOGO */}
      <div className='flex-1 flex flex-col bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden'>
        
        <div className='p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30'>
          <div>
            <h2 className='text-xl font-display font-bold text-slate-800'>Carta Digital</h2>
            <p className='text-sm text-slate-500'>Registra consumos y servicios de la propiedad.</p>
          </div>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className='flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-600 rounded-xl transition-all shadow-sm font-bold text-sm'
          >
            <Plus size={18} strokeWidth={1.5} /> Nuevo Producto
          </button>
        </div>

        {/* RENDERIZADO CONDICIONAL: EMPTY STATE VS GRID */}
        {menuItems.length === 0 ? (
          <div className='flex-1 flex items-center justify-center p-12'>
            <EmptyState 
              iconName="utensils"
              title="Tu carta está vacía" 
              description="Crea tu primer platillo o servicio para comenzar a vender."
              actionLabel="Crear mi primer ítem"
              actionOnClick={() => setIsProductModalOpen(true)}
              color="emerald"
            />
          </div>
        ) : (
          <>
            <div className='px-6 py-4 flex gap-2 overflow-x-auto border-b border-slate-50 bg-white'>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className='flex-1 overflow-y-auto p-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start custom-scrollbar bg-slate-50/20'>
              {filteredItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addToCart(item)}
                  className='bg-white border border-slate-100 hover:border-emerald-200 p-5 rounded-[1.5rem] flex flex-col items-center gap-3 text-center transition-all hover:shadow-xl hover:-translate-y-1 group'
                >
                  <div className='text-5xl group-hover:scale-110 transition-transform'>{item.image_emoji}</div>
                  <div>
                    <h4 className='font-bold text-slate-700 text-sm leading-tight'>{item.name}</h4>
                    <span className='text-xs font-bold text-emerald-600 mt-1 block bg-emerald-50 py-1 px-2 rounded-lg'>
                      ${item.price.toLocaleString()}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* SECCIÓN DERECHA: CARRITO */}
      <div className='w-[400px] flex flex-col bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden relative'>
        <div className='p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between'>
          <h3 className='font-bold text-slate-800 flex items-center gap-2'>
            <ShoppingBag size={20} strokeWidth={1.5} className="text-emerald-600" /> Detalle del Pedido
          </h3>
          <span className='text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md uppercase'>{cart.length} ítems</span>
        </div>

        <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
          {cart.length === 0 ? (
            <div className='h-full flex flex-col items-center justify-center text-slate-300 text-center p-10'>
              <Coffee size={48} strokeWidth={1.5} className="mb-4 opacity-20" />
              <p className='text-sm font-bold text-slate-400'>Selecciona productos a la izquierda para comenzar</p>
            </div>
          ) : (
            cart.map((item) => (
              <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={item.id} className='flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm'>
                <div className='flex items-center gap-3'>
                  <span className='text-2xl'>{item.image_emoji}</span>
                  <div>
                    <div className='text-sm font-bold text-slate-800'>{item.name}</div>
                    <div className='text-xs text-emerald-600 font-bold'>${item.price.toLocaleString()}</div>
                  </div>
                </div>
                <div className='flex items-center gap-3 bg-slate-50 rounded-xl p-1.5'>
                  <button onClick={() => adjustQuantity(item.id, -1)} className='p-1 hover:bg-white rounded-lg text-slate-500 hover:text-red-500 transition-all shadow-sm'><Minus size={14} /></button>
                  <span className='text-xs font-bold w-4 text-center'>{item.quantity}</span>
                  <button onClick={() => adjustQuantity(item.id, 1)} className='p-1 hover:bg-white rounded-lg text-slate-500 hover:text-emerald-600 transition-all shadow-sm'><Plus size={14} /></button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className='p-8 bg-slate-900 text-white space-y-6'>
          <div className='space-y-3'>
            <label className='text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2'><BedDouble size={14} strokeWidth={1.5} /> Cargar a Habitación</label>
            <select className='w-full p-4 bg-slate-800 rounded-xl text-sm font-bold border border-slate-700 outline-none focus:border-emerald-400' value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)}>
              <option value=''>-- Seleccionar Habitación --</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>
          <div className='flex justify-between items-end'>
            <div>
              <p className='text-[10px] font-bold text-slate-500 uppercase'>Subtotal</p>
              <p className='text-3xl font-display font-bold text-emerald-400'>${cartTotal.toLocaleString()}</p>
            </div>
          </div>
          <button onClick={createOrder} disabled={cart.length === 0 || !selectedRoomId} className='w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-2xl shadow-xl transition-all flex justify-center items-center gap-3 active:scale-95'>
            <CreditCard size={20} strokeWidth={1.5} /> {cart.length === 0 ? 'Carrito Vacío' : !selectedRoomId ? 'Elija Habitación' : 'Confirmar Venta'}
          </button>
        </div>
      </div>

      {/* MODAL NUEVO PRODUCTO (Blindado) */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className='fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4'>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className='bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl'>
              <div className='flex justify-between items-center mb-8'>
                <h3 className='text-2xl font-display font-bold text-slate-800'>Nuevo Producto</h3>
                <button onClick={() => setIsProductModalOpen(false)} className='text-slate-400 hover:text-slate-600'><Plus size={24} className='rotate-45' /></button>
              </div>
              <div className='space-y-5'>
                <div className='flex gap-4'>
                  <div className='space-y-2'>
                    <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Emoji</label>
                    <input className='w-20 h-14 bg-slate-50 rounded-2xl text-center text-3xl outline-none focus:ring-2 focus:ring-emerald-100' value={productForm.image_emoji} onChange={(e) => setProductForm({ ...productForm, image_emoji: e.target.value })} />
                  </div>
                  <div className='flex-1 space-y-2'>
                    <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Nombre</label>
                    <input className='w-full h-14 p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100' value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Categoría</label>
                    <select className='w-full h-14 px-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none' value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className='space-y-2'>
                    <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Precio (COP)</label>
                    {/* 🛡️ BLINDAJE UI: min="0" evita valores negativos */}
                    <input type='number' min="0" step="0.01" className='w-full h-14 p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100' value={productForm.price === 0 ? '' : productForm.price} onChange={(e) => setProductForm({ ...productForm, price: Math.max(0, Number(e.target.value)) })} />
                  </div>
                </div>
              </div>
              <div className='flex gap-4 mt-10'>
                <button onClick={() => setIsProductModalOpen(false)} className='flex-1 py-4 text-slate-500 font-bold'>Cancelar</button>
                <button onClick={createProduct} disabled={!productForm.name || productForm.price <= 0} className='flex-2 py-4 px-8 bg-slate-900 hover:bg-black disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-2xl shadow-xl transition-all'>Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}