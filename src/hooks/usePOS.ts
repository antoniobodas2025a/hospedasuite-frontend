'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// 🛡️ REPARACIÓN TOPOLÓGICA: Importación de las Acciones del Ledger Unificado
import { 
  addServiceChargeAction, 
  processWalkInChargeAction, 
  createProductAction 
} from '@/app/actions/pos';

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  description?: string;
  image_emoji: string;
  is_active: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface BookingOption {
  id: string;
  room_id: string;
  rooms?: { name: string };
  guests?: { full_name: string };
}

export const usePOS = (
  initialItems: MenuItem[],
  activeBookings: BookingOption[],
  hotelId: string,
) => {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialItems);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>(''); 
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [productForm, setProductForm] = useState<Partial<MenuItem>>({
    name: '',
    category: 'General',
    price: 0,
    image_emoji: '🍽️',
    description: '',
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const adjustQuantity = (itemId: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          return { ...i, quantity: Math.max(1, i.quantity + delta) };
        }
        return i;
      }),
    );
  };

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const createOrder = async () => {
    if (cart.length === 0) return alert('El carrito de compras está vacío.');
    if (!selectedRoomId) return alert('Selecciona una habitación activa o "Venta de Mostrador".');
    
    if (!hotelId) {
      console.error('Violación de contexto: hotelId nulo en entorno cliente.');
      return alert('Error de integridad de sesión. Por favor recarga el panel.');
    }

    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      return alert('📶 Pérdida de conexión detectada. El carrito ha sido preservado en memoria local.');
    }

    try {
      const cartSummary = cart.map(item => `${item.quantity}x ${item.name}`).join(' | ');

      // 🛡️ VECTORIZACIÓN DEL CARRITO PARA TRANSACCIÓN MASIVA (Bulk ACID)
      // Extraemos los Arrays matemáticos una sola vez para ambas rutas
      const extractedProductIds = cart.map(item => item.id);
      const extractedQuantities = cart.map(item => item.quantity);

      if (selectedRoomId === 'walk_in') {
        
        // 🛡️ AHORA DEDUCE STOCK ATÓMICAMENTE
        const result = await processWalkInChargeAction({
          amount: cartTotal,
          description: cartSummary,
          productIds: extractedProductIds,
          quantities: extractedQuantities
        });
        
        if (!result.success) throw new Error(result.error);
        alert('✅ Venta de mostrador (Walk-in) liquidada y stock actualizado.');
        
      } else {
        
        const targetBooking = activeBookings.find(b => b.id === selectedRoomId);
        if (!targetBooking) throw new Error('Folio huérfano. La reserva destino ya no es válida.');

        const result = await addServiceChargeAction({
          bookingId: targetBooking.id,
          roomId: targetBooking.room_id,
          productIds: extractedProductIds,     
          quantities: extractedQuantities,     
          description: `POS: ${cartSummary}`,
          amount: cartTotal
        });

        if (!result.success) throw new Error(result.error);
        alert('✅ Cargos transferidos y stock descontado exitosamente.');
      }

      setCart([]);
      setSelectedRoomId('');
      router.refresh(); 
      
    } catch (e: any) {
      if (e.message.includes('fetch') || e.message.includes('network')) {
        alert('📶 Fallo de transmisión en la última milla. Verifica tu red.');
      } else {
        alert('Violación de Transacción: ' + e.message);
      }
    }
  };

  const createProduct = async () => {
    if (!hotelId) return alert('Error de sesión: Permisos insuficientes.');

    try {
      const result = await createProductAction({
        ...productForm,
        hotel_id: hotelId,
      });

      if (!result.success) throw new Error(result.error);

      setMenuItems([...menuItems, result.data]);
      setIsProductModalOpen(false);
      setProductForm({
        name: '',
        category: 'General',
        price: 0,
        image_emoji: '🍽️',
        description: '',
      });
      router.refresh();
    } catch (e: any) {
      alert('Error en Inserción de Producto: ' + e.message);
    }
  };

  return {
    menuItems,
    cart,
    addToCart,
    removeFromCart,
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
  };
};