import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import * as transcriptionProjects from '../src/features/chordTranscription/projects';
import { CHORD_NAVIGATION_KEY } from '../src/lib/chordPracticeNavigation';
import { readConnectionProgress } from '../src/lib/connectionPractice';
import { GUITAR_PROGRESS_KEY, readGuitarProgress } from '../src/lib/guitarChords';
import { PROGRESS_KEY } from '../src/lib/progress';

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const choose = (name: string, value: string) =>
  fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('opens recall and reference directly and restores the task when returning to chords', () => {
  render(<App />);
  click('和弦');
  click('看题按弦');
  expect(screen.getByRole('button', { name: '按好了，核对指法' })).toBeTruthy();
  expect(screen.queryByRole('group', { name: '实琴练习内容' })).toBeNull();
  expect(screen.queryByRole('button', { name: '实琴和弦' })).toBeNull();
  click('指法参考');
  expect(screen.getByRole('group', { name: '本调七个和弦' })).toBeTruthy();
  click('音程');
  click('和弦');
  expect(screen.getByRole('button', { name: '指法参考', pressed: true })).toBeTruthy();
});

it('removes pair practice from desktop, mobile and connection controls', () => {
  render(<App />);
  click('和弦');
  expect(screen.queryByRole('button', { name: '两和弦专项' })).toBeNull();
  expect(screen.queryByRole('option', { name: '两和弦专项' })).toBeNull();
  click('和弦连接');
  expect(screen.queryByText('拆开练一对')).toBeNull();
  expect(screen.queryByRole('button', { name: /^单练 / })).toBeNull();
  expect(screen.queryByRole('group', { name: '选择两个和弦' })).toBeNull();
  expect(screen.getByLabelText('本轮进行').textContent).toBe('C → G → Am → F');
});

it('uses the grouped mobile task selector and goes directly to suspended-only tasks', () => {
  render(<App />);
  click('和弦');
  const picker = screen.getByRole('combobox', { name: '当前练习' });
  expect(
    within(picker)
      .getAllByRole('group')
      .map((group) => group.getAttribute('label')),
  ).toEqual(['认和弦', '弹和弦', '查指法']);
  expect(within(picker).queryByRole('option', { name: '扒歌' })).toBeNull();
  choose('当前练习', 'diatonic');
  expect(screen.getByRole('table', { name: /C 大调/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: '挂留和弦', pressed: true })).toBeTruthy();
  expect(screen.queryByRole('option', { name: /挂留与解决/ })).toBeNull();
  expect(screen.queryByRole('button', { name: '挂留与解决' })).toBeNull();
  choose('当前练习', 'connection');
  expect((screen.getByRole('checkbox', { name: '加入挂留变化' }) as HTMLInputElement).checked).toBe(
    true,
  );
  expect(screen.getByRole('button', { name: '三和弦', pressed: true })).toBeTruthy();
  choose('当前练习', 'diatonic');
  choose('当前练习', 'recall');
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByRole('button', { name: '弹好了，核对指法' })).toBeTruthy();
});

it('opens transcription as its own topic and keeps the last chord task', async () => {
  const app = render(<App />);
  click('和弦');
  click('指法参考');
  click('扒歌');
  const library = await screen.findByRole('region', { name: '工程文件' });
  expect(screen.getByRole('heading', { name: '扒歌', level: 1 })).toBeTruthy();
  expect(screen.getByRole('button', { name: '扒歌', pressed: true })).toBeTruthy();
  expect(screen.queryByRole('navigation', { name: '和弦练习' })).toBeNull();
  expect(within(library).getByRole('button', { name: '打开新歌' })).toBeTruthy();
  expect(within(library).getByRole('button', { name: '导入工程' })).toBeTruthy();
  expect(screen.queryByRole('region', { name: '扒歌工作区' })).toBeNull();
  expect(new URLSearchParams(location.search).get('practice')).toBe('transcription');
  expect(new URLSearchParams(location.search).has('task')).toBe(false);
  click('和弦');
  expect(screen.getByRole('button', { name: '指法参考', pressed: true })).toBeTruthy();
  click('扒歌');
  await screen.findByRole('region', { name: '工程文件' });
  app.unmount();
  history.replaceState(null, '', '/');
  render(<App />);
  expect(await screen.findByRole('region', { name: '工程文件' })).toBeTruthy();
});

