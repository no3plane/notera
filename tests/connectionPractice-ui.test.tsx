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
    fireEvent.change(screen.getByRole('combobox', { name: '和弦进行' }), {
      target: { value: '2' },
    });
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
    expect(screen.getByLabelText('本轮进行').textContent).toBe('ii → V → I');
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
