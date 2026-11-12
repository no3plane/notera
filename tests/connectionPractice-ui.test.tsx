import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { ChordConnectionPractice } from '../src/components/ChordConnectionPractice';
import { GuitarChordPractice } from '../src/components/GuitarChordPractice';
import { connectionStorageKey, readConnectionProgress } from '../src/lib/connectionPractice';
import { GUITAR_PROGRESS_KEY, readGuitarProgress } from '../src/lib/guitarChords';
import { LAST_PRACTICE_KEY } from '../src/lib/practiceNavigation';
import { PROGRESS_KEY, readProgress } from '../src/lib/progress';

afterEach(() => vi.useRealTimers());
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('independent connection practice', () => {
  it.each(['chord-connection', 'seventh-connection', 'sus-connection'])(
    'starts %s with no prior exercise and keeps the score visible',
    (mode) => {
      history.replaceState(null, '', `/?practice=${mode}`);
      render(<App />);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('和弦连接');
      expect(screen.getByRole('table', { name: '四小节节拍谱' })).toBeTruthy();
      expect(screen.queryByText(/开始随机级数|熟悉这一调/)).toBeNull();
      click('开始节拍');
      expect(screen.getByRole('button', { name: '停止节拍' })).toBeTruthy();
      expect(readGuitarProgress().attempts).toHaveLength(0);
    },
  );
  it('opens connections from the main navigation without a lesson or overview gate', () => {
    render(<App />);
    expect(
      within(screen.getByRole('group', { name: '练习专题' }))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['音程', '指板', '单个和弦', '和弦连接']);
    click('和弦连接');
    expect(screen.getByLabelText('本轮进行').textContent).toBe('C → G → Am → F');
    click('开始节拍');
    expect(screen.getByText('预数四拍')).toBeTruthy();
  });
  it('starts and stops the metronome without self-assessment and preserves saved records', () => {
    const legacy = {
      key: 'C',
      attempts: [{ key: 'C', degrees: [4], rating: 'missed', hints: 0, phase: 'recall', at: 1 }],
      overrides: { C: { 4: 6 } },
    };
    localStorage.setItem(GUITAR_PROGRESS_KEY, JSON.stringify(legacy));
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ total: 7, correct: 6, time: 12000, history: [], mistakes: [] }),
    );
    render(
      <StrictMode>
        <ChordConnectionPractice />
      </StrictMode>,
    );
    click('开始节拍');
    click('停止节拍');
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText(/自评|感受|有停顿|有犹豫|最近的连接/)).toBeNull();
    expect(readConnectionProgress('triad').attempts).toHaveLength(0);
    expect(readGuitarProgress()).toEqual(legacy);
    expect(readProgress()?.total).toBe(7);
    click('单练 Am → F');
    expect(screen.getByLabelText('本轮进行').textContent).toBe('Am → F');
    click('开始节拍');
    click('停止节拍');
    expect(readConnectionProgress('triad').attempts).toHaveLength(0);
    expect(screen.queryByText(/卡点复练|复练卡点|连接卡点/)).toBeNull();
  });
  it('remembers the last exercise, key, progression, tempo, loop count and display after reopening', () => {
    const view = render(<App />);
    click('和弦连接');
    fireEvent.change(screen.getByRole('combobox', { name: '连接调性' }), {
      target: { value: 'G' },
    });
    click(/选择和弦进行/);
    click('251 收束解决');
    fireEvent.change(screen.getByRole('combobox', { name: '速度' }), { target: { value: '80' } });
    fireEvent.change(screen.getByRole('combobox', { name: '循环圈数' }), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: '连接显示' }), {
      target: { value: 'degrees' },
    });
    expect(localStorage.getItem(LAST_PRACTICE_KEY)).toBe('chord-connection');
    view.unmount();
    history.replaceState(null, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('和弦连接');
    expect((screen.getByRole('combobox', { name: '连接调性' }) as HTMLSelectElement).value).toBe(
      'G',
    );
    expect((screen.getByRole('combobox', { name: '速度' }) as HTMLSelectElement).value).toBe('80');
    expect((screen.getByRole('combobox', { name: '循环圈数' }) as HTMLSelectElement).value).toBe(
      '2',
    );
    expect(screen.getByLabelText('本轮进行').textContent).toBe('2 → 5 → 1');
    expect(location.search).toBe('?practice=chord-connection');
  });
  it('counts in, advances on beats, ends without evaluation and stops in the background', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    render(<ChordConnectionPractice />);
    fireEvent.change(screen.getByRole('combobox', { name: '循环圈数' }), {
      target: { value: '1' },
    });
    click('开始节拍');
    expect(screen.getByText('预数四拍')).toBeTruthy();
    act(() => vi.advanceTimersByTime(4000));
    const score = within(screen.getByRole('table'));
    expect(score.getByRole('cell', { current: 'step' }).getAttribute('aria-label')).toBe(
      '第 1 拍，弹 C',
    );
    act(() => vi.advanceTimersByTime(16000));
    expect(screen.getByText('本轮连接完成')).toBeTruthy();
    expect(readConnectionProgress('triad').attempts).toHaveLength(0);
    expect(screen.queryByRole('group', { name: '连接自评' })).toBeNull();
    click('再练一轮');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByText('页面切到后台，节拍已停止。')).toBeTruthy();
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.queryByText('本轮连接完成')).toBeNull();
    expect(readConnectionProgress('triad').attempts).toHaveLength(0);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  it('keeps the chord materials separate and honours an explicit practice link', () => {
    localStorage.setItem(LAST_PRACTICE_KEY, 'seventh-connection');
    localStorage.setItem(
      connectionStorageKey('seventh'),
      JSON.stringify({ settings: { key: 'D', tempo: 80 }, attempts: [] }),
    );
    history.replaceState(null, '', '/?practice=chord-connection');
    render(<App />);
    expect(screen.getByLabelText('本轮进行').textContent).toBe('C → G → Am → F');
    click('七和弦');
    expect(screen.getByLabelText('本轮进行').textContent).toBe('Dmaj7 → A7 → Bm7 → Gmaj7');
    click('三和弦');
    expect(screen.getByLabelText('本轮进行').textContent).toBe('C → G → Am → F');
  });
  it('filters the library, previews transposed chords, and restores a long progression', () => {
    const view = render(<ChordConnectionPractice />);
    fireEvent.change(screen.getByRole('combobox', { name: '连接调性' }), {
      target: { value: 'G' },
    });
    click(/选择和弦进行/);
    expect(
      screen.getByRole('button', { name: '1564 经典流行', pressed: true }).textContent,
    ).toContain('G → D → Em → C');
    click('长进行');
    expect(screen.queryByRole('button', { name: '1645 经典老歌' })).toBeNull();
    click('15634145 卡农式进行');
    expect(screen.queryByRole('region', { name: '和弦进行库' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /选择和弦进行/ }));
    const expected = 'G → D → Em → Bm → C → G → C → D';
    expect(screen.getByLabelText('本轮进行').textContent).toBe(expected);
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(9);
    click('单练 D → G');
    expect(screen.getByLabelText('本轮进行').textContent).toBe('D → G');
    click('回到完整进行');
    view.unmount();
    render(<ChordConnectionPractice />);
    expect(screen.getByLabelText('本轮进行').textContent).toBe(expected);
  });
  it('uses minor-relative numeric degrees throughout and keeps the correct altered chords', () => {
    render(<ChordConnectionPractice />);
    click(/选择和弦进行/);
    click('小调进行');
    click('小调 251 小调收束');
    expect(screen.getByLabelText('本轮进行').textContent).toBe('Bm7♭5 → E7 → Am');
    fireEvent.change(screen.getByRole('combobox', { name: '连接显示' }), {
      target: { value: 'degrees' },
    });
    expect(screen.getByLabelText('本轮进行').textContent).toBe('2 → 5 → 1');
    expect(screen.getByRole('rowheader', { name: '第 1 小节 2' }).textContent).toBe('2');
    click('单练 5 → 1');
    expect(screen.getByLabelText('本轮进行').textContent).toBe('5 → 1');
    click(/选择和弦进行/);
    expect(screen.queryByText('Bm7♭5 → E7 → Am')).toBeNull();
    click('小调 1451 小调回归');
    expect(screen.getByLabelText('本轮进行').textContent).toBe('1 → 4 → 5 → 1');
    fireEvent.change(screen.getByRole('combobox', { name: '连接显示' }), {
      target: { value: 'names' },
    });
    expect(screen.getByLabelText('本轮进行').textContent).toBe('Am → Dm → E7 → Am');
  });
  it('closes the library with Escape and locks changes during playback of all eight bars', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    render(<ChordConnectionPractice />);
    click(/选择和弦进行/);
    fireEvent.keyDown(screen.getByRole('button', { name: '1564 经典流行' }), { key: 'Escape' });
    expect(screen.queryByRole('region', { name: '和弦进行库' })).toBeNull();
    click(/选择和弦进行/);
    click('15634145 卡农式进行');
    fireEvent.change(screen.getByRole('combobox', { name: '循环圈数' }), {
      target: { value: '1' },
    });
    click('开始节拍');
    expect(
      (screen.getByRole('button', { name: /选择和弦进行/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    act(() => vi.advanceTimersByTime(32_000));
    expect(screen.queryByText('本轮连接完成')).toBeNull();
    expect(screen.getByText('第 1 / 1 圈 · 第 8 小节')).toBeTruthy();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText('本轮连接完成')).toBeTruthy();
  });
  it('shows song examples on options and switches the linked passage with the selected progression', () => {
    render(<ChordConnectionPractice />);
    click(/选择和弦进行/);
    const option = screen.getByRole('button', { name: '15634145 卡农式进行' });
    expect(option.textContent).toContain('《简单爱》周杰伦');
    expect(option.textContent).toContain('《红日》李克勤');
    expect(within(option).queryByRole('link')).toBeNull();
    fireEvent.click(option);
    const reference = document.querySelector('.progression-song-reference') as HTMLDetailsElement;
    fireEvent.click(reference.querySelector('summary')!);
    expect(reference.open).toBe(true);
    const link = within(reference).getByRole('link', { name: '查看《红日》李克勤的参考谱例' });
    expect(link.getAttribute('href')).toBe('https://chord4.com/tabs/22469');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(within(reference).getByText('主歌第一段')).toBeTruthy();
    click(/选择和弦进行/);
    click('6154 换序循环');
    expect(document.querySelector('.progression-song-reference')).toBeNull();
    click(/选择和弦进行/);
    click('4365 柔和转折');
    expect(document.querySelector('.progression-song-reference')).toBeNull();
  });
});

