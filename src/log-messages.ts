/**
 * Log message mappings for development mode.
 *
 * This module contains human-readable log messages that are only included
 * when signy-dev is imported. The entire module is tree-shaken in production
 * when signy-dev is not used.
 *
 * @module signy-dev/log-messages
 */

import type { LogMessage } from 'signy';

/**
 * Maps log message identifiers to human-readable messages.
 * Only included when signy-dev is imported.
 */
export const LOG_MESSAGES: Record<LogMessage, string> = {
  // Core Errors
  'core:defensive-check-failed':
    'Defensive check failed: an unexpected internal state was detected. This is likely a bug in Signy. Please report it at https://github.com/alopia/signy/issues',

  // Component Errors
  'component:app-required':
    'Component requires an Application context. Mount the root with application(App).mount() instead of new App().mount().',

  'component:mount-failed':
    'Failed to mount component. Target element not found or invalid.',

  'component:already-mounted':
    'Component is already mounted. Create a new instance instead.',

  'component:shadow-dom-not-supported':
    'Shadow DOM or adoptedStyleSheets is not supported in this environment. A component with shadow = true cannot attach a root, and CSSStyleSheet styles are skipped. Use string styles or turn shadow off.',

  'component:shadow-dom-attach-failed':
    'The host element cannot have a shadow root. Use an element that allows one, such as a div or a custom element, or turn shadow off.',

  // Context Errors
  'context:invalid-provider':
    'Invalid provider passed to Context.provide(). Expected a Component instance with a provide() method.',

  'context:invalid-consumer':
    'Invalid consumer passed to Context.inject(). Expected a Component instance with an inject() method.',

  // Application Errors
  'app:not-mounted': 'Application is not mounted.',

  'app:invalid-mount-target':
    'Invalid mount target. Must be a valid CSS selector or HTMLElement.',

  'app:invalid-state': 'Application is in an invalid state.',

  'app:not-found':
    'Application instance not found. Mount the root component with application(App).mount().',

  'app:element-reserved-prop':
    'defineElement() got a prop named like a property every element has, such as title, id or hidden. It would replace the native property. Pick another name.',

  'app:component-already-bound':
    'Component instance is already bound to another application. Create a new component instance for each app.',

  // Plugin/Installable Errors
  'installable:invalid': 'Invalid installable. Must have an install() method.',

  'installable:install-failed': 'Failed to install plugin or module.',

  'installable:already-installed': 'Plugin or module is already installed.',

  'installable:uninstall-failed':
    'The cleanup a plugin returned from install() threw. The other plugin cleanups still ran.',

  // Feature Registry
  'feature:installed': 'Dev feature installed.',

  'feature:uninstalled': 'Dev feature uninstalled.',

  'feature:already-installed':
    'A dev feature with this id is already installed. Uninstall it first or use another id.',

  'feature:uninstall-error':
    "Error occurred in a dev feature's uninstall() hook.",

  'feature:cleanup-error':
    'Error occurred while removing a dev feature handler.',

  'feature:handler-error':
    'A dev feature event handler threw. The error is logged and the app goes on.',

  'feature:devtools-init':
    'DevTools hook initialized. Browser extensions can connect through window.__SIGNY_DEVTOOLS_HOOK__.',

  // Reactivity Errors
  'reactivity:effect-error':
    'An effect threw. The error is logged and the other effects keep running.',

  'reactivity:effect-flush-exceeded':
    'Effect flush exceeded maximum iterations. This usually indicates an infinite loop where an effect modifies a signal it depends on.',

  'reactivity:effect-unowned':
    'effect() called outside a component or createRoot(). Nothing owns it, so it is never disposed.',

  'reactivity:cleanup-unowned':
    'onCleanup() called outside a component, effect or createRoot(). The cleanup will never run.',

  'reactivity:store-disposed': 'Cannot access disposed store.',

  'reactivity:store-unsafe-key':
    'A store write went through __proto__, which would swap a prototype. The write is refused.',

  'reactivity:signal-disposed': 'Cannot access disposed signal.',

  'reactivity:cleanup-error':
    'Error occurred during cleanup function execution.',

  'reactivity:map-duplicate-key':
    'mapByItem() got the same item, or key, twice. Both positions share one row, so its nodes show only once. Make items or keys unique.',

  // View Errors
  'view:lazy-no-default-export':
    'Lazy loaded module has no default export. Export the component class with `export default`.',

  'view:unsafe-attribute':
    'A binding tried to set an on* attribute from a string, a srcdoc, or a javascript:, vbscript: or non image data: URL. It is not set. Pass event handlers as functions.',

  'view:invalid-directive':
    'A use: directive got something that is neither a function nor [function, argument]. It did not run.',

  'view:invalid-binding':
    'A bind: binding needs a signal (or an object with a value) and the property value or checked. Nothing is bound.',

  'view:invalid-dynamic':
    'Dynamic got a component that is not a tag name or a function. Nothing is rendered. A function component must be wrapped: component=${() => MyFunction}.',

  'view:duplicate-key':
    'The key of a For list returned the same key for two items. Each still gets its own row, but keys should be unique.',

  'view:lazy-outside-suspense':
    'Lazy component rendered outside Suspense boundary. Wrap in <Suspense> for proper loading states.',

  // Router Errors
  'router:no-match': 'No route matches the given path.',

  'router:loader-failed': 'Route data loader failed to load data.',

  'router:not-installed':
    'Router not installed. Add it with application(App).use(router) before mount().',

  'router:route-not-found':
    'Named route not found. Check that the route name is correctly specified.',

  'router:redirect-loop':
    'Redirects kept redirecting past the limit of 10. Check the redirect and guard of each route for a cycle.',

  'router:navigation-error':
    'An error occurred during navigation. Check the navigation guards and loaders.',

  'router:external-path':
    'push() or replace() got a URL with a scheme or a host, such as javascript: or //example.com. The router only navigates inside the app. Use a link or window.location for other URLs.',
};
