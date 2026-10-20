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
    await user.click(screen.getByRole('button', { name: '和弦构成音' }));
    const exercise = currentExercise();
    expect(exercise.answer).toHaveLength(3);
    const choices = within(screen.getByRole('group', { name: '选择三个构成音' }));
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
