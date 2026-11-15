import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import { ChordConnectionPractice } from '../src/components/ChordConnectionPractice';
import { connectionStorageKey, readConnectionProgress } from '../src/lib/connectionPractice';
import { CHORD_NAVIGATION_KEY } from '../src/lib/chordPracticeNavigation';
import { LAST_PRACTICE_KEY } from '../src/lib/practiceNavigation';

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const choose = (name: string, value: string) =>
  fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });
const openPlan = () =>
  fireEvent.click(screen.getByText(/查看整轮挂留安排/, { selector: 'summary' }));
const score = () => screen.getByRole('table', { name: '四小节节拍谱' });
beforeEach(() => {
  localStorage.setItem(
    connectionStorageKey('triad'),
    JSON.stringify({ settings: { suspensionVersion: 0 } }),
  );
  localStorage.setItem(
    connectionStorageKey('seventh'),
    JSON.stringify({ settings: { suspensionVersion: 0 } }),
  );
});
afterEach(() => vi.useRealTimers());

it('writes a connected phrase with several altered bars and follows its exact beats during playback', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  render(<ChordConnectionPractice />);
  expect(screen.queryByRole('button', { name: '换一组变化' })).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: '加入挂留变化' }));
  openPlan();
  const plan = screen.getByRole('table', { name: '整轮挂留安排' });
  const rows = within(plan).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(4);
  const written = plan.textContent;
  expect(written).toContain('Csus4');
  expect(written).toContain('Gsus2');
  expect(written).toContain('整小节保持');
  expect(written).toContain('连续换色');
  expect(written).toContain('主题');
  expect(written).toContain('展开');
  expect(written).toContain('Csus2');
  const firstScore = score().textContent;
  choose('预览圈次', '1');
  expect(score().textContent).toContain('Gsus2');
  click('开始节拍');
  expect(screen.getByText('预数四拍')).toBeTruthy();
  expect(score().textContent).toBe(firstScore);
  expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: '换一组变化' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  act(() => vi.advanceTimersByTime(4000));
  expect(within(score()).getByRole('cell', { current: 'step' }).getAttribute('aria-label')).toBe(
    '第 1 拍，挂上 Csus4',
  );
  act(() => vi.advanceTimersByTime(2000));
  expect(within(score()).getByRole('cell', { current: 'step' }).getAttribute('aria-label')).toBe(
    '第 3 拍，恢复 C',
  );
  act(() => vi.advanceTimersByTime(14000));
  expect(plan.textContent).toBe(written);
  expect(within(plan).getByRole('row', { current: 'step' })).toBe(rows[1]);
  expect(score().textContent).toContain('Gsus2');
  click('停止节拍');
  choose('速度', '80');
  choose('预览圈次', '0');
  expect(plan.textContent).toBe(written);
  expect(score().textContent).toBe(firstScore);
  click('开始节拍');
  expect(plan.textContent).toBe(written);
});

it('changes a group only on request and restores it together with the checkbox after reopening', () => {
  const view = render(<ChordConnectionPractice />);
  fireEvent.click(screen.getByRole('checkbox', { name: '加入挂留变化' }));
  openPlan();
  const written = screen.getByRole('table', { name: '整轮挂留安排' }).textContent;
  click('换一组变化');
  const changed = screen.getByRole('table', { name: '整轮挂留安排' }).textContent;
  expect(changed).not.toBe(written);
  choose('循环圈数', '8');
  expect(
    within(screen.getByRole('table', { name: '整轮挂留安排' })).getAllByRole('row'),
  ).toHaveLength(9);
  choose('循环圈数', '4');
  expect(screen.getByRole('table', { name: '整轮挂留安排' }).textContent).toBe(changed);
  view.unmount();
  render(<ChordConnectionPractice />);
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  openPlan();
  expect(screen.getByRole('table', { name: '整轮挂留安排' }).textContent).toBe(changed);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.queryByText(/查看整轮挂留安排/)).toBeNull();
  expect(score().textContent).not.toContain('sus');
});

it('preserves sevenths across richer colours and uses numeric-only names in the score and written plan', () => {
  render(<ChordConnectionPractice family="seventh" />);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(score().textContent).toContain('G7sus2');
  expect(score().textContent).toContain('Cmaj7sus2');
  openPlan();
  choose('连接显示', 'degrees');
  expect(score().textContent).toContain('5⁷sus2');
  expect(score().textContent).not.toContain('G7');
  const plan = screen.getByRole('table', { name: '整轮挂留安排' });
  expect(plan.textContent).not.toContain('G7');
  expect(plan.textContent).toContain('5⁷sus2');
  choose('连接显示', 'names');
  fireEvent.click(screen.getByText(/查看本轮指法/, { selector: 'summary' }));
  expect(screen.getByRole('img', { name: /^G7sus4 指法/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: '试听 G7sus4' })).toBeTruthy();
  choose('G7 本轮按法', '5');
  expect(screen.getByRole('img', { name: /^G7sus4 指法/ }).getAttribute('aria-label')).toContain(
    '第 6 弦不弹',
  );
});

