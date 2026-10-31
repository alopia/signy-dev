import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    restoreMocks: true,
    environment: 'jsdom',
    setupFiles: ['test/support/setup.ts'],
    include: ['test/**/*.test.ts'],
    // test/leaks.test.ts calls gc()
    execArgv: ['--expose-gc'],
  },
});
