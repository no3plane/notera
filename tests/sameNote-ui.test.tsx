import { StrictMode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { readProgress } from '../src/lib/progress';

vi.mock('../src/hooks/useAudio', () => ({ useAudio: () => vi.fn().mockResolvedValue(undefined) }));
const OPEN = [4, 11, 7, 2, 9, 4];
function point(label: string) {
  const [, string, fret] = label.match(/([1-6])弦 · 第(\d+)品/)!;
  return { string: Number(string), fret: Number(fret) };
}
function locations() {
  const board = within(screen.getByRole('group', { name: '同音搬运指板' }));
  const ref = point(board.getByRole('button', { name: /参照音/ }).getAttribute('aria-label')!);
  const candidates = board.getAllByRole('button').filter((b) => !(b as HTMLButtonElement).disabled);
  const correct = candidates.find((b) => {
    const p = point(b.getAttribute('aria-label')!);
    return (OPEN[p.string - 1] + p.fret) % 12 === (OPEN[ref.string - 1] + ref.fret) % 12;
  })!;
  return { correct, wrong: candidates.find((b) => b !== correct)!, candidates, board };
}
async function open() {
  const user = userEvent.setup();
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  await user.click(screen.getByRole('button', { name: /指板定位/ }));
  await user.click(screen.getByRole('button', { name: '同音搬运' }));
  return user;
}
describe('same-note practice', () => {
  it('shows an unscored demo, conceals the answer and completes ten independently scored questions', async () => {
    const user = await open();
    expect(screen.getByText('先看一题示范 · 不计分')).toBeTruthy();
    expect(screen.getByRole('img', { name: /移动路径/ })).toBeTruthy();
    expect(readProgress()?.sameNote).toBeUndefined();
    await user.click(screen.getByRole('button', { name: '开始练习 →' }));
    for (let i = 0; i < 10; i++) {
      expect(screen.queryByRole('img', { name: /移动路径/ })).toBeNull();
      expect(document.querySelectorAll('.same-note-figure .fret-note')).toHaveLength(1);
      const { correct, candidates } = locations();
      expect(candidates).toHaveLength(5);
      expect(correct.getAttribute('aria-label')).not.toContain('答案');
      await user.click(correct);
      await user.click(correct);
      expect(screen.getByText(/✓ 独立找到了/)).toBeTruthy();
      expect(screen.getByRole('img', { name: /移动路径/ })).toBeTruthy();
      expect(readProgress()?.sameNote?.basic).toHaveLength(i + 1);
      await user.click(screen.getByRole('button', { name: i === 9 ? '查看本轮结果' : '下一题 →' }));
    }
    expect(screen.getByText('这一轮，完成了。')).toBeTruthy();
    expect(screen.getByText('本轮形状回顾')).toBeTruthy();
    expect(readProgress()?.sameNote?.basic?.every((a) => a.correct && !a.hint)).toBe(true);
    expect(readProgress()?.total).toBe(0);
    expect(readProgress()?.fretboard).toBeUndefined();
  });
  it('records hints, requires correction after a wrong answer and persists answer reveals without extra attempts', async () => {
    const user = await open();
    await user.click(screen.getByRole('button', { name: '开始练习 →' }));
    await user.click(screen.getByRole('button', { name: '提示' }));
    expect(screen.getByRole('note').textContent).toContain('借助提示');
    expect(screen.queryByRole('button', { name: /，答案 / })).toBeNull();
    await user.click(locations().correct);
    expect(readProgress()?.sameNote?.basic?.[0]).toMatchObject({ correct: true, hint: true });
    expect(screen.getByText(/✓ 借助提示找到了/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '下一题 →' }));
    const { correct, wrong } = locations();
    await user.click(wrong);
    expect(screen.queryByRole('button', { name: '下一题 →' })).toBeNull();
    expect(screen.queryByRole('img', { name: /移动路径/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: '显示答案' }));
    expect(readProgress()?.sameNote?.basic?.[0]).toMatchObject({
      correct: false,
      shownAnswer: true,
    });
    expect(readProgress()?.sameNote?.basic).toHaveLength(2);
    expect(screen.getByRole('button', { name: /，答案 / })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '下一题 →' })).toBeNull();
    await user.click(correct);
    expect(screen.getByText(/已按答案找到，首次落点有误/)).toBeTruthy();
    expect(readProgress()?.sameNote?.basic).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '下一题 →' }));
    const third = locations();
    await user.click(third.wrong);
    await user.click(third.correct);
    expect(screen.getByText(/已纠正，首次落点有误/)).toBeTruthy();
    expect(readProgress()?.sameNote?.basic?.[0]).toMatchObject({
      correct: false,
      shownAnswer: false,
    });
  });
  it('separates stages, pauses background timing, excludes feedback time and restores records after reset', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const user = await open();
    now.mockReturnValue(3000);
    await user.click(screen.getByRole('button', { name: '开始练习 →' }));
    const hidden = vi.spyOn(document, 'hidden', 'get');
    now.mockReturnValue(4000);
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    now.mockReturnValue(14000);
    hidden.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    now.mockReturnValue(15000);
    await user.click(locations().correct);
    expect(readProgress()?.sameNote?.basic?.[0].time).toBe(2000);
    now.mockReturnValue(30000);
    fireEvent.keyDown(document.body, { key: 'Enter' });
    now.mockReturnValue(30500);
    await user.click(locations().correct);
    expect(readProgress()?.sameNote?.basic?.[0].time).toBe(500);
    await user.selectOptions(screen.getByRole('combobox', { name: '同音搬运阶段' }), 'offset');
    expect(screen.getByText('先看一题示范 · 不计分')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '开始练习 →' }));
    await user.click(locations().correct);
    const saved = readProgress()?.sameNote;
    expect(saved?.offset).toHaveLength(1);
    expect(saved?.basic).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '重置全部记录' }));
    expect(readProgress()?.sameNote).toBeUndefined();
    await user.click(screen.getByRole('button', { name: '弦间音程' }));
    await user.click(screen.getByRole('button', { name: '恢复上次记录' }));
    expect(readProgress()?.sameNote).toEqual(saved);
    await user.click(screen.getByRole('button', { name: '同音搬运' }));
    expect(screen.getByRole('combobox', { name: '同音搬运阶段' })).toHaveProperty('value', 'basic');
    await user.click(screen.getByRole('button', { name: '开始练习 →' }));
    await user.click(locations().correct);
    expect(readProgress()?.sameNote?.basic).toHaveLength(3);
  });
});
