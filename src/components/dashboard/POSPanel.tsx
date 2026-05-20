'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, Coffee, Minus, CreditCard, BedDouble, Search, Utensils, X, Save
} from 'lucide-react';
import { usePOS, POSMenuItem, BookingOption, RoomOption, toPOSItem } from '@/hooks/usePOS';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { MenuItemDTO, MenuCategoryDTO } from '@/data/carta-digital';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

interface POSPanelContainerProps {
  initialItems: MenuItemDTO[];
  rooms: RoomOption[];
  hotelId: string;
  categories?: MenuCategoryDTO[];
}

interface POSPanelViewProps {
  menuItems: POSMenuItem[];
  cart: any[];
  cartTotal: number;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  selectedRoomId: string;
  setSelectedRoomId: (id: string) => void;
  onAddToCart: (item: POSMenuItem) => void;
  onAdjustQuantity: (id: string, delta: number) => void;
  onCreateOrder: () => void;
  onOpenProductModal: () => void;
  rooms: RoomOption[];
}

const CATEGORIES = ['General', 'Bebidas', 'Comidas', 'Servicios'];

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const POSPanelView: React.FC<POSPanelViewProps> = ({
  menuItems, cart, cartTotal, activeCategory, setActiveCategory,
  selectedRoomId, setSelectedRoomId, onAddToCart, onAdjustQuantity,
  onCreateOrder, onOpenProductModal, rooms
}) => {
  return (
    <div className='h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 pb-4 font-poppins text-foreground'>
      
      {/* SECCIÓN IZQUIERDA: CATÁLOGO DE ACTIVOS (Liquid Glass) */}
      <div className='flex-1 flex flex-col glass-card rounded-[var(--radius-squircle-3xl)] shadow-2xl border border-border overflow-hidden ring-1 ring-inset ring-border'>
        
        <div className='p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted'>
          <div>
            <h2 className='text-xl font-bold text-foreground tracking-tight flex items-center gap-2'>
              <Utensils className="size-5 text-indigo-400" />
              Carta Digital
            </h2>
            <p className='text-xs text-muted-foreground font-lora mt-0.5'>Gestión de consumos y servicios de la unidad.</p>
          </div>
          <button
            onClick={onOpenProductModal}
            className='flex items-center gap-2 px-4 py-2 bg-muted hover:bg-indigo-600 border border-border text-foreground hover:text-white rounded-[var(--radius-squircle-lg)] transition-all font-bold text-sm active:scale-95'
          >
            <Plus size={16} strokeWidth={2} /> Nuevo Registro
          </button>
        </div>

        {menuItems.length === 0 ? (
          <div className='flex-1 flex items-center justify-center p-12'>
            <EmptyState 
              icon={Utensils}
              title="Carta en Blanco" 
              description="No se han detectado ítems operativos. Inicie la indexación de su primer producto o servicio."
              actionLabel="Inyectar Ítem"
              actionOnClick={onOpenProductModal}
              color="muted"
            />
          </div>
        ) : (
          <>
            {/* Navegación de Categorías (Neón Tab) */}
            <div className='px-6 py-4 flex gap-2 overflow-x-auto border-b border-border glass-card !rounded-none hide-scrollbar'>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-5 py-2 rounded-[var(--radius-squircle-lg)] text-xs font-bold transition-all duration-300 whitespace-nowrap border",
                    activeCategory === cat 
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/20" 
                      : "glass-card text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid de Productos */}
            <div className='flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start custom-scrollbar'>
              <AnimatePresence>
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAddToCart(item)}
                    className='glass-card p-5 flex flex-col items-center gap-4 text-center transition-all group relative overflow-hidden shadow-xl hover:border-indigo-500/30'
                  >
                    <div className="absolute -right-4 -top-4 size-20 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className='w-16 h-16 rounded-lg object-cover group-hover:scale-110 transition-transform duration-500 z-10'
                      />
                    ) : (
                      <div className='text-5xl group-hover:scale-110 transition-transform duration-500 z-10'>{item.image_emoji}</div>
                    )}
                    <div className="z-10">
                      <h4 className='font-bold text-foreground text-xs leading-tight mb-2'>{item.name}</h4>
                      <span className='text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 py-1 px-3 rounded-full border border-emerald-500/20'>
                        ${item.price.toLocaleString()}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* SECCIÓN DERECHA: CARRITO DE LIQUIDACIÓN (Liquid Glass Deep) */}
      <div className='w-full lg:w-[400px] flex flex-col glass-panel overflow-hidden relative'>
        <div className='p-6 bg-muted border-b border-border flex items-center justify-between'>
          <h3 className='font-bold text-foreground flex items-center gap-2'>
            <ShoppingBag size={18} className="text-indigo-400" /> Detalle del Pedido
          </h3>
          <span className='text-[10px] font-mono font-bold bg-muted text-muted-foreground px-2.5 py-1 rounded-[var(--radius-squircle-md)] border border-border uppercase'>
            {cart.length} Nodos
          </span>
        </div>

        <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
          <AnimatePresence>
            {cart.length === 0 ? (
              <div className='h-full flex flex-col items-center justify-center text-muted-foreground text-center p-10'>
                <div className="size-16 bg-muted rounded-full flex items-center justify-center mb-4 border border-border shadow-inner">
                  <Coffee size={32} className="opacity-20" />
                </div>
                <p className='text-xs font-bold uppercase tracking-widest opacity-50'>Esperando Selección...</p>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={item.id} 
                  className='flex justify-between items-center p-4 glass-card shadow-lg'
                >
                  <div className='flex items-center gap-3'>
                    <span className='text-2xl'>{item.image_emoji}</span>
                    <div>
                      <div className='text-xs font-bold text-foreground'>{item.name}</div>
                      <div className='text-[10px] text-emerald-400 font-mono font-bold'>${item.price.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 bg-muted rounded-[var(--radius-squircle-lg)] p-1 border border-border shadow-inner'>
                    <button onClick={() => onAdjustQuantity(item.id, -1)} className='p-1.5 hover:bg-muted text-muted-foreground hover:text-rose-400 transition-all'><Minus size={12} /></button>
                    <span className='text-xs font-mono font-bold w-5 text-center text-foreground'>{item.quantity}</span>
                    <button onClick={() => onAdjustQuantity(item.id, 1)} className='p-1.5 hover:bg-muted text-muted-foreground hover:text-emerald-400 transition-all'><Plus size={12} /></button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer del Carrito: Liquidación Financiera */}
        <div className='p-8 bg-card border-t border-border space-y-6'>
          <div className='space-y-3'>
            <label className='text-[10px] font-bold uppercase tracking-ultra text-muted-foreground flex items-center gap-2'>
              <BedDouble size={14} className="text-indigo-500" /> Cargar a Habitación
            </label>
            <select 
              className='w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-lg)] text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer appearance-none' 
              value={selectedRoomId} 
              onChange={(e) => setSelectedRoomId(e.target.value)}
            >
              <option value='' className="bg-card text-muted-foreground">-- Seleccionar Unidad --</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id} className="bg-card text-foreground">{room.name}</option>
              ))}
            </select>
          </div>
          <div className='flex justify-between items-end'>
            <div>
              <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest'>Total Liquidación</p>
              <p className='text-4xl font-bold text-emerald-400 tracking-tighter'>${cartTotal.toLocaleString()}</p>
            </div>
          </div>
          <button 
            onClick={onCreateOrder} 
            disabled={cart.length === 0 || !selectedRoomId} 
            className='w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-muted disabled:text-muted-foreground text-white font-bold rounded-[1.5rem] shadow-xl shadow-indigo-500/20 transition-all flex justify-center items-center gap-3 active:scale-95 border border-indigo-400/20'
          >
            <CreditCard size={20} strokeWidth={2} /> 
            {cart.length === 0 ? 'Cesta Vacía' : !selectedRoomId ? 'Falta Unidad' : 'Confirmar Cargo'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function POSPanel({ initialItems, rooms, hotelId, categories = [] }: POSPanelContainerProps) {
  const {
    menuItems, cart, addToCart, adjustQuantity, cartTotal,
    selectedRoomId, setSelectedRoomId, createOrder,
    isProductModalOpen, setIsProductModalOpen,
    productForm, setProductForm, createProduct,
  } = usePOS(initialItems, rooms as BookingOption[], hotelId, categories);

  const [activeCategory, setActiveCategory] = useState('General');

  // 🛡️ Zero-Trust Data Parsing
  const safeMenuItems = useMemo(() => Array.isArray(menuItems) ? menuItems : [], [menuItems]);

  const filteredItems = useMemo(() => {
    return safeMenuItems.filter((i) => 
      activeCategory === 'General' ? true : i.category === activeCategory
    );
  }, [safeMenuItems, activeCategory]);

  return (
    <>
      <POSPanelView 
        menuItems={filteredItems}
        cart={cart}
        cartTotal={cartTotal}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        selectedRoomId={selectedRoomId}
        setSelectedRoomId={setSelectedRoomId}
        onAddToCart={addToCart}
        onAdjustQuantity={(id: string, delta: number) => adjustQuantity(id, delta)}
        onCreateOrder={createOrder}
        onOpenProductModal={() => setIsProductModalOpen(true)}
        rooms={rooms}
      />

      {/* MODAL NUEVO PRODUCTO (Inyección Liquid Glass) */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className='fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4'>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className='bg-card border border-border w-full max-w-md rounded-[var(--radius-squircle-3xl)] p-10 shadow-2xl ring-1 ring-border'
            >
              <div className='flex justify-between items-center mb-8'>
                <h3 className='text-2xl font-bold text-foreground tracking-tight'>Inyectar Producto</h3>
                <button onClick={() => setIsProductModalOpen(false)} className='text-muted-foreground hover:text-white transition-colors'>
                  <X size={24} strokeWidth={1.5} />
                </button>
              </div>
              
              <div className='space-y-6'>
                <div className='flex gap-4'>
                  <div className='space-y-2'>
                    <label className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1'>Icono</label>
                    <input 
                      className='w-20 h-14 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-center text-3xl outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner' 
                      value={productForm.image_emoji} 
                      onChange={(e) => setProductForm({ ...productForm, image_emoji: e.target.value })} 
                    />
                  </div>
                  <div className='flex-1 space-y-2'>
                    <label className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1'>Identificador</label>
                    <input 
                      className='w-full h-14 p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner' 
                      placeholder="Ej. Coca Cola"
                      value={productForm.name} 
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} 
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <label className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1'>Taxonomía</label>
                    <select 
                      className='w-full h-14 px-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer appearance-none' 
                      value={productForm.category} 
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c} className="bg-card">{c}</option>)}
                    </select>
                  </div>
                  <div className='space-y-2'>
                    <label className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1'>Valor (COP)</label>
                    <input 
                      type='number' 
                      min="0" 
                      className='w-full h-14 p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] font-mono font-bold text-emerald-400 outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner' 
                      value={productForm.price === 0 ? '' : productForm.price} 
                      onChange={(e) => setProductForm({ ...productForm, price: Math.max(0, Number(e.target.value)) })} 
                    />
                  </div>
                </div>
              </div>

              <div className='flex gap-4 mt-10'>
                <button 
                  onClick={() => setIsProductModalOpen(false)} 
                  className='flex-1 py-4 text-muted-foreground font-bold hover:text-foreground transition-colors'
                >
                  Cancelar
                </button>
                <button 
                  onClick={createProduct} 
                  disabled={!productForm.name || (productForm.price ?? 0) <= 0} 
                  className='flex-[2] py-4 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:bg-muted disabled:text-muted-foreground text-white font-bold rounded-[var(--radius-squircle-2xl)] shadow-2xl transition-all flex items-center justify-center gap-2'
                >
                  <Save size={18} /> Compilar Producto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}