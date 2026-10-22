import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { exerciseBank } from '../src/lib/exercises';
import { readProgress } from '../src/lib/progress';

const { play } = vi.hoisted(() => ({ play: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/hooks/useAudio', () => ({ useAudio: () => play }));
function currentExercise() {
  const title = document.querySelector('.exercise-heading h2')?.textContent;
  return exerciseBank().find((e) => e.title === title)!;
}

describe('new exercise flows', () => {
  it('plays only the start note before a derivation answer, then reveals the target', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '推算音名' }));
    const e = currentExercise();
    expect(document.querySelector('.unknown-note')?.textContent).toBe('?');
    play.mockClear();
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(play).toHaveBeenCalledWith([e.notes[0]]);
    await user.click(
      within(screen.getByRole('group', { name: '选择答案' })).getByRole('button', {
        name: e.answer[0],
      }),
    );
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(screen.getByText(/✓ 回答正确/)).toBeTruthy();
    expect(document.querySelector('.unknown-note')).toBeNull();
    expect(readProgress()?.byKind?.['build-note']?.correct).toBe(1);
  });
  it('requires three tones, supports deselection and keeps wrong answers in scoped review', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /和弦对应/ }));
    await user.click(screen.getByRole('button', { name: '和弦名 → 构成音' }));
    const exercise = currentExercise();
    expect(exercise.answer).toHaveLength(3);
    const choices = within(screen.getByRole('group', { name: '选择三个构成音' }));
    expect(choices.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
    const wrong = exercise.choices.filter((v) => !exercise.answer.includes(v)).slice(0, 3);
    await user.click(choices.getByRole('button', { name: wrong[0] }));
    expect((screen.getByRole('button', { name: '确认答案 ↗' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await user.click(choices.getByRole('button', { name: wrong[0] }));
    expect(choices.getByRole('button', { name: wrong[0] }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    for (const value of wrong) await user.click(choices.getByRole('button', { name: value }));
    await user.click(screen.getByRole('button', { name: '确认答案 ↗' }));
    expect(readProgress()?.exerciseMistakes).toEqual([exercise.id]);
    await user.selectOptions(screen.getByRole('combobox', { name: '练习难度' }), 'review');
    expect(screen.getByText('第 1 / 1 题')).toBeTruthy();
    for (const value of exercise.answer)
      await user.click(
        within(screen.getByRole('group', { name: '选择三个构成音' })).getByRole('button', {
          name: value,
        }),
      );
    await user.click(screen.getByRole('button', { name: '确认答案 ↗' }));
    expect(readProgress()?.exerciseMistakes).toEqual([]);
    await user.click(screen.getByRole('button', { name: '查看本轮结果' }));
    expect(screen.getByText('这一轮，完成了。')).toBeTruthy();
  });
  it('limits number shortcuts to numbered tones when switching chord directions', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /和弦对应/ }));
    await user.click(screen.getByRole('button', { name: '和弦名 → 构成音' }));
    const exercise = currentExercise();
    const choices = within(screen.getByRole('group', { name: '选择三个构成音' }));
    const first = exercise.answer[0];
    const selected = () => choices.queryAllByRole('button', { pressed: true });

    for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'isComposing']) {
      fireEvent.keyDown(document.body, { key: first, [modifier]: true });
      expect(selected()).toHaveLength(0);
    }
    await user.click(screen.getByRole('combobox', { name: '练习难度' }));
    await user.keyboard(first);
    expect(selected()).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: '和弦名 → 构成音' }));

    await user.keyboard(first);
    const firstButton = choices.getByRole('button', { name: first });
    expect(firstButton.getAttribute('aria-keyshortcuts')).toBe(first);
    expect(firstButton.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(firstButton);
    fireEvent.keyDown(firstButton, { key: first, repeat: true });
    expect(firstButton.getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{Enter}');
    expect(
      within(screen.getByRole('region', { name: '和弦名 → 构成音练习' })).queryByRole('status'),
    ).toBeNull();
    await user.keyboard(first);
    expect(firstButton.getAttribute('aria-pressed')).toBe('false');

    for (const tone of exercise.answer) await user.keyboard(tone);
    expect(selected()).toHaveLength(3);
    await user.keyboard(exercise.choices.find((tone) => !exercise.answer.includes(tone))!);
    expect(selected()).toHaveLength(3);
    await user.keyboard('{Enter}');
    expect(screen.getByText(/✓ 回答正确/)).toBeTruthy();
    await user.keyboard(first);
    expect(selected()).toHaveLength(3);
    expect(readProgress()?.byKind?.['chord-tones-forward']?.correct).toBe(1);

    await user.keyboard('{Enter}');
    expect(screen.getByText('第 2 / 10 题')).toBeTruthy();
    expect(currentExercise().answer).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '构成音 → 和弦名' }));
    expect(screen.getByText('第 1 / 10 题')).toBeTruthy();
    const reverse = currentExercise();
    expect(reverse.answer).toHaveLength(1);
    const reverseChoices = within(screen.getByRole('group', { name: '选择答案' }));
    for (const button of reverseChoices.getAllByRole('button')) {
      expect(button.hasAttribute('aria-keyshortcuts')).toBe(false);
      expect(button.querySelector('kbd')).toBeNull();
    }
    await user.keyboard('1234567');
    expect(reverseChoices.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    const answer = reverseChoices.getByRole('button', {
      name: reverse.answer[0],
    });
    await user.click(answer);
    await user.keyboard('{Enter}');
    expect(screen.getByText(/✓ 回答正确/)).toBeTruthy();
    expect(readProgress()?.byKind?.['chord-tones-forward']?.correct).toBe(1);
    expect(readProgress()?.byKind?.['chord-tones-reverse']?.correct).toBe(1);
  });
  it.each(['和弦名 → 构成音', '构成音 → 和弦名'])(
    'keeps all ten turns in %s with the appropriate selection method',
    async (label) => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole('button', { name: /和弦对应/ }));
      await user.click(screen.getByRole('button', { name: label }));
      const forward = label === '和弦名 → 构成音';
      for (let i = 0; i < 10; i++) {
        const exercise = currentExercise();
        expect(exercise.kind).toBe(forward ? 'chord-tones-forward' : 'chord-tones-reverse');
        if (forward) {
          await user.keyboard(exercise.answer.join(''));
        } else {
          await user.click(
            within(screen.getByRole('group', { name: '选择答案' })).getByRole('button', {
              name: exercise.answer[0],
            }),
          );
        }
        await user.keyboard('{Enter}');
        expect(screen.getByText(/✓ 回答正确/)).toBeTruthy();
        await user.keyboard('{Enter}');
      }
      expect(screen.getByText('这一轮，完成了。')).toBeTruthy();
      expect(
        readProgress()?.byKind?.[forward ? 'chord-tones-forward' : 'chord-tones-reverse']?.correct,
      ).toBe(10);
    },
  );
  it('does not assign number shortcuts to chord names or Roman degrees in degree practice', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /和弦对应/ }));
    for (let i = 0; i < 2; i++) {
      const exercise = currentExercise();
      const choices = within(screen.getByRole('group', { name: '选择答案' }));
      await user.keyboard('1234567');
      expect(choices.queryAllByRole('button', { pressed: true })).toHaveLength(0);
      for (const button of choices.getAllByRole('button')) {
        expect(button.hasAttribute('aria-keyshortcuts')).toBe(false);
        expect(button.querySelector('kbd')).toBeNull();
      }
      await user.click(choices.getByRole('button', { name: exercise.answer[0] }));
      await user.keyboard('{Enter}{Enter}');
    }
    expect(readProgress()?.byKind?.['chord-degree']?.correct).toBe(2);
  });
  it('keeps a whole round in one type and exposes no retired or mixed modes', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByText(/混练|混合|^弦间关系$/)).toBeNull();
    await user.click(screen.getByRole('button', { name: /指板定位/ }));
    expect(screen.getByRole('region', { name: '指板定位练习' })).toBeTruthy();
    expect(screen.queryByText(/混练|混合|^弦间关系$/)).toBeNull();
    await user.click(screen.getByRole('button', { name: /和弦对应/ }));
    expect(screen.queryByText(/混练|混合|^弦间关系$/)).toBeNull();
    await user.click(screen.getByRole('button', { name: /音程推算/ }));
    await user.click(screen.getByRole('button', { name: '推算音名' }));
    for (let i = 0; i < 10; i++) {
      const exercise = currentExercise();
      expect(exercise.kind).toBe('build-note');
      await user.click(
        within(screen.getByRole('group', { name: '选择答案' })).getByRole('button', {
          name: exercise.answer[0],
        }),
      );
      await user.click(screen.getByRole('button', { name: '确认答案 ↗' }));
      await user.click(screen.getByRole('button', { name: i === 9 ? '查看本轮结果' : '下一题 →' }));
    }
    expect(screen.getByText('这一轮，完成了。')).toBeTruthy();
    expect(readProgress()?.total).toBe(10);
    expect(readProgress()?.byKind?.['build-note']?.total).toBe(10);
    expect(readProgress()?.byKind?.interval?.total).toBe(0);
  });
});
