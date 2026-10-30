/**
 * Dev Features
 *
 * Feature wrappers that integrate Profiler, Inspector, and EventLogger
 * with signy's feature registry.
 *
 * @module signy-dev/features
 */

import type { DevFeature, FeatureContext } from 'signy';
import { Profiler, type ProfilerOptions } from './profiler';
import { Inspector } from './inspector';
import { EventLogger, type EventLoggerOptions } from './event-logger';

/** Prefix of every feature id signy-dev installs. */
export const FEATURE_ID_PREFIX = 'signy-dev:';

//=============================================
// Profiler Feature
//=============================================

/**
 * Options for the profiler feature
 */
export type ProfilerFeatureOptions = ProfilerOptions;

/**
 * Creates a profiler feature for the feature registry.
 *
 * Tracks component mounts, unmounts and render timings, signal writes and
 * effect runs.
 *
 * @param options - Profiler options
 * @returns Feature with access to the profiler instance
 */
export function createProfilerFeature(
  options: ProfilerFeatureOptions = {}
): DevFeature & { profiler: Profiler } {
  const profiler = new Profiler(options);

  return {
    id: `${FEATURE_ID_PREFIX}profiler`,
    name: 'Performance Profiler',
    profiler,

    install(ctx: FeatureContext) {
      ctx.onLifecycle({
        onMount: (component, _target) => {
          profiler.trackComponentMount(component);
        },
        onUnmount: (component) => {
          profiler.trackComponentUnmount(component);
        },
        onRender: (component, duration) => {
          profiler.trackComponentRender(component, duration);
        },
      });

      ctx.onReactivity({
        onSignalWrite: (signal) => {
          profiler.trackSignalWrite(signal);
        },
        onEffectRun: (effect) => {
          profiler.trackEffectRun(effect);
        },
      });
    },

    uninstall() {
      profiler.clear();
    },
  };
}

//=============================================
// Inspector Feature
//=============================================

/**
 * Creates an inspector feature for the feature registry.
 *
 * Tracks mounted components, signals, effects and applications for
 * inspection.
 *
 * @returns Feature with access to the inspector instance
 */
export function createInspectorFeature(): DevFeature & {
  inspector: Inspector;
} {
  const inspector = new Inspector();

  return {
    id: `${FEATURE_ID_PREFIX}inspector`,
    name: 'State Inspector',
    inspector,

    install(ctx: FeatureContext) {
      // Registered on mount, not create: a component that never mounts never
      // unmounts either, so it would stay listed forever.
      ctx.onLifecycle({
        onMount: (component) => {
          inspector.registerComponent(component);
        },
        onUnmount: (component) => {
          inspector.unregisterComponent(component);
        },
      });

      ctx.onReactivity({
        onSignalCreate: (signal, initialValue) => {
          inspector.registerSignal(signal, initialValue);
        },
        onSignalWrite: (signal, _prevValue, nextValue) => {
          inspector.trackSignalWrite(signal, nextValue);
        },
        onEffectCreate: (effect) => {
          inspector.registerEffect(effect);
        },
        onEffectRun: (effect) => {
          inspector.trackEffectRun(effect);
        },
        onEffectDispose: (effect) => {
          inspector.unregisterEffect(effect);
        },
      });

      ctx.onApp({
        onMount: (app) => {
          inspector.registerApp(app);
        },
        onUnmount: (app) => {
          inspector.unregisterApp(app);
        },
      });
    },

    uninstall() {
      inspector.clear();
    },
  };
}

//=============================================
// EventLogger Feature
//=============================================

/**
 * Creates an event logger feature for the feature registry.
 *
 * Logs all events flowing through the application for debugging.
 *
 * @param options - EventLogger options
 * @returns Feature with access to the event logger instance
 */
export function createEventLoggerFeature(
  options: EventLoggerOptions = {}
): DevFeature & { logger: EventLogger } {
  const eventLogger = new EventLogger(options);

  return {
    id: `${FEATURE_ID_PREFIX}event-logger`,
    name: 'Event Logger',
    logger: eventLogger,

    install(ctx: FeatureContext) {
      ctx.onLifecycle({
        onCreate: (component) => {
          eventLogger.logComponentCreate(component);
        },
        onMount: (component, target) => {
          eventLogger.logComponentMount(component, target);
        },
        onUnmount: (component) => {
          eventLogger.logComponentUnmount(component);
        },
        onRender: (component, duration) => {
          eventLogger.logComponentRender(component, duration);
        },
        onError: (component, error) => {
          eventLogger.logComponentError(component, error);
        },
      });

      ctx.onReactivity({
        onSignalCreate: (signal, initialValue) => {
          eventLogger.logSignalCreate(signal, initialValue);
        },
        onSignalWrite: (signal, prevValue, nextValue) => {
          eventLogger.logSignalWrite(signal, prevValue, nextValue);
        },
        onEffectRun: (effect) => {
          eventLogger.logEffectRun(effect);
        },
        onEffectDispose: (effect) => {
          eventLogger.logEffectDispose(effect);
        },
        onEffectCreate: (effect) => {
          eventLogger.logEffectCreate(effect);
        },
        onComputedCreate: (computed) => {
          eventLogger.logComputedCreate(computed);
        },
        onComputedInvalidate: (computed) => {
          eventLogger.logComputedInvalidate(computed);
        },
      });

      ctx.onApp({
        onMount: (app) => {
          eventLogger.logAppMount(app);
        },
        onUnmount: (app) => {
          eventLogger.logAppUnmount(app);
        },
      });
    },

    uninstall() {
      eventLogger.clear();
    },
  };
}
