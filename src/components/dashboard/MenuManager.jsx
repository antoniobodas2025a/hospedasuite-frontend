import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // 👈 CONEXIÓN ACTIVA
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Edit,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

// --- BANCO DE ICONOS CURADOS ---
const FOOD_ICONS = [
  '🍔',
  '🍕',
  '🌭',
  '🌮',
  '🌯',
  '🥗',
  '🍝',
  '🍜',
  '🍲',
  '🍛',
  '🍣',
  '🍱',
  '🥟',
  '🍤',
  '🍖',
  '🍗',
  '🥩',
  '🥓',
  '🥞',
  '🧇',
  '🧀',
  '🥖',
  '🥨',
  '🥯',
  '🥐',
  '🍞',
  '🥚',
  '🍳',
  '🧈',
  '🥑',
  '🥦',
  '🥒',
  '🌽',
  '🥕',
  '🍅',
  '🥔',
  '🍆',
  '🍦',
  '🍩',
  '🍪',
  '🎂',
  '🍰',
  '🧁',
  '🥧',
  '🍫',
  '🍬',
  '🍭',
  '🍮',
  '🍯',
  '☕',
  '🍵',
  '🧃',
  '🥛',
  '🍺',
  '🍷',
  '🥃',
  '🍸',
  '🍹',
  '🍾',
];

// --- ESTILOS VISUALES (Intactos) ---
const glassCard =
  'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-white/80 transition-all duration-500 ease-out';
const glassPanel =
  'bg-[#F8FAFC]/80 backdrop-blur-2xl border-l border-white/60 shadow-[-20px_0_50px_rgba(0,0,0,0.05)]';
const inputGlass =
  'bg-white/50 border border-white/60 rounded-2xl px-4 py-3 outline-none focus:bg-white/80 focus:ring-2 focus:ring-blue-100/50 transition-all font-medium text-slate-700 placeholder-slate-400';

