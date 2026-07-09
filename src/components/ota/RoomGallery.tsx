"use client";

import { useState, useCallback, Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import dynamic from "next/dynamic";
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
import { GripVertical } from "lucide-react";

// CSS imports at top level (tree-shaken by PostCSS, minimal JS impact)
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/counter.css";

// Dynamic import of the YARL lightbox component (the heavy part ~50KB)
const LightboxWrapper = dynamic(
	() => import("@/components/ota/RoomGalleryLightbox"),
	{
		loading: () => (
			<div className="animate-pulse bg-muted w-full h-full flex items-center justify-center">
				<div className="size-12 rounded-full bg-muted-foreground/10" />
			</div>
		),
		ssr: false,
	},
);

// ============================================================================
// SORTABLE THUMBNAIL
// ============================================================================

function SortableThumbnail({
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
				<Image
					src={getImageSizeUrl(img.url, "thumb")}
					alt={img.alt ?? `${roomName} — ${realIndex + 1}`}
					fill
					className="object-cover"
					sizes="80px"
					quality={50}
					loading="lazy"
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
}

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
				blurDataURL: i === 0 ? blurDataURL : undefined,
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

	// --------------------------------------------------------------------------
	// MODO INLINE: carrusel empotrado en el panel izquierdo (desktop)
	// --------------------------------------------------------------------------
	if (variant === "inline") {
		return (
			<div suppressHydrationWarning>
				<Suspense
					fallback={
						<div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
							<div className="size-16 rounded-full bg-muted-foreground/10" />
						</div>
					}
				>
					<LightboxWrapper
						variant="inline"
						slides={slides}
						open={open}
						openIndex={index}
						onOpen={setOpen}
						onClose={() => setOpen(false)}
					/>
				</Suspense>
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

	return (
		<div suppressHydrationWarning>
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
						className="relative block aspect-[3/4] sm:aspect-[16/10] w-full rounded-[1.5rem] overflow-hidden shadow-lg shadow-elev-2 group cursor-pointer"
						aria-label={t("ota.roomGallery.viewGallery", { name: roomName })}
					>
						<Image
							src={galleryImages[0]?.url ?? ""}
							alt={galleryImages[0]?.alt ?? roomName}
							fill
							className="object-cover transition-transform duration-700 group-hover:scale-105"
							priority
							sizes="100vw"
							quality={85}
							placeholder={blurDataURL ? "blur" : undefined}
							blurDataURL={blurDataURL}
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
							<Image
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

			<Suspense fallback={null}>
				<LightboxWrapper
					variant="compact"
					slides={slides}
					open={open}
					openIndex={index}
					onOpen={setOpen}
					onClose={() => {
						setOpen(false);
					}}
				/>
			</Suspense>
		</div>
	);
}
