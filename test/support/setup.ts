import { afterEach } from 'vitest';
import { features } from 'signy';
import { assertNoUnexpectedLogs, installConsoleGuard } from './console';
import { unmountAll } from './mount';

installConsoleGuard();

afterEach(() => {
  unmountAll();
  for (const id of features.installed) {
    if (id.startsWith('signy-dev:')) features.uninstall(id);
  }
  document.body.innerHTML = '';
  performance.clearMarks();
  performance.clearMeasures();
  assertNoUnexpectedLogs();
});
