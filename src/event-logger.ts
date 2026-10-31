/**
 * EventLogger - Event Flow Tracking
 *
 * Logs and tracks events flowing through the application for debugging.
 *
 * @module signy-dev/event-logger
 */

import type {
  ApplicationLike,
  ComponentLike,
  SignalLike,
  EffectLike,
} from 'signy';
import { RingBuffer, now, safeStringify, withDefaults } from './helpers';

//=============================================
// Types
//=============================================

/**
 * Log entry for an event
 */
export interface EventLogEntry {
  readonly id: number;
  /** Milliseconds since page load, the same clock as the profiler */
  readonly timestamp: number;
  readonly type: EventType;
  readonly category: EventCategory;
  readonly name: string;
  readonly data?: unknown;
}

/**
 * Event types
 */
export type EventType =
  | 'component:create'
  | 'component:mount'
  | 'component:unmount'
  | 'component:render'
  | 'component:error'
  | 'signal:create'
  | 'signal:write'
  | 'effect:create'
  | 'effect:run'
  | 'effect:dispose'
  | 'computed:create'
  | 'computed:invalidate'
  | 'app:mount'
  | 'app:unmount';

/**
 * Event categories
 */
export type EventCategory =
  'component' | 'signal' | 'effect' | 'computed' | 'app';

/**
 * Event statistics
 */
export interface EventStats {
  readonly totalEvents: number;
  /** Only types that were logged have a key */
  readonly byType: Partial<Record<EventType, number>>;
  /** Only categories that were logged have a key */
  readonly byCategory: Partial<Record<EventCategory, number>>;
}

/**
 * Event logger options
 */
export interface EventLoggerOptions {
  /** Maximum number of entries to keep (default: 1000) */
  maxEntries?: number;

  /** Whether to log to console (default: false) */
  consoleOutput?: boolean | 'minimal' | 'verbose';

  /** Event types to filter (default: all) */
  filter?: EventType[];
}

//=============================================
// EventLogger Class
//=============================================

const DEFAULT_OPTIONS: Required<EventLoggerOptions> = {
  maxEntries: 1000,
  consoleOutput: false,
  filter: [],
};

/**
 * Event logger for debugging event flow through the application.
 */
export class EventLogger {
  private readonly _options: Required<EventLoggerOptions>;
  private readonly _entries: RingBuffer<EventLogEntry>;
  private _nextId = 1;
  private _enabled = true;

  constructor(options: EventLoggerOptions = {}) {
    this._options = withDefaults(DEFAULT_OPTIONS, options);
    this._entries = new RingBuffer(this._options.maxEntries);
  }

  //=============================================
  // Getters/Setters
  //=============================================

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  get entries(): readonly EventLogEntry[] {
    return this._entries.toArray();
  }

  get count(): number {
    return this._entries.size;
  }

  //=============================================
  // Logging Methods
  //=============================================

  /**
   * Log an event
   */
  log(type: EventType, name: string, data?: unknown): void {
    if (!this._enabled) return;

    // Check filter
    if (
      this._options.filter.length > 0 &&
      !this._options.filter.includes(type)
    ) {
      return;
    }

    const entry: EventLogEntry = {
      id: this._nextId++,
      timestamp: now(),
      type,
      category: type.split(':')[0] as EventCategory,
      name,
      data,
    };

    this._entries.push(entry);

    // Console output
    if (this._options.consoleOutput) {
      this._logToConsole(entry);
    }
  }

  /**
   * Log component creation
   */
  logComponentCreate(component: ComponentLike): void {
    this.log('component:create', component.name, {
      id: component.id,
    });
  }

  /**
   * Log component mount
   */
  logComponentMount(
    component: ComponentLike,
    target: Element | ShadowRoot
  ): void {
    this.log('component:mount', component.name, {
      id: component.id,
      target: target instanceof Element ? target.tagName : '#shadow-root',
    });
  }

