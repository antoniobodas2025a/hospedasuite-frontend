import { Html, Head, Body, Container, Section, Text, Heading, Button } from '@react-email/components';
import * as React from 'react';

interface HotelRejectedProps {
  hotelName: string;
  rejectionReason: string;
}

export const HotelRejected = ({ hotelName, rejectionReason }: HotelRejectedProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hospedasuite.com';
  const supportUrl = `mailto:soporte@hospedasuite.com`;

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', marginTop: '20px', maxWidth: '600px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', textAlign: 'center' }}>
            ❌ Solicitud de hotel no aprobada
          </Heading>
          
          <Text style={{ fontSize: '16px', color: '#4b5563', marginTop: '20px' }}>
            Hola,
          </Text>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            Lamentamos informarte que la solicitud de <strong>{hotelName}</strong> no ha sido aprobada en este momento.
          </Text>
          
          <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <Text style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '14px', fontWeight: 'bold' }}>
              Motivo de la decisión:
            </Text>
            <Text style={{ margin: '0', color: '#991b1b', fontSize: '14px' }}>
              {rejectionReason}
            </Text>
          </Section>
          
          <Text style={{ fontSize: '16px', color: '4b5563' }}>
            <strong>¿Qué puedes hacer?</strong>
          </Text>
          
          <ul style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
            <li>Revisa el motivo indicado arriba</li>
            <li>Corrige los problemas mencionados</li>
            <li>Vuelve a enviar tu solicitud cuando esté lista</li>
          </ul>
          
          <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <Text style={{ margin: '0', color: '#1e40af', fontSize: '14px' }}>
              <strong>💡 Consejo:</strong> Si tienes dudas sobre cómo mejorar tu solicitud, contáctanos y te ayudaremos.
            </Text>
          </Section>
          
          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button 
              href={supportUrl} 
              style={{ 
                backgroundColor: '#3b82f6', 
                color: '#ffffff', 
                padding: '14px 28px', 
                borderRadius: '6px', 
                textDecoration: 'none', 
                fontWeight: 'bold', 
                display: 'inline-block',
                fontSize: '16px'
              }}
            >
              Contactar Soporte
            </Button>
          </Section>
          
          <Text style={{ fontSize: '14px', color: '#6b7280', marginTop: '20px' }}>
            Gracias por tu interés en HospedaSuite.
          </Text>
          
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
            © 2024 HospedaSuite. Todos los derechos reservados.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
