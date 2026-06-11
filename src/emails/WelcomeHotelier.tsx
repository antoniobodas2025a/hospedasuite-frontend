import { Html, Head, Body, Container, Section, Text, Heading, Link, Button } from '@react-email/components';
import * as React from 'react';

interface WelcomeHotelierProps {
  hotelName: string;
  hotelSlug: string;
  ownerEmail: string;
  wompiConfigured: boolean;
}

export const WelcomeHotelier = ({ hotelName, hotelSlug, ownerEmail, wompiConfigured }: WelcomeHotelierProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hospedasuite.com';
  const publicUrl = `${baseUrl}/hotel/${hotelSlug}`;
  const bioUrl = `${baseUrl}/bio/${hotelSlug}`;

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', marginTop: '20px', maxWidth: '600px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>
            ¡Bienvenido a HospedaSuite!
          </Heading>
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            Hola, tu propiedad <strong>{hotelName}</strong> ya está activa en nuestro ecosistema.
          </Text>
          
          <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <Text style={{ margin: '0 0 10px 0', color: '#374151' }}>
              <strong>Tu Link Directo:</strong> <Link href={publicUrl}>{publicUrl}</Link>
            </Text>
            <Text style={{ margin: '0 0 10px 0', color: '#374151' }}>
              <strong>Link para Bio (Instagram/WhatsApp):</strong> <Link href={bioUrl}>{bioUrl}</Link>
            </Text>
          </Section>

          {!wompiConfigured && (
            <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <Text style={{ margin: '0 0 10px 0', color: '#991b1b', fontWeight: 'bold' }}>
                ⚠️ Importante: Configurá tu Pasarela de Pagos
              </Text>
              <Text style={{ margin: '0 0 10px 0', color: '#991b1b' }}>
                Para recibir pagos de tus huéspedes, necesitás conectar tu cuenta de Wompi.
                Sin esto, no podrás recibir reservas pagadas.
              </Text>
              <Button href={`${baseUrl}/dashboard`} style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', marginTop: '10px' }}>
                Ir al Dashboard
              </Button>
            </Section>
          )}

          <Section style={{ marginTop: '30px', textAlign: 'center' }}>
            <Link href={`${baseUrl}/dashboard`} style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>
              Gestionar mi Propiedad
            </Link>
          </Section>
          
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
            Este email fue enviado a {ownerEmail} por HospedaSuite.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeHotelier;
