'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ==========================================
// BLOQUE 1: INTERFACES Y CONTRATOS ESTRICTOS
// ==========================================

export interface ForensicEntry {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  total_price: number;
  created_at: string;
  guests: {
    full_name: string;
    doc_number: string;
    country?: string;
  };
  rooms: {
    name: string;
    type: string;
  };
}

// ==========================================
// BLOQUE 2: CAPA DE NORMALIZACIÓN (Zero-Trust)
// ==========================================

/**
 * 🛡️ ACL (Anti-Corruption Layer): Garantiza la integridad del Ledger
 * incluso si los nodos de la base de datos están malformados o incompletos.
 */
const sanitizeEntries = (data: any[]): ForensicEntry[] => {
  if (!Array.isArray(data)) return [];
  return data.map(e => ({
    ...e,
    total_price: Number(e.total_price) || 0,
    guests: e.guests || { full_name: 'Nodo No Indexado', doc_number: 'N/A' },
    rooms: e.rooms || { name: 'Sin Asignar', type: 'standard' }
  }));
};

// ==========================================
// BLOQUE 3: LÓGICA DEL HOOK (Motor de Inteligencia)
// ==========================================

export const useForensicBook = (initialData: ForensicEntry[]) => {
  const router = useRouter();
  
  // 1. Estado de Filtros (UI State: Cero redundancia de data)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 2. Inteligencia de Filtrado y Cálculos (Memoizada O(N))
  // Se recalculan los derivados solo si la data fuente o los filtros mutan realmente.
  const { entries, totalRevenue } = useMemo(() => {
    // Saneamiento preventivo de la data de entrada (Zero-Trust)
    const safeData = sanitizeEntries(initialData);
    
    const filtered = safeData.filter((e) => {
      // Filtro A: Búsqueda Multivectorial (Nombre, Doc o Habitación)
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term || 
        e.guests.full_name.toLowerCase().includes(term) ||
        e.guests.doc_number.includes(term) ||
        e.rooms.name.toLowerCase().includes(term);

      // Filtro B: Estado Transaccional
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Reducción financiera atómica bajo demanda
    const revenue = filtered.reduce((acc, curr) => acc + curr.total_price, 0);

    return { entries: filtered, totalRevenue: revenue };
  }, [initialData, searchTerm, statusFilter]);

  // 3. Controladores de Mutación y Navegación (Estabilizados)
  const handleFilter = useCallback((term: string, status: string) => {
    setSearchTerm(term);
    setStatusFilter(status);
  }, []);

  const refreshBook = useCallback(() => {
    router.refresh();
  }, [router]);

  return {
    entries,
    searchTerm,
    statusFilter,
    handleFilter,
    refreshBook,
    totalRevenue,
  };
};