  /**
   * Log component unmount
   */
  logComponentUnmount(component: ComponentLike): void {
    this.log('component:unmount', component.name, {
      id: component.id,
    });
  }

  /**
   * Log component render
   */
  logComponentRender(component: ComponentLike, duration: number): void {
    this.log('component:render', component.name, {
      id: component.id,
      duration: `${duration.toFixed(2)}ms`,
    });
  }

  /**
   * Log component error
   */
  logComponentError(component: ComponentLike, error: Error): void {
    this.log('component:error', component.name, {
      id: component.id,
      error: error.message,
    });
  }

  /**
   * Log signal creation
   */
  logSignalCreate(_signal: SignalLike, initialValue: unknown): void {
    this.log('signal:create', 'Signal', {
      value: initialValue,
    });
  }

  /**
   * Log signal write
   */
  logSignalWrite(
    _signal: SignalLike,
    prevValue: unknown,
    nextValue: unknown
  ): void {
    this.log('signal:write', 'Signal', {
      prev: prevValue,
      next: nextValue,
    });
  }

  /**
   * Log effect creation
   */
  logEffectCreate(effect: EffectLike): void {
    this.log('effect:create', effect.name ?? 'anonymous', {});
  }

  /**
   * Log effect run
   */
  logEffectRun(effect: EffectLike): void {
    this.log('effect:run', effect.name ?? 'anonymous', {});
  }

  /**
   * Log effect dispose
   */
  logEffectDispose(effect: EffectLike): void {
    this.log('effect:dispose', effect.name ?? 'anonymous', {});
  }

  /**
   * Log computed creation
   */
  logComputedCreate(_computed: SignalLike): void {
    this.log('computed:create', 'Computed', {});
  }

  /**
   * Log computed invalidation
   */
  logComputedInvalidate(_computed: SignalLike): void {
    this.log('computed:invalidate', 'Computed', {});
  }

  /**
   * Log application mount
   */
  logAppMount(app: ApplicationLike): void {
    this.log('app:mount', 'Application', { id: app.id });
  }

  /**
   * Log application unmount
   */
  logAppUnmount(app: ApplicationLike): void {
    this.log('app:unmount', 'Application', { id: app.id });
  }

  //=============================================
  // Query Methods
  //=============================================

  /**
   * Get entries by type
   */
  getByType(type: EventType): readonly EventLogEntry[] {
    return this._entries.toArray().filter((e) => e.type === type);
  }

  /**
   * Get entries by category
   */
  getByCategory(category: EventCategory): readonly EventLogEntry[] {
    return this._entries.toArray().filter((e) => e.category === category);
  }

  /**
   * Get entries in time range
   */
  getInTimeRange(start: number, end: number): readonly EventLogEntry[] {
    return this._entries
      .toArray()
      .filter((e) => e.timestamp >= start && e.timestamp <= end);
  }

  /**
   * Get statistics
   */
  getStats(): EventStats {
    const byType: Partial<Record<EventType, number>> = {};
    const byCategory: Partial<Record<EventCategory, number>> = {};

    const entries = this._entries.toArray();
    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] ?? 0) + 1;
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
    }

    return {
      totalEvents: entries.length,
      byType,
      byCategory,
    };
  }

  //=============================================
  // Utility Methods
  //=============================================

  /**
   * Clear all entries
   */
  clear(): void {
    this._entries.clear();
  }

  /**
   * Export entries as JSON. Values that JSON cannot hold, such as cycles and
   * BigInt, get a readable stand in.
   */
  export(): string {
    return safeStringify(this._entries.toArray());
  }

  //=============================================
  // Private Methods
  //=============================================

  private _logToConsole(entry: EventLogEntry): void {
    const prefix = `[${entry.type}]`;
    const time = `${entry.timestamp.toFixed(1)}ms`;

    if (this._options.consoleOutput === 'verbose') {
      console.log(`${time} ${prefix} ${entry.name}`, entry.data);
    } else {
      console.log(`${time} ${prefix} ${entry.name}`);
    }
  }
}
