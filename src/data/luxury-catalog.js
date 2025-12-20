// --- DATA MOCKEADA (LUXURY COPYWRITING) ---

export const LUXURY_CATALOG = [
  // --- VILLAS (STAY) ---
  {
    id: 'stay-01',
    category: 'STAY',
    title: 'Catedral de Silencio',
    tagline: 'Donde el tiempo se detiene y la privacidad es religión.',
    priceStartingAt: 850,
    image:
      'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?auto=format&fit=crop&w=800&q=80',
    isSecret: true,
    publicFeatures: [
      'Piscina Infinita Climatizada',
      'Arquitectura Brutalista',
      'Helipuerto',
    ],
    secretLocation: 'Coordenadas Ocultas, Cañón del Chicamocha',
    butlerName: 'Monsieur Laurent',
    exclusiveAmenities: [
      'Lencería de lino belga de 800 hilos',
      'Cava subterránea con Grand Cru Classé',
      'Sistema de sonido Devialet Phantom',
    ],
  },
  {
    id: 'stay-02',
    category: 'STAY',
    title: 'Oasis de Adobe',
    tagline: 'Arquitectura vernácula redefinida para el hedonismo moderno.',
    priceStartingAt: 1200,
    image:
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    isSecret: true,
    publicFeatures: [
      'Spa Termal Privado',
      'Jardines Xerofíticos',
      'Chef In-House',
    ],
    secretLocation: 'Reserva Privada, Villa de Leyva',
    butlerName: 'Ama de Llaves Matilde',
    exclusiveAmenities: [
      'Ducha exterior de lluvia monzónica',
      'Kit de rituales botánicos Santa Maria Novella',
      'Observatorio astronómico privado',
    ],
  },
  {
    id: 'stay-03',
    category: 'STAY',
    title: 'El Cubo de Vidrio',
    tagline: 'Invisibilidad total en medio del bosque de niebla.',
    priceStartingAt: 950,
    image:
      'https://images.unsplash.com/photo-1600596542815-27b88e542294?auto=format&fit=crop&w=800&q=80',
    isSecret: true,
    publicFeatures: ['Vista 360 Grados', 'Fire Pit Suspendido', 'Sin Vecinos'],
    secretLocation: 'Bosque Alto Andino, Cundinamarca',
    butlerName: 'Concierge Remoto 24/7',
    exclusiveAmenities: [
      'Telescopio Celestron Computerizado',
      'Bañera esculpida en piedra volcánica',
      'Menú de almohadas de seda',
    ],
  },
  // --- RITUALES (CURATOR) ---
  {
    id: 'rit-01',
    category: 'RITUAL',
    title: 'Pacto Eterno',
    tagline: 'La pedida de mano que reescribe su historia.',
    priceStartingAt: 2500,
    image:
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
    isSecret: true,
    publicFeatures: [
      'Locación Secreta',
      'Montaje Cinematográfico',
      'Fotografía Editorial',
    ],
    providers: [
      {
        role: 'Chef',
        name: 'Julián Martínez',
        specialty: 'Cocina de Autor / Maridaje Molecular',
      },
      {
        role: 'Música',
        name: 'Cuarteto de Cuerdas',
        specialty: 'Repertorio Clásico y Contemporáneo',
      },
    ],
    exclusiveAmenities: [
      'Floristería importada de Holanda',
      'Pirotecnia silenciosa',
      'Diamante Consulting',
    ],
  },
  {
    id: 'rit-02',
    category: 'RITUAL',
    title: 'Cena Clandestina',
    tagline: 'Gastronomía prohibida en ruinas coloniales.',
    priceStartingAt: 450,
    image:
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80',
    isSecret: true,
    publicFeatures: [
      'Menú 7 Tiempos',
      'Maridaje de Autor',
      'Acceso con Santo y Seña',
    ],
    providers: [
      {
        role: 'Sommelier',
        name: 'Camila V.',
        specialty: 'Vinos Naturales y Naranjas',
      },
    ],
    exclusiveAmenities: [
      'Vajilla de cerámica negra artesanal',
      'Iluminación exclusivamente con velas',
      'Jazz en vivo',
    ],
  },
];
