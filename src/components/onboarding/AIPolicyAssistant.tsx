'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader2, Check, Copy } from 'lucide-react';
import { useLocale } from 'next-intl';
import { generatePolicyText, PolicyContext } from '@/app/actions/ai-policy';
import { submitCommunityTemplate } from '@/app/actions/community-templates';

interface AIPolicyAssistantProps {
  type: 'cancellation' | 'roomDescription' | 'hotelDescription';
  context?: PolicyContext;
  onAccept: (text: string) => void;
  hotelName?: string;
  submitAsTemplate?: boolean;
}

export default function AIPolicyAssistant({ type, context, onAccept, hotelName, submitAsTemplate = true }: AIPolicyAssistantProps) {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState('');
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Client-side guard: reject obviously off-topic requests before consuming tokens
  const isOffTopic = (msg: string): string | null => {
    const lower = msg.toLowerCase();
    const topicHints: Record<typeof type, string[]> = {
      cancellation: ['cancel', 'política', 'politica', 'reembolso', 'devol', 'penal', 'anticip', 'plazo', 'flexible', 'estrict', 'no show', 'noshow', 'cargo', 'charge', 'fecha', 'día', 'reserva', 'booking'],
      roomDescription: ['habitación', 'habitacion', 'cuarto', 'cama', 'vista', 'baño', 'espacio', 'cómodo', 'comodo', 'amplio', 'luz', 'decor', 'ambiente', 'capacidad', 'huésped', 'huesped', 'descripción', 'descripcion'],
      hotelDescription: ['hotel', 'alojamiento', 'propiedad', 'ubicación', 'ubicacion', 'servicio', 'experiencia', 'huésped', 'huesped', 'descripción', 'descripcion', 'instalacion', 'comodidad'],
    };
    const genericHints = ['código', 'codigo', 'code', 'program', 'receta', 'recipe', 'chiste', 'joke', 'poema', 'poem', 'traduc', 'resumen', 'summary', 'explic', 'explain', 'qué es', 'que es', 'cómo', 'como se', 'quién', 'quien', 'historia', 'history', 'matem', 'math', 'física', 'fisica'];

    const hints = topicHints[type] || [];
    const hasTopicHint = hints.some(h => lower.includes(h));
    const hasGenericHint = genericHints.some(h => lower.includes(h));

    if (hasGenericHint && !hasTopicHint) {
      return 'Este asistente solo redacta texto para este campo. Escribe una instrucción relacionada.';
    }
    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);

    // Client-side guard check
    const guardBlock = isOffTopic(userMsg);
    if (guardBlock) {
      setMessages(prev => [...prev, { role: 'ai', text: guardBlock }]);
      return;
    }

    setIsLoading(true);
    setLastApplied(null); // Reset applied state when generating new version

    const result = await generatePolicyText(type, userMsg, context);

    setIsLoading(false);

    if (result.success) {
      setMessages(prev => [...prev, { role: 'ai', text: result.text }]);
      setLastGenerated(result.text);
    } else {
      setMessages(prev => [...prev, { role: 'ai', text: result.error || 'Error al generar' }]);
    }
  };

  const handleAccept = async () => {
    if (!lastGenerated) return;

    // Apply to the form field
    onAccept(lastGenerated);
    setLastApplied(lastGenerated);

    // Flash feedback
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);

    // Submit to community templates in background (non-blocking)
    if (submitAsTemplate && lastGenerated.length >= 20) {
      submitCommunityTemplate({
        type,
        content: lastGenerated,
        locale,
        propertyType: context?.propertyType,
        hotelName,
        source: 'ai_generated',
      });
    }
  };

  const handleCopy = () => {
    if (lastGenerated) {
      navigator.clipboard.writeText(lastGenerated);
    }
  };

  const isApplied = lastApplied === lastGenerated;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <Sparkles size={12} />
        Generar con IA
      </button>
    );
  }

  return (
    <div className="mt-3 border border-white/10 rounded-[var(--radius-squircle-lg)] bg-black/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Asistente IA</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-zinc-600 hover:text-zinc-400 text-xs">
          Cerrar
        </button>
      </div>

      {/* Messages */}
      <div className="h-48 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-4 space-y-1">
            <p className="text-xs text-zinc-600">
              {type === 'cancellation' && 'Ej: "Cancelación gratis hasta 48hs antes, luego cobra 1 noche"'}
              {type === 'roomDescription' && 'Ej: "Habitación amplia con vista al jardín, ideal para parejas"'}
              {type === 'hotelDescription' && 'Ej: "Hotel boutique en el centro, ambiente acogedor y moderno"'}
            </p>
            <p className="text-[10px] text-zinc-700">Genera todas las versiones que quieras</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[var(--radius-squircle-md)] px-3 py-2 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-500/20 text-indigo-200'
                : 'bg-white/5 text-zinc-300 whitespace-pre-wrap'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-[var(--radius-squircle-md)] px-3 py-2">
              <Loader2 size={14} className="text-zinc-500 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Actions — always available when there's generated text */}
      {lastGenerated && (
        <div className="px-3 py-2 flex items-center gap-3 border-t border-white/5">
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
              justSaved
                ? 'text-emerald-300'
                : isApplied
                  ? 'text-emerald-400/60'
                  : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            {justSaved ? (
              <>
                <Check size={12} />
                ¡Aplicado!
              </>
            ) : isApplied ? (
              <>
                <Check size={12} />
                Aplicado — puedes generar otra versión
              </>
            ) : (
              <>
                <Check size={12} />
                Usar este texto
              </>
            )}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Copy size={10} />
            Copiar
          </button>
        </div>
      )}

      {/* Input — always available for next iteration */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pide otra versión o ajusta algo..."
          className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-700"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="text-indigo-400 hover:text-indigo-300 disabled:text-zinc-700 transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
