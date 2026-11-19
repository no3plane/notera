import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import { chordsInKey, voicingFor, voicingNotes } from '../src/lib/guitarChords';
import {
  changedStrings,
  readSusGuitarProgress,
  SUS_GUITAR_GROUPS,
  SUS_GUITAR_PROGRESS_KEY,
  SUS_GUITAR_QUALITIES,
  susGuitarTasks,
  SUS_GUITAR_ROOTS,
} from '../src/lib/guitarSusChords';
import { midi } from '../src/lib/theory';

it.each(SUS_GUITAR_ROOTS)(
  'builds the %s group on the existing major shape and plays the named tones',
  (root) => {
    const { comparison } = SUS_GUITAR_GROUPS[root].major;
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

it.each(SUS_GUITAR_ROOTS)(
  'shares the suspended family across topics and continuously practices the %s group without ratings',
  (root) => {
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
    const degrees = (symbol: string) =>
      Array.from(
        screen
          .getByRole('img', { name: new RegExp(`^${symbol} 指法`) })
          .querySelectorAll('.chord-degree'),
        (label) => label.textContent,
      ).join(' ');
    expect([`${root}sus2`, root, `${root}sus4`].map(degrees)).toEqual(
      root === 'E'
        ? ['R 5 R × 5 2', 'R 5 R 3 5 R', 'R 5 R 4 5 R']
        : ['× R 5 R 2 5', '× R 5 R 3 5', '× R 5 R 4 5'],
    );
    fireEvent.click(screen.getByRole('button', { name: '和弦连接' }));
    expect(
      (screen.getByRole('checkbox', { name: '加入挂留变化' }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      within(screen.getByRole('table', { name: '四小节节拍谱' }))
        .getAllByRole('rowheader')
        .map((bar) => bar.querySelector('strong')?.textContent),
    ).toEqual(['C', 'G', 'Am', 'F']);
    fireEvent.click(screen.getByRole('button', { name: '和弦' }));
    fireEvent.click(screen.getByRole('button', { name: '指法参考' }));
    fireEvent.click(screen.getByRole('button', { name: '挂留和弦' }));
    fireEvent.click(screen.getByRole('button', { name: '看题按弦' }));
    expect(screen.getByRole('button', { name: '看题按弦', pressed: true })).toBeTruthy();
    expect(
      (screen.getByRole('combobox', { name: '开放指法组' }) as HTMLSelectElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '指法参考' }));
    expect(screen.getAllByRole('img')).toHaveLength(11);
    expect(
      (screen.getByRole('combobox', { name: '开放指法组' }) as HTMLSelectElement).disabled,
    ).toBe(false);
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(screen.getAllByRole('img')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: '看题按弦' }));
    expect(screen.queryAllByRole('img')).toHaveLength(0);

    for (let i = 0; i < 20; i++) {
      fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
      expect(screen.getAllByRole('img')).toHaveLength(2);
      fireEvent.keyDown(document.body, { key: 'Enter' });
    }
    expect(screen.getByText('本轮已练 0 / 20 次切换')).toBeTruthy();
    expect(screen.getByRole('button', { name: '弹好了，核对指法' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: '本题自评' })).toBeNull();
    expect(screen.queryByRole('button', { name: /进入和弦连接/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '指法参考' }));
    expect(screen.getAllByRole('img')).toHaveLength(11);
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
    for (let i = 0; i < 20; i++) {
      seen.add(document.querySelector('.guitar-sus-sequence')!.textContent!);
      click('弹好了，核对指法');
      click('下一题');
    }
    expect(seen.size).toBe(20);
    expect(screen.getByText('本轮已练 0 / 20 次切换')).toBeTruthy();
  }
  const prompt = document.querySelector('.guitar-sus-sequence')!.textContent;
  click('查看本组指法');
  expect(screen.getAllByRole('img')).toHaveLength(11);
  click('返回当前题');
  expect(document.querySelector('.guitar-sus-sequence')!.textContent).toBe(prompt);
  expect(screen.queryByRole('img')).toBeNull();
  click('弹好了，核对指法');
  fireEvent.change(screen.getByRole('combobox', { name: '开放指法组' }), {
    target: { value: 'A' },
  });
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByText('本轮已练 0 / 20 次切换')).toBeTruthy();
  expect(document.querySelector('.guitar-sus-sequence')!.textContent).toBe('A → Asus2');
  expect(readSusGuitarProgress().attempts).toEqual([]);
});

it.each(SUS_GUITAR_ROOTS)(
  'retains the exact named tones and source quality throughout the %s groups',
  (root) => {
    for (const quality of SUS_GUITAR_QUALITIES) {
      const {
        comparison: [sus2, base, sus4],
      } = SUS_GUITAR_GROUPS[root][quality];
      for (const shape of [sus2, base, sus4]) {
        const pitches = (notes: typeof shape.tones) =>
          [...new Set(notes.map((note) => midi(note) % 12))].sort((a, b) => a - b);
        expect(pitches(voicingNotes(shape.voicing)), shape.symbol).toEqual(pitches(shape.tones));
      }
      expect(
        susGuitarTasks(root)
          .filter((task) => task.quality === quality)
          .map((task) => task.sequence.map((s) => s.symbol)),
      ).toEqual([
        [base.symbol, sus2.symbol],
        [sus2.symbol, base.symbol],
        [base.symbol, sus4.symbol],
        [sus4.symbol, base.symbol],
      ]);
      if (quality !== 'major' && quality !== 'minor') {
        expect(midi(sus2.tones[3]) % 12).toBe(midi(base.tones[3]) % 12);
        expect(midi(sus4.tones[3]) % 12).toBe(midi(base.tones[3]) % 12);
      }
    }
    for (const [major, minor] of [
      ['major', 'minor'],
      ['7', 'm7'],
    ] as const) {
      expect(SUS_GUITAR_GROUPS[root][major].comparison[0]).toEqual(
        SUS_GUITAR_GROUPS[root][minor].comparison[0],
      );
      expect(SUS_GUITAR_GROUPS[root][major].comparison[2]).toEqual(
        SUS_GUITAR_GROUPS[root][minor].comparison[2],
      );
    }
  },
);

