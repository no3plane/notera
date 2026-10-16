import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { NoteDisplay, NoteKeyboard } from '../src/components/NoteDisplay';
import { createConversionSession } from '../src/lib/conversion';
import { FORMAT_KEY } from '../src/lib/notation';
import { midi, name } from '../src/lib/theory';
import { ConversionPage } from '../src/pages/ConversionPage';
import { useConversion } from '../src/hooks/useConversion';

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
    await user.click(screen.getByRole('button', { name: '音符对应' }));
    await user.click(screen.getByRole('button', { name: '反应练习' }));
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
  it('supports accessible keyboard input and excludes black keys in natural mode', () => {
    const onPick = vi.fn();
    render(<NoteKeyboard note={{ letter: 'C', acc: 0, octave: 4 }} onPick={onPick} naturalOnly />);
    const white = screen.getByRole('button', { name: '白键，从左起第 3 个' });
    fireEvent.keyDown(white, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith({ letter: 'E', acc: 0, octave: 4 });
    fireEvent.click(screen.getByRole('button', { name: '黑键，从左起第 1 个' }));
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});

describe('conversion page', () => {
  it('answers with a piano key, shows all equivalents, and retains progress across navigation', async () => {
    const user = userEvent.setup();
    location.hash = '#conversion';
    render(<App />);
    await user.selectOptions(screen.getByLabelText('题目形式'), 'name');
    await user.selectOptions(screen.getByLabelText('作答形式'), 'piano');
    const prompt = document.querySelector('.conversion-prompt .note-symbol')!;
    const letter = prompt.textContent![0];
    const keyboard = screen.getByRole('group', { name: '选择对应琴键' });
    await user.click(
      within(keyboard).getByRole('button', {
        name: `白键，从左起第 ${'CDEFGAB'.indexOf(letter) + 1} 个`,
      }),
    );
    expect(screen.getByText(/✓ 对应正确/)).toBeTruthy();
    expect(document.querySelectorAll('.note-equivalents > div')).toHaveLength(4);
    const next = screen.getByRole('button', { name: '下一题 →' });
    expect(document.activeElement).toBe(next);
    await user.click(screen.getByRole('button', { name: '反应练习' }));
    await user.click(screen.getByRole('button', { name: '音符对应' }));
    expect(screen.getByText(/✓ 对应正确/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '下一题 →' }));
    expect(screen.getByText('第 2 / 12 题')).toBeTruthy();
    expect(document.querySelector('.is-selected')).toBeNull();
    await user.selectOptions(screen.getByLabelText('题目形式'), 'piano');
    expect((screen.getByLabelText('作答形式') as HTMLSelectElement).value).toBe('any');
    expect(screen.getByText('第 1 / 12 题')).toBeTruthy();
  });
  it('finishes a round through numbered shortcuts and offers a fresh round', async () => {
    const user = userEvent.setup();
    function Harness() {
      const controller = useConversion(true);
      return <ConversionPage controller={controller} play={vi.fn()} navigate={vi.fn()} />;
    }
    render(<Harness />);
    await user.selectOptions(screen.getByLabelText('作答形式'), 'name');
    for (let i = 0; i < 12; i++) {
      fireEvent.keyDown(document.body, { key: '1' });
      const next = screen.getByRole('button', { name: i === 11 ? '查看本轮结果' : '下一题 →' });
      await user.click(next);
    }
    expect(screen.getByRole('heading', { name: '又熟悉了一点。' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '再练一轮 →' }));
    expect(screen.getByText('第 1 / 12 题')).toBeTruthy();
  });
  it('marks wrong and correct options, locks scoring, and exposes useful answer labels', async () => {
    const user = userEvent.setup();
    const session = createConversionSession({ source: 'piano', target: 'solfege', level: 'flat' });
    const dispatch = vi.fn();
    const q = session.queue[0];
    const wrong = q.choices.find((n) => midi(n) !== midi(q.note))!;
    const { rerender } = render(
      <ConversionPage controller={{ session, dispatch }} play={vi.fn()} navigate={vi.fn()} />,
    );
    const choice = screen.getByRole('button', {
      name: new RegExp(`选项 ${q.choices.indexOf(wrong) + 1}：`),
    });
    expect(choice.getAttribute('aria-label')).toContain('中音');
    await user.click(choice);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'answer', note: wrong }));
    rerender(
      <ConversionPage
        controller={{
          session: { ...session, results: [{ answer: wrong, correct: false, time: 500 }] },
          dispatch,
        }}
        play={vi.fn()}
        navigate={vi.fn()}
      />,
    );
    expect(screen.getByText(/再记一次这个对应/)).toBeTruthy();
    expect(document.querySelector('.choice-correct')).toBeTruthy();
    expect(document.querySelector('.choice-wrong')).toBeTruthy();
    expect((choice as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('.note-equivalents')?.textContent).toContain(name(q.note));
  });
});
