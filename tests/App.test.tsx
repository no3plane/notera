import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { interval } from '../src/lib/theory';
import { PROGRESS_KEY, readProgress } from '../src/lib/progress';
import type { Note } from '../src/lib/types';

const { play } = vi.hoisted(() => ({ play: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/hooks/useAudio', () => ({ useAudio: () => play }));
beforeEach(() => {
  location.hash = '#practice';
  play.mockClear();
});
function displayedNotes(): [Note, Note] {
  const notes = [...document.querySelectorAll('.question-notes b')].map((el) => {
    const text = el.textContent!;
    return {
      letter: text[0] as Note['letter'],
      acc: text.includes('♯') ? 1 : text.includes('♭') ? -1 : 0,
      octave: Number(text.at(-1)),
    };
  });
  return [notes[0], notes[1]];
}
describe('reaction practice', () => {
  it('preserves DOM nodes, focus and the page wrapper while selecting answers', async () => {
    const user = userEvent.setup();
    render(<App />);
    const wrapper = document.querySelector('.page-enter');
    const notes = document.querySelector('.question-notes');
    const degree = screen.getByRole('button', { name: '五度' });
    const quality = screen.getByRole('button', { name: '增' });
    const submit = screen.getByRole('button', { name: '确认答案 ↗' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    await user.click(degree);
    await user.click(quality);
    expect(screen.getByRole('button', { name: '五度' })).toBe(degree);
    expect(document.activeElement).toBe(quality);
    expect(document.querySelector('.question-notes')).toBe(notes);
    expect(document.querySelector('.page-enter')).toBe(wrapper);
    expect(degree.getAttribute('aria-pressed')).toBe('true');
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByRole('button', { name: '给我一点提示' }));
    expect(document.querySelector('.page-enter')).toBe(wrapper);
    expect(screen.getByRole('button', { name: '五度' })).toBe(degree);
  });
  it('supports keyboard selection and preserves the current question when returning home', async () => {
    const user = userEvent.setup();
    render(<App />);
    const question = document.querySelector('.question-notes')!.textContent;
    fireEvent.keyDown(document.body, { key: '4', code: 'Digit4' });
    expect(screen.getByRole('button', { name: '四度' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' });
    expect(play).toHaveBeenCalledWith(displayedNotes());
    await user.click(screen.getByRole('link', { name: 'Notera 首页' }));
    expect(document.querySelector('.question-notes')!.textContent).toBe(question);
    expect(screen.getByRole('button', { name: '四度' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps existing stats under StrictMode and records a submission only once', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ total: 7, correct: 6, time: 23000, history: [], mistakes: [] }),
    );
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(readProgress()?.total).toBe(7);
    const [a, b] = displayedNotes(),
      answer = interval(a, b);
    await user.click(
      screen.getByRole('button', { name: `${'一二三四五六七八'[answer.degree - 1]}度` }),
    );
    await user.click(screen.getByRole('button', { name: answer.quality }));
    await user.click(screen.getByRole('button', { name: '确认答案 ↗' }));
    expect(readProgress()?.total).toBe(8);
    expect(readProgress()?.correct).toBe(7);
    expect(screen.getByText(/✓ 判断正确/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '下一题 →' }));
    expect((screen.getByRole('button', { name: '确认答案 ↗' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText('第 2 / 10 题')).toBeTruthy();
  });
  it.each(['', '#explore', '#conversion', '#learn'])('opens practice directly from %s', (hash) => {
    location.hash = hash;
    render(<App />);
    expect(location.hash).toBe('#practice');
    expect(screen.getByRole('region', { name: '音程反应练习' })).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText(/探索音程|音符对应|学习笔记|在指板上看看|去笔记里看看/)).toBeNull();
  });
});
