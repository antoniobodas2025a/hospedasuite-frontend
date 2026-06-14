'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoomSchema } from '@/lib/validations/inventory';
import * as z from 'zod';

type RoomFormValues = z.input<typeof RoomSchema>;
import { saveRoomAction } from '@/app/actions/inventory';
import { motion } from 'framer-motion';
import { getPresignedUploadUrlAction } from '@/app/actions/settings';
import { compressImage, generateBlurDataURL, uploadToR2 } from '@/lib/upload-utils';
import { cn } from '@/lib/utils';
import { ROOM_AMENITY_REGISTRY } from '@/lib/amenity-registry';
import {
  X, Trash2, Copy, RefreshCw, Image as ImageIcon, Building2, Plus, UploadCloud, Loader2, GripVertical
} from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable thumbnail wrapper
function SortableThumbnail({ id, img, index, onRemove }: { id: string; img: any; index: number; onRemove: (i: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative shrink-0 w-24 h-20 rounded-[var(--radius-squircle-md)] overflow-hidden border border-border group cursor-grab active:cursor-grabbing"
    >
      <img src={img.url || img} className="w-full h-full object-cover" draggable={false} />
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0.5 left-0.5 p-0.5 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="size-3 text-white/80" />
      </div>
      {/* Delete overlay */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
      >
        <Trash2 className="size-4 text-rose-400" />
      </button>
      {/* Index badge */}
      <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] font-bold px-1 rounded">
        {index + 1}
      </div>
    </div>
  );
}

// ==========================================
// BLOQUE 1: CONSTANTES Y TIPADOS
// ==========================================

interface RoomEditorModalProps {
  hotelId: string;
  initialData?: any; 
  onClose: (needsRefresh?: boolean) => void;
}

// ==========================================
// BLOQUE 2: COMPONENTE PRINCIPAL
// ==========================================

export default function RoomEditorModal({ hotelId, initialData, onClose }: RoomEditorModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState(''); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RoomFormValues>({
    resolver: zodResolver(RoomSchema),
    defaultValues: {
      name: initialData?.name || '',
      capacity: initialData?.capacity || 2,
      price: initialData?.price || 0,
      description: initialData?.description || '',
      status: initialData?.status || 'active',
      amenities: initialData?.amenities || [],
      gallery: initialData?.gallery || [],
      ical_import_url: initialData?.ical_import_url || '',
      bed_type: initialData?.bed_type || undefined,
      beds: initialData?.beds || undefined,
    }
  });

  const currentAmenities = watch('amenities') || [];
  const currentGallery = watch('gallery') || [];

  // Drag-and-drop sensors for reordering
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = currentGallery.findIndex((_: any, i: number) => `thumb-${i}` === active.id);
    const newIndex = currentGallery.findIndex((_: any, i: number) => `thumb-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(currentGallery, oldIndex, newIndex);
    setValue('gallery', reordered, { shouldDirty: true });
  };

  const handleRemoveThumbnail = (index: number) => {
    setValue('gallery', currentGallery.filter((_: any, i: number) => i !== index), { shouldDirty: true });
  };

  const toggleAmenity = (amenityId: string) => {
    const exists = currentAmenities.includes(amenityId);
    setValue('amenities', exists 
      ? currentAmenities.filter((id: string) => id !== amenityId) 
      : [...currentAmenities, amenityId], { shouldDirty: true });
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    
    setIsUploadingMedia(true);
    try {
      // Parallel uploads
      const results = await Promise.all(
        files.map(async (file) => {
          const compressed = await compressImage(file);
          const presign = await getPresignedUploadUrlAction('rooms', file.name, 'image/webp');
          if (!presign.success || !presign.uploadUrl || !presign.publicUrl) throw new Error(presign.error || 'Sin URL presignada');
          await uploadToR2(presign.uploadUrl, compressed);
          const blurDataURL = await generateBlurDataURL(compressed);
          return { url: presign.publicUrl, blurDataURL };
        })
      );
      setValue('gallery', [...currentGallery, ...results], { shouldDirty: true });
    } catch (error: any) {
      console.error("[CRITICAL] Falla en la carga multimedia:", error);
      alert(`Error al subir archivo: ${error.message || 'Verifique conexión y bucket'}`);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingMedia(true);
    try {
      // Parallel uploads
      const results = await Promise.all(
        Array.from(files).map(async (file) => {
          const compressed = await compressImage(file);
          const presign = await getPresignedUploadUrlAction('rooms', file.name, 'image/webp');
          if (!presign.success || !presign.uploadUrl || !presign.publicUrl) throw new Error(presign.error || 'Sin URL presignada');
          await uploadToR2(presign.uploadUrl, compressed);
          const blurDataURL = await generateBlurDataURL(compressed);
          return { url: presign.publicUrl, blurDataURL };
        })
      );
      setValue('gallery', [...currentGallery, ...results], { shouldDirty: true });
    } catch (error: any) {
      console.error("[CRITICAL] Falla en la carga multimedia:", error);
      alert(`Error al subir archivo: ${error.message || 'Verifique conexión y bucket'}`);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmitHandler = async (data: RoomFormValues) => {
    setIsSaving(true);
    try {
      const result = await saveRoomAction(hotelId, data, initialData?.id);
      if (result.success) onClose(true);
      else alert(`Error en la mutación: ${result.error}`);
    } catch (error) {
      alert("Excepción crítica al intentar enlazar con la Bóveda.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl max-h-[90vh] glass-panel flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-border flex justify-between items-center glass-card !rounded-none">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-[var(--radius-squircle-2xl)] bg-card border border-border flex items-center justify-center">
              <Building2 className="size-6 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {initialData ? 'Afinación de Nodo' : 'Nuevo Nodo'}
            </h2>
          </div>
          <button onClick={() => onClose(false)} className="p-3 bg-muted hover:bg-rose-500/20 rounded-[var(--radius-squircle-2xl)] transition-colors text-muted-foreground hover:text-rose-400">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar font-poppins text-foreground">
          <form id="room-form" onSubmit={handleSubmit(onSubmitHandler)} className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Núcleo Operativo
                  </h3>
                  <div className="space-y-5">
                    <input {...register('name')} className="w-full bg-transparent border-b border-border text-white px-2 py-3 focus:outline-none focus:border-indigo-500 font-black text-2xl placeholder:text-muted-foreground" placeholder="Nombre de Unidad" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted p-4 rounded-[var(--radius-squircle-2xl)] border border-border">
                        <label className="block text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-widest">Tarifa (COP)</label>
                        <input type="number" {...register('price', { valueAsNumber: true })} className="w-full bg-transparent text-emerald-400 focus:outline-none font-bold font-mono" />
                      </div>
                      <div className="bg-muted p-4 rounded-[var(--radius-squircle-2xl)] border border-border">
                        <label className="block text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-widest">Aforo</label>
                        <input type="number" {...register('capacity', { valueAsNumber: true })} className="w-full bg-transparent text-white focus:outline-none font-bold font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-muted p-4 rounded-[var(--radius-squircle-2xl)] border border-border">
                        <label className="block text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-widest">Tipo de Cama</label>
                        <select {...register('bed_type')} className="w-full bg-transparent text-white focus:outline-none font-bold font-mono">
                          <option value="">—</option>
                          <option value="sencilla">Sencilla</option>
                          <option value="doble">Doble</option>
                          <option value="queen">Queen</option>
                          <option value="king">King</option>
                        </select>
                      </div>
                      <div className="bg-muted p-4 rounded-[var(--radius-squircle-2xl)] border border-border">
                        <label className="block text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-widest">Camas</label>
                        <input type="number" {...register('beds', { valueAsNumber: true })} className="w-full bg-transparent text-white focus:outline-none font-bold font-mono" min={1} max={10} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Comodidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(ROOM_AMENITY_REGISTRY).map((amenity) => (
                      <button type="button" key={amenity.id} onClick={() => toggleAmenity(amenity.id)} className={cn("flex items-center gap-2 px-3 py-2 rounded-[var(--radius-squircle-lg)] border text-[11px] font-medium transition-all", currentAmenities.includes(amenity.id) ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground")}>
                        <amenity.icon className="size-3.5" /> {amenity.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8 border-t lg:border-t-0 lg:border-l border-border pt-8 lg:pt-0 lg:pl-8">
                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Galería Visual (WebP)</h3>
                  <div className="space-y-4">
                    <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <div 
                      className={cn(
                        "w-full border border-dashed rounded-[var(--radius-squircle-lg)] py-4 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer",
                        isDragging 
                          ? "bg-rose-500/20 border-rose-500 scale-[1.01]" 
                          : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {isUploadingMedia ? <><Loader2 className="size-4 animate-spin" /> Procesando...</> : <><UploadCloud className="size-4" /> {isDragging ? 'Soltá las fotos acá' : 'Subir desde el Equipo'}</>}
                    </div>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={currentGallery.map((_: any, i: number) => `thumb-${i}`)} strategy={horizontalListSortingStrategy}>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                          {currentGallery.map((img: any, i: number) => (
                            <SortableThumbnail
                              key={`thumb-${i}`}
                              id={`thumb-${i}`}
                              img={img}
                              index={i}
                              onRemove={handleRemoveThumbnail}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-card flex justify-end gap-4">
          <button onClick={() => onClose(false)} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descartar</button>
          <button type="submit" form="room-form" disabled={isSaving || isUploadingMedia} className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-white bg-indigo-600 rounded-[var(--radius-squircle-lg)] shadow-cta">
            {isSaving ? 'Guardando...' : 'Compilar Mutación'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}