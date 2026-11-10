import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GuitarSusConnection } from '../src/components/GuitarSusConnection';

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }));
afterEach(() => vi.useRealTimers());

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

it('marks the target row in place while the playback cursor stays on the current measure', () => {
  render(<GuitarSusConnection root="E" />);
  expect((screen.getByRole('combobox', { name: '速度' }) as HTMLSelectElement).value).toBe('60');
  fireEvent.click(screen.getByRole('button', { name: '开始连接' }));
  const score = within(screen.getByRole('table', { name: '四小节节拍谱' }));
  const measure = (name: string) =>
    within(score.getByRole('rowheader', { name }).closest('tr')!).getAllByRole('cell');
  const d = measure('第 2 小节 D');
  const e = measure('第 3 小节 E');
  const a = measure('第 4 小节 A');
  expect(screen.getByText('预数四拍')).toBeTruthy();
  expect(score.getByRole('columnheader', { current: 'step' }).textContent).toBe('1');
  advance(3000);
  expect(score.getByRole('columnheader', { current: 'step' }).textContent).toBe('4');
  expect(score.queryByRole('cell', { current: 'step' })).toBeNull();
  advance(6000);

  const allCues: string[] = [];
  for (let i = 0; i < 4; i++) {
    expect(score.queryByText('挂上')).toBeNull();
    advance(1000);
    const enter = e.indexOf(score.getByText('挂上').closest('td')!);
    const release = e.indexOf(score.getByText('回原').closest('td')!);
    const chord = e[enter].querySelector('strong')?.textContent;
    allCues.push(`${enter}:${chord}:${release}`);
    expect(chord).toMatch(/^Esus[24]$/);
    expect(release - enter).toBeGreaterThanOrEqual(1);
    expect(release - enter).toBeLessThanOrEqual(2);
    expect(e[release].querySelector('strong')?.textContent).toBe('E');
    expect(e.filter((cell) => cell.hasAttribute('data-suspended'))).toEqual(
      e.slice(enter, release),
    );
    expect(score.getByRole('cell', { current: 'step' })).toBe(d[2]);
    advance(1000);
    expect(score.getByRole('cell', { current: 'step' })).toBe(d[3]);
    advance(1000);
    expect(screen.getByText(`第 ${i + 1} / 4 圈 · 第 3 小节`)).toBeTruthy();
    expect(score.getByRole('cell', { current: 'step' })).toBe(e[0]);
    expect(score.getByText('挂上').closest('td')).toBe(e[enter]);
    advance(enter * 1000);
    expect(score.getByRole('cell', { current: 'step' })).toBe(e[enter]);
    advance((release - enter) * 1000);
    expect(score.getByRole('cell', { current: 'step' })).toBe(e[release]);
    advance((4 - release) * 1000);
    expect(score.queryByText('挂上')).toBeNull();
    expect(score.getByRole('cell', { current: 'step' })).toBe(a[0]);
    if (i < 3) advance(9000);
  }
  expect(new Set(allCues).size).toBe(4);
  expect(allCues.filter((cue) => cue.includes('Esus2'))).toHaveLength(2);
  expect(allCues.filter((cue) => cue.includes('Esus4'))).toHaveLength(2);
  advance(4000);
  expect(screen.getByText('本轮连接完成')).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: '稳住了' }));
  fireEvent.click(screen.getByRole('radio', { name: '接上了' }));
  expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(2);
});

it('stops at once and resets the instruction before the next count-in', () => {
  render(<GuitarSusConnection root="A" />);
  fireEvent.change(screen.getByRole('combobox', { name: '速度' }), { target: { value: '120' } });
  fireEvent.click(screen.getByRole('button', { name: '开始连接' }));
  advance(5000);
  const score = within(screen.getByRole('table', { name: '四小节节拍谱' }));
  expect(score.getByText('挂上')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '停止节拍' }));
  advance(34_000);
  expect(score.queryByText('挂上')).toBeNull();
  expect(screen.queryByText('本轮连接完成')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '开始连接' }));
  expect(screen.getByText('预数四拍')).toBeTruthy();
  expect(score.queryByText('挂上')).toBeNull();
});
