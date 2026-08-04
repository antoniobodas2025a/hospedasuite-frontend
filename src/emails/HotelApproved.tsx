import { Html, Head, Body, Container, Section, Text, Heading, Button } from '@react-email/components';
import * as React from 'react';

interface HotelApprovedProps {
  hotelName: string;
  hotelSlug: string;
}

export const HotelApproved = ({ hotelName, hotelSlug }: HotelApprovedProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hospedasuite.com';
  const hotelUrl = `${baseUrl}/hotel/${hotelSlug}`;
  const dashboardUrl = `${baseUrl}/dashboard`;

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', marginTop: '20px', maxWidth: '600px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', textAlign: 'center' }}>
            🎉 ¡Tu hotel ha sido aprobado!
          </Heading>
          
          <Text style={{ fontSize: '16px', color: '#4b5563', marginTop: '20px' }}>
            Hola,
          </Text>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            Nos complace informarte que <strong>{hotelName}</strong> ha sido aprobado y ya está activo en HospedaSuite.
          </Text>
          
          <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <Text style={{ margin: '0 0 10px 0', color: '#065f46', fontSize: '14px', fontWeight: 'bold' }}>
              ✅ Tu hotel está visible en:
            </Text>
            <Text style={{ margin: '0', color: '#065f46', fontSize: '14px' }}>
              <strong>URL pública:</strong> <a href={hotelUrl} style={{ color: '#059669' }}>{hotelUrl}</a>
            </Text>
          </Section>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            <strong>¿Qué sigue?</strong>
          </Text>
          
          <ul style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
            <li>Configura tu pasarela de pagos Wompi para recibir reservas</li>
            <li>Verifica que todas tus habitaciones tengan precios y fotos</li>
            <li>Personaliza tu perfil en el dashboard</li>
          </ul>
          
          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button 
              href={dashboardUrl} 
              style={{ 
                backgroundColor: '#10b981', 
                color: '#ffffff', 
                padding: '14px 28px', 
                borderRadius: '6px', 
                textDecoration: 'none', 
                fontWeight: 'bold', 
                display: 'inline-block',
                fontSize: '16px'
              }}
            >
              Ir al Dashboard
            </Button>
          </Section>
          
          <Text style={{ fontSize: '14px', color: '#6b7280', marginTop: '20px' }}>
            Si tienes alguna pregunta, contáctanos en soporte@hospedasuite.com
          </Text>
          
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
            © 2024 HospedaSuite. Todos los derechos reservados.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
