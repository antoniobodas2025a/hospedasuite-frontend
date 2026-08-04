'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, ArrowLeft, Shield, Database, Users, CreditCard, Mail, Globe, Lock, FileText } from 'lucide-react';

const SECTIONS = [
  {
    id: 'introduccion',
    title: '1. Introducción y Marco Legal',
    icon: FileText,
    content: (
      <>
        <p className="mb-3">
          <strong>HospedaSuite</strong> (en adelante "la Plataforma"), operada por Antonio Bodas, con NIT pendiente de registro, 
          en cumplimiento de la <strong>Ley 1581 de 2012</strong> (Ley General de Protección de Datos Personales), 
          el <strong>Decreto 1377 de 2013</strong>, y la <strong>Ley 1266 de 2008</strong> (Habeas Data), 
          establece la presente Política de Tratamiento de Datos Personales.
        </p>
        <p className="mb-3">
          Esta política aplica a todos los usuarios de la Plataforma, incluyendo:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li><strong>Hoteles:</strong> Propietarios y administradores de propiedades que utilizan HospedaSuite para gestionar sus operaciones.</li>
          <li><strong>Huéspedes:</strong> Personas que realizan reservas a través de la Plataforma o directamente con los hoteles.</li>
          <li><strong>Visitantes:</strong> Personas que navegan por el sitio web sin realizar reservas.</li>
        </ul>
        <p className="mt-3">
          Al utilizar la Plataforma, usted otorga su <strong>consentimiento explícito, previo e informado</strong> para el tratamiento 
          de sus datos personales conforme a esta política.
        </p>
      </>
    ),
  },
  {
    id: 'datos-recopilados',
    title: '2. Datos Personales Recopilados',
    icon: Database,
    content: (
      <>
        <p className="mb-4">
          HospedaSuite recopila los siguientes datos personales según el tipo de usuario:
        </p>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-2">🏨 Datos de Hoteles (Owners)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Nombre completo del propietario</li>
              <li>Correo electrónico</li>
              <li>Nombre comercial del hotel</li>
              <li>Ubicación (ciudad, dirección)</li>
              <li>Datos de facturación (NIT, régimen fiscal)</li>
              <li>Credenciales de Wompi (llaves públicas y secretas)</li>
              <li>Plan de suscripción y estado de pago</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-bold text-green-900 mb-2">👤 Datos de Huéspedes (Guests)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Nombre completo</li>
              <li>Tipo y número de documento de identidad (CC, CE, pasaporte)</li>
              <li>Correo electrónico</li>
              <li>Número de teléfono</li>
              <li>País de origen</li>
              <li>Notas adicionales (preferencias, alergias, etc.)</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-2">📅 Datos de Reservas (Bookings)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Fechas de check-in y check-out</li>
              <li>Monto pagado</li>
              <li>Método de pago utilizado</li>
              <li>ID de transacción de Wompi</li>
              <li>Estado de la reserva</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">🌐 Datos de Navegación (Todos los usuarios)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Dirección IP</li>
              <li>Tipo de navegador y sistema operativo</li>
              <li>Páginas visitadas y tiempo de permanencia</li>
              <li>Referencias (de dónde vino el usuario)</li>
              <li>Cookies y tecnologías de seguimiento</li>
            </ul>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'finalidad',
    title: '3. Finalidad del Tratamiento de Datos',
    icon: Shield,
    content: (
      <>
        <p className="mb-4">
          Los datos personales recopilados son tratados con las siguientes finalidades específicas:
        </p>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Gestión de Reservas</h4>
              <p className="text-sm text-gray-600">Procesar, confirmar y administrar las reservas realizadas por los huéspedes.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">2</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Procesamiento de Pagos</h4>
              <p className="text-sm text-gray-600">Gestionar transacciones financieras a través de Wompi y generar facturas.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">3</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Comunicación con Usuarios</h4>
              <p className="text-sm text-gray-600">Enviar confirmaciones de reserva, recordatorios, notificaciones de pago y soporte técnico.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">4</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Mejora del Servicio</h4>
              <p className="text-sm text-gray-600">Analizar el uso de la Plataforma para mejorar funcionalidades y experiencia de usuario.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">5</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Cumplimiento Legal</h4>
              <p className="text-sm text-gray-600">Cumplir con obligaciones fiscales, contables y legales aplicables.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">6</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Seguridad y Prevención de Fraude</h4>
              <p className="text-sm text-gray-600">Detectar y prevenir actividades fraudulentas o no autorizadas.</p>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'derechos',
    title: '4. Derechos del Titular de los Datos',
    icon: Users,
    content: (
      <>
        <p className="mb-4">
          De conformidad con el <strong>Artículo 8 de la Ley 1581 de 2012</strong>, usted como titular de los datos personales 
          tiene los siguientes derechos:
        </p>
        
        <div className="space-y-3">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-bold text-green-900 mb-2">✅ Derecho de Acceso</h4>
            <p className="text-sm text-green-800">
              Conocer qué datos personales tenemos sobre usted y cómo están siendo utilizados.
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-2">✏️ Derecho de Actualización y Rectificación</h4>
            <p className="text-sm text-blue-800">
              Solicitar la corrección de datos inexactos, incompletos o desactualizados.
            </p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-bold text-red-900 mb-2">🗑️ Derecho de Supresión</h4>
            <p className="text-sm text-red-800">
              Solicitar la eliminación de sus datos personales cuando ya no sean necesarios para la finalidad 
              para la cual fueron recopilados, o cuando revoque su consentimiento.
            </p>
            <p className="text-xs text-red-700 mt-2">
              <strong>Nota:</strong> Este derecho no aplica cuando exista un deber legal o contractual de permanecer 
              en la base de datos (ej: obligaciones fiscales, reservas activas).
            </p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-bold text-yellow-900 mb-2">🚫 Derecho de Revocatoria</h4>
            <p className="text-sm text-yellow-800">
              Revocar el consentimiento para el tratamiento de sus datos personales en cualquier momento.
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-2">📋 Derecho a Presentar Quejas</h4>
            <p className="text-sm text-purple-800">
              Presentar quejas ante la <strong>Superintendencia de Industria y Comercio (SIC)</strong> 
              si considera que no han sido atendidos sus derechos.
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-bold text-gray-900 mb-2">📧 Cómo Ejercer sus Derechos</h4>
          <p className="text-sm text-gray-700 mb-2">
            Para ejercer cualquiera de estos derechos, envíe una solicitud a:
          </p>
          <p className="text-sm font-mono bg-white p-2 rounded">
            soporte@hospedasuite.com
          </p>
          <p className="text-xs text-gray-600 mt-2">
            <strong>Plazo de respuesta:</strong> 10 días hábiles (Art. 14, Ley 1581/2012)
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'terceros',
    title: '5. Terceros que Acceden a sus Datos',
    icon: Globe,
    content: (
      <>
        <p className="mb-4">
          HospedaSuite comparte datos personales con los siguientes terceros, únicamente para las finalidades 
          específicas indicadas:
        </p>
        
        <div className="space-y-3">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <CreditCard className="flex-shrink-0 w-6 h-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">Wompi (Pasarela de Pagos)</h4>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Datos compartidos:</strong> Nombre, email, monto de transacción, referencia de pago.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Finalidad:</strong> Procesar pagos de suscripciones y reservas.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Ubicación:</strong> Colombia | <strong>Política:</strong> wompi.co/politica-de-tratamiento-de-datos
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <Database className="flex-shrink-0 w-6 h-6 text-green-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">Supabase (Base de Datos)</h4>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Datos compartidos:</strong> Todos los datos almacenados en la Plataforma.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Finalidad:</strong> Almacenamiento y gestión de datos.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Ubicación:</strong> Estados Unidos (con cifrado en tránsito y reposo) | <strong>Política:</strong> supabase.com/privacy
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <Mail className="flex-shrink-0 w-6 h-6 text-purple-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">Resend (Servicio de Email)</h4>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Datos compartidos:</strong> Nombre, email, contenido del mensaje.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Finalidad:</strong> Enviar notificaciones transaccionales (confirmaciones, recordatorios, alertas).
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Ubicación:</strong> Estados Unidos | <strong>Política:</strong> resend.com/privacy
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <Globe className="flex-shrink-0 w-6 h-6 text-orange-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">PostHog (Analytics)</h4>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Datos compartidos:</strong> Datos de navegación anonymizados, eventos de uso.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Finalidad:</strong> Analizar el uso de la Plataforma para mejorar funcionalidades.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Ubicación:</strong> Estados Unidos | <strong>Política:</strong> posthog.com/privacy
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <Shield className="flex-shrink-0 w-6 h-6 text-red-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">Sentry (Error Tracking)</h4>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Datos compartidos:</strong> Logs de errores (pueden incluir datos de usuario en contexto).
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Finalidad:</strong> Detectar y corregir errores técnicos.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Ubicación:</strong> Estados Unidos | <strong>Política:</strong> sentry.io/privacy
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-bold text-yellow-900 mb-2">⚠️ Transferencias Internacionales</h4>
          <p className="text-sm text-yellow-800">
            Algunos de estos terceros están ubicados fuera de Colombia. Al utilizar la Plataforma, usted autoriza 
            expresamente estas transferencias internacionales de datos, las cuales se realizan bajo estándares 
            de seguridad adecuados y en cumplimiento del <strong>Artículo 26 de la Ley 1581 de 2012</strong>.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'seguridad',
    title: '6. Medidas de Seguridad',
    icon: Lock,
    content: (
      <>
        <p className="mb-4">
          HospedaSuite implementa las siguientes medidas técnicas, administrativas y organizativas para proteger 
          sus datos personales:
        </p>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Lock className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Cifrado en Tránsito</h4>
              <p className="text-sm text-gray-600">Todas las comunicaciones utilizan HTTPS/TLS 1.3.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Database className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Cifrado en Reposo</h4>
              <p className="text-sm text-gray-600">Los datos sensibles están cifrados en la base de datos (AES-256).</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Control de Acceso</h4>
              <p className="text-sm text-gray-600">Autenticación multifactor y permisos basados en roles (RBAC).</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <FileText className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Auditoría y Logs</h4>
              <p className="text-sm text-gray-600">Registro de todas las operaciones sobre datos personales (audit logs).</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Capacitación del Personal</h4>
              <p className="text-sm text-gray-600">Todo el personal con acceso a datos recibe capacitación en protección de datos.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-bold text-blue-900 mb-2">🔒 Certificaciones y Cumplimiento</h4>
          <p className="text-sm text-blue-800">
            HospedaSuite se compromete a obtener las siguientes certificaciones en el futuro:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
            <li>ISO 27001 (Sistema de Gestión de Seguridad de la Información)</li>
            <li>Registro en el RNBD (Registro Nacional de Bases de Datos)</li>
          </ul>
        </div>
      </>
    ),
  },
  {
    id: 'retencion',
    title: '7. Período de Retención de Datos',
    icon: FileText,
    content: (
      <>
        <p className="mb-4">
          Los datos personales se conservan durante los siguientes períodos:
        </p>
        
        <div className="space-y-3">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">📅 Datos de Reservas</h4>
            <p className="text-sm text-gray-600">
              <strong>Período:</strong> 5 años desde la fecha de check-out.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Razón:</strong> Cumplimiento de obligaciones fiscales y contables (Art. 630, Estatuto Tributario).
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">💳 Datos de Pagos</h4>
            <p className="text-sm text-gray-600">
              <strong>Período:</strong> 10 años desde la fecha de transacción.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Razón:</strong> Obligaciones tributarias y prevención de lavado de activos.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">👤 Datos de Huéspedes</h4>
            <p className="text-sm text-gray-600">
              <strong>Período:</strong> 5 años desde la última reserva o solicitud de supresión.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Razón:</strong> Historial de servicio al cliente y cumplimiento legal.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">🏨 Datos de Hoteles</h4>
            <p className="text-sm text-gray-600">
              <strong>Período:</strong> Mientras la suscripción esté activa + 90 días después de cancelación.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Razón:</strong> Período de gracia para reactivación de cuenta.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">📊 Datos de Analytics</h4>
            <p className="text-sm text-gray-600">
              <strong>Período:</strong> 26 meses (anonymizados después de 12 meses).
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Razón:</strong> Análisis de tendencias y mejora del servicio.
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-bold text-red-900 mb-2">🗑️ Eliminación de Datos</h4>
          <p className="text-sm text-red-800">
            Una vez vencido el período de retención, los datos serán eliminados de forma segura o anonymizados 
            de manera irreversible, impidiendo su re-identificación.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'cookies',
    title: '8. Uso de Cookies y Tecnologías de Seguimiento',
    icon: Globe,
    content: (
      <>
        <p className="mb-4">
          HospedaSuite utiliza cookies y tecnologías similares para mejorar la experiencia del usuario:
        </p>
        
        <div className="space-y-3">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-bold text-green-900 mb-2">🍪 Cookies Esenciales</h4>
            <p className="text-sm text-green-800">
              <strong>Finalidad:</strong> Autenticación, seguridad, preferencias de usuario.
            </p>
            <p className="text-xs text-green-700 mt-1">
              <strong>Obligatorias:</strong> No se pueden desactivar sin afectar el funcionamiento de la Plataforma.
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-2">📊 Cookies de Analytics</h4>
            <p className="text-sm text-blue-800">
              <strong>Finalidad:</strong> Analizar el uso de la Plataforma (PostHog).
            </p>
            <p className="text-xs text-blue-700 mt-1">
              <strong>Opcionales:</strong> Puedes desactivarlas en la configuración de tu navegador.
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-2">🎯 Cookies de Marketing</h4>
            <p className="text-sm text-purple-800">
              <strong>Finalidad:</strong> Personalizar anuncios y medir efectividad de campañas.
            </p>
            <p className="text-xs text-purple-700 mt-1">
              <strong>Opcionales:</strong> Puedes desactivarlas en la configuración de tu navegador.
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-bold text-gray-900 mb-2">⚙️ Cómo Gestionar Cookies</h4>
          <p className="text-sm text-gray-700 mb-2">
            Puedes configurar tu navegador para bloquear o eliminar cookies:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
            <li><strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies</li>
            <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies</li>
            <li><strong>Edge:</strong> Configuración → Cookies y permisos del sitio</li>
          </ul>
        </div>
      </>
    ),
  },
  {
    id: 'menores',
    title: '9. Tratamiento de Datos de Menores de Edad',
    icon: Users,
    content: (
      <>
        <p className="mb-3">
          HospedaSuite <strong>NO recopila intencionalmente datos personales de menores de 18 años</strong> 
          sin el consentimiento explícito de sus padres o representantes legales.
        </p>
        
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-bold text-yellow-900 mb-2">⚠️ Reserva de Menores</h4>
          <p className="text-sm text-yellow-800 mb-2">
            Si un huésped menor de edad realiza una reserva, el hotel debe obtener la autorización escrita 
            de los padres o tutores legales antes de registrar sus datos en la Plataforma.
          </p>
          <p className="text-xs text-yellow-700">
            <strong>Responsabilidad:</strong> El hotel es responsable de verificar la edad de los huéspedes y 
            obtener los consentimientos necesarios.
          </p>
        </div>

        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-bold text-red-900 mb-2">🚫 Eliminación de Datos de Menores</h4>
          <p className="text-sm text-red-800">
            Si descubrimos que hemos recopilado datos de un menor sin el consentimiento adecuado, 
            eliminaremos esos datos de inmediato. Si eres padre/madre o tutor y crees que tu hijo/a 
            nos ha proporcionado datos, contáctanos a <strong>soporte@hospedasuite.com</strong>.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'cambios',
    title: '10. Modificaciones a esta Política',
    icon: FileText,
    content: (
      <>
        <p className="mb-3">
          HospedaSuite se reserva el derecho de modificar esta Política de Tratamiento de Datos Personales 
          en cualquier momento, en cumplimiento del <strong>Artículo 9, literal h) de la Ley 1581 de 2012</strong>.
        </p>
        
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-bold text-blue-900 mb-2">📢 Notificación de Cambios</h4>
          <p className="text-sm text-blue-800 mb-2">
            En caso de modificaciones sustanciales que afecten los derechos de los titulares, notificaremos 
            a los usuarios con al menos <strong>30 días de anticipación</strong> a través de:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>Correo electrónico a la dirección registrada</li>
            <li>Aviso visible en la Plataforma</li>
            <li>Publicación en esta página con la fecha de actualización</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-bold text-gray-900 mb-2">📅 Historial de Versiones</h4>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex justify-between items-center">
              <span><strong>Versión 1.0</strong> — 3 de agosto de 2026</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Actual</span>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'contacto',
    title: '11. Contacto y Autoridad de Control',
    icon: Mail,
    content: (
      <>
        <p className="mb-4">
          Para cualquier consulta, solicitud o queja relacionada con el tratamiento de sus datos personales, 
          puede contactarnos a través de los siguientes canales:
        </p>
        
        <div className="space-y-3">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">📧 Correo Electrónico</h4>
            <p className="text-sm font-mono bg-gray-50 p-2 rounded">
              soporte@hospedasuite.com
            </p>
            <p className="text-xs text-gray-600 mt-2">
              <strong>Tiempo de respuesta:</strong> 10 días hábiles (Art. 14, Ley 1581/2012)
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">🏢 Dirección Física</h4>
            <p className="text-sm text-gray-700">
              HospedaSuite<br />
              Bogotá, Colombia<br />
              (Dirección pendiente de registro)
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-bold text-red-900 mb-2">⚖️ Autoridad de Control</h4>
          <p className="text-sm text-red-800 mb-2">
            Si considera que sus derechos no han sido atendidos, puede presentar una queja ante la:
          </p>
          <div className="bg-white p-3 rounded border border-red-300">
            <p className="font-bold text-gray-900">Superintendencia de Industria y Comercio (SIC)</p>
            <p className="text-sm text-gray-700 mt-1">
              Dirección: Carrera 13 No. 27-00, Bogotá D.C.<br />
              Teléfono: (57-1) 587 0000<br />
              Web: <a href="https://www.sic.gov.co" className="text-blue-600 hover:underline">www.sic.gov.co</a>
            </p>
          </div>
        </div>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  const [openSections, setOpenSections] = useState<string[]>(['introduccion']);

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HospedaSuite" width={32} height={32} />
            <span className="font-bold text-gray-900">HospedaSuite</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Política de Tratamiento de Datos Personales
          </h1>
          <p className="text-lg text-gray-600">
            En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Última actualización: 3 de agosto de 2026
          </p>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📑 Índice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setOpenSections([section.id]);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 text-sm text-left text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
              >
                <section.icon size={16} className="flex-shrink-0" />
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isOpen = openSections.includes(section.id);

            return (
              <div
                key={section.id}
                id={section.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-left">
                      {section.title}
                    </h3>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-gray-700 leading-relaxed">
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            © 2026 HospedaSuite. Todos los derechos reservados.
          </p>
          <p className="mt-2">
            Esta política cumple con la Ley 1581 de 2012, Decreto 1377 de 2013 y Ley 1266 de 2008.
          </p>
        </div>
      </div>
    </div>
  );
}
