import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import { chordsInKey, voicingFor, voicingNotes } from '../src/lib/guitarChords';
import {
  changedStrings,
  readSusGuitarProgress,
  SUS_GUITAR_GROUPS,
  SUS_GUITAR_PROGRESS_KEY,
  SUS_GUITAR_ROOTS,
} from '../src/lib/guitarSusChords';
import { midi } from '../src/lib/theory';

it.each(SUS_GUITAR_ROOTS)(
  'builds the %s group on the existing major shape and plays the named tones',
  (root) => {
    const { comparison } = SUS_GUITAR_GROUPS[root];
    const [sus2, major, sus4] = comparison;
    const rootString = root === 'E' ? 6 : 5;
    expect(major.voicing).toEqual(voicingFor(chordsInKey(root)[0], rootString));
    for (const { tones, voicing } of comparison) {
      const pitches = (notes: typeof tones) =>
        [...new Set(notes.map((note) => midi(note) % 12))].sort();
      expect(pitches(voicingNotes(voicing))).toEqual(pitches(tones));
    }
    expect(comparison.every(({ voicing }) => voicing.rootString === rootString)).toBe(true);
    expect(changedStrings([major, sus2])).toEqual(root === 'E' ? [3, 1] : [2]);
    expect(changedStrings([major, sus4])).toEqual(root === 'E' ? [3] : [2]);
  },
);

it.each([
  ['E', ['A', 'D', 'E', 'A']],
  ['A', ['D', 'G', 'A', 'D']],
] as const)(
  'shares the suspended family across topics and continuously practices the %s group without ratings',
  (root, progression) => {
    const view = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '和弦' }));
    fireEvent.click(screen.getByRole('button', { name: '挂留和弦' }));
    expect(
      within(screen.getByRole('group', { name: '练习题型' })).getByRole('button', {
        name: '和弦名 → 构成音',
        pressed: true,
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '指法参考' }));
    const tasks = within(screen.getByRole('group', { name: '练习题型' }));
    expect(tasks.getByRole('button', { name: '指法参考', pressed: true })).toBeTruthy();
    expect(tasks.getByRole('button', { name: '看题按弦', pressed: false })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '去练挂留连接' })).toBeNull();
    expect(screen.queryByRole('group', { name: '本组练习步骤' })).toBeNull();
    const group = screen.getByRole('combobox', { name: '开放指法组' });
    fireEvent.change(group, { target: { value: root } });
    const sus2Diagram =
      root === 'E' ? /^Esus2 指法：.*第 3 弦不弹.*第 1 弦第 2 品$/ : /^Asus2 指法/;
    expect(screen.getByRole('img', { name: sus2Diagram })).toBeTruthy();
    expect(
      screen.getAllByRole('img').map((diagram) => {
        const labels = diagram.querySelectorAll('.chord-degree');
        return Array.from(labels, (label) => label.textContent).join(' ');
      }),
    ).toEqual(
      root === 'E'
        ? ['R 5 R × 5 2', 'R 5 R 3 5 R', 'R 5 R 4 5 R']
        : ['× R 5 R 2 5', '× R 5 R 3 5', '× R 5 R 4 5'],
    );
    fireEvent.click(screen.getByRole('button', { name: '挂留与解决' }));
    expect(
      within(screen.getByRole('table', { name: '四小节节拍谱' }))
        .getAllByRole('rowheader')
        .map((bar) => bar.querySelector('strong')?.textContent),
    ).toEqual(progression);
    fireEvent.click(screen.getByRole('button', { name: '和弦' }));
    fireEvent.click(screen.getByRole('button', { name: '指法参考' }));
    fireEvent.click(screen.getByRole('button', { name: '看题按弦' }));
    expect(screen.getByRole('button', { name: '看题按弦', pressed: true })).toBeTruthy();
    expect(
      (screen.getByRole('combobox', { name: '开放指法组' }) as HTMLSelectElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '指法参考' }));
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(
      (screen.getByRole('combobox', { name: '开放指法组' }) as HTMLSelectElement).disabled,
    ).toBe(false);
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(screen.getAllByRole('img')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: '看题按弦' }));
    expect(screen.queryAllByRole('img')).toHaveLength(0);

    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
      expect(screen.getAllByRole('img')).toHaveLength(2);
      fireEvent.keyDown(document.body, { key: 'Enter' });
    }
    expect(screen.getByText('本轮已练 0 / 4 次切换')).toBeTruthy();
    expect(screen.getByRole('button', { name: '弹好了，核对指法' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: '本题自评' })).toBeNull();
    expect(screen.queryByRole('button', { name: /进入和弦连接/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '指法参考' }));
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.getByRole('button', { name: '指法参考', pressed: true })).toBeTruthy();
    expect(readSusGuitarProgress()).toEqual({ root, attempts: [] });

    view.unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '和弦' }));
    fireEvent.click(screen.getByRole('button', { name: '指法参考' }));
    expect(screen.getByRole('option', { name: `${root} 组`, selected: true })).toBeTruthy();
    expect(screen.queryByText('已练自评')).toBeNull();
  },
);

it('opens E for an old D preference and retains both legacy groups’ self-ratings', () => {
  const attempts = [
    { root: 'D', rating: 'easy' },
    { root: 'A', rating: 'slow' },
  ];
  localStorage.setItem(SUS_GUITAR_PROGRESS_KEY, JSON.stringify({ root: 'D', attempts }));
  expect(readSusGuitarProgress()).toEqual({ root: 'E', attempts });
});

it('covers every suspended switch per cycle, opens inline reference and changes groups mid-question', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
  history.replaceState(null, '', '/?practice=guitar-sus-chords&task=recall');
  render(<App />);
  const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
  for (let cycle = 0; cycle < 2; cycle++) {
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      seen.add(document.querySelector('.guitar-sus-sequence')!.textContent!);
      click('弹好了，核对指法');
      click('下一题');
    }
    expect(seen.size).toBe(4);
    expect(screen.getByText('本轮已练 0 / 4 次切换')).toBeTruthy();
  }
  const prompt = document.querySelector('.guitar-sus-sequence')!.textContent;
  click('查看本组指法');
  expect(screen.getAllByRole('img')).toHaveLength(3);
  click('返回当前题');
  expect(document.querySelector('.guitar-sus-sequence')!.textContent).toBe(prompt);
  expect(screen.queryByRole('img')).toBeNull();
  click('弹好了，核对指法');
  fireEvent.change(screen.getByRole('combobox', { name: '开放指法组' }), {
    target: { value: 'A' },
  });
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByText('本轮已练 0 / 4 次切换')).toBeTruthy();
  expect(document.querySelector('.guitar-sus-sequence')!.textContent).toBe('A → Asus2');
  expect(readSusGuitarProgress().attempts).toEqual([]);
});
