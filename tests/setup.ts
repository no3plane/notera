import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  location.hash = '';
});
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
