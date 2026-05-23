'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, FileText } from 'lucide-react';
import { getPendingTemplates, curateTemplate } from '@/app/actions/community-templates';
import type { CommunityTemplate } from '@/lib/community-templates-schema';

export default function TemplateCurationPanel() {
  const [pending, setPending] = useState<CommunityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadPending = async () => {
    setLoading(true);
    const templates = await getPendingTemplates();
    setPending(templates);
    setLoading(false);
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActing(id);
    await curateTemplate(id, action);
    setPending(prev => prev.filter(t => t.id !== id));
    setActing(null);
  };

  const typeLabels: Record<string, string> = {
    cancellation: 'Política de cancelación',
    roomDescription: 'Descripción de habitación',
    hotelDescription: 'Descripción del hotel',
  };

  const localeLabels: Record<string, string> = {
    es: 'Español',
    en: 'English',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-500 size-8" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-2">
        <FileText className="mx-auto text-indigo-400" size={32} />
        <h2 className="text-2xl font-bold text-white">Curación de Plantillas</h2>
        <p className="text-zinc-500 text-sm">
          {pending.length} {pending.length === 1 ? 'plantilla pendiente' : 'plantillas pendientes'}
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-600">No hay plantillas pendientes de revisión</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(template => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/40 border border-white/5 rounded-[var(--radius-squircle-xl)] p-5 space-y-3"
            >
              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded border border-indigo-500/20 font-mono uppercase">
                  {typeLabels[template.type]}
                </span>
                <span className="bg-zinc-500/10 text-zinc-400 text-[10px] px-2 py-0.5 rounded border border-zinc-500/20 font-mono">
                  {localeLabels[template.locale]}
                </span>
                {template.propertyType && (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20 font-mono uppercase">
                    {template.propertyType}
                  </span>
                )}
                <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                  {template.source === 'ai_generated' ? 'IA' : template.source === 'user_written' ? 'Manual' : 'IA + Editado'}
                </span>
                <span className="text-zinc-700 text-[10px] ml-auto">
                  {new Date(template.createdAt).toLocaleDateString('es-AR')}
                </span>
              </div>

              {/* Content */}
              <div className="bg-black/30 rounded-[var(--radius-squircle-md)] p-3">
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{template.content}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAction(template.id, 'approve')}
                  disabled={acting === template.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                >
                  <Check size={14} />
                  Aprobar
                </button>
                <button
                  onClick={() => handleAction(template.id, 'reject')}
                  disabled={acting === template.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 disabled:opacity-50 transition-colors"
                >
                  <X size={14} />
                  Rechazar
                </button>
                {acting === template.id && (
                  <Loader2 size={14} className="text-zinc-500 animate-spin" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
