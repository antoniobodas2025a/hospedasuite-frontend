import { Metadata } from 'next';
import { FAQ } from '@/components/support/FAQ';
import { KnowledgeBase } from '@/components/support/KnowledgeBase';
import { Mail, MessageSquare, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Soporte | HospedaSuite',
  description: 'Centro de ayuda y soporte técnico de HospedaSuite',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Centro de Soporte
          </h1>
          <p className="text-gray-600 text-center mt-3 max-w-2xl mx-auto">
            Encuentra respuestas rápidas a tus preguntas o contacta a nuestro equipo de soporte.
          </p>
        </div>
      </div>

      {/* Contact Cards */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <Mail className="w-8 h-8 text-blue-600 mx-auto" />
            <h3 className="font-semibold text-gray-900 mt-3">Email</h3>
            <p className="text-gray-600 text-sm mt-1">soporte@hospedasuite.com</p>
            <p className="text-xs text-gray-500 mt-2">Respuesta en 24h hábiles</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <MessageSquare className="w-8 h-8 text-green-600 mx-auto" />
            <h3 className="font-semibold text-gray-900 mt-3">WhatsApp</h3>
            <p className="text-gray-600 text-sm mt-1">+57 300 123 4567</p>
            <p className="text-xs text-gray-500 mt-2">Lun-Vie 9am-6pm</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <Clock className="w-8 h-8 text-purple-600 mx-auto" />
            <h3 className="font-semibold text-gray-900 mt-3">Horario</h3>
            <p className="text-gray-600 text-sm mt-1">Lunes a Viernes</p>
            <p className="text-xs text-gray-500 mt-2">9:00 AM - 6:00 PM (COT)</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
        <KnowledgeBase />
        <FAQ />

        {/* Contact Form */}
        <section id="contact" className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Envíanos un Mensaje</h2>
          <form className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="tu@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asunto
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Selecciona un tema</option>
                <option value="technical">Soporte Técnico</option>
                <option value="billing">Facturación</option>
                <option value="feature">Sugerencia de Función</option>
                <option value="bug">Reportar un Bug</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe tu consulta o problema..."
              />
            </div>
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enviar Mensaje
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
