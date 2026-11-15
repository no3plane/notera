import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { GuitarChordPractice } from '../src/components/GuitarChordPractice';
import { GUITAR_PROGRESS_KEY, readGuitarProgress } from '../src/lib/guitarChords';

describe('continuous guitar practice', () => {
  it('shows the full Emaj7 shape for the tonic in E major, open and at fret 12', async () => {
    const user = userEvent.setup();
    render(<GuitarChordPractice family="seventh" />);
    await user.selectOptions(screen.getByRole('combobox', { name: '练习调性' }), 'E');
    expect(
      screen.getByRole('img', {
        name: 'Emaj7 指法：第 6 弦空弦，第 5 弦第 2 品，第 4 弦第 1 品，第 3 弦第 1 品，第 2 弦空弦，第 1 弦空弦',
      }),
    ).toBeTruthy();
    const fretted = screen.getByRole('img', {
      name: 'Emaj7 指法：第 6 弦第 12 品，第 5 弦第 14 品，第 4 弦第 13 品，第 3 弦第 13 品，第 2 弦第 12 品，第 1 弦第 12 品',
    });
    expect(fretted.querySelector('.chord-barre')).not.toBeNull();
  });
  it('keeps separate keys, voicing preferences and attempts when switching chord families', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const user = userEvent.setup();
    localStorage.setItem(
      GUITAR_PROGRESS_KEY,
      JSON.stringify({ key: 'G', attempts: [], overrides: { G: { 1: 5 } } }),
    );
    history.replaceState(null, '', '/?practice=guitar-chords');
    render(<App />);
    history.replaceState(null, '', '/');
    await user.click(screen.getByRole('button', { name: '七和弦' }));
    const key = () => screen.getByRole('combobox', { name: '练习调性' }) as HTMLSelectElement;
    expect(key().value).toBe('C');
    await user.selectOptions(key(), 'F♯');
    await user.selectOptions(screen.getByRole('combobox', { name: '练习使用的按法' }), '6');
    await user.click(screen.getByRole('button', { name: '查看 viiø7 E♯m7♭5 指法' }));
    expect(screen.getByText(/减三和弦加上小七度音/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '开始看题按弦 →' }));
    expect(document.querySelector('.guitar-prompt')?.textContent).toContain('Imaj7');
    await user.click(screen.getByRole('button', { name: '一点提示' }));
    expect(document.querySelector('.guitar-hints')?.textContent).toContain('大七和弦');
    await user.click(screen.getByRole('button', { name: '按好了，核对指法' }));
    expect(screen.getAllByRole('img', { name: /F♯maj7 指法/ })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '下一题' }));

    await user.click(screen.getByRole('button', { name: '三和弦' }));
    expect(key().value).toBe('G');
    expect(readGuitarProgress()).toEqual({ key: 'G', attempts: [], overrides: { G: { 1: 5 } } });
    await user.click(screen.getByRole('button', { name: '七和弦' }));
    expect(key().value).toBe('F♯');
    expect(readGuitarProgress('seventh')).toMatchObject({
      key: 'F♯',
      attempts: [],
      overrides: { 'F♯': { 1: 6 } },
    });
  });
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
    await user.selectOptions(screen.getByRole('combobox', { name: '练习调性' }), 'G');
    await user.click(screen.getByRole('button', { name: '查看 vi Em 指法' }));
    for (const position of ['第五弦第 7 品', '第六弦空弦', '第六弦第 12 品']) {
      expect(screen.getByRole('group', { name: `Em · ${position}` })).toBeTruthy();
    }
    await user.click(screen.getByRole('button', { name: '开始看题按弦 →' }));
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: '按好了，核对指法' }));
      await user.click(screen.getByRole('button', { name: '下一题' }));
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
    await user.click(screen.getByRole('button', { name: '和弦' }));
    await user.click(screen.getByRole('button', { name: '指法参考' }));
    expect(screen.getByRole('region', { name: '实琴和弦练习' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('和弦');
  });
  it('keeps key selection available and continuously covers all seven degrees', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <GuitarChordPractice />
      </StrictMode>,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: '练习调性' }), 'A');
    await user.selectOptions(screen.getByRole('combobox', { name: '练习使用的按法' }), '5');
    expect(readGuitarProgress().overrides.A?.[1]).toBe(5);
    await user.click(screen.getByRole('button', { name: '开始看题按弦 →' }));
    expect((screen.getByRole('combobox', { name: '练习调性' }) as HTMLSelectElement).disabled).toBe(
      false,
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('group', { name: '本题自评' })).toBeNull();
    const seen = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const prompt = document.querySelector('.guitar-prompt')!.textContent!;
      seen.add(prompt);
      if (i === 0) {
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
      await user.click(screen.getByRole('button', { name: '下一题' }));
    }
    expect(seen.size).toBe(7);
    expect(screen.getByText('本轮已练 0 / 7 个级数')).toBeTruthy();
    expect(screen.getByRole('button', { name: '按好了，核对指法' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '完成本组' })).toBeNull();
    const stored = readGuitarProgress();
    expect(stored.attempts).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: '查看本调指法' }));
    await user.click(screen.getByRole('button', { name: '查看 I A 指法' }));
    expect((screen.getByRole('combobox', { name: '练习调性' }) as HTMLSelectElement).disabled).toBe(
      false,
    );
    expect(
      (screen.getByRole('combobox', { name: '练习使用的按法' }) as HTMLSelectElement).value,
    ).toBe('5');
  });
  it('retains settings when reopened while starting a fresh round', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      GUITAR_PROGRESS_KEY,
      JSON.stringify({ key: 'D♭', attempts: [], overrides: { 'D♭': { 1: 6 } } }),
    );
    const view = render(<GuitarChordPractice />);
    expect((screen.getByRole('combobox', { name: '练习调性' }) as HTMLSelectElement).value).toBe(
      'D♭',
    );
    expect(
      (screen.getByRole('combobox', { name: '练习使用的按法' }) as HTMLSelectElement).value,
    ).toBe('6');
    await user.click(screen.getByRole('button', { name: '开始看题按弦 →' }));
    await user.click(screen.getByRole('button', { name: '按好了，核对指法' }));
    await user.click(screen.getByRole('button', { name: '下一题' }));
    expect(screen.getByText('本轮已练 1 / 7 个级数')).toBeTruthy();
    expect(readGuitarProgress().attempts).toHaveLength(0);
    expect(screen.queryByRole('button', { name: '结束本组' })).toBeNull();
    view.unmount();
    render(<GuitarChordPractice />);
    expect((screen.getByRole('combobox', { name: '练习调性' }) as HTMLSelectElement).value).toBe(
      'D♭',
    );
    expect(screen.getByText('本轮已练 0 / 7 个级数')).toBeTruthy();
  });

  it.each(['triad', 'seventh'] as const)(
    'switches keys immediately in %s recall and discards the old question state',
    (family) => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999);
      render(<GuitarChordPractice family={family} initialTask="recall" />);
      const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
      const choose = (key: string) =>
        fireEvent.change(screen.getByRole('combobox', { name: '练习调性' }), {
          target: { value: key },
        });
      click('一点提示');
      click('再提示一步');
      choose('G');
      expect(document.querySelector('.guitar-hints')).toBeNull();
      expect(screen.getByText('本轮已练 0 / 7 个级数')).toBeTruthy();
      expect(screen.queryByRole('img')).toBeNull();
      click('按好了，核对指法');
      expect(document.querySelector('.guitar-answer h3')?.textContent).toBe(
        family === 'seventh' ? 'Gmaj7' : 'G',
      );
      choose('D');
      expect(screen.queryByRole('img')).toBeNull();
      click('按好了，核对指法');
      click('下一题');
      expect(screen.getByText('本轮已练 1 / 7 个级数')).toBeTruthy();
      choose('G');
      expect(screen.getByText('本轮已练 0 / 7 个级数')).toBeTruthy();
      expect(screen.getByRole('button', { name: '一点提示' })).toBeTruthy();
      expect(readGuitarProgress(family).attempts).toEqual([]);
    },
  );

  it('returns from inline reference to the same question with its hints and revealed answer', () => {
    history.replaceState(null, '', '/?practice=guitar-chords&task=recall');
    render(<App />);
    const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
    click('按好了，核对指法');
    click('下一题');
    click('一点提示');
    click('再提示一步');
    const prompt = document.querySelector('.guitar-prompt')!.textContent;
    const hints = document.querySelector('.guitar-hints')!.textContent;
    click('查看本调指法');
    expect(screen.getByRole('button', { name: '看题按弦', pressed: true })).toBeTruthy();
    expect(screen.getByRole('group', { name: '本调七个和弦' })).toBeTruthy();
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    fireEvent.keyDown(document.body, { key: 'Enter' });
    click('返回当前题');
    expect(document.querySelector('.guitar-prompt')!.textContent).toBe(prompt);
    expect(document.querySelector('.guitar-hints')!.textContent).toBe(hints);
    expect(screen.getByText('本轮已练 1 / 7 个级数')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    click('按好了，核对指法');
    const answer = document.querySelector('.guitar-answer')!.textContent;
    click('查看本调指法');
    click('返回当前题');
    expect(document.querySelector('.guitar-answer')!.textContent).toBe(answer);
    click('下一题');
    expect(screen.getByText('本轮已练 2 / 7 个级数')).toBeTruthy();
  });
});
