import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Plus,
  Minus,
  X,
  Check,
  Hotel,
  ChevronRight,
  MessageCircle,
  Loader,
} from 'lucide-react';

// --- ESTILOS GLOBALES (Mejorados) ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
    body { background-color: #F9F7F2; } 
    .font-serif { fontFamily: 'Playfair Display', serif; }
    .font-sans { fontFamily: 'Lato', sans-serif; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

const MenuPage = () => {
  const { hotelSlug } = useParams();

  // Estados
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['Todo']);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // UI States
  const [activeCategory, setActiveCategory] = useState('Todo');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [orderStatus, setOrderStatus] = useState('idle');
  const [lastOrder, setLastOrder] = useState(null);
  const [toast, setToast] = useState(null);

  const springTransition = { type: 'spring', stiffness: 300, damping: 30 };
  const softSpring = { type: 'spring', stiffness: 180, damping: 25 };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: h } = await supabase
          .from('hotels')
          .select('*')
          .limit(1)
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
            const uniqueCats = [
              'Todo',
              ...new Set(items.map((i) => i.category)),
            ];
            setCategories(uniqueCats);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMenu(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const addToCart = (item) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setToast(`${item.name} agregado`);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing)
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id)
            return { ...item, qty: Math.max(0, item.qty + delta) };
          return item;
        })
        .filter((i) => i.qty > 0)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((a, b) => a + b.qty, 0);

  const handlePlaceOrder = async () => {
    if (!selectedRoomId)
      return alert('Por favor selecciona tu número de habitación.');
    setOrderStatus('sending');
    const currentOrder = {
      items: [...cart],
      total: total,
      roomName: rooms.find((r) => r.id === selectedRoomId)?.name || 'Sin Info',
    };
    setLastOrder(currentOrder);

    try {
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
      setOrderStatus('success');
      setCart([]);
      setIsCartOpen(false);
    } catch (error) {
      alert(error.message);
      setOrderStatus('idle');
    }
  };

  const sendToWhatsApp = () => {
    if (!lastOrder) return;
    const itemsList = lastOrder.items
      .map((i) => `- ${i.qty}x ${i.name}`)
      .join('\n');
    const message = `*PEDIDO BOUTIQUE* 🛎️\n\n🏨 ${
      hotel.name
    }\n🚪 Habitación: *${
      lastOrder.roomName
    }*\n\n📝 Selección:\n${itemsList}\n\n💎 Total: $${lastOrder.total.toLocaleString()}\n\nPor favor confirmar.`;
    window.open(
      `https://wa.me/${hotel.phone}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  if (!hotel || loadingMenu)
    return (
      <div className='min-h-screen bg-[#F9F7F2] flex items-center justify-center'>
        <Loader className='animate-spin text-[#8C3A3A]' />
      </div>
    );

  if (orderStatus === 'success')
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className='min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-8 text-center'
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={springTransition}
          className='w-24 h-24 bg-[#8C3A3A] text-[#F9F7F2] rounded-full flex items-center justify-center mb-8 shadow-2xl'
        >
          <Check
            size={48}
            strokeWidth={2}
          />
        </motion.div>
        <h2 className='text-4xl font-serif text-[#2C2C2C] mb-4 italic'>
          Excellent Choice
        </h2>
        <p className='text-[#5D5555] font-sans mb-10 max-w-xs leading-relaxed'>
          Su pedido ha sido recibido. Estamos preparándolo para usted.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={sendToWhatsApp}
          className='w-full max-w-xs bg-[#2C2C2C] text-[#F9F7F2] py-4 rounded-xl font-sans font-bold shadow-lg flex items-center justify-center gap-3 mb-4'
        >
          <MessageCircle size={20} /> Confirmar por WhatsApp
        </motion.button>
        <button
          onClick={() => setOrderStatus('idle')}
          className='text-[#8C3A3A] font-serif font-bold text-lg underline decoration-1 underline-offset-4'
        >
          Volver al Menú
        </button>
      </motion.div>
    );

  return (
    <div className='min-h-screen bg-[#F9F7F2] font-sans text-[#2C2C2C] pb-32 selection:bg-[#8C3A3A] selection:text-white'>
      <GlobalStyles />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className='fixed top-6 left-1/2 bg-[#2C2C2C] text-[#F9F7F2] px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 backdrop-blur-md bg-opacity-95'
          >
            <span className='text-[#F9F7F2] font-serif italic'>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER MEJORADO (Menos blur, más legibilidad) */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={softSpring}
        className='bg-[#F9F7F2]/95 backdrop-blur-sm px-6 py-6 sticky top-0 z-20 flex justify-between items-center border-b border-[#E5E0D8]'
      >
        <div className='flex flex-col'>
          <span className='text-[10px] tracking-[0.2em] uppercase text-[#8C3A3A] font-bold mb-1'>
            Bienvenido a
          </span>
          <h1 className='font-serif text-2xl font-bold text-[#2C2C2C] leading-none'>
            {hotel.name}
          </h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={() => setIsCartOpen(true)}
          className='relative p-3 bg-white rounded-full shadow-sm border border-[#E5E0D8]'
        >
          <ShoppingBag
            size={22}
            className='text-[#2C2C2C]'
          />
          {totalItems > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='absolute -top-1 -right-1 bg-[#8C3A3A] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md'
            >
              {totalItems}
            </motion.div>
          )}
        </motion.button>
      </motion.header>

      {/* TABS DE CATEGORÍA (Mejor contraste) */}
      <div className='flex gap-4 px-6 py-6 overflow-x-auto no-scrollbar'>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className='relative px-5 py-2 rounded-full whitespace-nowrap outline-none'
          >
            {activeCategory === cat && (
              <motion.div
                layoutId='activeTab'
                className='absolute inset-0 bg-[#2C2C2C] rounded-full'
                transition={springTransition}
              />
            )}
            <span
              className={`relative z-10 text-sm font-bold tracking-wide transition-colors ${
                activeCategory === cat ? 'text-[#F9F7F2]' : 'text-[#5D5555]'
              }`}
            >
              {cat.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      <div className='px-6 grid gap-6'>
        <AnimatePresence mode='popLayout'>
          {menuItems
            .filter(
              (i) => activeCategory === 'Todo' || i.category === activeCategory
            )
            .map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ ...softSpring, delay: index * 0.05 }}
                className='bg-white p-5 rounded-[2rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-[#E5E0D8] flex justify-between items-center group'
              >
                <div className='flex items-center gap-5'>
                  <div className='text-4xl bg-[#F9F7F2] w-20 h-20 flex items-center justify-center rounded-[1.5rem] shadow-inner'>
                    {item.image_emoji}
                  </div>
                  <div>
                    <h4 className='font-serif text-xl font-bold text-[#2C2C2C] mb-1'>
                      {item.name}
                    </h4>
                    {/* CONTRASTE CORREGIDO: De #888 a #5D5555 */}
                    <p className='text-xs text-[#5D5555] font-sans mb-2 max-w-[140px] leading-snug'>
                      {item.description}
                    </p>
                    <p className='font-sans font-bold text-[#8C3A3A] text-lg'>
                      ${item.price.toLocaleString()}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{
                    scale: 1.1,
                    backgroundColor: '#8C3A3A',
                    color: '#FFF',
                  }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => addToCart(item)}
                  className='w-12 h-12 bg-[#F2F0E9] rounded-full flex items-center justify-center text-[#2C2C2C] shadow-sm transition-colors'
                >
                  <Plus size={20} />
                </motion.button>
              </motion.div>
            ))}
        </AnimatePresence>
        {menuItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='text-center py-12'
          >
            <p className='font-serif text-[#5D5555] italic text-lg'>
              No hay delicias en esta categoría.
            </p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={springTransition}
            className='fixed bottom-8 left-6 right-6 z-30'
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCartOpen(true)}
              className='w-full bg-[#2C2C2C] text-[#F9F7F2] p-5 rounded-[1.5rem] shadow-2xl flex justify-between items-center border border-[#444]'
            >
              <div className='flex items-center gap-4'>
                <div className='bg-[#F9F7F2] text-[#2C2C2C] w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md'>
                  {totalItems}
                </div>
                <span className='font-serif font-bold text-lg tracking-wide'>
                  Ver mi orden
                </span>
              </div>
              <div className='flex items-center gap-3'>
                <span className='font-sans text-xl font-bold'>
                  ${total.toLocaleString()}
                </span>
                <ChevronRight
                  size={20}
                  className='text-[#888]'
                />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CARRITO */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className='fixed inset-0 bg-[#2C2C2C]/40 backdrop-blur-sm z-40'
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: '0%' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className='fixed bottom-0 left-0 right-0 bg-[#F9F7F2] rounded-t-[2.5rem] z-50 h-[90vh] flex flex-col shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden'
            >
              <div
                className='w-full flex justify-center pt-4 pb-2'
                onClick={() => setIsCartOpen(false)}
              >
                <div className='w-16 h-1.5 bg-[#E5E0D8] rounded-full' />
              </div>
              <div className='px-8 py-4 flex justify-between items-center border-b border-[#E5E0D8]'>
                <h3 className='font-serif text-3xl font-bold text-[#2C2C2C] italic'>
                  Su Selección
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className='p-2 bg-[#E5E0D8] rounded-full text-[#555]'
                >
                  <X size={20} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className='flex-1 flex flex-col items-center justify-center text-[#5D5555]'>
                  <ShoppingBag
                    size={64}
                    className='mb-4 opacity-20'
                  />
                  <p className='font-serif italic text-lg'>
                    Su bandeja está vacía
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className='mt-6 text-[#8C3A3A] font-bold text-sm underline decoration-1 underline-offset-4'
                  >
                    Explorar Menú
                  </button>
                </div>
              ) : (
                <>
                  <div className='flex-1 overflow-y-auto p-6 space-y-6'>
                    {cart.map((item) => (
                      <motion.div
                        layout
                        key={item.id}
                        className='flex justify-between items-center'
                      >
                        <div className='flex items-center gap-4'>
                          <span className='text-3xl bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-[#E5E0D8]'>
                            {item.image_emoji}
                          </span>
                          <div>
                            <p className='font-serif font-bold text-lg text-[#2C2C2C]'>
                              {item.name}
                            </p>
                            <p className='text-xs text-[#5D5555] font-sans'>
                              ${item.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-3 bg-white rounded-full p-1.5 shadow-sm border border-[#E5E0D8]'>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => updateQty(item.id, -1)}
                            className='w-8 h-8 flex items-center justify-center text-[#5D5555] hover:bg-[#F9F7F2] rounded-full'
                          >
                            <Minus size={14} />
                          </motion.button>
                          <span className='font-bold text-sm w-4 text-center font-sans'>
                            {item.qty}
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => updateQty(item.id, 1)}
                            className='w-8 h-8 flex items-center justify-center text-[#2C2C2C] bg-[#F2F0E9] rounded-full'
                          >
                            <Plus size={14} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className='p-8 bg-white border-t border-[#E5E0D8] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]'>
                    {/* SELECCION DE HABITACIÓN MEJORADA (Borde destacado) */}
                    <div className='mb-6'>
                      <label className='block text-xs font-bold text-[#5D5555] uppercase tracking-widest mb-3 pl-1'>
                        Seleccione su Habitación
                      </label>
                      <div className='relative'>
                        <Hotel
                          className='absolute left-4 top-4 text-[#8C3A3A]'
                          size={20}
                        />
                        <select
                          className='w-full p-4 pl-12 bg-[#F9F7F2] border-2 border-[#E5E0D8] focus:border-[#8C3A3A] rounded-2xl font-serif font-bold text-lg text-[#2C2C2C] outline-none transition-colors appearance-none'
                          value={selectedRoomId}
                          onChange={(e) => setSelectedRoomId(e.target.value)}
                        >
                          <option value=''>Habitación...</option>
                          {rooms.map((r) => (
                            <option
                              key={r.id}
                              value={r.id}
                            >
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className='flex justify-between items-end mb-6'>
                      <span className='text-[#5D5555] font-serif italic text-lg'>
                        Total a Pagar
                      </span>
                      <span className='text-4xl font-sans font-bold text-[#2C2C2C]'>
                        ${total.toLocaleString()}
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePlaceOrder}
                      disabled={orderStatus === 'sending'}
                      className='w-full bg-[#8C3A3A] text-white font-sans font-bold py-5 rounded-2xl shadow-xl shadow-[#8C3A3A]/30 flex items-center justify-center gap-2 text-lg'
                    >
                      {orderStatus === 'sending' ? (
                        <Loader className='animate-spin' />
                      ) : (
                        'Confirmar Pedido'
                      )}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
