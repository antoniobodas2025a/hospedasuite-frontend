import { describe, it, expect, beforeEach } from 'vitest';
import { registerHandler, getHandlers, getAllEventTypes } from '../event-handlers';

describe('event-handlers', () => {
  beforeEach(() => {
    // Clear registry before each test
    // Note: In a real implementation, you'd expose a clear() method
  });

  it('should register and retrieve handlers', () => {
    const handler = async () => {};
    registerHandler('booking.created', handler);
    
    const handlers = getHandlers('booking.created');
    expect(handlers).toContain(handler);
  });

  it('should return empty array for unregistered event', () => {
    const handlers = getHandlers('nonexistent.event' as never);
    expect(handlers).toEqual([]);
  });

  it('should support multiple handlers for same event', () => {
    const handler1 = async () => {};
    const handler2 = async () => {};
    
    registerHandler('payment.received', handler1);
    registerHandler('payment.received', handler2);
    
    const handlers = getHandlers('payment.received');
    expect(handlers).toHaveLength(2);
  });
});
