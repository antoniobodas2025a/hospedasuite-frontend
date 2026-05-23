import type en from '../messages/en.json';

type Messages = typeof en;

declare global {
  // Use `type IntlMessages = typeof en` instead of `interface` for better performance with large message files
   
  type IntlMessages = Messages;
}