it('ends a seven-degree round without forcing connections or offering retired tasks', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
  render(<GuitarChordPractice />);
  click('级数弹奏');
  for (let i = 0; i < 7; i++) {
    click('按好了，核对指法');
    click(i === 6 ? '完成本组' : '下一题');
  }
  expect(screen.getByText('本组完成 7 题。')).toBeTruthy();
  expect(screen.queryByText('把这些级数连起来弹。')).toBeNull();
  expect(screen.queryByRole('button', { name: /推荐组合|卡点复练/ })).toBeNull();
});

it.each(['guided', 'review'])('opens the reference safely for a saved retired %s task', (task) => {
  localStorage.setItem('notera.guitar-task.triad.v1', task);
  const legacy = {
    key: 'C',
    attempts: [{ key: 'C', degrees: [4], rating: 'missed', hints: 0, phase: 'review', at: 1 }],
    overrides: {},
  };
  localStorage.setItem(GUITAR_PROGRESS_KEY, JSON.stringify(legacy));
  render(<GuitarChordPractice />);
  expect(
    within(screen.getByRole('group', { name: '实琴练习内容' }))
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual(['指法参考', '级数弹奏']);
  expect(screen.getByRole('button', { name: '指法参考', pressed: true })).toBeTruthy();
  expect(localStorage.getItem('notera.guitar-task.triad.v1')).toBe('reference');
  expect(readGuitarProgress()).toEqual(legacy);
});
