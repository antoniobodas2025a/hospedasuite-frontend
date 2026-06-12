'use client';

import { useState } from 'react';
import { Key, CheckCircle, XCircle, Loader2, Plug } from 'lucide-react';
import { saveAlegraCredentials, getAlegraCredentials } from '@/app/actions/alegra-integration';

interface AlegraConfigProps {
  hotelId: string;
  initialEmail?: string;
}

export default function AlegraConfigPanel({ hotelId, initialEmail }: AlegraConfigProps) {
  const [email, setEmail] = useState(initialEmail || '');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!email || !token) {
      setStatus('error');
      setMessage('Completá ambos campos');
      return;
    }

    setSaving(true);
    setStatus('idle');
    setMessage('');

    try {
      const result = await saveAlegraCredentials(hotelId, email, token);
      if (result.success) {
        setStatus('success');
        setMessage('¡Conexión exitosa! Alegra está configurado.');
        setToken(''); // Clear token for security
      } else {
        setStatus('error');
        setMessage(result.error || 'Error al conectar');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!email || !token) {
      setStatus('error');
      setMessage('Completá ambos campos para probar');
      return;
    }

    setTesting(true);
    try {
      const { testAlegraConnection } = await import('@/lib/alegra-connector');
      const result = await testAlegraConnection({
        email,
        token,
        baseUrl: 'https://api.alegra.com/api/v1',
      });

      if (result.success) {
        setStatus('success');
        setMessage('Conexión verificada. Podés guardar las credenciales.');
      } else {
        setStatus('error');
        setMessage(result.error || 'Conexión fallida');
      }
    } catch {
      setStatus('error');
      setMessage('Error al probar la conexión');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Plug size={20} className="text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-bold">Conector de Facturación Electrónica</h3>
          <p className="text-gray-400 text-sm">Conectá tu cuenta de Alegra para emitir facturas automáticas</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Email de Alegra
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Token de API
          </label>
          <div className="relative">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Tu token de Alegra"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
            <Key size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Obtenelo en Alegra → Configuración → API - Integraciones
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
            Probar Conexión
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Guardar y Conectar
          </button>
        </div>

        {status !== 'idle' && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            status === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'
          }`}>
            {status === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
