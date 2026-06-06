"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const HotelMapView = dynamic(() => import("@/components/ota/HotelMapView"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-[60vh] bg-muted/30 rounded-[var(--radius-squircle-xl)] flex items-center justify-center border border-border/30">
			<Loader2 size={24} className="animate-spin text-muted-foreground" />
		</div>
	),
});

/**
 * Lab: /lab/map — Internal map testing environment.
 *
 * Loads the full HotelMapView with all 9 defense layers:
 *   NaN firewall, gesture lock, search intent, 15s window,
 *   silent URL sync, distance filter, isSearchActive gate.
 *
 * NOT accessible in production — development and QA only.
 */
export default function LabMapPage() {
	const [location, setLocation] = useState("");

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-4xl mx-auto mb-6">
				<h1 className="text-2xl font-bold text-foreground mb-2">
					🧪 Lab: Mapa Interno
				</h1>
				<p className="text-sm text-muted-foreground mb-4">
					Escudo de HospedaSuite activo — 9 capas de defensa. Búsqueda simulada,
					sin dependencia de producción.
				</p>
				<div className="flex gap-3">
					<input
						type="text"
						value={location}
						onChange={(e) => setLocation(e.target.value)}
						placeholder="Ciudad (ej: Duitama, Salento...)"
						className="flex-1 p-3 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] text-foreground placeholder:text-muted-foreground"
						onKeyDown={(e) => {
							if (e.key === "Enter" && location.trim()) {
								// trigger map centering
							}
						}}
					/>
					<button
						onClick={() => location.trim() && setLocation(location.trim())}
						className="px-6 py-3 bg-brand-600 text-white rounded-[var(--radius-squircle-xl)] font-semibold"
					>
						Buscar
					</button>
				</div>
			</div>

			<div className="max-w-6xl mx-auto">
				<HotelMapView
					hotels={[]}
					centerLocation={location || undefined}
					initialCenter={location ? undefined : [4.6097, -74.0817]}
					initialZoom={6}
					enableSearchOnMove={false}
				/>
			</div>

			<div className="max-w-4xl mx-auto mt-8 p-4 bg-card border border-border/30 rounded-[var(--radius-squircle-xl)]">
				<h2 className="text-sm font-bold text-foreground mb-2">
					Capas de Defensa Activas
				</h2>
				<ul className="text-xs text-muted-foreground space-y-1">
					<li>✅ 3.1 Cortafuegos NaN (isFinite)</li>
					<li>✅ 3.2 Filtrado de Servidor</li>
					<li>✅ 3.3 Blindaje de Coordenadas (safeCenter/safeZoom)</li>
					<li>✅ 3.4 Parada Cinemática (map.stop() en contacto)</li>
					<li>✅ 3.5 Sello de Intención (token-based)</li>
					<li>✅ 3.6 Ventana de Inmunidad (15s)</li>
					<li>✅ 3.7 Filtro de Micro-movimientos (&lt;0.001°)</li>
					<li>✅ 3.8 Puerta de Estado (isSearchActive)</li>
					<li>✅ 3.9 Sincronización Silenciosa (replaceState)</li>
				</ul>
			</div>
		</div>
	);
}
