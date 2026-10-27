import { StrictMode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { GuitarChordPractice } from '../src/components/GuitarChordPractice';
import { GUITAR_PROGRESS_KEY, readGuitarProgress } from '../src/lib/guitarChords';

describe('single-key guitar practice', () => {
  it('draws and describes the first-string note of the full fifth-string C major shape', () => {
    render(<GuitarChordPractice />);
    const diagram = screen.getByRole('img', {
      name: 'C 指法：第 6 弦不弹，第 5 弦第 3 品，第 4 弦第 5 品，第 3 弦第 5 品，第 2 弦第 5 品，第 1 弦第 3 品',
    });
    expect(diagram.querySelectorAll('.chord-dot')).toHaveLength(5);
    expect(diagram.querySelector('.chord-barre')).not.toBeNull();
    expect(
      [...diagram.querySelectorAll('.chord-axis')].filter((node) => node.textContent === '×'),
    ).toHaveLength(1);
  });
  it('shows all fifth/sixth-string Em shapes together in overview and after reveal, including open E', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const user = userEvent.setup();
    render(<GuitarChordPractice />);
    await user.selectOptions(screen.getByRole('combobox', { name: '本组调性' }), 'G');
    await user.click(screen.getByRole('button', { name: '查看 vi Em 指法' }));
    for (const position of ['第五弦第 7 品', '第六弦空弦', '第六弦第 12 品']) {
      expect(screen.getByRole('group', { name: `Em · ${position}` })).toBeTruthy();
    }
    await user.click(screen.getByRole('button', { name: '开始随机级数 →' }));
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: '按好了，核对指法' }));
      await user.click(screen.getByRole('button', { name: /顺利/ }));
    }
    expect(screen.queryByRole('img')).toBeNull();
    await user.click(screen.getByRole('button', { name: '按好了，核对指法' }));
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(
      screen.getByRole('img', { name: /Em 指法：第 6 弦空弦，第 5 弦第 2 品，第 4 弦第 2 品/ }),
    ).toBeTruthy();
    for (const position of ['第五弦第 7 品', '第六弦空弦', '第六弦第 12 品']) {
      expect(screen.getByRole('button', { name: `聆听 Em ${position}的构成音` })).toBeTruthy();
    }
  });
  it('opens directly through the practice link', () => {
    history.replaceState(null, '', '/?practice=guitar-chords');
    render(<App />);
    expect(screen.getByRole('region', { name: '实琴和弦练习' })).toBeTruthy();
    history.replaceState(null, '', '/');
  });
  it('is available beside the existing theory exercises', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /04实琴和弦/ }));
    expect(screen.getByRole('region', { name: '实琴和弦练习' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('实琴和弦');
  });
  it('locks one key and its fingerings, reveals progressively, covers every degree, then connections and weak-degree review', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <GuitarChordPractice />
      </StrictMode>,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: '本组调性' }), 'A');
    await user.selectOptions(screen.getByRole('combobox', { name: '本组使用的按法' }), '5');
    expect(readGuitarProgress().overrides.A?.[1]).toBe(5);
    await user.click(screen.getByRole('button', { name: '开始随机级数 →' }));
    expect((screen.getByRole('combobox', { name: '本组调性' }) as HTMLSelectElement).disabled).toBe(
      true,
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('group', { name: '本题自评' })).toBeNull();
    const seen = new Set<string>();
    let weakDegree = 0;
    for (let i = 0; i < 7; i++) {
      const prompt = document.querySelector('.guitar-prompt')!.textContent!;
      seen.add(prompt);
      if (i === 0) {
        weakDegree = Number(prompt.match(/第 (\d) 级/)![1]);
        await user.click(screen.getByRole('button', { name: '一点提示' }));
        expect(document.querySelector('.guitar-hints')!.textContent).toMatch(/三和弦/);
        await user.click(screen.getByRole('button', { name: '再提示一步' }));
        await user.click(screen.getByRole('button', { name: '再提示一步' }));
        expect(screen.getByRole('button', { name: '提示已展开' }).hasAttribute('disabled')).toBe(
          true,
        );
      }
      await user.click(screen.getByRole('button', { name: '按好了，核对指法' }));
      expect(screen.getAllByRole('img', { name: /指法/ }).length).toBeGreaterThanOrEqual(2);
      const ratings = screen.getByRole('group', { name: '本题自评' });
      await user.click(
        within(ratings).getByRole('button', { name: i === 0 ? /没按出来/ : /顺利/ }),
      );
    }
    expect(seen.size).toBe(7);
    expect(document.querySelector('.guitar-stage-heading')!.textContent).toBe(
      '把这些级数连起来弹。',
    );
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: '按好了，核对指法' }));
      expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(3);
      await user.click(screen.getByRole('button', { name: /顺利/ }));
    }
    expect(document.querySelector('.guitar-stage-heading')!.textContent).toBe(
      '再给这个级数一次机会。',
    );
    expect(document.querySelector('.guitar-prompt')!.textContent).toContain(`第 ${weakDegree} 级`);
    // Keyboard reveal and grading must not leak into the existing theory reducer.
    fireEvent.keyDown(document.querySelector('.guitar-stage-heading')!, {
      code: 'Space',
      key: ' ',
    });
    fireEvent.keyDown(document.querySelector('.guitar-stage-heading')!, {
      code: 'Digit1',
      key: '1',
    });
    expect(screen.getByText('本组共完成 11 次自评。', { exact: false })).toBeTruthy();
    const stored = readGuitarProgress();
    expect(stored.attempts).toHaveLength(11);
    expect(stored.attempts.every((attempt) => attempt.key === 'A')).toBe(true);
    expect(stored.attempts[0].hints).toBe(3);
    await user.click(screen.getByRole('button', { name: '返回总览 / 换调' }));
    expect((screen.getByRole('combobox', { name: '本组调性' }) as HTMLSelectElement).disabled).toBe(
      false,
    );
    expect(
      (screen.getByRole('combobox', { name: '本组使用的按法' }) as HTMLSelectElement).value,
    ).toBe('5');
  });
  it('retains selected key and fingerings when reopened, and keeps early-ended rounds honest', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      GUITAR_PROGRESS_KEY,
      JSON.stringify({ key: 'D♭', attempts: [], overrides: { 'D♭': { 1: 6 } } }),
    );
    const view = render(<GuitarChordPractice />);
    expect((screen.getByRole('combobox', { name: '本组调性' }) as HTMLSelectElement).value).toBe(
      'D♭',
    );
    expect(
      (screen.getByRole('combobox', { name: '本组使用的按法' }) as HTMLSelectElement).value,
    ).toBe('6');
    await user.click(screen.getByRole('button', { name: '开始随机级数 →' }));
    await user.click(screen.getByRole('button', { name: '结束本组' }));
    expect(readGuitarProgress().attempts).toHaveLength(0);
    expect(screen.getByText(/本组共完成 0 次自评/)).toBeTruthy();
    view.unmount();
    render(<GuitarChordPractice />);
    expect((screen.getByRole('combobox', { name: '本组调性' }) as HTMLSelectElement).value).toBe(
      'D♭',
    );
  });
});
