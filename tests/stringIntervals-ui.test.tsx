import { StrictMode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { stringInterval } from '../src/lib/stringIntervals';
import * as stringQuestions from '../src/lib/stringIntervals';
import { readProgress } from '../src/lib/progress';
vi.mock('../src/hooks/useAudio', () => ({ useAudio: () => vi.fn().mockResolvedValue(undefined) }));

function current() {
  const text = document.querySelector('.string-route')!.getAttribute('aria-label')!;
  const [, from, to] = text.match(/([1-6]) 弦到 ([1-6]) 弦/)!;
  return stringInterval({ from: Number(from), to: Number(to) });
}
async function open() {
  const user = userEvent.setup();
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  await user.click(screen.getByRole('button', { name: /指板定位/ }));
  return user;
}
describe('string interval practice', () => {
  it('removes the memory map and toggles standard open-string labels without changing the question or answer', async () => {
    const user = await open();
    expect(screen.queryByRole('button', { name: /弦间关系图/ })).toBeNull();
    expect(screen.queryByRole('region', { name: '弦间关系记忆图' })).toBeNull();
    const toggle = screen.getByRole('switch', { name: '显示空弦音名' });
    expect((toggle as HTMLInputElement).checked).toBe(true);
    for (const [i, note] of ['E', 'B', 'G', 'D', 'A', 'E'].entries()) {
      expect(screen.getByText(`${i + 1} 弦 · ${note}`)).toBeTruthy();
    }
    const route = document.querySelector('.string-route')!;
    const degree = within(screen.getByRole('group', { name: '选择度数' })).getByRole('button', {
      name: '三度',
    });
    await user.click(degree);
    const saved = readProgress();
    await user.click(toggle);
    expect((toggle as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByText('2 弦 · B')).toBeNull();
    expect(screen.getByText('2 弦', { selector: 'text' })).toBeTruthy();
    expect(document.querySelector('.string-route')).toBe(route);
    expect(degree.getAttribute('aria-pressed')).toBe('true');
    expect(readProgress()).toEqual(saved);
    await user.click(screen.getByRole('button', { name: '认音' }));
    expect(screen.queryByRole('switch', { name: '显示空弦音名' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '弦间音程' }));
    const restoredToggle = screen.getByRole('switch', { name: '显示空弦音名' });
    expect((restoredToggle as HTMLInputElement).checked).toBe(false);
    await user.click(restoredToggle);
    expect(screen.getByText('2 弦 · B')).toBeTruthy();
    expect(localStorage.getItem('notera-string-open-notes')).toBe('true');
  });
  it('opens first, completes a balanced round and records each answer once', async () => {
    const user = await open();
    const tabs = within(screen.getByRole('group', { name: '指板题型' })).getAllByRole('button');
    expect(tabs.map((b) => b.textContent)).toEqual(['弦间音程', '同音搬运', '认音', '找音接力']);
    expect(tabs[0].getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('combobox', { name: '指板难度' })).toBeNull();
    expect(
      within(screen.getByRole('group', { name: '选择度数' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['一度', '二度', '三度', '四度', '五度', '六度', '七度']);
    expect(screen.queryByText(/超过八度保留|记作纯十五度/)).toBeNull();
    expect(
      screen.getByRole('img', { name: /弦间音程指板：起点 .*终点 .*同在第 3 品/ }),
    ).toBeTruthy();
    for (let i = 0; i < 10; i++) {
      const expected = current();
      const qualities = within(screen.getByRole('group', { name: '选择性质' }));
      const degrees = within(screen.getByRole('group', { name: '选择度数' }));
      const quality = qualities.getByRole('button', { name: expected.quality });
      const degree = degrees.getByRole('button', { name: expected.title.slice(1) });
      // Either row can be chosen first; a partial selection must not score.
      await user.click(i % 2 ? degree : quality);
      expect(readProgress()?.stringIntervals?.length ?? 0).toBe(i);
      await user.click(i % 2 ? quality : degree);
      await user.click(quality);
      expect(
        within(screen.getByRole('region', { name: '指板定位练习' })).getByRole('status')
          .textContent,
      ).toContain(`是${expected.title}`);
      expect(readProgress()?.stringIntervals).toHaveLength(i + 1);
      await user.click(screen.getByRole('button', { name: i === 9 ? '查看本轮结果' : '下一题 →' }));
    }
    expect(screen.getByText('这一轮，完成了。')).toBeTruthy();
    const history = readProgress()!.stringIntervals!;
    expect(history.filter((a) => a.correct)).toHaveLength(10);
    expect(history.filter((a) => a.from > a.to)).toHaveLength(5);
    expect(readProgress()?.fretboard).toBeUndefined();
    expect(readProgress()?.total).toBe(0);
    await user.click(screen.getByRole('button', { name: '再练一轮 →' }));
    expect(screen.getByText('第 1 / 10 题')).toBeTruthy();
    expect(readProgress()?.stringIntervals).toHaveLength(10);
  });
  it('reveals wrong answers, excludes background and feedback time, and resets/restores all records', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const user = await open();
    const hidden = vi.spyOn(document, 'hidden', 'get');
    now.mockReturnValue(2000);
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    now.mockReturnValue(12000);
    hidden.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    now.mockReturnValue(13000);
    const expected = current();
    const qualities = within(screen.getByRole('group', { name: '选择性质' }));
    const degrees = within(screen.getByRole('group', { name: '选择度数' }));
    await user.click(qualities.getByRole('button', { name: expected.quality }));
    expect(readProgress()?.stringIntervals).toBeUndefined();
    await user.click(qualities.getByRole('button', { name: '增' }));
    expect(readProgress()?.stringIntervals).toBeUndefined();
    await user.click(degrees.getByRole('button', { name: expected.title.slice(1) }));
    expect(
      within(screen.getByRole('region', { name: '指板定位练习' })).getByRole('status').textContent,
    ).toContain(`是${expected.title}`);
    expect(readProgress()?.stringIntervals?.[0]).toMatchObject({ correct: false, time: 2000 });
    expect(qualities.getAllByRole('button').every((b) => (b as HTMLButtonElement).disabled)).toBe(
      true,
    );
    expect(degrees.getAllByRole('button').every((b) => (b as HTMLButtonElement).disabled)).toBe(
      true,
    );
    expect(qualities.getByRole('button', { name: '增' }).getAttribute('aria-pressed')).toBe('true');
    expect(
      qualities.getByRole('button', { name: expected.quality }).getAttribute('aria-pressed'),
    ).toBe('false');
    now.mockReturnValue(20000);
    fireEvent.keyDown(document.body, { key: 'Enter' });
    now.mockReturnValue(20500);
    const second = current();
    expect(
      qualities.getAllByRole('button').every((b) => b.getAttribute('aria-pressed') === 'false'),
    ).toBe(true);
    await user.click(qualities.getByRole('button', { name: second.quality }));
    await user.click(degrees.getByRole('button', { name: second.title.slice(1) }));
    expect(readProgress()?.stringIntervals?.[0]).toMatchObject({ correct: true, time: 500 });
    const saved = readProgress()?.stringIntervals;
    await user.click(screen.getByRole('button', { name: '认音' }));
    expect(screen.getByRole('group', { name: '选择指板级数' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '重置全部记录' }));
    expect(readProgress()?.stringIntervals).toBeUndefined();
    await user.click(screen.getByRole('button', { name: '恢复上次记录' }));
    expect(readProgress()?.stringIntervals).toEqual(saved);
    await user.click(screen.getByRole('button', { name: '弦间音程' }));
    expect(screen.getByText('第 1 / 10 题')).toBeTruthy();
    expect(readProgress()?.stringIntervals).toEqual(saved);
  });
  it('scores B to D as a minor third and D to B as a major sixth without physical up/down wording', async () => {
    vi.spyOn(stringQuestions, 'createStringRound').mockReturnValue([
      { from: 2, to: 4 },
      { from: 4, to: 2 },
      ...Array.from({ length: 8 }, () => ({ from: 6, to: 1 })),
    ]);
    const user = await open();
    expect(
      screen.getByRole('heading', { name: '以起点音为 1，终点音是什么音程关系？' }),
    ).toBeTruthy();
    expect(screen.queryByText(/从高到低|从低到高|上下行进度/)).toBeNull();
    const degrees = within(screen.getByRole('group', { name: '选择度数' }));
    const qualities = within(screen.getByRole('group', { name: '选择性质' }));
    await user.click(degrees.getByRole('button', { name: '三度' }));
    await user.click(qualities.getByRole('button', { name: '小' }));
    expect(readProgress()?.stringIntervals?.[0]).toMatchObject({
      from: 2,
      to: 4,
      answer: '小三度',
      correct: true,
      rule: 'pitch-class',
    });
    expect(screen.getByText(/✓ 判断正确，是小三度/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '下一题 →' }));
    await user.click(qualities.getByRole('button', { name: '大' }));
    await user.click(degrees.getByRole('button', { name: '六度' }));
    expect(readProgress()?.stringIntervals?.[0]).toMatchObject({
      from: 4,
      to: 2,
      answer: '大六度',
      correct: true,
    });
  });
});
