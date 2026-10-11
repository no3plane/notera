import { Heading } from '../components/Heading';
import { BASE, DEGREE_NAMES, LETTERS } from '../lib/theory';
import type { PresetName } from '../lib/presets';
import type { NotePair, Page } from '../lib/types';

export function LearnPage({
  navigate,
  preset,
  onExplore,
}: {
  navigate: (page: Page) => void;
  preset: (name: PresetName) => void;
  onExplore: (pair: NotePair) => void;
}) {
  return (
    <>
      <Heading
        eyebrow="NOTES, NOT RULES TO MEMORIZE"
        description="用两条线索，把音程的名字一步步推出来。"
        side="理解之后，回到指板上验证"
      >
        理解关系，<em>就不必硬背。</em>
      </Heading>
      <div className="learn-grid">
        <div>
          <section className="lesson">
            <p className="eyebrow">01 / TWO COORDINATES</p>
            <h2>一个音程的名字，有两部分。</h2>
            <p>
              <strong>度数看音名，性质看半音。</strong> 比如 C → G♯：先数
              C、D、E、F、G，首尾都算，是五度；再数距离，8 个半音比纯五度的 7 个半音多
              1，所以是增五度。
            </p>
            <div className="family-line">
              <b>字母音名 → 几度</b>
              <span>＋</span>
              <b>半音距离 → 性质</b>
            </div>
            <button className="plain-button" onClick={() => preset('augmented')}>
              把 C → G♯ 放到指板上 ↗
            </button>
          </section>
          <section className="lesson">
            <p className="eyebrow">02 / TWO FAMILIES</p>
            <h2>把八种度数，分成两个家族。</h2>
            <p>
              <strong>一、四、五、八度</strong>以“纯”为基准。少一个半音是减，多一个半音是增。
            </p>
            <div className="family-line">
              <b>减</b>
              <span>← −1</span>
              <b>纯</b>
              <span>+1 →</span>
              <b>增</b>
            </div>
            <p>
              <strong>二、三、六、七度</strong>
              以“大”为基准。少一个半音是小，再少一个是减；多一个是增。
            </p>
            <div className="family-line">
              <b>减</b>
              <span>← −1</span>
              <b>小</b>
              <span>← −1</span>
              <b>大</b>
              <span>+1 →</span>
              <b>增</b>
            </div>
            <p>
              注意：大到减一共少 <strong>2 个半音</strong>
              。普通的一度音程不使用负的半音距离；练习以同音或上行音程为主。
            </p>
          </section>
          <section className="lesson">
            <p className="eyebrow">03 / YOUR REFERENCE</p>
            <h2>八个基准音程，可以在 C 大调里找到。</h2>
            <p>C → C、D、E、F、G、A、B、C。先把它们听熟，再试着改变目标音的升降号。</p>
            <table className="interval-table">
              <thead>
                <tr>
                  <th>音程</th>
                  <th>音名</th>
                  <th>半音数</th>
                  <th>探索</th>
                </tr>
              </thead>
              <tbody>
                {BASE.map((semitones, i) => (
                  <tr key={i}>
                    <td>
                      {[0, 3, 4, 7].includes(i) ? '纯' : '大'}
                      {DEGREE_NAMES[i]}度
                    </td>
                    <td>
                      C → {LETTERS[i % 7]}
                      {i === 7 && '（高八度）'}
                    </td>
                    <td>{semitones}</td>
                    <td>
                      <button
                        onClick={() =>
                          onExplore({
                            a: { letter: 'C', acc: 0, octave: 3 },
                            b: { letter: LETTERS[i % 7], acc: 0, octave: 3 + Math.floor(i / 7) },
                          })
                        }
                      >
                        看看 ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="lesson">
            <p className="eyebrow">04 / SAME SOUND, DIFFERENT NAME</p>
            <h2>同样 6 个半音，为什么有两个名字？</h2>
            <p>
              C → F♯：C、D、E、F，四个音名。纯四度是 5 个半音，增加 1 个，所以是
              <strong>增四度</strong>。<br />C → G♭：C、D、E、F、G，五个音名。纯五度是 7
              个半音，减少 1 个，所以是<strong>减五度</strong>。
            </p>
            <p>
              在这里采用的十二平均律中，F♯ 与 G♭
              音高相同。指板位置能告诉你半音距离，但还要看音名拼写才能确定音程名称。探索区可以直接修改升降号和字母音名。
            </p>
            <button className="plain-button" onClick={() => preset('enharmonic')}>
              去对比增四度与减五度 ↗
            </button>
          </section>
        </div>
        <aside>
          <div className="lesson-callout">
            <p className="eyebrow">A PRACTICE ROUTINE</p>
            <h2>一次只改变一件事。</h2>
            <p>
              先固定起始音 C。
              <br />把 E 改为 E♭，观察大三度变成小三度。
              <br />把 G 改为 G♯，观察纯五度变成增五度。
            </p>
            <p>然后换起始音，让同一套判断方法在别的音上也成立。</p>
            <button className="primary" onClick={() => navigate('explore')}>
              回到音程探索 →
            </button>
            <p style={{ marginTop: 30 }}>最后做一轮反应练习。遇到不会的题，先数音名，再数半音。</p>
            <button className="plain-button" onClick={() => navigate('practice')}>
              开始练习 ↗
            </button>
            <p style={{ marginTop: 36, fontSize: 10 }}>乐理参考</p>
            <a
              className="source-link"
              href="https://musictheory.pugetsound.edu/mt21c/AugmentedAndDiminishedIntervals.html"
              target="_blank"
              rel="noopener"
            >
              Music Theory for the 21st-Century Classroom ↗
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
