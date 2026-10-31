/**
 * signy-dev - Development tools for Signy
 *
 * This package provides development tools for Signy applications:
 * - Inspector: view mounted components, signals, effects and apps
 * - Profiler: track mounts, renders, effect runs and timing
 * - Event logger: debug event flow
 * - Readable log messages, registered on import
 *
 * All tools integrate with Signy's feature registry, so they cost nothing
 * until you enable them.
 *
 * Importing this module automatically enables readable error messages
 * throughout Signy. Just import anywhere in your app:
 *
 * ```typescript
 * import 'signy-dev';
 * ```
 *
 * @module signy-dev
 *
 * @example
 * ```typescript
 * import { application } from 'signy';
 * import { enableDevTools } from 'signy-dev';
 * import { App } from './app';
 *
 * // Enable dev tools in development
 * if (import.meta.env.DEV) {
 *   const devTools = enableDevTools();
 *
 *   // Access individual tools
 *   console.log(devTools.profiler?.report());
 *   console.log(devTools.inspector?.getComponents());
 * }
 *
 * application(App).mount('#app');
 * ```
 */

import { features, initDevToolsHook, registerMessageResolver } from 'signy';
import type { DevFeature, LogMessage } from 'signy';
import { LOG_MESSAGES } from './log-messages';
import {
  createProfilerFeature,
  createInspectorFeature,
  createEventLoggerFeature,
  FEATURE_ID_PREFIX,
  type ProfilerFeatureOptions,
} from './features';
import { withDefaults } from './helpers';
import type { EventLogger, EventLoggerOptions } from './event-logger';
import type { Profiler } from './profiler';
import type { Inspector } from './inspector';

//=============================================
// Auto-register message resolver on module load
//=============================================

// This enables human-readable error messages throughout signy
// Just by importing signy-dev, all error messages become descriptive
registerMessageResolver((message: LogMessage) => LOG_MESSAGES[message] || '');

//=============================================
// Types
//=============================================

/**
 * Options for enabling dev tools
 */
export interface DevToolsOptions {
  /**
   * Enable the performance profiler (default: true)
   */
  profiler?: boolean | ProfilerFeatureOptions;

  /**
   * Enable the state inspector (default: true)
   */
  inspector?: boolean;

  /**
   * Enable the event logger (default: false)
   */
  eventLogger?: boolean | EventLoggerOptions;

  /**
   * Initialize the global DevTools hook for browser extensions (default: true)
   */
  globalHook?: boolean;
}

/**
 * DevTools instance with access to all enabled tools
 */
export interface DevToolsInstance {
  /** Performance profiler (if enabled) */
  readonly profiler?: Profiler;

  /** State inspector (if enabled) */
  readonly inspector?: Inspector;

  /** Event logger (if enabled) */
  readonly eventLogger?: EventLogger;

  /** Cleanup function to disable all dev tools */
  readonly cleanup: () => void;

  /** IDs of the features this call installed that are still installed */
  readonly installedFeatures: readonly string[];
}

//=============================================
// Default Options
//=============================================

const DEFAULT_OPTIONS: Required<DevToolsOptions> = {
  profiler: true,
  inspector: true,
  eventLogger: false,
  globalHook: true,
};

/** Cleanup of the last enableDevTools() call that is still active */
let activeCleanup: (() => void) | undefined;

//=============================================
// Main API
//=============================================

/**
 * Enable signy development tools.
 *
 * Installs profiler, inspector, and optionally event logger
 * as features in signy's feature registry.
 *
 * @param options - Configuration options
 * @returns DevTools instance with access to tools and cleanup function
 *
 * @example
 * ```typescript
 * // Basic usage - enable all default tools
 * const devTools = enableDevTools();
 *
 * // Check profiler report
 * console.log(devTools.profiler?.report());
 *
 * // Cleanup when done
 * devTools.cleanup();
 * ```
 *
 * @example
 * ```typescript
 * // Custom configuration
 * const devTools = enableDevTools({
 *   profiler: { prefix: 'my-app' },
 *   inspector: true,
 *   eventLogger: { consoleOutput: 'minimal' },
 * });
 * ```
 */
export function enableDevTools(
  options: DevToolsOptions = {}
): DevToolsInstance {
  // Replaces the previous call, so hot reload can run the setup again
  activeCleanup?.();

  const opts = withDefaults(DEFAULT_OPTIONS, options);
  // Features this call installed and that are still installed. Whoever
  // uninstalls one, it leaves the set, so cleanup() never removes a later
  // feature that reuses the id.
  const owned = new Set<string>();

  const cleanup = (): void => {
    for (const id of [...owned]) features.uninstall(id);
    if (activeCleanup === cleanup) activeCleanup = undefined;
  };

  const install = <T extends DevFeature>(feature: T): T => {
    features.install({
      ...feature,
      uninstall: () => {
        owned.delete(feature.id);
        feature.uninstall?.();
      },
    });
    owned.add(feature.id);
    return feature;
  };

  // Initialize global hook for browser extensions
  if (opts.globalHook) {
    initDevToolsHook();
  }

  let profiler: Profiler | undefined;
  let inspector: Inspector | undefined;
  let eventLogger: EventLogger | undefined;

  // All or nothing: a feature that fails to install, for example one already
  // installed by hand, takes back the ones installed before it
  try {
    if (opts.profiler) {
      const profilerOptions =
        typeof opts.profiler === 'object' ? opts.profiler : {};
      profiler = install(createProfilerFeature(profilerOptions)).profiler;
    }

    if (opts.inspector) {
      inspector = install(createInspectorFeature()).inspector;
    }

    if (opts.eventLogger) {
      const loggerOptions =
        typeof opts.eventLogger === 'object' ? opts.eventLogger : {};
      eventLogger = install(createEventLoggerFeature(loggerOptions)).logger;
    }
  } catch (error) {
    cleanup();
    throw error;
  }

  activeCleanup = cleanup;

  return {
    profiler,
    inspector,
    eventLogger,
    cleanup,
    get installedFeatures() {
      return [...owned];
    },
  };
}

/**
 * Disable all dev tools by uninstalling every signy-dev feature.
 *
 * Useful for cleanup in tests or when switching modes.
 */
export function disableDevTools(): void {
  // Not uninstallAll(): that also removes the DevTools hook bridge, which
  // initDevToolsHook() never reconnects.
  for (const id of features.installed) {
    if (id.startsWith(FEATURE_ID_PREFIX)) features.uninstall(id);
  }
}

//=============================================
// Re-exports
//=============================================

// Core classes for direct use
export {
  Profiler,
  type ProfilerOptions,
  type PerformanceMetric,
  type PerformanceReport,
  type PerformanceSummary,
  type MetricStats,
} from './profiler';
export {
  Inspector,
  type ComponentInfo,
  type SignalInfo,
  type EffectInfo,
  type AppInfo,
  type InspectorCounts,
  type ReactiveSnapshot,
} from './inspector';
export {
  EventLogger,
  type EventLogEntry,
  type EventLoggerOptions,
  type EventStats,
  type EventType,
  type EventCategory,
} from './event-logger';

// Feature creators for custom setups
export {
  createProfilerFeature,
  createInspectorFeature,
  createEventLoggerFeature,
  type ProfilerFeatureOptions,
} from './features';

// Log messages for custom usage. Read one with getLogMessage() from signy.
export { LOG_MESSAGES } from './log-messages';

/** Injected from package.json at build time. */
declare const __VERSION__: string;

export const VERSION = __VERSION__;