it('keeps the minor dominant seventh in its suspension and avoids the half-diminished chord', () => {
  render(<ChordConnectionPractice family="seventh" />);
  click(/选择和弦进行/);
  click('小调进行');
  click('小调 251 小调收束');
  fireEvent.click(screen.getByRole('checkbox'));
  const score = screen.getByRole('table', { name: '连接节拍谱' });
  expect(score.textContent).toContain('E7sus4');
  expect(score.textContent).toContain('Bm7♭5');
  expect(score.textContent).not.toContain('Bsus');
  choose('连接调性', 'G');
  expect(score.textContent).toContain('B7sus4');
  expect(within(score).getByRole('rowheader', { name: '第 2 小节 B7' })).toBeTruthy();
  expect(within(score).queryByRole('rowheader', { name: '第 2 小节 E7' })).toBeNull();
});

it.each(['link', 'last-practice', 'saved-navigation'])(
  'migrates the old %s entry to the integrated exercise with its old timing settings',
  (entry) => {
    localStorage.setItem(
      connectionStorageKey('sus'),
      JSON.stringify({ settings: { key: 'A', tempo: 80, loops: 2 } }),
    );
    if (entry === 'link') history.replaceState(null, '', '/?practice=sus-connection&task=resolve');
    if (entry === 'last-practice') localStorage.setItem(LAST_PRACTICE_KEY, 'sus-connection');
    if (entry === 'saved-navigation') {
      localStorage.setItem(
        CHORD_NAVIGATION_KEY,
        JSON.stringify({ mode: 'sus-connection', task: 'resolve' }),
      );
      localStorage.setItem(LAST_PRACTICE_KEY, 'sus-connection');
    }
    render(<App />);
    expect(screen.getByRole('button', { name: '和弦连接', pressed: true })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '挂留与解决' })).toBeNull();
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByLabelText('本轮进行').textContent).toBe('D → G → A → D');
    expect(readConnectionProgress('triad').settings).toMatchObject({
      suspensions: true,
      tempo: 80,
      loops: 2,
    });
    expect(new URLSearchParams(location.search).get('practice')).toBe('chord-connection');
    expect(new URLSearchParams(location.search).get('task')).toBe('connection');
  },
);

it('keeps the integrated practice available when browser storage is blocked', () => {
  const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  try {
    render(<ChordConnectionPractice />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(score().textContent).toContain('sus');
    expect(screen.getByText(/浏览器暂时无法保存设置/)).toBeTruthy();
  } finally {
    get.mockRestore();
    set.mockRestore();
  }
});

it('keeps an entire suspended bar and connects directly to the actual next chord without an invented restoration', () => {
  render(<ChordConnectionPractice />);
  fireEvent.click(screen.getByRole('checkbox'));
  const row = within(score()).getByRole('rowheader', { name: '第 2 小节 G' }).closest('tr')!;
  const cells = within(row).getAllByRole('cell');
  expect(cells.map((cell) => cell.getAttribute('aria-label'))).toEqual([
    '第 1 拍，保持 Gsus2',
    '第 2 拍，延续 Gsus2',
    '第 3 拍，延续 Gsus2',
    '第 4 拍，延续 Gsus2',
  ]);
  expect(within(row).queryByText('恢复')).toBeNull();
  const next = within(score()).getByRole('rowheader', { name: '第 3 小节 Am' }).closest('tr')!;
  expect(within(next).getAllByRole('cell')[0].getAttribute('aria-label')).toBe('第 1 拍，弹 Am');
  openPlan();
  const first = within(screen.getByRole('table', { name: '整轮挂留安排' })).getAllByRole('row')[1];
  expect(first.textContent).toContain('接 Am（下一小节）');
  expect(first.textContent).not.toContain('第 4 拍恢复 G');
});

it('previews the development with a direct transition, continuous colours and a single-beat ornament', () => {
  render(<ChordConnectionPractice />);
  fireEvent.click(screen.getByRole('checkbox'));
  choose('预览圈次', '2');
  expect(screen.getByText('展开 · 3 个小节有变化')).toBeTruthy();
  const rows = within(score()).getAllByRole('row').slice(1);
  expect(within(rows[0]).queryByText('恢复')).toBeNull();
  expect(within(rows[0]).getAllByRole('cell')[3].getAttribute('aria-label')).toBe(
    '第 4 拍，挂上 Csus2',
  );
  expect(within(rows[1]).getByText('换色')).toBeTruthy();
  expect(within(rows[1]).getAllByRole('cell')[1].getAttribute('aria-label')).toBe(
    '第 2 拍，挂上 Gsus4',
  );
  expect(within(rows[1]).getAllByRole('cell')[2].getAttribute('aria-label')).toBe(
    '第 3 拍，换色 Gsus2',
  );
  expect(within(rows[2]).getAllByRole('cell')[2].getAttribute('aria-label')).toBe(
    '第 3 拍，挂上 Asus2',
  );
  expect(within(rows[2]).getAllByRole('cell')[3].getAttribute('aria-label')).toBe(
    '第 4 拍，恢复 Am',
  );
  choose('预览圈次', '3');
  expect(screen.getByText('收束 · 1 个小节有变化')).toBeTruthy();
});

it('labels a final held suspension as continuing to the end instead of promising another bar', () => {
  localStorage.setItem(
    connectionStorageKey('triad'),
    JSON.stringify({ settings: { suspensions: true, suspensionVersion: 5, loops: 1 } }),
  );
  render(<ChordConnectionPractice />);
  const lastRow = within(score()).getAllByRole('row').at(-1)!;
  expect(within(lastRow).getAllByRole('cell')[3].getAttribute('aria-label')).toBe(
    '第 4 拍，延续 Fsus2',
  );
  openPlan();
  expect(screen.getByText('保持至本轮结束')).toBeTruthy();
});