const MenuManager = ({ hotelInfo }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [items, setItems] = useState([]); // Inicia vacío, se llenará con la DB
  const [loading, setLoading] = useState(true);

  // 1. CARGAR DATOS REALES AL INICIAR
  useEffect(() => {
    if (hotelInfo?.id) fetchItems();
  }, [hotelInfo]);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('hotel_id', hotelInfo.id)
      .order('created_at', { ascending: false });

    if (data) setItems(data);
    setLoading(false);
  };

  const handleOpenEditor = (item = null) => {
    setActiveItem(
      item || {
        id: null,
        name: '',
        price: '',
        image_emoji: '🍽️', // Usamos image_emoji para coincidir con la DB
        is_active: true,
        category: 'Fuertes',
        description: '',
      }
    );
    setIsEditorOpen(true);
  };

  // 2. GUARDAR (INSERTAR O ACTUALIZAR)
  const handleSave = async () => {
    const payload = {
      hotel_id: hotelInfo.id,
      name: activeItem.name,
      price: parseFloat(activeItem.price) || 0,
      image_emoji: activeItem.image_emoji, // Mapeo correcto para la DB
      category: activeItem.category,
      description: activeItem.description,
      is_active: activeItem.is_active,
    };

    try {
      if (activeItem.id) {
        // Actualizar existente
        await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', activeItem.id);
      } else {
        // Crear nuevo
        await supabase.from('menu_items').insert([payload]);
      }
      fetchItems(); // Recarga visual
      setIsEditorOpen(false);
    } catch (e) {
      console.error('Error guardando:', e);
      alert('Error al conectar con la nube');
    }
  };

  // 3. ACTIVAR / DESACTIVAR RAPIDO
  const handleToggleActive = async (item) => {
    const newStatus = !item.is_active;
    // Optimismo UI (cambia inmediato)
    setItems(
      items.map((i) => (i.id === item.id ? { ...i, is_active: newStatus } : i))
    );
    // Persistencia DB
    await supabase
      .from('menu_items')
      .update({ is_active: newStatus })
      .eq('id', item.id);
  };

  // 4. ELIMINAR DE LA NUBE
  const handleDelete = async () => {
    if (window.confirm('¿Deseas eliminar permanentemente este plato?')) {
      await supabase.from('menu_items').delete().eq('id', activeItem.id);
      fetchItems();
      setIsEditorOpen(false);
    }
  };

  const handleUpdateField = (field, value) => {
    setActiveItem((prev) => ({ ...prev, [field]: value }));
  };

  if (loading)
    return (
      <div className='h-64 flex flex-col items-center justify-center text-slate-400 gap-3'>
        <Loader2
          className='animate-spin text-slate-300'
          size={32}
        />
        <span className='text-[10px] font-bold uppercase tracking-widest opacity-70'>
          Sincronizando Menú...
        </span>
      </div>
    );

  return (
    <div className='relative min-h-[80vh] p-8 pb-32 overflow-hidden'>
      {/* HEADER */}
      <div className='flex justify-between items-end mb-10'>
        <div>
          <span className='text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase'>
            Gestión de Carta
          </span>
          <h1 className='text-4xl font-serif text-slate-800 mt-1'>
            Room Service
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleOpenEditor(null)}
          className='bg-slate-900/90 text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl backdrop-blur-md flex items-center gap-2 border border-white/10'
        >
          <Plus size={18} /> Crear Plato
        </motion.button>
      </div>

      {/* GRID DE PLATOS */}
      <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6'>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`${glassCard} group relative p-6 flex flex-col items-center text-center cursor-pointer ${
              !item.is_active ? 'opacity-60 grayscale-[0.5]' : ''
            }`}
            onClick={() => handleOpenEditor(item)}
          >
            {/* Toggle Switch */}
            <div
              className='absolute top-4 right-4 z-10'
              onClick={(e) => {
                e.stopPropagation();
                handleToggleActive(item);
              }}
            >
              {item.is_active ? (
                <ToggleRight
                  className='text-emerald-500'
                  size={28}
                />
              ) : (
                <ToggleLeft
                  className='text-slate-400'
                  size={28}
                />
              )}
            </div>

            {/* Icono Principal (Mapeado a image_emoji) */}
            <div className='text-6xl mb-6 drop-shadow-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500'>
              {item.image_emoji}
            </div>

            <h3 className='font-serif font-bold text-lg text-slate-800 mb-1'>
              {item.name}
            </h3>
            <span className='text-[10px] font-bold tracking-widest text-slate-400 bg-white/50 px-2 py-1 rounded-lg uppercase'>
              {item.category}
            </span>
            <div className='mt-4 font-bold text-slate-600'>
              ${Number(item.price).toLocaleString()}
            </div>

            <div className='absolute inset-0 bg-white/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] flex items-center justify-center'>
              <span className='bg-white/90 px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2'>
                <Edit size={14} /> Editar
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* EDITOR DRAWER */}
      <AnimatePresence>
        {isEditorOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditorOpen(false)}
              className='fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[100]'
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`fixed top-4 bottom-4 right-4 w-full max-w-md ${glassPanel} rounded-[2.5rem] z-[101] overflow-hidden flex flex-col border border-white`}
            >
              <div className='p-8 border-b border-white/40 flex justify-between items-center bg-white/20'>
                <h2 className='font-serif text-2xl font-bold text-slate-800'>
                  {activeItem.id ? 'Editar Plato' : 'Nuevo Plato'}
                </h2>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className='p-2 hover:bg-white/50 rounded-full text-slate-500'
                >
                  <X size={20} />
                </button>
              </div>

              <div className='flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar'>
                {/* Preview Icono */}
                <div className='flex flex-col items-center gap-4'>
                  <div className='w-24 h-24 bg-white/60 rounded-[2rem] border border-white flex items-center justify-center text-6xl shadow-inner relative'>
                    {activeItem.image_emoji}
                    <button className='absolute -bottom-2 -right-2 bg-slate-900 text-white p-2 rounded-full shadow-lg'>
                      <ImageIcon size={12} />
                    </button>
                  </div>
                  <p className='text-[10px] font-bold uppercase text-slate-400 tracking-widest'>
                    Iconografía HIG 2026
                  </p>
                </div>

                {/* Selector de Iconos */}
                <div className='bg-white/40 rounded-2xl p-4 border border-white/50 h-44 overflow-y-auto grid grid-cols-6 gap-2 custom-scrollbar shadow-inner'>
                  {FOOD_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => handleUpdateField('image_emoji', icon)}
                      className={`text-2xl h-10 w-10 flex items-center justify-center rounded-xl transition-all ${
                        activeItem.image_emoji === icon
                          ? 'bg-white shadow-md ring-2 ring-blue-100'
                          : 'opacity-60 hover:opacity-100 hover:bg-white/40'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>

                {/* Formulario */}
                <div className='space-y-4'>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-black text-slate-400 uppercase ml-1'>
                      Nombre
                    </label>
                    <input
                      type='text'
                      value={activeItem.name}
                      onChange={(e) =>
                        handleUpdateField('name', e.target.value)
                      }
                      className={`w-full ${inputGlass}`}
                      placeholder='Nombre del plato...'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-1'>
                      <label className='text-[10px] font-black text-slate-400 uppercase ml-1'>
                        Precio
                      </label>
                      <input
                        type='number'
                        value={activeItem.price}
                        onChange={(e) =>
                          handleUpdateField('price', e.target.value)
                        }
                        className={`w-full ${inputGlass}`}
                        placeholder='0'
                      />
                    </div>
                    <div className='space-y-1'>
                      <label className='text-[10px] font-black text-slate-400 uppercase ml-1'>
                        Categoría
                      </label>
                      <select
                        value={activeItem.category}
                        onChange={(e) =>
                          handleUpdateField('category', e.target.value)
                        }
                        className={`w-full ${inputGlass} appearance-none`}
                      >
                        <option>Fuertes</option>
                        <option>Bebidas</option>
                        <option>Postres</option>
                        <option>Bar</option>
                        <option>Desayuno</option>
                      </select>
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-[10px] font-black text-slate-400 uppercase ml-1'>
                      Descripción
                    </label>
                    <div className='relative'>
                      <textarea
                        rows='3'
                        value={activeItem.description}
                        onChange={(e) =>
                          handleUpdateField('description', e.target.value)
                        }
                        className={`w-full ${inputGlass} resize-none pr-10`}
                        placeholder='Ingredientes...'
                      />
                      <motion.button
                        whileHover={{ rotate: 15 }}
                        className='absolute bottom-3 right-3 text-blue-500 bg-white/80 p-1.5 rounded-lg shadow-sm border border-white/50'
                      >
                        <Sparkles size={16} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              <div className='p-6 bg-white/30 border-t border-white/40 backdrop-blur-md flex flex-col gap-3'>
                <button
                  onClick={handleSave}
                  className='w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-transform'
                >
                  {activeItem.id ? 'Guardar Cambios' : 'Publicar en Menú'}
                </button>
                {activeItem.id && (
                  <button
                    onClick={handleDelete}
                    className='w-full text-red-500 text-[10px] font-black uppercase tracking-widest py-2 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2'
                  >
                    <Trash2 size={12} /> Eliminar del Inventario
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuManager;
