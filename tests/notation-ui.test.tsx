import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { NoteDisplay } from '../src/components/NoteDisplay';
import { FORMAT_KEY } from '../src/lib/notation';

vi.mock('../src/hooks/useAudio', () => ({ useAudio: () => vi.fn().mockResolvedValue(undefined) }));
beforeEach(() => {
  location.hash = '#practice';
});

describe('notation interactions', () => {
  it('switches all formats without losing the question or answer and remembers the preference', async () => {
    const user = userEvent.setup();
    render(<App />);
    const original = document.querySelector('.question-notes')!.textContent;
    await user.click(screen.getByRole('button', { name: '四度' }));
    await user.click(screen.getByRole('button', { name: '大' }));
    for (const label of ['简谱', '唱名', '钢琴键盘', '音名']) {
      await user.click(screen.getByRole('button', { name: label }));
      expect(screen.getByRole('button', { name: label }).getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByRole('button', { name: '四度' }).getAttribute('aria-pressed')).toBe(
        'true',
      );
      expect(
        (screen.getByRole('button', { name: '确认答案 ↗' }) as HTMLButtonElement).disabled,
      ).toBe(false);
    }
    expect(document.querySelector('.question-notes')!.textContent).toBe(original);
    await user.click(screen.getByRole('button', { name: '简谱' }));
    expect(localStorage.getItem(FORMAT_KEY)).toBe('numbered');
    await user.click(screen.getByRole('link', { name: 'Notera 首页' }));
    expect(screen.getByRole('button', { name: '简谱' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '四度' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('renders octave dots and keeps C flat / B sharp visible on their actual keyboard octave', () => {
    const { rerender, container } = render(
      <NoteDisplay note={{ letter: 'C', acc: 0, octave: 3 }} format="numbered" />,
    );
    expect(container.querySelector('.octave-below')?.textContent).toBe('•');
    rerender(<NoteDisplay note={{ letter: 'C', acc: 0, octave: 5 }} format="solfege" />);
    expect(container.querySelector('.octave-above')?.textContent).toBe('•');
    rerender(
      <NoteDisplay note={{ letter: 'C', acc: -1, octave: 4 }} format="piano" showSpelling />,
    );
    expect(screen.getByText('按 C♭4 的拼写判断')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('C3 至 B3');
    expect(container.querySelectorAll('.is-selected')).toHaveLength(1);
    rerender(<NoteDisplay note={{ letter: 'B', acc: 1, octave: 4 }} format="piano" />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('C5 至 B5');
    expect(container.querySelectorAll('.is-selected')).toHaveLength(1);
  });
});
