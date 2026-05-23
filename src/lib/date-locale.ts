import { es, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';

/**
 * Returns the date-fns locale object matching the app's current locale.
 * Use in client components with useLocale() from next-intl.
 * 
 * @example
 * const appLocale = useLocale();
 * const dateLocale = getDateFnsLocale(appLocale);
 * format(date, 'dd MMM', { locale: dateLocale });
 */
export function getDateFnsLocale(appLocale: string): Locale {
  return appLocale === 'en' ? enUS : es;
}
