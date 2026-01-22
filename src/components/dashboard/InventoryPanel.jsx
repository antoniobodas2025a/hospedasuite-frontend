import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  CheckCircle2,
  Image as ImageIcon,
  Wifi,
  Tv,
  Wind,
  Coffee,
  Lock,
  Car,
  Utensils,
  Mountain,
  Star,
  Users,
  BedDouble,
  Scan,
  UploadCloud,
  RefreshCw,
  Trash2,
  Settings,
  Sparkles,
  MapPin,
  Smartphone,
} from 'lucide-react';
import { ChannelManager } from './ChannelManager';

const AMENITIES_LIST = [
  { id: 'Wifi', label: 'Wifi 5G', icon: Wifi },
  { id: 'TV', label: 'Smart TV', icon: Tv },
  { id: 'AC', label: 'Aire Acond.', icon: Wind },
  { id: 'Agua Caliente', label: 'Agua Caliente', icon: Coffee },
  { id: 'Caja Fuerte', label: 'Caja Fuerte', icon: Lock },
  { id: 'Parqueadero', label: 'Parqueadero', icon: Car },
  { id: 'Desayuno', label: 'Desayuno', icon: Utensils },
  { id: 'Vista', label: 'Vista Panorámica', icon: Mountain },
  { id: 'Baño Privado', label: 'Baño Privado', icon: Star },
];

const BED_TYPES = ['King Size', 'Queen Size', 'Doble', 'Sencilla', 'Camarote'];

