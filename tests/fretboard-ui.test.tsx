import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { DEGREES, degreeAt, samePoint } from '../src/lib/fretboard';
import type { FretDegree, FretPoint } from '../src/lib/fretboard';
import { readProgress } from '../src/lib/progress';
vi.mock('../src/hooks/useAudio', () => ({ useAudio: () => vi.fn().mockResolvedValue(undefined) }));

async function openFretboard() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /指板定位/ }));
  return user;
}
function board() {
  return within(screen.getByRole('group', { name: '练习指板' }));
}
function pointFrom(text: string): FretPoint {
  const match = text.match(/([1-6])弦 · 第(\d+)品/)!;
  return { string: Number(match[1]), fret: Number(match[2]) };
}
function reference() {
  const degree = document.querySelector('.fret-known b')!.textContent as FretDegree;
  const point = pointFrom(document.querySelector('.fret-known small')!.textContent!);
  const open = [4, 11, 7, 2, 9, 4];
  const tonic = (((open[point.string - 1] + point.fret - DEGREES.indexOf(degree)) % 12) + 12) % 12;
  return { degree, point, tonic };
}
function locateButtons() {
  return board()
    .getAllByRole('button')
    .filter((b) => !(b as HTMLButtonElement).disabled);
}
function correctLocation() {
  const ref = reference();
  const target = document.querySelector('.fret-request strong')!.textContent;
  return locateButtons().find(
    (button) => degreeAt(ref.tonic, pointFrom(button.getAttribute('aria-label')!)) === target,
  )!;
}

describe('single-reference fretboard practice', () => {
  it('starts from a non-tonic reference, carries the found point onward and conceals all other notes', async () => {
    const user = await openFretboard();
    expect(reference().degree).not.toBe('1');
    expect(document.querySelectorAll('.fret-note')).toHaveLength(1);
    expect(screen.queryByText(/默写|根音品|看完整图/)).toBeNull();
    expect(locateButtons()).toHaveLength(5);
    const targetButton = correctLocation(),
      target = pointFrom(targetButton.getAttribute('aria-label')!);
    const degree = document.querySelector('.fret-request strong')!.textContent;
    expect(target.string).not.toBe(reference().point.string);
    await user.click(targetButton);
    expect(readProgress()?.fretboard?.['locate:natural']).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: `从 ${degree} 继续 →` }));
    expect(reference().point).toEqual(target);
    expect(reference().degree).toBe(degree);
    expect(document.querySelectorAll('.fret-note')).toHaveLength(1);
    expect(screen.getByText('第 2 / 10 题')).toBeTruthy();
  });
  it('records only the first click, requires correction and gives just one target when requested', async () => {
    const user = await openFretboard();
    const target = correctLocation();
    const wrong = locateButtons().find((button) => button !== target)!;
    await user.click(wrong);
    const first = readProgress()?.fretboard?.['locate:natural']?.[0];
    expect(first?.correct).toBe(false);
    expect(screen.queryByRole('button', { name: /从 .* 继续/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: '显示目标位置' }));
    expect(document.querySelectorAll('.fret-note')).toHaveLength(3);
    await user.click(target);
    expect(screen.getByText(/已找到 .*首次落点有误/)).toBeTruthy();
    expect(readProgress()?.fretboard?.['locate:natural']).toEqual([first]);
  });
  it('runs ten recognition questions with only a reference 1 and a question marker, and remembers all answers once', async () => {
    const user = await openFretboard();
    await user.click(screen.getByRole('button', { name: '认音' }));
    const targets = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const ref = reference();
      expect(ref.degree).toBe('1');
      const target = board().getByRole('button', { name: /待判断位置/ });
      const point = pointFrom(target.getAttribute('aria-label')!);
      targets.add(`${point.string}:${point.fret}`);
      expect(document.querySelectorAll('.fret-note')).toHaveLength(2);
      const answer = degreeAt(ref.tonic, point);
      fireEvent.keyDown(document.body, { key: answer });
      expect(screen.getByText(/✓ 判断正确/)).toBeTruthy();
      expect(readProgress()?.fretboard?.['recognize:natural']).toHaveLength(i + 1);
      await user.click(screen.getByRole('button', { name: i === 9 ? '查看本轮结果' : '下一题 →' }));
    }
    expect(targets.size).toBe(10);
    expect(screen.getByText('这一轮，完成了。')).toBeTruthy();
    expect(readProgress()?.fretboard?.['locate:natural']).toBeUndefined();
  });
  it('separates difficulty records, excludes hidden time and restores progress after reset', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const user = await openFretboard();
    const hidden = vi.spyOn(document, 'hidden', 'get');
    now.mockReturnValue(2000);
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    now.mockReturnValue(12000);
    hidden.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    now.mockReturnValue(13000);
    await user.click(correctLocation());
    expect(readProgress()?.fretboard?.['locate:natural']?.[0].time).toBe(2000);
    await user.selectOptions(screen.getByRole('combobox', { name: '指板难度' }), 'chromatic');
    now.mockReturnValue(14000);
    await user.click(correctLocation());
    expect(readProgress()?.fretboard?.['locate:chromatic']).toHaveLength(1);
    expect(readProgress()?.fretboard?.['locate:natural']).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '重置全部记录' }));
    expect(readProgress()?.fretboard).toBeUndefined();
    await user.click(screen.getByRole('button', { name: '恢复上次记录' }));
    expect(readProgress()?.fretboard?.['locate:chromatic']).toHaveLength(1);
    expect(readProgress()?.fretboard?.['locate:natural']).toHaveLength(1);
  });
});
