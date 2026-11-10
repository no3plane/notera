import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
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
  'shares the suspended family across topics and saves a complete %s-group practice',
  (root, progression) => {
    const view = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /和弦对应/ }));
    fireEvent.click(screen.getByRole('button', { name: '挂留和弦' }));
    expect(
      within(screen.getByRole('group', { name: '练习题型' })).getByRole('button', {
        name: '换一个音',
        pressed: true,
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /实琴和弦/ }));
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
    fireEvent.click(screen.getByRole('button', { name: '和弦连接' }));
    expect(
      within(screen.getByRole('table', { name: '四小节节拍谱' }))
        .getAllByRole('rowheader')
        .map((bar) => bar.querySelector('strong')?.textContent),
    ).toEqual(progression);
    fireEvent.click(screen.getByRole('button', { name: '指法与切换' }));
    fireEvent.click(screen.getByRole('button', { name: /开始随机切换/ }));
    expect(screen.queryAllByRole('img')).toHaveLength(0);

    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
      expect(screen.getAllByRole('img')).toHaveLength(2);
      fireEvent.keyDown(document.body, { key: i === 0 ? '2' : '1' });
    }
    expect(screen.getByRole('heading', { name: '本组练习完成' })).toBeTruthy();
    const review = screen.getByRole('heading', { name: '待巩固的转换' }).parentElement!;
    expect(within(review).getByRole('listitem')).toBeTruthy();
    expect(readSusGuitarProgress()).toEqual({
      root,
      attempts: ['slow', 'easy', 'easy', 'easy'].map((rating) => ({ root, rating })),
    });

    view.unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /实琴和弦/ }));
    expect(screen.getByRole('option', { name: `${root} 组`, selected: true })).toBeTruthy();
    expect(screen.getByText('4 次')).toBeTruthy();
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
