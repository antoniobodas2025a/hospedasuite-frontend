'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowLeft, Shield, FileText, CreditCard, Lock, Ban } from 'lucide-react';

const SECTIONS = [
  {
    id: 'definiciones',
    title: '1. Definiciones',
    icon: FileText,
    content: (
      <>
        <p className="mb-3">
          <strong>PMS (Property Management System):</strong> Sistema de gestión hotelera que incluye motor
          de reservas, calendario, gestión de huéspedes, channel manager, POS y facturación.
        </p>
        <p className="mb-3">
          <strong>Channel (Online Travel Agency):</strong> Motor de búsqueda y reserva global de HospedaSuite
          (<em>hospedasuite.com</em>) donde los viajeros encuentran y reservan propiedades.
        </p>
        <p>
          <strong>Link Directo:</strong> Enlace de pago personalizado que el hotel comparte por WhatsApp,
          redes sociales o su propio sitio web. Las reservas por este canal tienen 0% de comisión.
        </p>
      </>
    ),
  },
  {
    id: 'planes',
    title: '2. Planes y Precios',
    icon: CreditCard,
    content: (
      <>
        <p className="mb-3">
          HospedaSuite ofrece tres planes de suscripción mensual, todos con 1 mes de prueba gratuita:
        </p>
        <ul className="space-y-3 mb-3">
          <li className="flex items-start gap-3">
            <span className="font-semibold min-w-[100px] text-sm bg-black/5 px-2 py-0.5 rounded-full text-center">
              Starter
            </span>
            <span>$49.000 COP / mes</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-semibold min-w-[100px] text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-center">
              Pro
            </span>
            <span>$99.000 COP / mes</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-semibold min-w-[100px] text-sm bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-center">
              Enterprise
            </span>
            <span>$169.000 COP / mes</span>
          </li>
        </ul>
        <p>
          Los precios no incluyen IVA. HospedaSuite se reserva el derecho de ajustar precios
          con un aviso mínimo de 30 días calendario.
        </p>
      </>
    ),
  },
  {
    id: 'prueba',
    title: '3. Período de Prueba',
    icon: Shield,
    content: (
      <>
        <p className="mb-3">
          Todo hotel nuevo recibe <strong>30 días gratis</strong> desde la fecha de registro,
          sin costo alguno. Durante este período tiene acceso completo a todas las funcionalidades
          del plan contratado.
        </p>
        <p className="mb-3">
          <strong>Garantía de Extensión:</strong> Si durante los 30 días de prueba el hotel no recibe
          al menos 1 reserva a través de la Channel de HospedaSuite, el período de prueba se extiende
          automáticamente 1 mes adicional sin costo.
        </p>
        <p>
          Al finalizar el período de prueba, la suscripción pasa automáticamente a estado activo
          y comienza la facturación mensual según el plan elegido. El hotel puede cancelar en cualquier
          momento antes de que termine la prueba sin incurrir en cargos.
        </p>
      </>
    ),
  },
  {
    id: 'facturacion',
    title: '4. Facturación',
    icon: FileText,
    content: (
      <>
        <p className="mb-3">
          HospedaSuite opera bajo un modelo <strong>post-pago mensual</strong>. El hotel utiliza el
          sistema durante todo el mes y recibe una factura consolidada al cierre del período.
        </p>
        <p className="mb-3">
          La factura mensual incluye:
        </p>
        <ul className="list-disc list-inside space-y-1 mb-3 ml-2">
          <li>El costo del plan de suscripción contratado</li>
          <li>Las comisiones por reservas generadas a través de la Channel (10%)</li>
        </ul>
        <p>
          Las facturas se emiten en pesos colombianos (COP) y se envían al correo electrónico
          registrado del hotel. El pago se realiza a través de un enlace de Wompi incluido en la factura.
        </p>
      </>
    ),
  },
  {
    id: 'comisiones',
    title: '5. Comisiones',
    icon: CreditCard,
    content: (
      <>
        <p className="mb-3">
          Las comisiones se calculan únicamente sobre reservas confirmadas y no reembolsadas:
        </p>
        <ul className="space-y-3 mb-3">
          <li className="flex items-start gap-3">
            <span className="font-semibold min-w-[120px] text-sm bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-center">
              Canales Propios
            </span>
            <span>
              <strong>0% de comisión.</strong> WhatsApp, teléfono, web del hotel, Link Directo.
              El hotel recibe el 100% del valor de la reserva.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-semibold min-w-[120px] text-sm bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-center">
              Channel HospedaSuite
            </span>
            <span>
              <strong>10% de comisión</strong> sobre reservas generadas a través del motor de
              búsqueda global de HospedaSuite.
            </span>
          </li>
        </ul>
        <p>
          Las comisiones se descuentan automáticamente de la factura mensual. El hotel siempre recibe
          el 100% del dinero de las reservas en su cuenta de Wompi; las comisiones se facturan por separado.
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    title: '6. Propiedad de los Datos',
    icon: Lock,
    content: (
      <>
        <p className="mb-3">
          <strong>El hotel es y será siempre el dueño absoluto de sus datos.</strong> Esto incluye
          pero no se limita a: información de huéspedes, historial de reservas, datos financieros,
          configuración de tarifas y contenido cargado en la plataforma.
        </p>
        <p>
          HospedaSuite actúa como procesador de datos y no reclama ningún derecho de propiedad
          sobre la información del hotel. En caso de cancelación, el hotel puede exportar todos
          sus datos en formatos estándar (CSV, JSON) durante 30 días calendario.
        </p>
      </>
    ),
  },
  {
    id: 'privacidad',
    title: '7. Privacidad',
    icon: Shield,
    content: (
      <>
        <p className="mb-3">
          HospedaSuite protege los datos del hotel y sus huéspedes con estándares de seguridad
          de nivel empresarial. Toda la información se almacena encriptada en servidores seguros.
        </p>
        <p className="mb-3">
          <strong>No compartimos, vendemos ni alquilamos</strong> los datos del hotel o sus
          huéspedes a terceros bajo ninguna circunstancia. Los datos solo se utilizan para
          proveer el servicio contratado.
        </p>
        <p>
          HospedaSuite cumple con la legislación colombiana de protección de datos personales
          (Ley 1581 de 2012) y se adhiere a los principios de minimización de datos y
          limitación de finalidad.
        </p>
      </>
    ),
  },
  {
    id: 'cancelacion',
    title: '8. Cancelación',
    icon: Ban,
    content: (
      <>
        <p className="mb-3">
          El hotel puede cancelar su suscripción <strong>en cualquier momento</strong>, sin
          penalidades ni cargos ocultos. No hay contratos de permanencia mínima más allá del
          período de facturación en curso.
        </p>
        <p className="mb-3">
          Al cancelar:
        </p>
        <ul className="list-disc list-inside space-y-1 mb-3 ml-2">
          <li>El acceso al PMS se mantiene hasta el final del ciclo de facturación ya pagado</li>
          <li>Los datos del hotel permanecen exportables durante 30 días calendario</li>
          <li>Transcurridos 30 días, los datos se eliminan de forma segura de nuestros servidores</li>
          <li>Las reservas existentes no se ven afectadas y se honran normalmente</li>
        </ul>
        <p>
          Para cancelar, el hotel debe enviar una solicitud por escrito a{' '}
          <strong>soporte@hospedasuite.com</strong>. La cancelación se procesa en un máximo
          de 48 horas hábiles.
        </p>
      </>
    ),
  },
  {
    id: 'responsabilidad',
    title: '9. Limitación de Responsabilidad',
    icon: Shield,
    content: (
      <>
        <p className="mb-3">
          HospedaSuite se compromete a mantener una disponibilidad de servicio del 99.5% mensual.
          No nos hacemos responsables por:
        </p>
        <ul className="list-disc list-inside space-y-1 mb-3 ml-2">
          <li>Pérdidas derivadas de cortes de internet o electricidad del hotel</li>
          <li>Decisiones comerciales tomadas por el hotel basadas en los reportes de la plataforma</li>
          <li>Reservas duplicadas por errores en la configuración del channel manager</li>
          <li>Fallas en servicios de terceros (Wompi, proveedores de hosting)</li>
        </ul>
        <p>
          La responsabilidad máxima de HospedaSuite frente a cualquier reclamo se limita al valor
          de la suscripción mensual del hotel en el período en que ocurrió el incidente.
        </p>
      </>
    ),
  },
  {
    id: 'modificaciones',
    title: '10. Modificaciones a los Términos',
    icon: FileText,
    content: (
      <>
        <p className="mb-3">
          HospedaSuite puede modificar estos términos en cualquier momento. Los cambios se notifican
          al hotel con al menos <strong>30 días calendario de anticipación</strong> a través del
          correo electrónico registrado y un aviso dentro de la plataforma.
        </p>
        <p className="mb-3">
          Si el hotel no está de acuerdo con las modificaciones, puede cancelar su suscripción
          antes de que los nuevos términos entren en vigencia sin ninguna penalidad.
        </p>
        <p>
          El uso continuado de la plataforma después de la fecha de entrada en vigencia de los
          nuevos términos constituye la aceptación de los mismos.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[980px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/software"
              className="flex items-center gap-2 text-[13px] text-[#1d1d1f]/60 hover:text-[#1d1d1f] transition-colors font-medium"
            >
              <ArrowLeft size={16} />
              Volver
            </Link>
            <span className="text-[#1d1d1f]/20">|</span>
            <span className="text-[13px] font-semibold text-[#1d1d1f]/80 tracking-tight">
              Términos y Condiciones del Servicio
            </span>
          </div>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="HospedaSuite" className="w-6 h-6 rounded-lg object-cover" />
            <span className="text-[13px] font-semibold text-[#1d1d1f]/80 tracking-tight hidden sm:block">HospedaSuite</span>
          </div>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 mb-6 border border-black/5">
            <Shield size={14} className="text-[#1d1d1f]/50" />
            <span className="text-[11px] font-semibold text-[#1d1d1f]/60 tracking-wide uppercase">
              Acuerdo de Servicio
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Términos y Condiciones
          </h1>
          <p className="text-[15px] text-[#1d1d1f]/60 leading-relaxed max-w-lg mx-auto">
            Última actualización: Mayo 2026. Estos términos rigen el uso de HospedaSuite PMS
            y todos los servicios asociados.
          </p>
        </div>

        {/* Plain Language Summary */}
        <section className="bg-white rounded-[var(--radius-squircle-3xl)] p-8 md:p-10 border border-black/5 shadow-sm mb-16">
          <h2 className="text-xl font-semibold tracking-tight mb-6 text-[#1d1d1f]">
            Resumen del Servicio
          </h2>
          <p className="text-[15px] text-[#1d1d1f]/70 leading-relaxed mb-8">
            En lenguaje simple, sin letra chica. Esto es lo que necesitás saber sobre cómo
            funciona HospedaSuite:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield size={14} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1d1d1f] text-sm mb-1">1 Mes Gratis</h3>
                <p className="text-[13px] text-[#1d1d1f]/60 leading-relaxed">
                  Probá todo sin pagar nada durante 30 días. Sin tarjeta de crédito.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CreditCard size={14} className="text-sky-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1d1d1f] text-sm mb-1">Facturación Mensual</h3>
                <p className="text-[13px] text-[#1d1d1f]/60 leading-relaxed">
                  Pagás al final del mes solo por lo que usaste. Plan + comisiones en una sola factura.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock size={14} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1d1d1f] text-sm mb-1">Tus Datos son Tuyos</h3>
                <p className="text-[13px] text-[#1d1d1f]/60 leading-relaxed">
                  El hotel es dueño del 100% de su información. Siempre.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Ban size={14} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1d1d1f] text-sm mb-1">Cancelá Cuando Quieras</h3>
                <p className="text-[13px] text-[#1d1d1f]/60 leading-relaxed">
                  Sin permanencia mínima. Sin penalidades. Tus datos exportables por 30 días.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-black/5">
            <p className="text-[13px] text-[#1d1d1f]/50 leading-relaxed">
              <strong className="text-[#1d1d1f]/70">Comisiones:</strong> 0% en canales propios
              (WhatsApp, Link Directo, tu web) y 10% en reservas por Channel HospedaSuite. El hotel siempre recibe el 100% del
              dinero de las reservas en su Wompi.
            </p>
          </div>
        </section>

        {/* Full Terms — Collapsible Sections */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight mb-8 text-[#1d1d1f]">
            Términos Completos
          </h2>

          <div className="space-y-3">
            {SECTIONS.map((section) => {
              const isOpen = openSection === section.id;
              const Icon = section.icon;

              return (
                <div
                  key={section.id}
                  className="bg-white rounded-[var(--radius-squircle-xl)] border border-black/5 overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenSection(isOpen ? null : section.id)}
                    className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-black/[0.02] transition-colors"
                  >
                    <Icon size={16} className="text-[#1d1d1f]/40 flex-shrink-0" />
                    <span className="flex-1 font-medium text-[#1d1d1f] text-[15px]">
                      {section.title}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-[#1d1d1f]/30 transition-transform duration-300 flex-shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pb-6 text-[14px] text-[#1d1d1f]/70 leading-relaxed">
                      {section.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact */}
        <div className="mt-16 text-center">
          <p className="text-[13px] text-[#1d1d1f]/40 leading-relaxed">
            ¿Tenés preguntas sobre estos términos? Escribinos a{' '}
            <a
              href="mailto:soporte@hospedasuite.com"
              className="text-[#007dfa] hover:underline font-medium"
            >
              soporte@hospedasuite.com
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-black/5 bg-white">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <p className="text-[12px] text-[#1d1d1f]/40 font-medium">
            © 2026 HospedaSuite Inc. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
