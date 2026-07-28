"use client";

import React, { useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useTranslations } from "next-intl";
import type { GalleryItem } from "@/types";
import { getImageSizeUrl } from "@/lib/image-config";
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	useSortable,
	SortableContext,
	horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import GalleryImage from "@/components/ota/shared/GalleryImage";
import GalleryLightbox from "@/components/ota/shared/GalleryLightbox";
import { cn } from "@/lib/utils";

// ============================================================================
// SORTABLE THUMBNAIL — memoized to avoid re-renders during drag
// ============================================================================

const SortableThumbnail = React.memo(function SortableThumbnail({
	img,
	realIndex,
	roomName,
	onClick,
	isDragging,
}: {
	img: GalleryItem;
	realIndex: number;
	roomName: string;
	onClick: (i: number) => void;
	isDragging: boolean;
}) {
	const t = useTranslations();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging: isSortableDragging,
	} = useSortable({
		id: `thumb-${realIndex}`,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isSortableDragging ? 50 : "auto",
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="relative shrink-0 w-20 h-14 rounded-[var(--radius-squircle-lg)] overflow-hidden transition-all duration-300 group"
		>
			<button
				type="button"
				onClick={() => onClick(realIndex)}
				className="absolute inset-0 w-full h-full"
				aria-label={t("ota.roomGallery.viewImage", { index: realIndex + 1 })}
			>
				<GalleryImage
					src={getImageSizeUrl(img.url, "thumb")}
					alt={img.alt ?? `${roomName} — ${realIndex + 1}`}
					fill
					className="object-cover"
					sizes="80px"
					quality={50}
				/>
				<div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors rounded-[var(--radius-squircle-lg)]" />
				<div className="absolute inset-0 rounded-[var(--radius-squircle-lg)] ring-1 ring-white/20" />
			</button>

			{/* Drag handle — visible on hover */}
			<div
				{...attributes}
				{...listeners}
				className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 rounded bg-black/40 backdrop-blur-sm"
			>
				<GripVertical size={10} className="text-white/80" />
			</div>
		</div>
	);
});

// ============================================================================
// ROOM GALLERY — Liquid Glass edition (dynamic YARL imports)
// ============================================================================

interface RoomGalleryProps {
	images: GalleryItem[];
	roomName: string;
	variant?: "inline" | "compact";
	/** Optional blur placeholder for the main/hero image */
	blurDataURL?: string;
}

