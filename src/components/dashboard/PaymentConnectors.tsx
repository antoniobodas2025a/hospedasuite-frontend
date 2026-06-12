'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Plus } from 'lucide-react';

interface PaymentConnectorsProps {
  hotelId: string;
  currentGateway?: string;
}

export default function PaymentConnectors({ hotelId, currentGateway = 'wompi' }: PaymentConnectorsProps) {
  const [selectedGateway, setSelectedGateway] = useState(currentGateway);

  const gateways = [
    { id: 'wompi', name: 'Wompi', status: 'active', color: 'bg-blue-500' },
    { id: 'mercadopago', name: 'MercadoPago', status: 'coming_soon', color: 'bg-yellow-500' },
    { id: 'payu', name: 'PayU', status: 'coming_soon', color: 'bg-red-500' },
  ];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/20 rounded-lg">
          <CreditCard size={20} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-bold">Conectores de Pago</h3>
          <p className="text-gray-400 text-sm">Soberanía Financiera: 100% de los fondos van a tu cuenta</p>
        </div>
      </div>

      <div className="space-y-3">
        {gateways.map((gw) => (
          <div
            key={gw.id}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              selectedGateway === gw.id
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
            } ${gw.status === 'coming_soon' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => gw.status === 'active' && setSelectedGateway(gw.id)}
          >
            <div className="flex items-center gap-3">
              <div className={`size-3 rounded-full ${gw.color}`} />
              <div>
                <p className="text-white font-medium">{gw.name}</p>
                <p className="text-xs text-gray-500">
                  {gw.status === 'active' ? 'Conectado' : 'Próximamente'}
                </p>
              </div>
            </div>

            {gw.status === 'active' ? (
              selectedGateway === gw.id ? (
                <CheckCircle size={20} className="text-emerald-400" />
              ) : (
                <div className="size-5 rounded-full border-2 border-gray-600" />
              )
            ) : (
              <Plus size={20} className="text-gray-500" />
            )}
          </div>
        ))}
      </div>

      {selectedGateway === 'wompi' && (
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-blue-300 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            Wompi está configurado y operando en modo {false ? 'Prueba' : 'Producción'}.
          </p>
        </div>
      )}
    </div>
  );
}
