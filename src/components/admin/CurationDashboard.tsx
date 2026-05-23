'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, X, Loader2, FileText, Lightbulb, Zap, BarChart3,
  Copy, ChevronDown, ChevronUp, RefreshCw, AlertTriangle,
  TrendingUp, Shield
} from 'lucide-react';
import {
  getPendingTemplates, curateTemplate, getPendingAmenitySuggestions,
  curateAmenitySuggestion, runCurationAutomation, getCurationStats,
  generateRegistryMergeCode
} from '@/app/actions/community-templates';
import type { CommunityTemplate } from '@/lib/community-templates-schema';
import type { AmenitySuggestion } from '@/app/actions/community-templates';
import type { AutomationResult } from '@/lib/curation-automation';

type Tab = 'amenities' | 'templates' | 'automation' | 'stats';

export default function CurationDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('amenities');
  const [loading, setLoading] = useState(true);

  // Amenities
  const [pendingAmenities, setPendingAmenities] = useState<AmenitySuggestion[]>([]);
  const [actingAmenity, setActingAmenity] = useState<string | null>(null);

  // Templates
  const [pendingTemplates, setPendingTemplates] = useState<CommunityTemplate[]>([]);
  const [actingTemplate, setActingTemplate] = useState<string | null>(null);

  // Automation
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [automationResult, setAutomationResult] = useState<{
    amenities: AutomationResult;
    templates: AutomationResult;
    summary: { totalProcessed: number; autoApproved: number; autoRejected: number; needsReview: number; duplicatesFound: number };
  } | null>(null);

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [mergeCode, setMergeCode] = useState<string | null>(null);
  const [mergeCount, setMergeCount] = useState(0);

  const loadData = async () => {
    setLoading(true);
    const [amenities, templates, statsData] = await Promise.all([
      getPendingAmenitySuggestions(),
      getPendingTemplates(),
      getCurationStats(),
    ]);
    setPendingAmenities(amenities);
    setPendingTemplates(templates);
    setStats(statsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAmenityAction = async (id: string, action: 'approve' | 'reject' | 'merge') => {
    setActingAmenity(id);
    await curateAmenitySuggestion(id, action);
    setPendingAmenities(prev => prev.filter(a => a.id !== id));
    setActingAmenity(null);
  };

  const handleTemplateAction = async (id: string, action: 'approve' | 'reject') => {
    setActingTemplate(id);
    await curateTemplate(id, action);
    setPendingTemplates(prev => prev.filter(t => t.id !== id));
    setActingTemplate(null);
  };

  const handleRunAutomation = async () => {
    setRunningAutomation(true);
    const result = await runCurationAutomation();
    setAutomationResult(result);
    setRunningAutomation(false);
    // Reload pending lists
    const [amenities, templates] = await Promise.all([
      getPendingAmenitySuggestions(),
      getPendingTemplates(),
    ]);
    setPendingAmenities(amenities);
    setPendingTemplates(templates);
  };

  const handleGenerateMergeCode = async () => {
    const result = await generateRegistryMergeCode();
    if (result.success) {
      setMergeCode(result.code);
      setMergeCount(result.count);
    }
  };

  const typeLabels: Record<string, string> = {
    cancellation: 'Política de cancelación',
    roomDescription: 'Descripción de habitación',
    hotelDescription: 'Descripción del hotel',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-500 size-8" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">Panel de Curación</h2>
          <p className="text-zinc-500 text-sm">Automatización + revisión manual de contenido comunitario</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <RefreshCw size={14} />
          Recargar
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Lightbulb}
            label="Amenidades pendientes"
            value={stats.amenities.pending || 0}
            color="amber"
          />
          <StatCard
            icon={FileText}
            label="Plantillas pendientes"
            value={stats.templates.pending || 0}
            color="indigo"
          />
          <StatCard
            icon={Check}
            label="Amenidades aprobadas"
            value={stats.amenities.approved || 0}
            color="emerald"
          />
          <StatCard
            icon={Shield}
            label="Plantillas aprobadas"
            value={pendingTemplates.length > 0 ? stats.templates.approved || 0 : stats.templates.approved || 0}
            color="emerald"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-black/40 p-1 rounded-[var(--radius-squircle-lg)] border border-white/5">
        {[
          { id: 'amenities' as Tab, label: 'Amenidades', count: pendingAmenities.length },
          { id: 'templates' as Tab, label: 'Plantillas', count: pendingTemplates.length },
          { id: 'automation' as Tab, label: 'Automatización' },
          { id: 'stats' as Tab, label: 'Top sugerencias' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-[var(--radius-squircle-md)] text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {tab.label}
            {'count' in tab && tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'amenities' && (
          <motion.div
            key="amenities"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {pendingAmenities.length === 0 ? (
              <EmptyState message="No hay amenidades pendientes de revisión" />
            ) : (
              pendingAmenities.map(amenity => (
                <AmenityCard
                  key={amenity.id}
                  amenity={amenity}
                  acting={actingAmenity === amenity.id}
                  onAction={handleAmenityAction}
                />
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'templates' && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {pendingTemplates.length === 0 ? (
              <EmptyState message="No hay plantillas pendientes de revisión" />
            ) : (
              pendingTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  acting={actingTemplate === template.id}
                  onAction={handleTemplateAction}
                  typeLabels={typeLabels}
                />
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'automation' && (
          <motion.div
            key="automation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Run automation */}
            <div className="bg-black/40 border border-white/5 rounded-[var(--radius-squircle-xl)] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Zap className="text-amber-400" size={24} />
                <div>
                  <h3 className="text-white font-bold">Motor de Automatización</h3>
                  <p className="text-zinc-500 text-xs">Detección de duplicados, ruido y auto-curación</p>
                </div>
              </div>

              <button
                onClick={handleRunAutomation}
                disabled={runningAutomation}
                className="w-full flex items-center justify-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 py-3 rounded-[var(--radius-squircle-lg)] text-sm font-bold uppercase tracking-wider hover:bg-amber-500/30 disabled:opacity-50 transition-all"
              >
                {runningAutomation ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                {runningAutomation ? 'Procesando...' : 'Ejecutar automatización'}
              </button>

              {automationResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <AutoStat label="Procesados" value={automationResult.summary.totalProcessed} color="zinc" />
                    <AutoStat label="Auto-aprobados" value={automationResult.summary.autoApproved} color="emerald" />
                    <AutoStat label="Auto-rechazados" value={automationResult.summary.autoRejected} color="rose" />
                    <AutoStat label="Revisión manual" value={automationResult.summary.needsReview} color="amber" />
                    <AutoStat label="Duplicados" value={automationResult.summary.duplicatesFound} color="orange" />
                  </div>

                  {/* Auto-approved details */}
                  {automationResult.amenities.autoApproved.length > 0 && (
                    <details className="bg-emerald-500/5 border border-emerald-500/10 rounded-[var(--radius-squircle-md)] p-3">
                      <summary className="text-xs font-bold text-emerald-400 cursor-pointer">
                        Amenidades auto-aprobadas ({automationResult.amenities.autoApproved.length})
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {automationResult.amenities.autoApproved.map(item => (
                          <li key={item.id} className="text-xs text-zinc-400 flex items-center justify-between">
                            <span>{item.name}</span>
                            <span className="text-emerald-500 font-mono">{(item.score * 100).toFixed(0)}%</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* Auto-rejected details */}
                  {automationResult.amenities.autoRejected.length > 0 && (
                    <details className="bg-rose-500/5 border border-rose-500/10 rounded-[var(--radius-squircle-md)] p-3">
                      <summary className="text-xs font-bold text-rose-400 cursor-pointer">
                        Amenidades auto-rechazadas ({automationResult.amenities.autoRejected.length})
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {automationResult.amenities.autoRejected.map(item => (
                          <li key={item.id} className="text-xs text-zinc-400 flex items-center justify-between">
                            <span>{item.name}</span>
                            <span className="text-rose-500 font-mono">{(item.score * 100).toFixed(0)}%</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* Needs review */}
                  {automationResult.amenities.needsReview.length > 0 && (
                    <details className="bg-amber-500/5 border border-amber-500/10 rounded-[var(--radius-squircle-md)] p-3">
                      <summary className="text-xs font-bold text-amber-400 cursor-pointer">
                        Requieren revisión manual ({automationResult.amenities.needsReview.length})
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {automationResult.amenities.needsReview.map(item => (
                          <li key={item.id} className="text-xs text-zinc-400 flex items-center justify-between">
                            <span>{item.name}</span>
                            <span className="text-amber-500 font-mono">{(item.score * 100).toFixed(0)}%</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Merge code generator */}
            <div className="bg-black/40 border border-white/5 rounded-[var(--radius-squircle-xl)] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Copy className="text-indigo-400" size={24} />
                <div>
                  <h3 className="text-white font-bold">Generar código de merge</h3>
                  <p className="text-zinc-500 text-xs">Código listo para pegar en amenity-registry.ts</p>
                </div>
              </div>

              <button
                onClick={handleGenerateMergeCode}
                className="w-full flex items-center justify-center gap-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 py-3 rounded-[var(--radius-squircle-lg)] text-sm font-bold uppercase tracking-wider hover:bg-indigo-500/30 transition-all"
              >
                <Copy size={16} />
                Generar código
              </button>

              {mergeCode && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">{mergeCount} amenidades pendientes de merge</p>
                  <pre className="bg-black/60 border border-white/5 rounded-[var(--radius-squircle-md)] p-4 text-xs text-zinc-300 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                    {mergeCode}
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(mergeCode)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Copiar al portapapeles
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {stats?.topSuggested && stats.topSuggested.length > 0 ? (
              <div className="bg-black/40 border border-white/5 rounded-[var(--radius-squircle-xl)] p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="text-emerald-400" size={16} />
                  <h3 className="text-white font-bold text-sm">Top amenidades sugeridas</h3>
                </div>
                {stats.topSuggested.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 font-mono w-5">{i + 1}</span>
                      <span className="text-zinc-300">{item.name}</span>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                      {item.count} {item.count === 1 ? 'vez' : 'veces'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No hay sugerencias registradas aún" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className={`p-3 rounded-[var(--radius-squircle-lg)] border ${colorClasses[color] || colorClasses.zinc}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function AutoStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    zinc: 'text-zinc-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    amber: 'text-amber-400',
    orange: 'text-orange-400',
  };

  return (
    <div className="bg-black/30 rounded-[var(--radius-squircle-md)] p-2 text-center">
      <p className={`text-lg font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-[9px] text-zinc-600 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-zinc-600">{message}</p>
    </div>
  );
}

function AmenityCard({ amenity, acting, onAction }: { amenity: AmenitySuggestion; acting: boolean; onAction: (id: string, action: 'approve' | 'reject' | 'merge') => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="bg-black/40 border border-white/5 rounded-[var(--radius-squircle-xl)] p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-bold text-sm">{amenity.name}</span>
          <span className="bg-zinc-500/10 text-zinc-400 text-[10px] px-2 py-0.5 rounded border border-zinc-500/20 font-mono">
            {amenity.locale === 'en' ? 'EN' : 'ES'}
          </span>
          {amenity.category && (
            <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded border border-indigo-500/20 font-mono uppercase">
              {amenity.category}
            </span>
          )}
          {amenity.hotelName && (
            <span className="text-zinc-700 text-[10px]">por {amenity.hotelName}</span>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-zinc-600 hover:text-zinc-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && amenity.description && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-zinc-400 bg-black/30 rounded p-2">{amenity.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onAction(amenity.id, 'approve')}
          disabled={acting}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
        >
          <Check size={14} />
          Aprobar
        </button>
        <button
          onClick={() => onAction(amenity.id, 'merge')}
          disabled={acting}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
        >
          <Copy size={14} />
          Aprobar + mergear
        </button>
        <button
          onClick={() => onAction(amenity.id, 'reject')}
          disabled={acting}
          className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 disabled:opacity-50 transition-colors"
        >
          <X size={14} />
          Rechazar
        </button>
        {acting && <Loader2 size={14} className="text-zinc-500 animate-spin" />}
      </div>
    </motion.div>
  );
}

function TemplateCard({ template, acting, onAction, typeLabels }: { template: CommunityTemplate; acting: boolean; onAction: (id: string, action: 'approve' | 'reject') => void; typeLabels: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="bg-black/40 border border-white/5 rounded-[var(--radius-squircle-xl)] p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded border border-indigo-500/20 font-mono uppercase">
            {typeLabels[template.type] || template.type}
          </span>
          <span className="bg-zinc-500/10 text-zinc-400 text-[10px] px-2 py-0.5 rounded border border-zinc-500/20 font-mono">
            {template.locale === 'en' ? 'EN' : 'ES'}
          </span>
          <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded border border-amber-500/20 font-mono">
            {template.source === 'ai_generated' ? 'IA' : template.source === 'user_written' ? 'Manual' : 'IA + Editado'}
          </span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-zinc-600 hover:text-zinc-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-zinc-300 bg-black/30 rounded p-3 leading-relaxed whitespace-pre-wrap">{template.content}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onAction(template.id, 'approve')}
          disabled={acting}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
        >
          <Check size={14} />
          Aprobar
        </button>
        <button
          onClick={() => onAction(template.id, 'reject')}
          disabled={acting}
          className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 disabled:opacity-50 transition-colors"
        >
          <X size={14} />
          Rechazar
        </button>
        {acting && <Loader2 size={14} className="text-zinc-500 animate-spin" />}
      </div>
    </motion.div>
  );
}
