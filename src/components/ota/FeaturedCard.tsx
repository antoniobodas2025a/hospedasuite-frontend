"use client";

import { motion } from "framer-motion";
import { Star, MapPin, ArrowRight } from "lucide-react";
import { springBounce } from "@/lib/mac2026/spring";
import { preserveSearchParams } from "@/lib/handoff-url";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface FeaturedCardProps {
	hotel: any;
	/** Compact variant for split-view: max-h-[120px], horizontal layout with thumbnail only */
	variant?: "full" | "compact";
}

export default function FeaturedCard({
	hotel,
	variant = "full",
}: FeaturedCardProps) {
	const searchParams = useSearchParams();
	const href = preserveSearchParams(searchParams, `/hotel/${hotel.slug}`);

	if (variant === "compact") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={springBounce()}
				className="mb-4"
			>
				<Link
					href={href}
					className="group flex max-h-[120px] overflow-hidden rounded-[var(--radius-squircle-xl)] border border-border/30 shadow-sm bg-card hover:shadow-md transition-shadow"
					aria-label={`Ver ${hotel.name} — $${hotel.min_price?.toLocaleString()} por noche`}
				>
					{/* Thumbnail */}
					<div className="w-[120px] min-w-[120px] relative overflow-hidden">
						{hotel.main_image_url ? (
							<Image
								src={hotel.main_image_url}
								alt={hotel.name}
								fill
								priority
								className="object-cover group-hover:scale-105 transition-transform duration-500"
								sizes="120px"
							/>
						) : (
							<div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
								<MapPin size={24} className="text-brand-400" />
							</div>
						)}
					</div>

					{/* Info */}
					<div className="flex-1 flex flex-col justify-center px-3 py-2 min-w-0">
						<h3 className="text-sm font-bold text-foreground truncate">
							{hotel.name}
						</h3>
						<div className="flex items-center gap-2 mt-1">
							{hotel.rating && (
								<span className="flex items-center gap-0.5 text-xs text-muted-foreground">
									<Star
										size={12}
										className="fill-yellow-400 text-yellow-400"
										aria-hidden="true"
									/>
									{hotel.rating}
								</span>
							)}
							<span className="text-sm font-bold text-brand-600">
								${hotel.min_price?.toLocaleString()}
							</span>
							<span className="text-xs text-muted-foreground">/noche</span>
						</div>
					</div>
				</Link>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={springBounce()}
			className="mb-6 sm:mb-8"
		>
			<Link
				href={href}
				className="group block"
				aria-label={`Ver ${hotel.name} - ${hotel.location} - $${hotel.min_price?.toLocaleString()} por noche`}
			>
				<div className="relative overflow-hidden rounded-[var(--radius-squircle-2xl)] border border-border/30 shadow-lg bg-card hover:shadow-xl transition-shadow">
					{/* Featured badge */}
					<div
						className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/90 backdrop-blur-sm text-white text-xs font-bold rounded-full"
						role="status"
					>
						<Star size={12} className="fill-white" aria-hidden="true" />
						<span>Selección HospedaSuite</span>
					</div>

					{/* Image */}
					<div className="relative aspect-[21/9] overflow-hidden">
						{hotel.main_image_url ? (
							<Image
								src={hotel.main_image_url}
								alt={hotel.name}
								fill
								className="object-cover group-hover:scale-105 transition-transform duration-500"
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
								priority
							/>
						) : (
							<div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
								<MapPin size={48} className="text-brand-400" />
							</div>
						)}
						{/* Gradient overlay */}
						<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
					</div>

					{/* Content overlay */}
					<div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
						<h3 className="text-xl sm:text-2xl font-bold mb-1">{hotel.name}</h3>
						<div className="flex items-center gap-3 text-sm text-white/80">
							<span className="flex items-center gap-1">
								<MapPin size={14} aria-hidden="true" />
								{hotel.location}
							</span>
							{hotel.rating && (
								<span className="flex items-center gap-1">
									<Star
										size={14}
										className="fill-yellow-400 text-yellow-400"
										aria-hidden="true"
									/>
									{hotel.rating}
								</span>
							)}
						</div>
						<div className="flex items-center justify-between mt-3">
							<div>
								<span className="text-2xl font-bold">
									${hotel.min_price?.toLocaleString()}
								</span>
								<span className="text-sm text-white/60 ml-1">/noche</span>
							</div>
							<div className="flex items-center gap-1 text-sm font-semibold text-white group-hover:gap-2 transition-all">
								Ver hotel <ArrowRight size={14} />
							</div>
						</div>
					</div>
				</div>
			</Link>
		</motion.div>
	);
}
