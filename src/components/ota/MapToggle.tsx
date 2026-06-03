"use client";

import { motion } from "framer-motion";
import { Map } from "lucide-react";
import { springSnappy } from "@/lib/mac2026/spring";

interface MapToggleProps {
	hotelCount: number;
	onClick: () => void;
}

/**
 * MapToggle — Airbnb-style toggle below the card grid.
 *
 * "🗺️ Mostrar mapa (12 alojamientos)"
 * Subtle, non-intrusive, invites exploration when the user is ready.
 */
export default function MapToggle({ hotelCount, onClick }: MapToggleProps) {
	return (
		<div className="flex justify-center my-8">
			<motion.button
				onClick={onClick}
				whileHover={{ scale: 1.02, y: -1 }}
				whileTap={{ scale: 0.98 }}
				transition={springSnappy()}
				className="flex items-center gap-3 px-6 py-3.5 bg-card border border-border/50 rounded-[var(--radius-squircle-2xl)] shadow-sm hover:shadow-md hover:border-foreground/20 transition-all group"
			>
				<div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
					<Map size={18} className="text-brand-600" />
				</div>
				<div className="text-left">
					<p className="text-sm font-semibold text-foreground">Mostrar mapa</p>
					<p className="text-xs text-muted-foreground">
						{hotelCount} {hotelCount === 1 ? "alojamiento" : "alojamientos"} en
						la zona
					</p>
				</div>
			</motion.button>
		</div>
	);
}