it('lists saved transcription projects and opens one only when selected', async () => {
  const project: transcriptionProjects.Project = {
    id: 'saved-song',
    name: '练习曲',
    audioName: '练习曲.mp3',
    audioFingerprint: '12:87654321',
    duration: 3,
    meter: '4/4',
    firstBeat: null,
    beats: [
      { id: 1, time: 0.5, chord: 'Cmaj7' },
      { id: 2, time: 1, chord: 'iiø7' },
    ],
    bpm: 120,
    analysisDone: true,
    speed: 1,
    position: 0.5,
    updatedAt: 1000,
  };
  vi.spyOn(transcriptionProjects, 'listProjects').mockResolvedValue([
    { project, remembersFile: false },
  ]);
  const loadSong = vi.spyOn(transcriptionProjects, 'loadSong').mockResolvedValue({
    project,
    audio: null,
  });
  vi.spyOn(transcriptionProjects, 'saveProject').mockResolvedValue(undefined);
  history.replaceState(null, '', '/?practice=transcription');
  render(<App />);
  const openSong = await screen.findByRole('button', { name: /^练习曲/ });
  expect(screen.getByRole('button', { name: '扒歌', pressed: true })).toBeTruthy();
  expect(new URLSearchParams(location.search).has('task')).toBe(false);
  expect(screen.queryByRole('region', { name: '扒歌工作区' })).toBeNull();
  expect(loadSong).not.toHaveBeenCalled();

  fireEvent.click(openSong);
  const workspace = await screen.findByRole('region', { name: '扒歌工作区' });
  expect(loadSong).toHaveBeenCalledWith(project.id);
  expect(within(workspace).getByRole('button', { name: '导出当前工程' })).toBeTruthy();
  const firstBeat = within(workspace).getByRole('textbox', { name: /第 1 拍和弦/ });
  const secondBeat = within(workspace).getByRole('textbox', { name: /第 2 拍和弦/ });
  expect(firstBeat).toHaveProperty('value', 'Cmaj7');
  act(() => firstBeat.focus());
  expect(fireEvent.keyDown(firstBeat, { key: 'ArrowRight' })).toBe(true);
  expect(document.activeElement).toBe(firstBeat);
  fireEvent.keyDown(firstBeat, { key: 'Enter' });
  expect(document.activeElement).toBe(secondBeat);
  expect(fireEvent.keyDown(secondBeat, { key: 'ArrowLeft' })).toBe(true);
  expect(document.activeElement).toBe(secondBeat);
  click('返回工程列表');
  expect(screen.getByRole('button', { name: /^练习曲/ })).toBeTruthy();
  expect(screen.queryByRole('region', { name: '扒歌工作区' })).toBeNull();
});

it('shares changed keys and voicings between reference, recall and connections', () => {
  render(<App />);
  click('和弦');
  click('指法参考');
  choose('练习调性', 'G');
  choose('练习使用的按法', '5');
  click('看题按弦');
  expect((screen.getByRole('combobox', { name: '练习调性' }) as HTMLSelectElement).value).toBe('G');
  click('和弦连接');
  expect((screen.getByRole('combobox', { name: '连接调性' }) as HTMLSelectElement).value).toBe('G');
  choose('连接调性', 'D');
  fireEvent.click(screen.getByText(/查看本轮指法/, { selector: 'summary' }));
  choose('D 本轮按法', '5');
  click('指法参考');
  expect((screen.getByRole('combobox', { name: '练习调性' }) as HTMLSelectElement).value).toBe('D');
  expect(readGuitarProgress().overrides.G?.[1]).toBe(5);
  expect(readGuitarProgress().overrides.D?.[1]).toBe(5);
  expect(readConnectionProgress('triad').settings.key).toBe('D');
});

it('stops playback when selecting another task', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  history.replaceState(null, '', '/?practice=chord-connection');
  render(<App />);
  click('开始节拍');
  expect(screen.getByRole('button', { name: '停止节拍' })).toBeTruthy();
  click('看题按弦');
  act(() => vi.advanceTimersByTime(8000));
  expect(screen.queryByRole('button', { name: '停止节拍' })).toBeNull();
  click('和弦连接');
  expect(screen.getByRole('button', { name: '开始节拍' })).toBeTruthy();
});

it('continues suspended recall after a round and permits changing groups immediately', () => {
  history.replaceState(null, '', '/?practice=guitar-sus-chords&task=recall');
  render(<App />);
  for (let i = 0; i < 20; i++) {
    click('弹好了，核对指法');
    click('下一题');
  }
  expect(screen.getByText('本轮已练 0 / 20 次切换')).toBeTruthy();
  choose('开放指法组', 'A');
  expect(screen.getByRole('button', { name: '看题按弦', pressed: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: '弹好了，核对指法' })).toBeTruthy();
  expect(screen.queryByRole('img')).toBeNull();
  expect(readConnectionProgress('sus').settings.key).toBe('A');
});

it('honours an explicit practice link over the saved task and preserves existing records', () => {
  const records = { total: 7, correct: 6, time: 12000, history: [], mistakes: [] };
  const guitar = { key: 'G', attempts: [], overrides: { G: { 1: 5 } } };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(records));
  localStorage.setItem(GUITAR_PROGRESS_KEY, JSON.stringify(guitar));
  localStorage.setItem(
    CHORD_NAVIGATION_KEY,
    JSON.stringify({ mode: 'guitar-chords', task: 'recall' }),
  );
  history.replaceState(null, '', '/?practice=chord-connection&task=connection');
  render(<App />);
  expect(screen.getByRole('button', { name: '和弦连接', pressed: true })).toBeTruthy();
  expect(screen.getByLabelText('本轮进行').textContent?.split(' → ')).toHaveLength(4);
  expect(readGuitarProgress()).toEqual(guitar);
  expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!).total).toBe(7);
});
