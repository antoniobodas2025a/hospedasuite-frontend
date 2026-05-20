import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Locales soportados
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];

// Locale por defecto
export const defaultLocale: Locale = 'es';

export default getRequestConfig(async () => {
  // Leer locale de la cookie (seteada por el middleware)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

  // Validar que sea un locale soportado
  const locale: Locale = locales.includes(localeCookie as Locale)
    ? (localeCookie as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
