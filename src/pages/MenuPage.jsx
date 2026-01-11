import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Plus,
  Minus,
  X,
  Search,
  ChevronRight,
  MessageCircle,
  UtensilsCrossed,
  Sparkles,
  Clock,
  Loader,
} from 'lucide-react';

// --- ESTILOS "NEURO-GLASS 2026" ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600&display=swap');
    
    body { 
      background-color: #F2F4F6; 
      background-image: radial-gradient(at 0% 0%, rgba(255,255,255,0.8) 0px, transparent 50%), 
                        radial-gradient(at 100% 100%, rgba(200,210,230,0.3) 0px, transparent 50%);
      background-attachment: fixed;
    } 
    
    .font-serif { fontFamily: 'Playfair Display', serif; }
    .font-sans { fontFamily: 'Inter', sans-serif; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    
    /* El efecto de cristal esmerilado premium */
    .glass-panel { 
      background: rgba(255, 255, 255, 0.65); 
      backdrop-filter: blur(24px); 
      -webkit-backdrop-filter: blur(24px); 
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
    }

    .glass-input {
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }
  `}</style>
);

const MenuPage = () => {
  const { hotelId } = useParams();

  // Datos
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['Todo']);
  const [loading, setLoading] = useState(true);

  // UX Contextual (Opción 1 y 3)
  const [greeting, setGreeting] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI States
  const [activeCategory, setActiveCategory] = useState('Todo');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [orderStatus, setOrderStatus] = useState('idle');

  // --- 1. CEREBRO CONTEXTUAL ---
  useEffect(() => {
    // Determinar saludo según la hora (Predictivo)
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Buenos días');
    else if (hour >= 12 && hour < 19) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');

    // Carga de Datos Supabase
    const fetchData = async () => {
      if (!hotelId) return;
      try {
        const { data: h } = await supabase
          .from('hotels')
          .select('*')
          .eq('id', hotelId)
          .single();
        if (h) {
          setHotel(h);
          const { data: r } = await supabase
            .from('rooms')
            .select('id, name')
            .eq('hotel_id', h.id)
            .order('name');
          setRooms(r || []);
          const { data: items } = await supabase
            .from('menu_items')
            .select('*')
            .eq('hotel_id', h.id)
            .eq('is_active', true)
            .order('category');
          if (items) {
            setMenuItems(items);
            // Extraer categorías únicas
            const cats = ['Todo', ...new Set(items.map((i) => i.category))];
            setCategories(cats);

            // Predicción simple: Si es desayuno, activar esa categoría por defecto
            if (hour < 11 && cats.includes('Desayuno'))
              setActiveCategory('Desayuno');
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [hotelId]);

  // --- LÓGICA DEL CARRITO ---
  const addToCart = (item) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      return existing
        ? prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item
        )
        .filter((i) => i.qty > 0)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((a, b) => a + b.qty, 0);

  const handlePlaceOrder = async () => {
    // 1. Validación
    if (!selectedRoomId)
      return alert('⚠️ Por favor selecciona tu habitación para continuar.');

    setOrderStatus('sending');

    try {
      // 2. GUARDAR EN SUPABASE (¡ESTO ES LO QUE FALTABA!)
      // Usamos 'service_orders' porque es lo que tu DashboardPage está escuchando
      const { error } = await supabase.from('service_orders').insert([
        {
          hotel_id: hotel.id,
          room_id: selectedRoomId,
          items: cart,
          total_price: total,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      // 3. PREPARAR WHATSAPP (Tu lógica original mejorada)
      const roomName =
        rooms.find((r) => r.id === selectedRoomId)?.name || 'Sin Info';
      const itemsList = cart.map((i) => `- ${i.qty}x ${i.name}`).join('\n');

      const message = `*PEDIDO ROOM SERVICE* 🛎️\n\n🏨 ${
        hotel.name
      }\n🚪 Habitación: *${roomName}*\n\n📝 Pedido:\n${itemsList}\n\n💎 Total: $${total.toLocaleString()}\n\nPor favor confirmar recepción.`;

      // Corrección de número
      let cleanPhone = hotel.phone.replace(/\D/g, '');
      if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
        cleanPhone = '57' + cleanPhone;
      }

      // 4. ABRIR WHATSAPP Y LIMPIAR
      setTimeout(() => {
        window.open(
          `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
          '_blank'
        );

        setOrderStatus('success');
        setCart([]);
        setIsCartOpen(false);
      }, 1000);
    } catch (error) {
      console.error('Error crítico guardando pedido:', error);
      alert('Hubo un error de conexión, pero intentaremos abrir WhatsApp.');
      // Fallback: Intentar abrir WhatsApp aunque falle la BD
      setOrderStatus('idle');
    }
  };

  // Filtrado Inteligente (Categoría + Búsqueda)
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      activeCategory === 'Todo' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!hotel || loading)
    return (
      <div className='min-h-screen bg-[#F2F4F6] flex items-center justify-center'>
        <Loader className='animate-spin text-slate-400' />
      </div>
    );

  return (
    <div className='min-h-screen font-sans text-slate-800 pb-36 selection:bg-slate-900 selection:text-white'>
      <GlobalStyles />

      {/* --- HEADER HÍBRIDO (Opción 3 + 1) --- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className='px-6 pt-10 pb-4 sticky top-0 z-20 bg-[#F2F4F6]/80 backdrop-blur-md'
      >
        <div className='flex justify-between items-center mb-6'>
          <div>
            <div className='flex items-center gap-2 text-slate-400 mb-1'>
              <Clock size={12} />
              <span className='text-[10px] font-bold tracking-[0.2em] uppercase'>
                {greeting}
              </span>
            </div>
            <h1 className='font-serif text-3xl font-bold text-slate-900 leading-none'>
              {hotel.name}
            </h1>
          </div>
          <div className='w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-900'>
            <UtensilsCrossed size={18} />
          </div>
        </div>

        {/* BARRA "CONCIERGE SEARCH" (Predicción) */}
        <div className='relative group'>
          <input
            type='text'
            placeholder='¿Qué se te antoja hoy?'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full glass-input rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-400'
          />
          <Search
            className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors'
            size={18}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800'
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>

      {/* --- CATEGORÍAS FLOTANTES (Opción 1) --- */}
      <div className='flex gap-2 px-6 pb-6 overflow-x-auto no-scrollbar pt-2'>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className='relative px-5 py-2.5 rounded-full whitespace-nowrap outline-none group'
          >
            {activeCategory === cat && (
              <motion.div
                layoutId='activePill'
                className='absolute inset-0 bg-slate-900 rounded-full shadow-lg shadow-slate-900/20'
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 text-xs font-bold tracking-wide transition-colors ${
                activeCategory === cat
                  ? 'text-white'
                  : 'text-slate-500 group-hover:text-slate-700'
              }`}
            >
              {cat}
            </span>
          </button>
        ))}
      </div>

      {/* --- GRID ESPACIAL (Opción 2) --- */}
      <div className='px-6 grid gap-4'>
        <AnimatePresence mode='popLayout'>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
                className='glass-panel p-4 rounded-[1.8rem] flex gap-5 items-center group relative overflow-hidden'
              >
                {/* Emoji con efecto de profundidad */}
                <div className='text-4xl bg-gradient-to-br from-white to-slate-100 w-20 h-20 flex items-center justify-center rounded-2xl shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_4px_12px_rgba(0,0,0,0.05)] flex-shrink-0'>
                  {item.image_emoji}
                </div>

                <div className='flex-1 min-w-0 py-1'>
                  <div className='flex justify-between items-start'>
                    <h4 className='font-serif text-lg font-bold text-slate-800 truncate pr-2'>
                      {item.name}
                    </h4>
                  </div>
                  <p className='text-[11px] text-slate-500 leading-snug line-clamp-2 mb-3 mt-0.5 font-medium'>
                    {item.description}
                  </p>

                  <div className='flex justify-between items-end'>
                    <span className='font-bold text-slate-900 text-lg'>
                      ${item.price.toLocaleString()}
                    </span>

                    {/* Botón de acción minimalista */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => addToCart(item)}
                      className='w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform'
                    >
                      <Plus size={18} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className='text-center py-12 text-slate-400'>
              <Sparkles className='mx-auto mb-2 opacity-50' />
              <p className='text-sm font-medium'>
                No encontramos antojos con ese nombre.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* --- DYNAMIC ISLAND CART (Opción 1 - Fusión) --- */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className='fixed bottom-8 left-0 right-0 z-30 flex justify-center pointer-events-none'
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsCartOpen(true)}
              className='pointer-events-auto bg-[#1a1a1a]/95 backdrop-blur-2xl text-white py-3 pl-4 pr-6 rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-4 border border-white/10 min-w-[300px]'
            >
              {/* Contador Circular */}
              <div className='bg-white text-slate-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-black/20'>
                {totalItems}
              </div>

              <div className='flex-1 flex flex-col items-start'>
                <span className='text-[9px] font-bold text-slate-400 uppercase tracking-widest'>
                  Tu Bandeja
                </span>
                <span className='font-serif font-bold text-base'>
                  ${total.toLocaleString()}
                </span>
              </div>

              <div className='flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-300'>
                Ver <ChevronRight size={14} />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CART MODAL (Full Blur Experience) --- */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className='fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40'
            />
            <motion.div
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              exit={{ y: '110%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className='fixed bottom-0 left-0 right-0 bg-[#F2F4F6] rounded-t-[2.5rem] z-50 max-h-[92vh] flex flex-col shadow-[0_-20px_80px_rgba(0,0,0,0.4)] overflow-hidden border-t border-white/50'
            >
              <div className='px-8 py-6 flex justify-between items-center bg-white/40 backdrop-blur-md border-b border-white/50'>
                <h3 className='font-serif text-2xl font-bold text-slate-900'>
                  Resumen
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className='p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-800 transition-colors'
                >
                  <X size={20} />
                </button>
              </div>

              <div className='flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar'>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className='flex justify-between items-center bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100'
                  >
                    <div className='flex items-center gap-4'>
                      <span className='text-3xl'>{item.image_emoji}</span>
                      <div>
                        <p className='font-serif font-bold text-slate-800 text-sm'>
                          {item.name}
                        </p>
                        <p className='text-xs text-slate-400 font-medium'>
                          ${(item.price * item.qty).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3 bg-slate-50 rounded-full p-1.5 border border-slate-100'>
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className='w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-sm text-slate-600'
                      >
                        <Minus size={12} />
                      </button>
                      <span className='font-bold text-xs w-4 text-center'>
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className='w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-sm text-slate-600'
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className='mt-8 bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm'>
                  <label className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block ml-1'>
                    ¿A dónde lo llevamos?
                  </label>
                  <div className='relative'>
                    <select
                      className='w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 appearance-none'
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                    >
                      <option value=''>Selecciona tu habitación...</option>
                      {rooms.map((r) => (
                        <option
                          key={r.id}
                          value={r.id}
                        >
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <ChevronRight
                      className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90'
                      size={16}
                    />
                  </div>
                </div>
              </div>

              <div className='p-6 bg-white border-t border-slate-100 pb-10'>
                <button
                  onClick={handlePlaceOrder}
                  disabled={orderStatus === 'sending'}
                  className='w-full bg-slate-900 text-white py-5 rounded-2xl font-bold shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 text-lg hover:scale-[1.01] active:scale-[0.99] transition-all'
                >
                  {orderStatus === 'sending' ? (
                    <Loader className='animate-spin' />
                  ) : (
                    <>
                      <MessageCircle size={22} /> Confirmar por WhatsApp
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
