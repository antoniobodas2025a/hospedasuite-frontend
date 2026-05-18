import { AnyEvent, EventType } from './event-types';

type EventHandler = (event: AnyEvent) => Promise<void> | void;

// Registry: event type → array of handlers
const handlerRegistry: Map<EventType, EventHandler[]> = new Map();

export function registerHandler(
  eventType: EventType,
  handler: EventHandler
): void {
  const handlers = handlerRegistry.get(eventType) || [];
  handlers.push(handler);
  handlerRegistry.set(eventType, handlers);
}

export function getHandlers(eventType: EventType): EventHandler[] {
  return handlerRegistry.get(eventType) || [];
}

export function getAllEventTypes(): EventType[] {
  return Array.from(handlerRegistry.keys());
}
