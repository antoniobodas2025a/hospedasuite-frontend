import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: '¿Cómo creo mi hotel en HospedaSuite?',
    answer: 'Regístrate con tu email, completa el onboarding de 5 pasos (datos del hotel, habitaciones, precios, fotos y configuración de pagos). Tu hotel estará activo en menos de 10 minutos.',
  },
  {
    question: '¿Cuánto cuesta usar HospedaSuite?',
    answer: 'Ofrecemos un plan gratuito de 14 días para probar todas las funciones. Después, el plan básico comienza en $49,000 COP/mes con todas las funciones incluidas.',
  },
  {
    question: '¿Cómo configuro los pagos con Wompi?',
    answer: 'En Configuración > Pagos, ingresa tu llave pública de Wompi y tu secreto de integridad. HospedaValida la configuración automáticamente y podrás recibir pagos por tarjeta de crédito y PSE.',
  },
  {
    question: '¿Puedo personalizar la apariencia de mi hotel page?',
    answer: 'Sí. En Configuración > Apariencia puedes cambiar el color primario, subir tu logo y seleccionar entre múltiples plantillas. Los cambios se reflejan inmediatamente.',
  },
  {
    question: '¿Cómo gestiono las reservas?',
    answer: 'Ve a tu Dashboard > Reservas para ver todas las reservas activas. Puedes cambiar el estado (confirmada, check-in, check-out), enviar vouchers por email y gestionar pagos.',
  },
  {
    question: '¿HospedaSuite cumple con la Ley 1581 de protección de datos?',
    answer: 'Sí. Cumplimos completamente con la Ley 1581 de 2012 y el Decreto 1377 de 2013. Todos los datos de usuarios están protegidos, tenemos audit trail de consentimientos y ofrecemos eliminación de datos bajo solicitud.',
  },
  {
    question: '¿Cómo contacto soporte técnico?',
    answer: 'Puedes escribirnos a soporte@hospedasuite.com o usar el formulario de contacto en esta página. Respondemos en menos de 24 horas hábiles.',
  },
  {
    question: '¿Puedo cancelar mi suscripción en cualquier momento?',
    answer: 'Sí. No hay permanencia. Puedes cancelar desde Configuración > Suscripción. Tu acceso se mantendrá hasta el final del período facturado.',
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  return (
    <details className="group border border-gray-200 rounded-lg">
      <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
        <span className="font-medium text-gray-900 pr-4">{item.question}</span>
        <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform flex-shrink-0" />
      </summary>
      <div className="px-4 pb-4 text-gray-600 leading-relaxed">
        {item.answer}
      </div>
    </details>
  );
}

export function FAQ() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas Frecuentes</h2>
      <div className="space-y-3">
        {faqData.map((item, index) => (
          <FAQAccordion key={index} item={item} />
        ))}
      </div>
    </section>
  );
}
