'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

export const useForensicBook = (initialData: ForensicEntry[]) => {
  const router = useRouter();
  const [entries, setEntries] = useState<ForensicEntry[]>(initialData);
  const [filteredEntries, setFilteredEntries] =
    useState<ForensicEntry[]>(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Lógica de Filtrado Forense
  const handleFilter = (term: string, status: string) => {
    setSearchTerm(term);
    setStatusFilter(status);

    let filtered = entries;

    // 1. Filtro de Texto (Nombre, Cédula o Habitación)
    if (term) {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.guests?.full_name.toLowerCase().includes(lowerTerm) ||
          e.guests?.doc_number.includes(term) ||
          e.rooms?.name.toLowerCase().includes(lowerTerm),
      );
    }

    // 2. Filtro de Estado
    if (status !== 'all') {
      filtered = filtered.filter((e) => e.status === status);
    }

    setFilteredEntries(filtered);
  };

  const refreshBook = () => {
    router.refresh();
  };

  return {
    entries: filteredEntries,
    searchTerm,
    statusFilter,
    handleFilter,
    refreshBook,
    totalRevenue: filteredEntries.reduce(
      (acc, curr) => acc + curr.total_price,
      0,
    ),
  };
};