it.each(SUS_GUITAR_ROOTS)(
  'mixes all %s suspensions without a source selector or a legacy quality filter',
  (root) => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    localStorage.setItem(
      SUS_GUITAR_PROGRESS_KEY,
      JSON.stringify({ root, quality: 'm7', attempts: [] }),
    );
    history.replaceState(null, '', '/?practice=guitar-sus-chords&task=reference');
    const view = render(<App />);
    expect(screen.queryByRole('combobox', { name: '出发和弦' })).toBeNull();
    expect(screen.getAllByRole('img')).toHaveLength(11);
    for (const quality of SUS_GUITAR_QUALITIES) {
      for (const shape of SUS_GUITAR_GROUPS[root][quality].comparison) {
        expect(screen.getByRole('img', { name: new RegExp(`^${shape.symbol} 指法`) })).toBeTruthy();
        expect(screen.getByRole('button', { name: `试听 ${shape.symbol}` })).toBeTruthy();
      }
    }
    fireEvent.click(screen.getByRole('button', { name: '看题按弦' }));
    expect(screen.queryByRole('combobox', { name: '出发和弦' })).toBeNull();
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seen.add(document.querySelector('.guitar-sus-sequence')!.textContent!);
      fireEvent.click(screen.getByRole('button', { name: '弹好了，核对指法' }));
      expect(screen.getAllByRole('img')).toHaveLength(2);
      fireEvent.click(screen.getByRole('button', { name: '下一题' }));
    }
    const expected = [
      [root, root],
      [`${root}m`, root],
      [`${root}7`, `${root}7`],
      [`${root}m7`, `${root}7`],
      [`${root}maj7`, `${root}maj7`],
    ].flatMap(([base, sus]) => [
      `${base} → ${sus}sus2`,
      `${sus}sus2 → ${base}`,
      `${base} → ${sus}sus4`,
      `${sus}sus4 → ${base}`,
    ]);
    expect([...seen].sort()).toEqual(expected.sort());
    expect(screen.getByText('本轮已练 0 / 20 次切换')).toBeTruthy();
    expect(readSusGuitarProgress()).toEqual({ root, attempts: [] });
    view.unmount();
    render(<App />);
    expect(screen.queryByRole('combobox', { name: '出发和弦' })).toBeNull();
    expect(screen.getByRole('option', { name: `${root} 组`, selected: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '指法参考' }));
    expect(screen.getByRole('img', { name: new RegExp(`^${root}maj7sus4 指法`) })).toBeTruthy();
  },
);

it('ignores obsolete source preferences when reading progress', () => {
  for (const quality of [undefined, 'major', 'm7', 'maj7', 'dim', null, {}, 'sus4']) {
    localStorage.setItem(SUS_GUITAR_PROGRESS_KEY, JSON.stringify({ root: 'A', quality }));
    expect(readSusGuitarProgress()).toEqual({ root: 'A', attempts: [] });
  }
});

it.each(SUS_GUITAR_ROOTS)(
  'groups all %s reference shapes by the retained seventh and shares each suspension only once',
  (root) => {
    history.replaceState(null, '', '/?practice=guitar-sus-chords&task=reference');
    render(<App />);
    fireEvent.change(screen.getByRole('combobox', { name: '开放指法组' }), {
      target: { value: root },
    });
    const groups = [
      { label: '三和弦', symbols: [root, `${root}m`, `${root}sus2`, `${root}sus4`] },
      { label: '小七音挂留', symbols: [`${root}7`, `${root}m7`, `${root}7sus2`, `${root}7sus4`] },
      { label: '大七音挂留', symbols: [`${root}maj7`, `${root}maj7sus2`, `${root}maj7sus4`] },
    ];
    for (const { label, symbols } of groups) {
      const band = within(screen.getByRole('region', { name: label }));
      expect(band.getAllByRole('img')).toHaveLength(symbols.length);
      for (const symbol of symbols) {
        expect(band.getByRole('img', { name: new RegExp(`^${symbol} 指法`) })).toBeTruthy();
        expect(band.getByRole('button', { name: `试听 ${symbol}` })).toBeTruthy();
      }
      expect(band.getByRole('group', { name: /的挂留关系：挂二/ })).toBeTruthy();
    }
    expect(screen.queryByRole('combobox', { name: '出发和弦' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '开始看题按弦 →' }));
    expect(screen.queryByRole('combobox', { name: '出发和弦' })).toBeNull();
    const prompt = document.querySelector('.guitar-sus-sequence')!.textContent;
    fireEvent.click(screen.getByRole('button', { name: '弹好了，核对指法' }));
    fireEvent.click(screen.getByRole('button', { name: '查看本组指法' }));
    expect(screen.getAllByRole('img')).toHaveLength(11);
    expect(screen.queryByRole('combobox', { name: '出发和弦' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '返回当前题' }));
    expect(document.querySelector('.guitar-sus-sequence')!.textContent).toBe(prompt);
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.queryByRole('combobox', { name: '出发和弦' })).toBeNull();
  },
);
