import { test } from 'vitest';
import type { Note } from '../src/lib/types';
import assert from 'node:assert/strict';
import { interval, makeQuestion, letterPath } from '../src/lib/theory';
const n = (letter: Note['letter'], acc = 0, octave = 3): Note => ({ letter, acc, octave });
test('all baseline intervals from unison through octave', () => {
  const letters: Note['letter'][] = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  const titles = ['纯一度', '大二度', '大三度', '纯四度', '纯五度', '大六度', '大七度', '纯八度'];
  for (let i = 0; i < 8; i++)
    assert.equal(interval(n('C'), n(letters[i], 0, i === 7 ? 4 : 3)).title, titles[i]);
});
test('enharmonic names retain the correct degree', () => {
  const a = interval(n('C'), n('F', 1)),
    b = interval(n('C'), n('G', -1));
  assert.equal(a.title, '增四度');
  assert.equal(b.title, '减五度');
  assert.equal(a.semitones, b.semitones);
  assert.equal(interval(n('C'), n('G', 1)).title, '增五度');
});
test('minor versus diminished uses the appropriate family', () => {
  assert.equal(interval(n('C'), n('E', -1)).title, '小三度');
  assert.equal(interval(n('C', 1), n('E', -1)).title, '减三度');
  assert.equal(interval(n('C'), n('F', -1)).title, '减四度');
  assert.equal(interval(n('C'), n('C', 1)).title, '增一度');
  assert.equal(interval(n('C'), n('C', -1, 4)).title, '减八度');
});
test('descending, octave crossing, altered starting notes, compound intervals', () => {
  assert.equal(interval(n('G'), n('C')).title, '纯五度');
  assert.equal(interval(n('G'), n('C')).descending, true);
  assert.equal(interval(n('B'), n('C', 0, 4)).title, '小二度');
  assert.equal(interval(n('F', 1), n('A', 1)).title, '大三度');
  assert.deepEqual(letterPath(n('B'), n('D', 0, 4)), ['B', 'C', 'D']);
  assert.equal(interval(n('C'), n('D', 0, 4)).title, '大9度');
  assert.equal(interval(n('C'), n('D', -1, 4)).semitones, 13);
});
test('generated questions remain in supported scope', () => {
  for (const level of ['basic', 'mixed'] as const)
    for (let i = 0; i < 2000; i++) {
      const q = makeQuestion(level),
        r = interval(q.a, q.b);
      assert.ok(r.degree >= 1 && r.degree <= 8);
      assert.ok(['纯', '大', '小', '增', '减'].includes(r.quality));
      assert.ok(r.semitones >= 0);
      assert.equal(r.descending, false);
      if (level === 'basic') {
        assert.equal(q.a.acc, 0);
        assert.equal(q.b.acc, 0);
      }
    }
});

test('multiple augmentation does not collapse into double augmentation', () => {
  assert.equal(interval(n('F', -1), n('B', 1)).title, '三增四度');
  assert.equal(interval(n('B', 1), n('F', -1, 4)).title, '三减五度');
});
