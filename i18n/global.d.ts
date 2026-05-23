import type en from '../messages/en.json';

type Messages = typeof en;

declare global {
  // Use `type IntlMessages = typeof en` instead of `interface` for better performance with large message files
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  type IntlMessages = Messages;
}
