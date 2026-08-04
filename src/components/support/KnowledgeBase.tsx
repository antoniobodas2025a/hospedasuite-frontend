import { BookOpen, CreditCard, Settings, Shield, Calendar, HelpCircle } from 'lucide-react';

interface KBArticle {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  category: string;
}

const articles: KBArticle[] = [
  {
    title: 'Primeros Pasos',
    description: 'Guía completa para crear tu primer hotel y configurar las funciones básicas.',
    icon: <BookOpen className="w-6 h-6" />,
    href: '#getting-started',
    category: 'Inicio',
  },
  {
    title: 'Gestión de Habitaciones',
    description: 'Cómo crear, editar y gestionar el inventario de habitaciones de tu hotel.',
    icon: <Calendar className="w-6 h-6" />,
    href: '#rooms',
    category: 'Operaciones',
  },
  {
    title: 'Configuración de Pagos',
    description: 'Configura Wompi para recibir pagos por tarjeta de crédito y PSE.',
    icon: <CreditCard className="w-6 h-6" />,
    href: '#payments',
    category: 'Pagos',
  },
  {
    title: 'Apariencia y Branding',
    description: 'Personaliza los colores, logo y plantilla de tu página de hotel.',
    icon: <Settings className="w-6 h-6" />,
    href: '#appearance',
    category: 'Configuración',
  },
  {
    title: 'Política de Privacidad',
    description: 'Cumplimiento con Ley 1581 de 2012 y protección de datos personales.',
    icon: <Shield className="w-6 h-6" />,
    href: '/software/privacy',
    category: 'Legal',
  },
  {
    title: 'Soporte y Contacto',
    description: '¿Necesitas ayuda? Contáctanos o revisa nuestras preguntas frecuentes.',
    icon: <HelpCircle className="w-6 h-6" />,
    href: '#faq',
    category: 'Soporte',
  },
];

function ArticleCard({ article }: { article: KBArticle }) {
  return (
    <a
      href={article.href}
      className="block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          {article.icon}
        </div>
        <div className="flex-1">
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
            {article.category}
          </span>
          <h3 className="text-lg font-semibold text-gray-900 mt-1">{article.title}</h3>
          <p className="text-gray-600 mt-2 text-sm leading-relaxed">{article.description}</p>
        </div>
      </div>
    </a>
  );
}

export function KnowledgeBase() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Centro de Ayuda</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article, index) => (
          <ArticleCard key={index} article={article} />
        ))}
      </div>
    </section>
  );
}