const InventoryPanel = ({
  rooms,
  inventory,
  onOpenSync,
  hotelId,
  hotelInfo,
}) => {
  const {
    createRoom,
    updateRoom,
    deleteRoom,
    updateHotelProfile,
    loading,
    uploading,
  } = inventory || {};

  // MODALES
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);

  const [editingRoom, setEditingRoom] = useState(null);
  const fileInputRef = useRef(null);
  const heroInputRef = useRef(null);

  // ESTADO HABITACIÓN
  const [roomData, setRoomData] = useState({
    name: '',
    price: '',
    status: 'available',
    is_price_per_person: false,
    description: '',
    capacity: 2,
    beds: 1,
    bed_type: 'Doble',
    amenities: [],
    images: [],
  });
  const [newRoomFiles, setNewRoomFiles] = useState([]);

  // ESTADO PERFIL HOTEL (Branding)
  const [hotelData, setHotelData] = useState({
    name: '',
    tagline: '',
    location: '',
    phone: '',
    instagram_url: '',
    main_image_url: '',
  });
  const [newHeroFile, setNewHeroFile] = useState(null);

  // Sincronizar datos del hotel cuando llegan
  useEffect(() => {
    if (hotelInfo) {
      setHotelData({
        name: hotelInfo.name || '',
        tagline: hotelInfo.tagline || '',
        location: hotelInfo.location || '',
        phone: hotelInfo.phone || '',
        instagram_url: hotelInfo.instagram_url || '',
        main_image_url: hotelInfo.main_image_url || '',
      });
    }
  }, [hotelInfo]);

  // --- HANDLERS HABITACIÓN ---
  const handleOpenCreateRoom = () => {
    setEditingRoom(null);
    setRoomData({
      name: '',
      price: '',
      status: 'available',
      is_price_per_person: false,
      description: '',
      capacity: 2,
      beds: 1,
      bed_type: 'Doble',
      amenities: [],
      images: [],
    });
    setNewRoomFiles([]);
    setShowRoomModal(true);
  };

  const handleOpenEditRoom = (room) => {
    setEditingRoom(room);
    setRoomData({
      name: room.name,
      price: room.price,
      status: room.status || 'available',
      is_price_per_person: room.is_price_per_person || false,
      description: room.description || '',
      capacity: room.capacity || 2,
      beds: room.beds || 1,
      bed_type: room.bed_type || 'Doble',
      amenities: room.amenities || [],
      images: room.images || [],
    });
    setNewRoomFiles([]);
    setShowRoomModal(true);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!hotelId) return alert('Error Crítico: Falta ID Hotel.');
    try {
      if (editingRoom) {
        await updateRoom(
          editingRoom.id,
          roomData,
          newRoomFiles,
          roomData.images,
          editingRoom.status,
        );
      } else {
        await createRoom(roomData, newRoomFiles);
      }
      setShowRoomModal(false);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // --- HANDLERS PERFIL HOTEL ---
  const handleSaveHotel = async (e) => {
    e.preventDefault();
    try {
      await updateHotelProfile(hotelData, newHeroFile);
      alert('✅ Identidad del hotel actualizada con éxito.');
      setShowHotelModal(false);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleHeroChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewHeroFile(e.target.files[0]);
    }
  };

  // --- UTILS ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0)
      setNewRoomFiles([...newRoomFiles, ...Array.from(e.target.files)]);
  };
  const toggleAmenity = (id) => {
    setRoomData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter((a) => a !== id)
        : [...prev.amenities, id],
    }));
  };
  const handleDeleteRoom = async () => {
    if (window.confirm(`⚠️ ¿Eliminar "${editingRoom.name}" permanentemente?`)) {
      await deleteRoom(editingRoom.id);
      setShowRoomModal(false);
    }
  };
  const removeNewFile = (index) =>
    setNewRoomFiles((prev) => prev.filter((_, i) => i !== index));
  const removeExistingImage = (url) =>
    setRoomData((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img !== url),
    }));

  return (
    <div className='h-full p-6 overflow-y-auto scrollbar-hide relative pb-32'>
      {/* HEADER PRINCIPAL */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4'>
        <div>
          <h2 className='text-3xl font-serif font-bold text-slate-800 flex items-center gap-3'>
            Inventario & Marca
            {hotelInfo?.tagline && (
              <span className='hidden md:block text-xs font-sans font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-lg italic'>
                "{hotelInfo.tagline}"
              </span>
            )}
          </h2>
          <p className='text-slate-500'>
            Diseña la experiencia de tus huéspedes.
          </p>
        </div>
        <div className='flex gap-3'>
          {/* BOTÓN CONFIGURAR HOTEL (BRANDING) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHotelModal(true)}
            className='px-4 py-3 bg-white text-slate-700 border border-slate-200 font-bold rounded-2xl shadow-sm flex items-center gap-2 hover:bg-slate-50'
          >
            <Settings
              size={18}
              className='text-purple-600'
            />{' '}
            <span className='hidden md:inline'>Configurar Hotel</span>
          </motion.button>

          {/* BOTÓN NUEVA HABITACIÓN */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenCreateRoom}
            className='px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-xl flex items-center gap-2'
          >
            <Plus size={18} /> Nueva Habitación
          </motion.button>
        </div>
      </div>

      {/* GRID HABITACIONES */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
        <AnimatePresence>
          {rooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className='group relative bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer'
              onClick={() => handleOpenEditRoom(room)}
            >
              <div className='h-48 w-full bg-slate-100 relative'>
                {room.images && room.images.length > 0 ? (
                  <img
                    src={room.images[0]}
                    alt={room.name}
                    className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-slate-300 bg-slate-50'>
                    <ImageIcon size={40} />
                  </div>
                )}
                <div className='absolute top-4 left-4'>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase backdrop-blur-md border border-white/20 ${
                      room.status === 'available'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-orange-500/90 text-white'
                    }`}
                  >
                    {room.status === 'available'
                      ? 'Disponible'
                      : 'Mantenimiento'}
                  </span>
                </div>
                <div className='absolute top-4 right-4'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSync(room.id);
                    }}
                    className='p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-blue-600 transition-all shadow-sm z-10'
                    title='Sync'
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div className='p-5'>
                <div className='flex justify-between items-start mb-2'>
                  <h3 className='text-lg font-bold text-slate-800 line-clamp-1'>
                    {room.name}
                  </h3>
                  <div className='text-right whitespace-nowrap ml-2'>
                    <span className='block text-lg font-serif font-bold text-slate-900'>
                      ${parseInt(room.price).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className='flex gap-2 flex-wrap'>
                  <span className='px-2 py-1 bg-slate-50 rounded-md text-[10px] font-bold text-slate-500 border border-slate-100'>
                    <Users
                      size={10}
                      className='inline mr-1'
                    />{' '}
                    {room.capacity}
                  </span>
                  <span className='px-2 py-1 bg-slate-50 rounded-md text-[10px] font-bold text-slate-500 border border-slate-100 truncate max-w-[80px]'>
                    {room.bed_type}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* === MODAL CONFIGURAR HOTEL (BRANDING) === */}
      <AnimatePresence>
        {showHotelModal && (
          <div className='fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto'>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className='bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl p-8 relative overflow-hidden'
            >
              <button
                onClick={() => setShowHotelModal(false)}
                className='absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200'
              >
                <X size={20} />
              </button>

              <h3 className='font-serif text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2'>
                <Sparkles className='text-purple-600' /> Identidad del Hotel
              </h3>

              <form
                onSubmit={handleSaveHotel}
                className='space-y-6'
              >
                {/* HERO IMAGE UPLOAD */}
                <div className='bg-slate-50 p-6 rounded-2xl border border-slate-100'>
                  <label className='text-xs font-bold uppercase text-slate-400 mb-3 block'>
                    Foto de Portada (Página de Reservas)
                  </label>
                  <div className='flex items-start gap-6'>
                    <div
                      onClick={() => heroInputRef.current.click()}
                      className='w-40 h-24 bg-white rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-purple-500 hover:text-purple-500 text-slate-400 transition-all relative overflow-hidden group'
                    >
                      {newHeroFile ? (
                        <img
                          src={URL.createObjectURL(newHeroFile)}
                          className='w-full h-full object-cover'
                        />
                      ) : hotelData.main_image_url ? (
                        <img
                          src={hotelData.main_image_url}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='flex flex-col items-center gap-1'>
                          <ImageIcon size={24} />
                          <span className='text-[10px] font-bold'>Subir</span>
                        </div>
                      )}
                      {/* Hover Overlay */}
                      <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
                        <UploadCloud className='text-white' />
                      </div>
                    </div>
                    <input
                      type='file'
                      ref={heroInputRef}
                      className='hidden'
                      accept='image/*'
                      onChange={handleHeroChange}
                    />

                    <div className='flex-1 space-y-4'>
                      <div className='space-y-1'>
                        <label className='text-[10px] font-bold uppercase text-slate-400'>
                          Tagline (Frase Emocional)
                        </label>
                        <input
                          className='w-full p-3 bg-white border border-slate-200 rounded-xl font-serif italic text-slate-700 focus:ring-2 focus:ring-purple-200 outline-none'
                          placeholder='Ej: "Donde el lujo toca la naturaleza"'
                          value={hotelData.tagline}
                          onChange={(e) =>
                            setHotelData({
                              ...hotelData,
                              tagline: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* DATOS DE CONTACTO PUBLICOS */}
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1'>
                      <MapPin size={10} /> Ubicación Pública
                    </label>
                    <input
                      className='w-full p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none'
                      value={hotelData.location}
                      onChange={(e) =>
                        setHotelData({ ...hotelData, location: e.target.value })
                      }
                      placeholder='Ej: Villa de Leyva, Km 2'
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1'>
                      <Smartphone size={10} /> WhatsApp Reservas
                    </label>
                    <input
                      className='w-full p-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none'
                      value={hotelData.phone}
                      onChange={(e) =>
                        setHotelData({ ...hotelData, phone: e.target.value })
                      }
                      placeholder='Ej: 573001234567'
                    />
                  </div>
                </div>

                <button
                  type='submit'
                  disabled={loading || uploading}
                  className='w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2'
                >
                  {uploading ? (
                    <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent' />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  Guardar Identidad
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === MODAL HABITACIÓN (CORREGIDO: SCROLL DESBLOQUEADO EN MÓVIL) === */}
      <AnimatePresence>
        {showRoomModal && (
          // CORRECCIÓN CLAVE 1: items-start en vez de items-center.
          // Esto evita que el tope del modal se corte si es más alto que la pantalla.
          <div className='fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[9999] flex justify-center p-0 md:p-4 overflow-y-auto items-start md:items-center'>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              // CORRECCIÓN CLAVE 2: Estructura responsiva (flex-col + min-h-screen en móvil)
              className='bg-white md:rounded-[2.5rem] shadow-2xl w-full max-w-5xl flex flex-col md:flex-row relative min-h-screen md:min-h-0 md:h-[85vh] md:overflow-hidden'
            >
              {/* COLUMNA IZQUIERDA: FORMULARIO */}
              <div className='flex-1 p-6 md:p-8 md:overflow-y-auto custom-scrollbar relative order-1'>
                {/* HEADER LÍQUIDO (No sticky en móvil para ganar espacio) */}
                <div className='flex justify-between items-center mb-6 md:sticky md:top-0 bg-white z-20 py-2'>
                  <h3 className='font-serif text-2xl font-bold text-slate-800'>
                    {editingRoom ? 'Editar Experiencia' : 'Nueva Habitación'}
                  </h3>
                  <button
                    onClick={() => setShowRoomModal(false)}
                    className='p-2 hover:bg-slate-100 rounded-full bg-slate-50 md:bg-transparent'
                  >
                    <X
                      size={24}
                      className='text-slate-400'
                    />
                  </button>
                </div>

                <form
                  onSubmit={handleSaveRoom}
                  className='space-y-6 pb-10'
                >
                  {/* BLOQUE DATOS */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-1'>
                      <label className='text-[10px] font-bold uppercase text-slate-400'>
                        Nombre
                      </label>
                      <input
                        className='w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-200'
                        placeholder='Ej: Suite 101'
                        value={roomData.name}
                        onChange={(e) =>
                          setRoomData({ ...roomData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className='space-y-1'>
                      <label className='text-[10px] font-bold uppercase text-slate-400'>
                        Precio
                      </label>
                      <input
                        type='number'
                        className='w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-200'
                        placeholder='0'
                        value={roomData.price}
                        onChange={(e) =>
                          setRoomData({ ...roomData, price: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* BLOQUE CONFIGURACIÓN */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-1'>
                      <label className='text-[10px] font-bold uppercase text-slate-400'>
                        Cobro
                      </label>
                      <div
                        onClick={() =>
                          setRoomData({
                            ...roomData,
                            is_price_per_person: !roomData.is_price_per_person,
                          })
                        }
                        className='flex flex-col justify-center p-3 bg-slate-50 rounded-xl cursor-pointer border border-transparent hover:border-slate-200'
                      >
                        <div className='flex items-center gap-2 mb-1'>
                          <div
                            className={`w-8 h-4 rounded-full transition-all relative ${
                              roomData.is_price_per_person
                                ? 'bg-blue-600'
                                : 'bg-slate-300'
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                                roomData.is_price_per_person
                                  ? 'left-4.5'
                                  : 'left-0.5'
                              }`}
                            />
                          </div>
                          <span className='text-[10px] font-bold uppercase text-slate-400'>
                            Modo
                          </span>
                        </div>
                        <span className='text-xs font-bold text-slate-700 leading-tight'>
                          {roomData.is_price_per_person
                            ? 'Por Persona'
                            : 'Por Noche'}
                        </span>
                      </div>
                    </div>
                    <div className='space-y-1'>
                      <label className='text-[10px] font-bold uppercase text-slate-400'>
                        Estado
                      </label>
                      <select
                        className={`w-full p-3 rounded-xl font-bold text-xs outline-none appearance-none ${
                          roomData.status === 'available'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-orange-50 text-orange-600'
                        }`}
                        value={roomData.status}
                        onChange={(e) =>
                          setRoomData({ ...roomData, status: e.target.value })
                        }
                      >
                        <option value='available'>🟢 Disponible</option>
                        <option value='maintenance'>🟠 Mantenimiento</option>
                      </select>
                    </div>
                  </div>

                  {/* BLOQUE DISTRIBUCIÓN */}
                  <div className='p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3'>
                    <div className='flex items-center gap-2'>
                      <Scan
                        size={16}
                        className='text-blue-500'
                      />
                      <span className='text-xs font-bold uppercase text-blue-500'>
                        Distribución
                      </span>
                    </div>
                    <div className='grid grid-cols-3 gap-3'>
                      <div>
                        <label className='text-[10px] font-bold text-slate-400 block mb-1'>
                          Pax
                        </label>
                        <input
                          type='number'
                          className='w-full p-2 bg-white rounded-lg border-none shadow-sm text-center text-sm'
                          value={roomData.capacity}
                          onChange={(e) =>
                            setRoomData({
                              ...roomData,
                              capacity: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className='text-[10px] font-bold text-slate-400 block mb-1'>
                          Camas
                        </label>
                        <input
                          type='number'
                          className='w-full p-2 bg-white rounded-lg border-none shadow-sm text-center text-sm'
                          value={roomData.beds}
                          onChange={(e) =>
                            setRoomData({ ...roomData, beds: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className='text-[10px] font-bold text-slate-400 block mb-1'>
                          Tipo
                        </label>
                        <select
                          className='w-full p-2 bg-white rounded-lg border-none shadow-sm text-[10px]'
                          value={roomData.bed_type}
                          onChange={(e) =>
                            setRoomData({
                              ...roomData,
                              bed_type: e.target.value,
                            })
                          }
                        >
                          {BED_TYPES.map((t) => (
                            <option
                              key={t}
                              value={t}
                            >
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* DESCRIPCIÓN OPTIMIZADA */}
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold uppercase text-slate-400'>
                      Descripción
                    </label>
                    <textarea
                      className='w-full min-h-[120px] p-4 bg-slate-50 rounded-xl text-sm text-slate-600 outline-none resize-y border-2 border-transparent focus:border-slate-200 focus:bg-white transition-colors'
                      value={roomData.description}
                      onChange={(e) =>
                        setRoomData({
                          ...roomData,
                          description: e.target.value,
                        })
                      }
                      placeholder='Describe la experiencia...'
                    />
                  </div>

                  {/* AMENITIES */}
                  <div>
                    <label className='text-[10px] font-bold uppercase text-slate-400 mb-2 block'>
                      Comodidades
                    </label>
                    <div className='grid grid-cols-3 gap-2'>
                      {AMENITIES_LIST.map((amenity) => (
                        <button
                          key={amenity.id}
                          type='button'
                          onClick={() => toggleAmenity(amenity.id)}
                          className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${
                            roomData.amenities.includes(amenity.id)
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white border-slate-100 text-slate-400'
                          }`}
                        >
                          <amenity.icon size={14} />
                          {amenity.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>

                {editingRoom && (
                  <div className='pt-6 border-t border-slate-100'>
                    <button
                      type='button'
                      onClick={handleDeleteRoom}
                      className='text-red-500 text-xs font-bold flex items-center gap-2 hover:bg-red-50 p-3 rounded-xl w-full justify-center'
                    >
                      <Trash2 size={14} /> Eliminar habitación
                    </button>
                  </div>
                )}
              </div>

              {/* COLUMNA DERECHA: FOTOS ROOM (Apilada al final en móvil) */}
              <div className='md:w-[380px] bg-slate-50 p-6 md:p-8 flex flex-col border-t md:border-t-0 md:border-l border-slate-100 order-2'>
                <div className='flex justify-between items-center mb-4'>
                  <h4 className='font-bold text-slate-800'>Galería</h4>
                  <button
                    type='button'
                    onClick={() => fileInputRef.current.click()}
                    className='text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg'
                  >
                    + Foto
                  </button>
                  <input
                    type='file'
                    multiple
                    accept='image/*'
                    ref={fileInputRef}
                    className='hidden'
                    onChange={handleFileChange}
                  />
                </div>

                {/* Scroll de fotos */}
                <div className='flex-1 md:overflow-y-auto space-y-3 pb-4'>
                  {roomData.images.length === 0 &&
                    newRoomFiles.length === 0 && (
                      <div
                        onClick={() => fileInputRef.current.click()}
                        className='border-2 border-dashed border-slate-300 rounded-3xl h-32 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-blue-400 bg-white'
                      >
                        <UploadCloud
                          size={24}
                          className='mb-2'
                        />
                        <span className='text-[10px] font-bold'>
                          Toca para subir
                        </span>
                      </div>
                    )}

                  {roomData.images.map((url, idx) => (
                    <div
                      key={idx}
                      className='relative group rounded-xl overflow-hidden aspect-video shadow-sm bg-white'
                    >
                      <img
                        src={url}
                        className='w-full h-full object-cover'
                      />
                      <button
                        type='button'
                        onClick={() => removeExistingImage(url)}
                        className='absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg'
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {newRoomFiles.map((file, idx) => (
                    <div
                      key={`new-${idx}`}
                      className='relative group rounded-xl overflow-hidden aspect-video shadow-sm border-2 border-blue-500/20 bg-white'
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        className='w-full h-full object-cover opacity-90'
                      />
                      <button
                        type='button'
                        onClick={() => removeNewFile(idx)}
                        className='absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg'
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* ✅ PROTECCIÓN CONTRA CRASH: Solo renderiza si editingRoom existe */}
                {editingRoom?.id && (
                  <div className='border-t border-slate-200 pt-6 mt-6'>
                    <div className='flex items-center gap-2 mb-2'>
                      <RefreshCw
                        size={16}
                        className='text-slate-700'
                      />
                      <h3 className='text-sm font-medium text-slate-700'>
                        Conexiones Externas (OTA)
                      </h3>
                    </div>
                    <ChannelManager roomId={editingRoom.id} />
                  </div>
                )}

                <div className='pt-4 mt-auto border-t border-slate-200 sticky bottom-0 bg-slate-50 pb-safe'>
                  <button
                    onClick={handleSaveRoom}
                    disabled={loading || uploading}
                    className='w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform'
                  >
                    {uploading
                      ? 'Subiendo...'
                      : loading
                        ? 'Guardando...'
                        : 'Guardar Todo'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryPanel;
