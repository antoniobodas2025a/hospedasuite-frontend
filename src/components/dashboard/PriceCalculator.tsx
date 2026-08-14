"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, Info, TrendingDown, DollarSign } from "lucide-react";
import { calculatePriceBreakdown } from "./price-calculator-logic";

// ==========================================
// INTERFACES
// ==========================================

interface PriceCalculatorProps {
	basePrice?: number;
	compact?: boolean;
	readonly?: boolean;
	onChange?: (price: number) => void;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function PriceCalculator({
	basePrice: initialBasePrice = 300000,
	compact = false,
	readonly = false,
	onChange,
}: PriceCalculatorProps) {
	const [basePrice, setBasePrice] = useState(initialBasePrice);

	const breakdown = useMemo(
		() => calculatePriceBreakdown(basePrice),
		[basePrice],
	);

	const formatCOP = (value: number) => {
		return new Intl.NumberFormat("es-CO", {
			style: "currency",
			currency: "COP",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(value);
	};

	const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseFloat(e.target.value) || 0;
		setBasePrice(value);
		onChange?.(value);
	};

	// Modo compacto para widgets
	if (compact) {
		return (
			<div className="rounded-[var(--radius-squircle-lg)] border border-border bg-card/50 p-3 space-y-2">
				<div className="flex justify-between items-center text-xs">
					<span className="text-muted-foreground">Total</span>
					<span className="text-emerald-400 font-mono font-bold">
						{formatCOP(basePrice)}
					</span>
				</div>
				<div className="flex justify-between items-center text-xs">
					<span className="text-muted-foreground">Recibes</span>
					<span className="text-emerald-400 font-mono font-bold">
						{formatCOP(breakdown.hotelReceives)}
					</span>
				</div>
			</div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			className="relative overflow-hidden rounded-[var(--radius-squircle-2xl)] border border-border bg-card p-6 shadow-2xl"
		>
			{/* Background gradient */}
			<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />

			{/* Content */}
			<div className="relative z-10">
				{/* Header */}
				<div className="mb-6 flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-squircle-xl)] bg-indigo-500/10 border border-indigo-500/20">
						<Calculator size={20} className="text-indigo-400" />
					</div>
					<div>
						<h3 className="text-lg font-bold text-foreground">
							Calculadora de Precios
						</h3>
						<p className="text-xs text-muted-foreground">
							Ve exactamente cuánto recibes
						</p>
					</div>
				</div>

				{/* Input: Precio base — hidden when readonly (e.g., inside RoomEditorModal) */}
				{!readonly && (
					<div className="mb-6">
						<label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Precio Base
						</label>
						<div className="relative">
							<span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
								$
							</span>
							<input
								type="number"
								value={basePrice || ""}
								onChange={handlePriceChange}
								className="w-full rounded-[var(--radius-squircle-lg)] border border-border bg-background/50 py-3 pl-10 pr-4 text-lg font-bold text-foreground placeholder:text-muted-foreground/50 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
								placeholder="300000"
								min="0"
								step="1000"
							/>
						</div>
					</div>
				)}

				{/* Desglose */}
				<div className="space-y-3">
					{/* Precio Base */}
					<div className="flex items-center justify-between border-b border-border/50 py-2">
						<span className="text-sm text-muted-foreground">
							{readonly ? "Precio por Noche" : "Precio Base"}
						</span>
						<span className="text-sm font-bold text-foreground">
							{formatCOP(basePrice)}
						</span>
					</div>

					{/* Total — el precio final que paga el huésped */}
					<motion.div
						data-testid="price-total"
						layout
						className="flex items-center justify-between rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-4 py-3"
					>
						<div className="flex items-center gap-2">
							<DollarSign size={16} className="text-indigo-400" />
							<span className="text-sm font-bold text-indigo-300">
								Total
							</span>
						</div>
						<span className="text-lg font-black text-indigo-400">
							{formatCOP(breakdown.total)}
						</span>
					</motion.div>

					{/* Deducciones */}
					<div className="pt-3">
						<div className="mb-2 flex items-center gap-2">
							<TrendingDown size={12} className="text-muted-foreground" />
							<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Deducciones
							</p>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between py-1">
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">
										Comisión Wompi (3%)
									</span>
								</div>
								<span className="text-xs font-bold text-rose-400">
									-{formatCOP(breakdown.wompiFee)}
								</span>
							</div>

							<div className="flex items-center justify-between py-1">
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">
										Comisión Plataforma (8%)
									</span>
								</div>
								<span className="text-xs font-bold text-rose-400">
									-{formatCOP(breakdown.platformFee)}
								</span>
							</div>

							<div className="flex items-center justify-between py-1">
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">
										Retención (11%)
									</span>
								</div>
								<span className="text-xs font-bold text-rose-400">
									-{formatCOP(breakdown.retencion)}
								</span>
							</div>
						</div>
					</div>

					{/* Neto que recibe el hotel */}
					<motion.div
						layout
						className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-4"
					>
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
								<DollarSign size={16} className="text-emerald-400" />
							</div>
							<div>
								<p className="text-xs font-medium text-emerald-300/80">
									Recibes
								</p>
								<p className="text-xs text-emerald-300/60">Neto final</p>
							</div>
						</div>
						<span className="text-2xl font-black text-emerald-400">
							{formatCOP(breakdown.hotelReceives)}
						</span>
					</motion.div>
				</div>

				{/* Nota informativa */}
				<div className="mt-4 rounded-lg border border-blue-500/10 bg-blue-500/5 p-3">
					<div className="flex gap-2">
						<Info size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />
						<p className="text-xs text-blue-300">
							<strong>Importante:</strong> El precio que ingresas es el precio
							final que paga el huésped. No se agrega IVA.
						</p>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