export default function RoomGallery({
	images,
	roomName,
	variant = "inline",
	blurDataURL,
}: RoomGalleryProps) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [index, setIndex] = useState(0);
	const [galleryImages, setGalleryImages] = useState<GalleryItem[]>(images);
	const [activeId, setActiveId] = useState<string | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	const slides = useMemo(
		() =>
			galleryImages.map((img, i) => ({
				src: img.url,
				alt: img.alt ?? roomName,
				description: img.caption,
				blurDataURL: img.blurDataURL || (i === 0 ? blurDataURL : undefined),
			})),
		[galleryImages, roomName, blurDataURL],
	);

	const handleThumbnailClick = useCallback((i: number) => {
		setIndex(i);
		setOpen(true);
	}, []);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	}, []);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			setActiveId(null);

			if (!over || active.id === over.id) return;

			const oldIndex = galleryImages.findIndex(
				(_, i) => `thumb-${i}` === active.id,
			);
			const newIndex = galleryImages.findIndex(
				(_, i) => `thumb-${i}` === over.id,
			);

			if (oldIndex !== -1 && newIndex !== -1) {
				setGalleryImages((prev) => arrayMove(prev, oldIndex, newIndex));
			}
		},
		[galleryImages],
	);

	// Stable callback to prevent useEffect re-execution in GalleryLightbox
	const handleClose = useCallback(() => setOpen(false), []);

	// --------------------------------------------------------------------------
	// MODO INLINE: carrusel CSS nativo con scroll-snap (reemplaza YARL inline)
	// --------------------------------------------------------------------------
	if (variant === "inline") {
		return (
			<div className="relative w-full h-full group">
			{/* Carrusel con scroll-snap nativo */}
			<div
				ref={scrollContainerRef}
				className="flex overflow-x-auto snap-x snap-mandatory w-full h-full scrollbar-hide"
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
			>
					{galleryImages.map((img, i) => (
						<button
							key={i}
							type="button"
							onClick={() => {
								setIndex(i);
								setOpen(true);
							}}
							className="flex-none w-full h-full snap-center relative cursor-pointer group/slide"
							aria-label={t("ota.roomGallery.viewImage", { index: i + 1 })}
						>
							<GalleryImage
								src={img.url}
								alt={img.alt ?? `${roomName} — ${i + 1}`}
								fill
								className="object-contain"
								sizes="100vw"
								quality={90}
								priority={i === 0}
								loading={i === 0 ? "eager" : "lazy"}
								placeholder={img.blurDataURL ? "blur" : undefined}
								blurDataURL={img.blurDataURL}
							/>
							<div className="absolute inset-0 bg-foreground/0 group-hover/slide:bg-foreground/[0.03] transition-colors" />
						</button>
					))}
				</div>

				{/* Navigation arrows — visible on hover (desktop) */}
				{galleryImages.length > 1 && (
					<>
						<button
							onClick={() => {
								const container = scrollContainerRef.current;
								if (container) {
									const slideWidth = container.scrollWidth / galleryImages.length;
									const newIndex = Math.max(0, index - 1);
									container.scrollTo({ left: slideWidth * newIndex, behavior: 'smooth' });
									setIndex(newIndex);
								}
							}}
							className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-card/90 shadow-lg items-center justify-center hover:bg-card motion-safe:transition-all motion-safe:duration-200 z-10 opacity-0 group-hover:opacity-100 active:motion-safe:scale-90"
							aria-label={t("ota.roomGallery.prevImage")}
							disabled={index === 0}
						>
							<ChevronLeft size={20} className="text-foreground" />
						</button>
						<button
							onClick={() => {
								const container = scrollContainerRef.current;
								if (container) {
									const slideWidth = container.scrollWidth / galleryImages.length;
									const newIndex = Math.min(galleryImages.length - 1, index + 1);
									container.scrollTo({ left: slideWidth * newIndex, behavior: 'smooth' });
									setIndex(newIndex);
								}
							}}
							className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-card/90 shadow-lg items-center justify-center hover:bg-card motion-safe:transition-all motion-safe:duration-200 z-10 opacity-0 group-hover:opacity-100 active:motion-safe:scale-90"
							aria-label={t("ota.roomGallery.nextImage")}
							disabled={index === galleryImages.length - 1}
						>
							<ChevronRight size={20} className="text-foreground" />
						</button>
					</>
				)}

				{/* Indicadores de posición — 44px touch targets */}
				{galleryImages.length > 1 && (
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-0 z-10">
					{galleryImages.map((_, i) => (
						<button
							key={i}
							onClick={() => {
								const container = scrollContainerRef.current;
								if (container) {
									const scrollWidth = container.scrollWidth / galleryImages.length;
									container.scrollTo({ left: scrollWidth * i, behavior: 'smooth' });
									setIndex(i);
								}
							}}
							className="relative flex items-center justify-center min-w-[44px] min-h-[44px]"
							aria-label={t('ota.roomGallery.goToImage', { index: i + 1 })}
							aria-current={i === index ? 'true' : undefined}
						>
							<span className={cn(
								'block size-2 rounded-full motion-safe:transition-all motion-safe:duration-300',
								i === index ? 'bg-white w-6' : 'bg-white/50'
							)} />
						</button>
					))}
					</div>
				)}

				{/* Lightbox fullscreen */}
				<GalleryLightbox
					slides={slides}
					open={open}
					openIndex={index}
					onClose={handleClose}
					zoom={{ maxZoomLevel: 3 }}
				/>
			</div>
		);
	}

	// --------------------------------------------------------------------------
	// MODO COMPACTO: preview glass con thumbnails (mobile)
	// --------------------------------------------------------------------------
	const thumbnailItems = galleryImages.slice(1);
	const activeDragImage = activeId
		? galleryImages.find((_, i) => `thumb-${i}` === activeId)
		: null;

	// MÓVIL: Sin drag & drop, solo scroll nativo (oculto en desktop con lg:hidden)
	const mobileLayout = (
		<div className="lg:hidden">
			<div className="space-y-3">
				{/* Imagen principal glass */}
				<button
					type="button"
					onClick={() => {
						setIndex(0);
						setOpen(true);
					}}
					className="relative block aspect-[4/3] sm:aspect-[16/10] w-full rounded-[1.5rem] overflow-hidden shadow-lg shadow-elev-2 group cursor-pointer"
					aria-label={t("ota.roomGallery.viewGallery", { name: roomName })}
				>
					<GalleryImage
						src={galleryImages[0]?.url ?? ""}
						alt={galleryImages[0]?.alt ?? roomName}
						fill
						className="object-cover transition-transform duration-700 group-hover:scale-105"
						priority
						sizes="100vw"
						quality={85}
						placeholder={galleryImages[0]?.blurDataURL || blurDataURL ? "blur" : undefined}
						blurDataURL={galleryImages[0]?.blurDataURL || blurDataURL}
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
					<div className="absolute bottom-3 left-3">
						<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="size-3.5"
							>
								<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
								<circle cx="9" cy="9" r="2" />
								<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
							</svg>
							{t("ota.roomGallery.photoCount", {
								count: galleryImages.length,
							})}
						</span>
					</div>
				</button>

				{/* Thumbnails scrolleables (sin drag) */}
				{thumbnailItems.length > 0 && (
					<div
						className="flex gap-2 overflow-x-auto pb-1 px-1 [&::-webkit-scrollbar]:hidden"
						style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
					>
						{thumbnailItems.map((img, i) => {
							const realIndex = i + 1;
							return (
								<button
									key={`thumb-${realIndex}`}
									type="button"
									onClick={() => handleThumbnailClick(realIndex)}
									className="relative shrink-0 w-20 h-14 rounded-[var(--radius-squircle-lg)] overflow-hidden group"
									aria-label={t("ota.roomGallery.viewImage", { index: realIndex })}
								>
									<GalleryImage
										src={getImageSizeUrl(img.url, "thumb")}
										alt={img.alt ?? `${roomName} — ${realIndex}`}
										fill
										className="object-cover"
										sizes="80px"
										quality={50}
									/>
				<div className="absolute inset-0 bg-black/20 group-hover:bg-transparent motion-safe:transition-colors motion-safe:duration-200 rounded-[var(--radius-squircle-lg)]" />
									<div className="absolute inset-0 rounded-[var(--radius-squircle-lg)] ring-1 ring-white/20" />
								</button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);

	// DESKTOP: Con drag & drop completo (oculto en mobile con hidden lg:block)
	const desktopLayout = (
		<div className="hidden lg:block">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className="space-y-3">
					{/* Imagen principal glass */}
					<button
						type="button"
						onClick={() => {
							setIndex(0);
							setOpen(true);
						}}
						className="relative block aspect-[4/3] sm:aspect-[16/10] w-full rounded-[1.5rem] overflow-hidden shadow-lg shadow-elev-2 group cursor-pointer"
						aria-label={t("ota.roomGallery.viewGallery", { name: roomName })}
					>
						<GalleryImage
							src={galleryImages[0]?.url ?? ""}
							alt={galleryImages[0]?.alt ?? roomName}
							fill
							className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out group-hover:motion-safe:scale-105"
							priority
							sizes="100vw"
							quality={85}
							placeholder={galleryImages[0]?.blurDataURL || blurDataURL ? "blur" : undefined}
							blurDataURL={galleryImages[0]?.blurDataURL || blurDataURL}
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
						<div className="absolute bottom-3 left-3">
							<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="size-3.5"
								>
									<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
									<circle cx="9" cy="9" r="2" />
									<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
								</svg>
								{t("ota.roomGallery.photoCount", {
									count: galleryImages.length,
								})}
							</span>
						</div>
					</button>

					{thumbnailItems.length > 0 && (
						<SortableContext
							items={thumbnailItems.map((_, i) => `thumb-${i + 1}`)}
							strategy={horizontalListSortingStrategy}
						>
							<div
								className="flex gap-2 overflow-x-auto pb-1 px-1 [&::-webkit-scrollbar]:hidden"
								style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
							>
								{thumbnailItems.map((img, i) => {
									const realIndex = i + 1;
									return (
										<SortableThumbnail
											key={`thumb-${realIndex}`}
											img={img}
											realIndex={realIndex}
											roomName={roomName}
											onClick={handleThumbnailClick}
											isDragging={activeId === `thumb-${realIndex}`}
										/>
									);
								})}
							</div>
						</SortableContext>
					)}
				</div>

				<DragOverlay>
					{activeDragImage ? (
						<div className="relative w-20 h-14 rounded-[var(--radius-squircle-lg)] overflow-hidden shadow-xl ring-2 ring-brand-500/50 rotate-3 scale-110">
							<GalleryImage
								src={getImageSizeUrl(activeDragImage.url, "thumb")}
								alt={activeDragImage.alt ?? roomName}
								fill
								className="object-cover"
								sizes="80px"
								quality={50}
							/>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>
		</div>
	);

	return (
		<div>
			{mobileLayout}
			{desktopLayout}

			<Suspense fallback={null}>
				<GalleryLightbox
					slides={slides}
					open={open}
					openIndex={index}
					onClose={handleClose}
					zoom={{ maxZoomLevel: 3 }}
				/>
			</Suspense>
		</div>
	);
}