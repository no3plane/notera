import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import { ChordIntervalPractice } from '../src/components/ChordIntervalPractice';
import {
  chordIntervalQuestions,
  chordIntervalStorageKey,
  newChordIntervalSession,
} from '../src/lib/chordIntervals';

function choose(role: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${role}，`) }));
}
function answerE(third = '3') {
  ['R', '5', 'R', third, '5', 'R'].forEach(choose);
}

it('checks and corrects a whole chord, then repeats the selected chord', () => {
  render(<ChordIntervalPractice />);
  const check = screen.getByRole('button', { name: '检查答案' }) as HTMLButtonElement;
  expect(check.disabled).toBe(true);
  expect(screen.getAllByRole('button', { name: /^第\d弦/ })).toHaveLength(6);
  answerE('b3');
  expect(check.disabled).toBe(false);
  fireEvent.click(check);
  expect(screen.getByRole('status').textContent).toBe('3弦：b3 → 3');
  expect(document.querySelectorAll('[data-result="wrong"]')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '第3弦，b3，需修改' }));
  choose('3');
  fireEvent.click(check);
  expect(screen.getByRole('status').textContent).toBe('全部正确 ✓');
  fireEvent.click(screen.getByRole('button', { name: '再练一次' }));
  expect(screen.getByRole('button', { name: 'E', pressed: true })).toBeTruthy();
  expect((screen.getByRole('button', { name: '检查答案' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
});

it('retains the approved minimal copy before and during input', () => {
  render(<ChordIntervalPractice />);
  choose('R');
  const practice = screen.getByRole('region', { name: '指型音程练习' });
  expect(practice.textContent).not.toMatch(/已填|空弦|按弦|022100|音程身份|粗弦|细弦|当前填写|①|⑥/);
  expect(screen.getByRole('status').textContent).toBe('');
  expect(screen.queryByText('E2')).toBeNull();
});

it('preserves the unfinished question and keyboard focus after a reload', async () => {
  const user = userEvent.setup();
  const view = render(<ChordIntervalPractice />);
  const root = screen.getByRole('button', { name: 'R，根音' });
  await user.click(root);
  expect(document.activeElement).toBe(root);
  view.unmount();
  render(<ChordIntervalPractice />);
  expect(screen.getByRole('button', { name: '第6弦，R' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '第5弦，未填写', pressed: true })).toBeTruthy();
});

it('handles muted strings without requiring answers for them', () => {
  const questions = chordIntervalQuestions('triad');
  localStorage.setItem(
    chordIntervalStorageKey('triad'),
    JSON.stringify(newChordIntervalSession(questions[2])),
  );
  render(<ChordIntervalPractice />);
  expect(screen.getAllByRole('button', { name: /^第\d弦/ })).toHaveLength(5);
  ['R', '5', 'R', '3', '5'].forEach(choose);
  fireEvent.click(screen.getByRole('button', { name: '检查答案' }));
  expect(screen.getByRole('status').textContent).toBe('全部正确 ✓');
});

it('works when writing local storage is blocked', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render(<ChordIntervalPractice />);
  answerE();
  fireEvent.click(screen.getByRole('button', { name: '检查答案' }));
  expect(screen.getByRole('button', { name: '再练一次' })).toBeTruthy();
  spy.mockRestore();
});

it('integrates desktop/mobile task navigation and keeps independent family sessions', () => {
  history.replaceState(null, '', '/?practice=guitar-chords&task=intervals');
  const view = render(<App />);
  expect(screen.getByRole('button', { name: '指型音程', pressed: true })).toBeTruthy();
  choose('R');
  fireEvent.click(screen.getByRole('button', { name: '七和弦' }));
  expect(screen.getByRole('button', { name: 'E7', pressed: true })).toBeTruthy();
  choose('R');
  fireEvent.click(screen.getByRole('button', { name: '挂留和弦' }));
  expect(screen.getByRole('button', { name: 'Esus2', pressed: true })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^第\d弦/ })).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: '三和弦' }));
  expect(screen.getByRole('button', { name: 'E', pressed: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: '第6弦，R' })).toBeTruthy();
  const picker = screen.getByRole('combobox', { name: '当前练习' });
  expect(within(picker).getByRole('option', { name: '指型音程' })).toBeTruthy();
  fireEvent.change(picker, { target: { value: 'reference' } });
  expect(screen.getByRole('group', { name: '本调七个和弦' })).toBeTruthy();
  fireEvent.change(picker, { target: { value: 'intervals' } });
  expect(screen.getByRole('button', { name: '第6弦，R' })).toBeTruthy();
  view.unmount();
  render(<App />);
  expect(screen.getByRole('button', { name: '指型音程', pressed: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: '第6弦，R' })).toBeTruthy();
});

it('directly selects basic E/A chords and restores each unfinished answer', () => {
  render(<ChordIntervalPractice />);
  choose('R');
  fireEvent.click(screen.getByRole('button', { name: 'Em' }));
  expect(screen.getByRole('button', { name: 'Em', pressed: true })).toBeTruthy();
  choose('R');
  fireEvent.click(screen.getByRole('button', { name: 'Am' }));
  expect(screen.getByRole('button', { name: 'Am', pressed: true })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^第\d弦/ })).toHaveLength(5);
  expect((screen.getByRole('button', { name: '检查答案' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  choose('R');
  fireEvent.click(screen.getByRole('button', { name: 'Em' }));
  expect(screen.getByRole('button', { name: '第6弦，R' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'E' }));
  expect(screen.getByRole('button', { name: '第6弦，R' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /下一和弦/ })).toBeNull();
});

it('remembers a directly selected basic chord after reloading', () => {
  const view = render(<ChordIntervalPractice />);
  fireEvent.click(screen.getByRole('button', { name: 'Am' }));
  choose('R');
  view.unmount();
  render(<ChordIntervalPractice />);
  expect(screen.getByRole('button', { name: 'Am', pressed: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: '第5弦，R' })).toBeTruthy();
});

it('puts all basic chords in a single directly selectable group without dropdowns or shape switches', () => {
  render(<ChordIntervalPractice />);
  const tabs = screen.getByRole('group', { name: '选择和弦' });
  expect(
    within(tabs)
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual(['E', 'Em', 'Edim', 'A', 'Am', 'Adim']);
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.queryByRole('group', { name: '选择指型' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'F' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Bm' })).toBeNull();
  fireEvent.click(within(tabs).getByRole('button', { name: 'Am' }));
  expect(screen.getByRole('button', { name: 'Am', pressed: true })).toBeTruthy();
});

it('selects the requested F/B half-diminished examples with their updated interval answers', () => {
  render(<ChordIntervalPractice family="seventh" />);
  expect(screen.queryByRole('button', { name: 'Em7♭5' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Am7♭5' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Fm7(b5)' }));
  expect(screen.getAllByRole('button', { name: /^第\d弦/ })).toHaveLength(4);
  ['R', 'b7', 'b3', 'b5'].forEach(choose);
  fireEvent.click(screen.getByRole('button', { name: '检查答案' }));
  expect(screen.getByRole('status').textContent).toBe('全部正确 ✓');
  fireEvent.click(screen.getByRole('button', { name: 'Bm7(b5)' }));
  ['R', 'b5', 'b7', 'b3'].forEach(choose);
  fireEvent.click(screen.getByRole('button', { name: '检查答案' }));
  expect(screen.getByRole('status').textContent).toBe('全部正确 ✓');
});

it('answers and restores seventh suspension intervals for both shapes', () => {
  const view = render(<ChordIntervalPractice family="sus" />);
  const questions = chordIntervalQuestions('sus');
  expect(
    within(screen.getByRole('group', { name: '选择和弦' })).getAllByRole('button'),
  ).toHaveLength(12);
  for (const symbol of [
    'E7sus2',
    'E7sus4',
    'Emaj7sus2',
    'Emaj7sus4',
    'A7sus2',
    'A7sus4',
    'Amaj7sus2',
    'Amaj7sus4',
  ]) {
    fireEvent.click(screen.getByRole('button', { name: symbol }));
    questions
      .find((q) => q.symbol === symbol)!
      .answers.filter((role) => role !== null)
      .forEach(choose);
    fireEvent.click(screen.getByRole('button', { name: '检查答案' }));
    expect(screen.getByRole('status').textContent).toBe('全部正确 ✓');
  }
  view.unmount();
  render(<ChordIntervalPractice family="sus" />);
  expect(screen.getByRole('button', { name: 'Amaj7sus4', pressed: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: '第3弦，7，正确' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('全部正确 ✓');
});
