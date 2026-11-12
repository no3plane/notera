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

it('shows the whole plan before starting and keeps it visible while only the cursor advances', () => {
  render(<GuitarSusConnection root="E" />);
  expect((screen.getByRole('combobox', { name: '速度' }) as HTMLSelectElement).value).toBe('60');
  const plan = screen.getByRole('table', { name: '整轮挂留安排' });
  const plannedRows = within(plan).getAllByRole('row').slice(1);
  expect(plannedRows.map((row) => row.textContent)).toEqual([
    '第 1 圈第 1 拍换 Esus2第 3 拍恢复 E',
    '第 2 圈第 1 拍换 Esus4第 3 拍恢复 E',
    '第 3 圈第 2 拍换 Esus2第 4 拍恢复 E',
    '第 4 圈第 2 拍换 Esus4第 4 拍恢复 E',
  ]);
  const writtenPlan = plan.textContent;
  const score = within(screen.getByRole('table', { name: '四小节节拍谱' }));
  const target = score.getByRole('rowheader', { name: '第 3 小节 E' }).closest('tr')!;
  const cells = within(target).getAllByRole('cell');
  const firstMeasure = score.getByRole('rowheader', { name: '第 1 小节 A' }).closest('tr')!;
  const lastMeasure = score.getByRole('rowheader', { name: '第 4 小节 A' }).closest('tr')!;
  expect(score.getByText('挂上').closest('td')).toBe(cells[0]);
  expect(score.getByText('恢复').closest('td')).toBe(cells[2]);
  expect(cells[0].textContent).toContain('Esus2');

  fireEvent.click(screen.getByRole('button', { name: '开始节拍' }));
  expect(screen.getByText('预数四拍')).toBeTruthy();
  expect(score.getByRole('columnheader', { current: 'step' }).textContent).toBe('1');
  advance(4000);

  for (let i = 0; i < 4; i++) {
    expect(plan.textContent).toBe(writtenPlan);
    expect(within(firstMeasure).getByRole('cell', { current: 'step' })).toBeTruthy();
    const enter = i < 2 ? 0 : 1;
    const release = i < 2 ? 2 : 3;
    const chord = `Esus${i % 2 ? 4 : 2}`;
    // Both instructions are already on the score before reaching the target measure.
    expect(score.getByText('挂上').closest('td')).toBe(cells[enter]);
    expect(score.getByText('恢复').closest('td')).toBe(cells[release]);
    expect(cells[enter].textContent).toContain(chord);
    expect(cells[release].querySelector('strong')?.textContent).toBe('E');
    advance(8000);
    expect(score.getByRole('cell', { current: 'step' })).toBe(cells[0]);
    expect(within(plan).getByRole('row', { current: 'step' })).toBe(plannedRows[i]);
    advance(4000);
    expect(within(lastMeasure).getByRole('cell', { current: 'step' })).toBeTruthy();
    expect(score.getByText('挂上').closest('td')).toBe(cells[enter]);
    advance(4000);
  }
  expect(plan.textContent).toBe(writtenPlan);
  expect(screen.getByText('本轮连接完成')).toBeTruthy();
  expect(screen.queryByRole('group', { name: '连接自评' })).toBeNull();
  expect(screen.getByRole('button', { name: '再练一轮' })).toBeTruthy();
});

it('keeps the written plan unchanged when stopping, changing tempo, and restarting', () => {
  render(<GuitarSusConnection root="A" />);
  const plan = screen.getByRole('table', { name: '整轮挂留安排' });
  const writtenPlan = plan.textContent;
  const score = screen.getByRole('table', { name: '四小节节拍谱' });
  const initialScore = score.textContent;
  expect(writtenPlan).toContain('Asus2');
  expect(writtenPlan).toContain('Asus4');
  fireEvent.change(screen.getByRole('combobox', { name: '速度' }), { target: { value: '120' } });
  expect(plan.textContent).toBe(writtenPlan);
  fireEvent.click(screen.getByRole('button', { name: '开始节拍' }));
  advance(5000);
  fireEvent.click(screen.getByRole('button', { name: '停止节拍' }));
  advance(34_000);
  expect(plan.textContent).toBe(writtenPlan);
  expect(score.textContent).toBe(initialScore);
  expect(screen.queryByText('本轮连接完成')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '开始节拍' }));
  expect(screen.getByText('预数四拍')).toBeTruthy();
  expect(plan.textContent).toBe(writtenPlan);
  expect(score.textContent).toBe(initialScore);
});
