// src/components/modals/RoomServiceModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const RoomServiceModal = ({ isOpen, onClose, orders, onDeliver }) => {
  const springSoft = { type: 'spring', stiffness: 200, damping: 25 };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Fondo oscuro) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 bg-[#2C2C2C]/30 backdrop-blur-sm z-60'
          />
          {/* Panel Deslizante */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={springSoft}
            className='fixed top-0 right-0 h-full w-full max-w-md bg-[#F9F7F2] z-50 shadow-2xl p-8 flex flex-col'
          >
            <div className='flex justify-between items-center mb-8'>
              <h3 className='font-serif text-3xl font-bold text-[#2C2C2C]'>
                Room Service
              </h3>
              <button
                onClick={onClose}
                className='p-2 hover:bg-[#E5E0D8] rounded-full'
              >
                <X size={24} />
              </button>
            </div>

            <div className='flex-1 overflow-auto space-y-4'>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className='bg-white p-6 rounded-[1.5rem] shadow-sm border border-[#E5E0D8]'
                >
                  <div className='flex justify-between mb-4'>
                    <span className='bg-[#8C3A3A] text-white px-3 py-1 rounded-full text-xs font-bold'>
                      Hab. {order.rooms?.name}
                    </span>
                    <span className='font-serif font-bold text-lg'>
                      ${order.total_price.toLocaleString()}
                    </span>
                  </div>
                  <ul className='space-y-2 mb-6'>
                    {order.items.map((i, idx) => (
                      <li
                        key={idx}
                        className='flex justify-between text-sm text-[#5D5555]'
                      >
                        <span>
                          {i.qty}x {i.name}
                        </span>
                        <span className='font-bold'>
                          ${(i.price * i.qty).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => onDeliver(order.id)}
                    className='w-full bg-white border-2 border-[#2C2C2C] text-[#2C2C2C] py-3 rounded-xl font-bold text-sm hover:bg-[#2C2C2C] hover:text-white transition-colors'
                  >
                    Marcar Entregado
                  </button>
                </div>
              ))}

              {orders.length === 0 && (
                <p className='text-center text-[#888] font-serif italic mt-10'>
                  Todo está tranquilo por aquí. 🍃
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RoomServiceModal;
