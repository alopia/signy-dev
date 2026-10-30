import { vi } from 'vitest';
import { EventLogger } from '../src';

describe('EventLogger', () => {
  it('logs only the types in filter', () => {
    const logger = new EventLogger({ filter: ['app:mount'] });
    logger.log('app:mount', 'a');
    logger.log('app:unmount', 'a');

    expect(logger.entries.map((e) => e.type)).toEqual(['app:mount']);
  });

  it('keeps the newest maxEntries entries', () => {
    const logger = new EventLogger({ maxEntries: 2 });
    logger.log('app:mount', 'a');
    logger.log('app:mount', 'b');
    logger.log('app:mount', 'c');

    expect(logger.entries.map((e) => e.name)).toEqual(['b', 'c']);
    expect(logger.count).toBe(2);
  });

  it('counts only the types and categories that were logged', () => {
    const logger = new EventLogger();
    logger.log('app:mount', 'a');
    logger.log('effect:run', 'e');
    logger.log('effect:run', 'e');

    expect(logger.getStats()).toEqual({
      totalEvents: 3,
      byType: { 'app:mount': 1, 'effect:run': 2 },
      byCategory: { app: 1, effect: 2 },
    });
  });

  it('exports circular and BigInt values', () => {
    const logger = new EventLogger();
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    logger.log('signal:write', 'Signal', { next: circular, big: 1n });

    const [entry] = JSON.parse(logger.export());

    expect(entry.data).toEqual({ next: { self: '[Circular]' }, big: '1n' });
  });

  it('prints to the console in the mode asked for', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    new EventLogger({ consoleOutput: 'minimal' }).log('app:mount', 'a', {
      id: 1,
    });
    new EventLogger({ consoleOutput: 'verbose' }).log('app:mount', 'b', {
      id: 2,
    });
    new EventLogger().log('app:mount', 'c');

    expect(log.mock.calls).toEqual([
      [expect.stringMatching(/ms \[app:mount\] a$/)],
      [expect.stringMatching(/ms \[app:mount\] b$/), { id: 2 }],
    ]);
  });

  it('records nothing while disabled', () => {
    const logger = new EventLogger();
    logger.enabled = false;
    logger.log('app:mount', 'a');

    expect(logger.count).toBe(0);
  });
});
