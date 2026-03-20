'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// ✅ Importamos las Server Actions seguras (ya no usamos supabase cliente)
import { createOrderAction, createProductAction } from '@/app/actions/pos';

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

export interface RoomOption {
  id: string;
  name: string;
}

export const usePOS = (
  initialItems: MenuItem[],
  initialRooms: RoomOption[],
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

  // A. Lógica del Carrito (Mantenemos igual porque es 100% UI local)
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

  // B. Acción: Crear Pedido (Delegado al Servidor con Mitigación de Riesgos)
  const createOrder = async () => {
    // 1. Validaciones UI rápidas
    if (cart.length === 0) return alert('El carrito está vacío');
    if (!selectedRoomId) return alert('Selecciona una habitación para cargar el consumo');
    
    // Validación redundante manejada de forma segura
    if (!hotelId) {
      console.error('Violación de contexto: hotelId es nulo en el cliente.');
      return alert('Error de sesión. Por favor recarga la página.');
    }

    // 2. MITIGACIÓN DE CONECTIVIDAD: Verificación offline preemptiva
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      return alert('📶 No hay conexión a internet. Tu pedido está a salvo en el carrito. Espera a que vuelva la red y presiona "Cobrar" de nuevo.');
    }

    try {
      // 3. OPTIMIZACIÓN DE PAYLOAD (JSON Diet)
      // Solo enviamos los datos esenciales para la facturación (quitamos emojis y descripciones largas)
      const optimizedCart = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      // 4. Llamada al Servidor
      const result = await createOrderAction({
        hotel_id: hotelId,
        room_id: selectedRoomId,
        items: optimizedCart, // <-- Payload ligero enviado
        total_price: cartTotal,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // 5. Éxito: Limpieza del carrito
      alert('✅ Consumo cargado a la habitación exitosamente');
      setCart([]);
      setSelectedRoomId('');
      router.refresh();
      
    } catch (e: any) {
      // Manejo de caída de red a mitad de la petición
      if (e.message.includes('fetch') || e.message.includes('network')) {
        alert('📶 La conexión falló mientras se enviaba. Verifica tu internet e intenta de nuevo.');
      } else {
        alert('Error al crear orden: ' + e.message);
      }
    }
  };

  // C. Acción: Crear Producto (Delegado al Servidor)
  const createProduct = async () => {
    if (!hotelId) return alert('Error de sesión: Falta ID del hotel');

    try {
      // Usamos la Server Action
      const result = await createProductAction({
        ...productForm,
        hotel_id: hotelId,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Actualizamos UI
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
      alert('Error al crear producto: ' + e.message);
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