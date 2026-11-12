import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  history.replaceState(null, '', '/');
});
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
