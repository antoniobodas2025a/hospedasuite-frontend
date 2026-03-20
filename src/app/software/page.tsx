 'use client';
  import React, { useState, useEffect } from 'react';
  import { 
    Smartphone, 
    Globe, 
    Check, 
    ShieldCheck,
    LayoutGrid,
    Menu,
    X,
    ArrowUpRight
  } from 'lucide-react';

  const TIERS = {
    micro: {
      id: 'micro',
      label: '1-2 Habitaciones',
      shortLabel: '1-2 Hab.',
      title: 'Micro',
      price: '49.900',
      description: 'Para Glampings y Airbnb Pro.',
      features: ['Link Directo 0%', 'Motor Web 10%', 'PMS Incluido', 'Configuración lista para usar']
    },
    standard: {
      id: 'standard',
      label: '3-12 Habitaciones',
      shortLabel: '3-12 Hab.',
      title: 'Estándar',
      price: '89.900',
      description: 'El nuevo estándar para Hostales.',
      features: ['Todo lo de Micro', 'Soporte Prioritario', 'Carga de Tarifas Inicial']
    },
    pro: {
      id: 'pro',
      label: '13-30 Habitaciones',
      shortLabel: '13-30 Hab.',
      title: 'Pro',
      price: '179.900',
      description: 'Potencia total para Hoteles Boutique.',
      features: ['Todo lo de Estándar', 'Auditoría de Setup', 'Consultoría Inicial']
    }
  };

  export default function App() {
    const [scrolled, setScrolled] = useState(false);
    const [selectedTier, setSelectedTier] = useState('standard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
      const handleScroll = () => setScrolled(window.scrollY > 30);
      
      // Optimización: Solo escuchar mousemove en desktop para rendimiento
      const handleMouseMove = (e) => {
        requestAnimationFrame(() => {
          setMousePosition({ x: e.clientX, y: e.clientY });
        });
      };
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('mousemove', handleMouseMove);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }, []);

    const scrollTo = (id) => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    };

    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased selection:bg-[#007dfa]/20">
        
        {/* Ambient cursor glow - very subtle */}
        <div 
          className="fixed w-[600px] h-[600px] pointer-events-none z-0 transition-opacity duration-700 opacity-0 md:opacity-100"
          style={{
            background: 'radial-gradient(circle, rgba(0,125,250,0.08) 0%, transparent 60%)',
            left: mousePosition.x - 300,
            top: mousePosition.y - 300,
            transform: 'translate3d(0,0,0)', 
            willChange: 'left, top'
          }}
        />

        {/* Navigation - macOS style */}
        <nav className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-500
          ${scrolled ? 'bg-[#f5f5f7]/80 backdrop-blur-2xl border-b border-black/5 shadow-sm' : 'bg-transparent'}
        `}>
          <div className="max-w-[980px] mx-auto px-6 h-14 flex items-center justify-between">
            
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <img src="logo.jpg" alt="HospedaSuite Logo" className="w-7 h-7 rounded-lg object-cover shadow-sm" />
              <span className="font-semibold text-[17px] tracking-tight hidden sm:block">HospedaSuite</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => scrollTo('modelo')} 
                className="text-[13px] text-[#1d1d1f]/70 hover:text-[#1d1d1f] transition-colors duration-200 font-medium"
              >
                Ecosistema
              </button>
              <button 
                onClick={() => scrollTo('precios')} 
                className="text-[13px] text-[#1d1d1f]/70 hover:text-[#1d1d1f] transition-colors duration-200 font-medium"
              >
                Precios
              </button>
              <button 
                onClick={() => scrollTo('garantia')} 
                className="text-[13px] text-[#1d1d1f]/70 hover:text-[#1d1d1f] transition-colors duration-200 font-medium"
              >
                Garantía
              </button>
            </div>

            {/* CTA Button */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => scrollTo('precios')} 
                className="bg-[#007dfa] text-white px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-[#0051d5] transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
              >
                Iniciar Gratis
              </button>

              {/* Mobile Menu Toggle */}
              <button 
                className="md:hidden text-[#1d1d1f] p-1" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-[#f5f5f7]/95 backdrop-blur-3xl border-t border-black/5 absolute w-full shadow-xl">
              <div className="px-6 py-6 space-y-4">
                <button 
                  onClick={() => scrollTo('modelo')} 
                  className="block w-full text-left py-2 text-[17px] font-medium text-[#1d1d1f]"
                >
                  Ecosistema
                </button>
                <button 
                  onClick={() => scrollTo('precios')} 
                  className="block w-full text-left py-2 text-[17px] font-medium text-[#1d1d1f]"
                >
                  Precios
                </button>
                <button 
                  onClick={() => scrollTo('garantia')} 
                  className="block w-full text-left py-2 text-[17px] font-medium text-[#1d1d1f]"
                >
                  Garantía
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="relative pt-40 pb-20 px-6 z-10">
          <div className="max-w-[980px] mx-auto text-center">
            
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 mb-8 backdrop-blur-sm border border-black/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#1d1d1f]/60 tracking-wide uppercase">
                Nuevo Modelo Freemium 2026
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tighter mb-6 leading-[1.05] text-[#1d1d1f]">
              El PMS es Gratis <br />por 3 Meses.
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-[#1d1d1f]/70 max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
              Sin pagos de instalación. <strong>Instalación VIP (Lo hacemos por ti)</strong> y te incluimos en nuestra OTA.<br className="hidden sm:block"/>
              Disfruta 90 días gratis y deja que se pague solo.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => scrollTo('precios')}
                className="bg-[#007dfa] text-white px-8 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#0051d5] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
              >
                Reclamar mis 3 Meses Gratis
                <ArrowUpRight size={16} />
              </button>
              <button 
                onClick={() => scrollTo('modelo')}
                className="text-[#007dfa] px-8 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#007dfa]/5 transition-all duration-200"
              >
                Cómo funciona
              </button>
            </div>
          </div>
        </section>

        {/* Ecosystem Section */}
        <section id="modelo" className="py-24 px-6 relative z-10">
          <div className="max-w-[980px] mx-auto">
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-center mb-16">
              Un sistema. Dos motores.
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Link Directo Card */}
              <div className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 border border-black/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
                
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Smartphone size={22} className="text-[#1d1d1f]" strokeWidth={1.5} />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 tracking-tight">Link Directo</h3>
                  
                  <p className="text-[15px] text-[#1d1d1f]/60 mb-8 leading-relaxed">
                    Tu herramienta para WhatsApp. Envía el link, el cliente paga, y el inventario se bloquea.
                  </p>
                  
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-semibold tracking-tight">0%</span>
                    <span className="text-sm text-[#1d1d1f]/40 font-medium uppercase tracking-wide">Comisión</span>
                  </div>
                </div>
              </div>

              {/* PMS Central Card - Featured */}
              <div className="group bg-[#007dfa] rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden md:col-span-1">
                
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }} />
                
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"/>
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                      <LayoutGrid size={22} className="text-white" strokeWidth={1.5} />
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-3 tracking-tight text-white">PMS Central</h3>
                    
                    <p className="text-[15px] text-white/90 mb-8 leading-relaxed font-medium">
                      El cerebro de la operación. Controla tarifas, disponibilidad y huéspedes desde una sola pantalla.
                    </p>
                  </div>
                  
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full w-fit">
                    <span className="text-sm font-semibold text-white">3 Meses Gratis</span>
                    <span className="text-xs text-white/70 font-medium uppercase tracking-wide">Luego suscripción</span>
                  </div>
                </div>
              </div>

              {/* HospedaSuite.com Card */}
              <div className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 border border-black/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-bl from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
                
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Globe size={22} className="text-[#1d1d1f]" strokeWidth={1.5} />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 tracking-tight">HospedaSuite.com</h3>
                  
                  <p className="text-[15px] text-[#1d1d1f]/60 mb-8 leading-relaxed">
                    Publicación automática. Si estás en el PMS, estás visible al mundo. Nosotros traemos al huésped.
                  </p>
                  
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-semibold tracking-tight">10%</span>
                    <span className="text-sm text-[#1d1d1f]/40 font-medium uppercase tracking-wide">Comisión</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Pricing Section (Relative WITHOUT overflow-hidden para permitir el Sticky) */}
        <section id="precios" className="py-24 px-6 bg-white border-t border-black/5 relative">
          {/* Decorative background element aislado para evitar scroll horizontal */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-[#f5f5f7] to-transparent opacity-50" />
          </div>

          <div className="max-w-[980px] mx-auto relative z-10">
            
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-6">
                Empieza gratis hoy.
              </h2>
              <p className="text-lg text-[#1d1d1f]/60">Sin pagos de instalación. Tu suscripción inicia en 3 meses.</p>
            </div>
            
            {/* Contenedor que limita el área "Sticky" solo hasta terminar la tarjeta */}
            <div className="relative">
              {/* Tier Selector - Sticky & Mobile Optimized */}
              <div className="sticky top-[72px] z-50 flex justify-center mb-16 px-2 py-4 -mt-4 transition-all">
                <div className="inline-flex bg-[#f5f5f7]/90 backdrop-blur-xl p-1.5 rounded-full border border-black/10 max-w-full shadow-sm">
                  {Object.values(TIERS).map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className={`
                        px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[13px] font-medium transition-all duration-300
                        ${selectedTier === tier.id 
                          ? 'bg-white text-[#1d1d1f] shadow-md scale-100' 
                          : 'text-[#1d1d1f]/50 hover:text-[#1d1d1f]/80'}
                      `}
                    >
                      <span className="hidden sm:inline">{tier.label}</span>
                      <span className="sm:hidden">{tier.shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-[#f5f5f7] rounded-[2.5rem] p-8 sm:p-12 md:p-16 shadow-inner border border-white/50 relative overflow-hidden transition-all duration-500">
                
                <div className="absolute top-0 right-0 p-32 bg-white/40 blur-3xl rounded-full pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-12 relative z-10">
                  
                  {/* Left side - Details */}
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 bg-[#34c759] text-white px-3 py-1 rounded-full mb-6 shadow-sm">
                      <span className="text-[11px] font-bold tracking-wide uppercase">Prueba de 3 Meses</span>
                    </div>
                    
                    <h3 className="text-3xl sm:text-4xl font-semibold mb-3 tracking-tight text-[#1d1d1f]">
                      {TIERS[selectedTier].title}
                    </h3>
                    
                    <p className="text-[17px] text-[#1d1d1f]/60 mb-10 font-medium">
                      {TIERS[selectedTier].description}
                    </p>
                    
                    <div className="h-px bg-black/5 w-full mb-10" />

                    <ul className="space-y-4">
                      {TIERS[selectedTier].features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-3 text-[15px] text-[#1d1d1f]/80">
                          <div className="w-5 h-5 rounded-full bg-[#34c759]/20 flex items-center justify-center flex-shrink-0">
                            <Check size={12} className="text-[#34c759]" strokeWidth={3} />
                          </div>
                          <span className="font-medium">{feat}</span>
                        </li>
                      ))}
                      <li className="flex items-center gap-3 text-[15px] text-[#1d1d1f]/40 pt-2">
                        <ShieldCheck size={18} className="flex-shrink-0" strokeWidth={2} />
                        <span className="font-medium">Cancela en cualquier momento</span>
                      </li>
                    </ul>
                  </div>

                  {/* Right side - Price & CTA */}
                  <div className="md:text-right flex flex-col md:items-end">
                    <div className="flex items-start justify-start md:justify-end gap-1 mb-1">
                      <span className="text-2xl font-normal text-[#1d1d1f]/40 mt-3">$</span>
                      <span className="text-6xl sm:text-7xl lg:text-8xl font-semibold tracking-tighter text-[#1d1d1f]">
                        {TIERS[selectedTier].price}
                      </span>
                    </div>
                    
                    <p className="text-[13px] text-[#1d1d1f]/40 mb-10 font-medium">COP / mes (después de 3 meses)</p>
                    
                    <button className="w-full md:w-auto bg-[#1d1d1f] text-white px-10 py-5 rounded-full font-semibold text-[15px] hover:bg-black transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2">
                      Empezar 3 Meses Gratis
                      <ArrowUpRight size={16} className="text-white/60"/>
                    </button>

                    {/* Transparencia Wompi */}
                    <div className="mt-6 bg-[#007dfa]/5 border border-[#007dfa]/10 rounded-2xl p-4 text-left md:text-right max-w-xs">
                      <p className="text-[11px] text-[#1d1d1f]/70 leading-relaxed font-medium">
                        <span className="text-[#007dfa] font-bold">Transparencia Absoluta:</span> Para activar tu prueba, ingresas tu tarjeta de forma segura vía Wompi. <strong>No te cobraremos nada hoy.</strong> El cobro inicia en el mes 4. Cancela cuando quieras en 1 clic.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            {/* Fin del Contenedor Sticky */}

            {/* Complementos Opcionales (Upsells de financiamiento) */}
            <div className="mt-16 pt-16 border-t border-black/5">
              <div className="text-center mb-10">
                <h3 className="text-2xl font-semibold tracking-tight mb-2 text-[#1d1d1f]">Potencia tu lanzamiento (Opcional)</h3>
                <p className="text-[15px] text-[#1d1d1f]/60">Invierte una sola vez en este complemento para maximizar tus ventas desde el primer día.</p>
              </div>
              
              <div className="grid grid-cols-1 max-w-md mx-auto">
                {/* Fotografía */}
                <div className="bg-white p-8 rounded-[2rem] border border-black/5 shadow-sm hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-[#f5f5f7] w-12 h-12 rounded-xl flex items-center justify-center text-xl">📸</div>
                    <span className="text-[11px] font-bold tracking-wide uppercase text-[#34c759] bg-[#34c759]/10 px-3 py-1.5 rounded-full">Pago Único</span>
                  </div>
                  <h4 className="font-semibold text-xl mb-3 text-[#1d1d1f]">Pack Fotografía Profesional</h4>
                  <p className="text-[14px] text-[#1d1d1f]/60 mb-8 leading-relaxed">Los hoteles con imágenes de alta calidad venden un 40% más. Enviamos a un experto para fotografiar tus espacios y dejarlos impecables en tu Motor Web.</p>
                  <div className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">$450.000 <span className="text-[15px] font-normal text-[#1d1d1f]/40">COP</span></div>
                </div>
              </div>
            </div>
            
            {/* Fine Print / Garantía Hormozi */}
            <div id="garantia" className="mt-16 max-w-2xl mx-auto text-center">
              <div className="bg-gradient-to-r from-[#007dfa]/10 to-[#0051d5]/10 rounded-2xl p-6 border border-[#007dfa]/20">
                <p className="text-[#1d1d1f]/80 text-[14px] leading-relaxed font-medium">
                  <strong className="text-[#007dfa] block mb-2 text-base">Garantía de Extensión</strong>
                  Prueba HospedaSuite Gratis por 3 Meses. Y si durante estos 90 días no logramos generarte al menos 1 reserva a través de nuestro motor o OTA, <strong>te regalamos 3 meses adicionales gratis</strong> hasta que lo logremos.
                </p>
              </div>
              <p className="text-[#1d1d1f]/40 text-[12px] mt-6 leading-relaxed font-medium">
                El 10% de comisión solo aplica a ventas generadas por HospedaSuite.com. 
                Las ventas por Link Directo son 100% tuyas (costos bancarios aplican).
              </p>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 border-t border-black/5 bg-white">
          <div className="max-w-[980px] mx-auto px-6">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-2 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                <img src="logo.jpg" alt="HospedaSuite Logo" className="w-6 h-6 rounded-md object-cover" />
                <span className="font-semibold text-[15px] tracking-tight text-[#1d1d1f]">HospedaSuite</span>
              </div>
              <p className="text-[12px] text-[#1d1d1f]/40 font-medium">
                © 2026 HospedaSuite Inc. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }