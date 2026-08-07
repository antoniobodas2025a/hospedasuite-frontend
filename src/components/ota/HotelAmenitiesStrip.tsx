'use client';

import { motion } from 'framer-motion';
import { getAmenityById } from '@/lib/amenity-registry';
import { springGentle } from '@/lib/mac2026/spring';

interface HotelAmenitiesStripProps {
  amenities: string[];
}

export default function HotelAmenitiesStrip({ amenities }: HotelAmenitiesStripProps) {
  if (!amenities || amenities.length === 0) return null;

  const resolved = amenities
    .map((id) => getAmenityById(id))
    .filter((a): a is NonNullable<ReturnType<typeof getAmenityById>> => a !== null);

  if (resolved.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        {resolved.map((amenity, i) => {
          const Icon = amenity.icon;
          return (
            <motion.div
              key={amenity.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springGentle(), delay: i * 0.06 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-500/10 border border-warm-500/20 text-warm-700 text-xs font-medium"
            >
              <Icon size={14} strokeWidth={1.5} />
              <span>{amenity.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
