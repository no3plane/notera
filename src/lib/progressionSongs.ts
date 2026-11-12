import { progressionCode } from './chordProgressions';
import type { ChordProgression } from './chordProgressions';

export interface ProgressionSong {
  title: string;
  artist: string;
  section: string;
  /** Chords in the linked arrangement, before transposing to the practice key. */
  chords: string;
  source: string;
  note?: string;
}

// Checked against the linked charts on 2026-11-12. These are local passages,
// not claims about an entire recording or its exact rhythm/voicing.
const SONGS: Record<string, ProgressionSong[]> = {
  '1451': [
    {
      title: '传奇',
      artist: '王菲',
      section: '前奏、主歌开头',
      chords: 'E → A → B → E',
      source: 'https://chord4.com/tabs/11752',
    },
    {
      title: '不将就',
      artist: '李荣浩',
      section: '主歌开头',
      chords: 'C → F → G → C',
      source: 'https://chord4.com/tabs/3247',
    },
  ],
  '1564': [
    {
      title: '简单爱',
      artist: '周杰伦',
      section: '前奏、主歌',
      chords: 'C → G7 → Am → F',
      source: 'https://chord4.com/tabs/12826',
      note: '谱例五级为属七和弦。',
    },
    {
      title: '故乡',
      artist: '许巍',
      section: '副歌开头',
      chords: 'G → D → Em → C',
      source: 'https://chord4.com/tabs/109',
    },
    {
      title: '淋雨一直走',
      artist: '张韶涵',
      section: '主要循环',
      chords: 'E → B → C♯m → A',
      source: 'https://www.jitashe.org/tab/56722/',
    },
  ],
  '251': [
    {
      title: '月亮代表我的心',
      artist: '邓丽君',
      section: '桥段、句尾收束',
      chords: 'Dm → G → C',
      source: 'https://chord4.com/tabs/34462',
    },
    {
      title: '泡沫',
      artist: '邓紫棋',
      section: '主歌句尾',
      chords: 'Dm → G7 → C',
      source: 'https://chord4.com/tabs/2341',
      note: '谱例五级为属七和弦。',
    },
  ],
  '1645': [
    {
      title: '童话',
      artist: '光良',
      section: '前奏、主歌',
      chords: 'F → Dm → B♭ → C',
      source: 'https://chord4.com/tabs/12428',
    },
    {
      title: '最重要的小事',
      artist: '五月天',
      section: '主歌、间奏',
      chords: 'C → Am7 → F → G',
      source: 'https://chord4.com/tabs/11082',
      note: '谱例六级有小七和弦配法。',
    },
    {
      title: '童年',
      artist: '罗大佑',
      section: '所链弹唱谱的开头',
      chords: 'G → Em → C → D',
      source: 'https://www.guitarworld.com.cn/pu/q40961',
      note: '参考所链入门弹唱编配。',
    },
  ],
  '1625': [
    {
      title: '春天里',
      artist: '旭日阳刚',
      section: '主歌、副歌',
      chords: 'D → Bm → Em → A',
      source: 'https://chord4.com/tabs/12791',
      note: '此谱注明采用旭日阳刚演唱版；原作为汪峰。',
    },
    {
      title: '吻别',
      artist: '张学友',
      section: '副歌首句',
      chords: 'G → Em → Am7 → D',
      source: 'https://chord4.com/tabs/1135',
      note: '谱例二级为小七和弦。',
    },
  ],
  '6415': [
    {
      title: '平凡之路',
      artist: '朴树',
      section: '副歌主要循环',
      chords: 'Em → C → G → D',
      source: 'https://chord4.com/tabs/2525',
    },
    {
      title: '再见',
      artist: '邓紫棋',
      section: '前奏、主歌及副歌',
      chords: 'Em → C → G → D',
      source: 'https://chord4.com/tabs/35770',
      note: '主歌另有 Em7、Cadd9、D/F♯ 配法。',
    },
  ],
  // 6154 and 4365 intentionally have no song claims until verified.
  '1545': [
    {
      title: '那些花儿',
      artist: '范玮琪',
      section: '副歌后半句',
      chords: 'C → G → F → G',
      source: 'https://chord4.com/tabs/1696',
    },
    {
      title: '不将就',
      artist: '李荣浩',
      section: '主歌后半句',
      chords: 'C → G/B → F → G',
      source: 'https://chord4.com/tabs/3247',
      note: '谱例第二个和弦为五级转位 G/B。',
    },
  ],
  '1345': [
    {
      title: '成都',
      artist: '赵雷',
      section: '主歌开头',
      chords: 'C → Em → Fmaj7 → G',
      source: 'https://www.jita.com/doc/nebiug49cv',
      note: '谱例四级为大七和弦。',
    },
    {
      title: '月亮代表我的心',
      artist: '邓丽君',
      section: '所链弹唱谱的间奏',
      chords: 'C → Em → F → G',
      source: 'https://chord4.com/tabs/34462',
    },
  ],
  '4536': [
    {
      title: '知足',
      artist: '五月天',
      section: '副歌前半',
      chords: 'F → G/F → Em7 → Am7',
      source: 'https://chord4.com/tabs/11802',
      note: '谱例含转位与七和弦。',
    },
    {
      title: '突然好想你',
      artist: '五月天',
      section: '副歌前半',
      chords: 'F → G → Em → Am7',
      source: 'https://chord4.com/tabs/37',
    },
    {
      title: '后来',
      artist: '刘若英',
      section: '副歌后半的起始片段',
      chords: 'F → G → Em → Am7',
      source: 'https://chord4.com/tabs/12230',
    },
  ],
  '4536251': [
    {
      title: '知足',
      artist: '五月天',
      section: '副歌首句',
      chords: 'F → G/F → Em7 → Am7 → Dm7 → G7 → C',
      source: 'https://chord4.com/tabs/11802',
      note: '谱例含转位与七和弦。',
    },
    {
      title: '突然好想你',
      artist: '五月天',
      section: '副歌首句',
      chords: 'F → G → Em → Am7 → Dm7 → G → C',
      source: 'https://chord4.com/tabs/37',
    },
    {
      title: '后来',
      artist: '刘若英',
      section: '副歌后半',
      chords: 'F → G → Em → Am7 → Dm7 → G → C',
      source: 'https://chord4.com/tabs/12230',
    },
  ],
  '15634145': [
    {
      title: '简单爱',
      artist: '周杰伦',
      section: '副歌',
      chords: 'C → G7 → Am → Em → F → C → F → G7',
      source: 'https://chord4.com/tabs/12826',
      note: '谱例五级为属七和弦。',
    },
    {
      title: '红日',
      artist: '李克勤',
      section: '主歌第一段',
      chords: 'C → G → Am → Em → F → C → F → G',
      source: 'https://chord4.com/tabs/22469',
    },
  ],
  'minor:251': [
    {
      title: '手写的从前',
      artist: '周杰伦',
      section: '副歌中的小调解决',
      chords: 'Bm7♭5 → E7 → Am',
      source: 'https://chord4.com/tabs/10798',
    },
    {
      title: '秋意浓',
      artist: '张学友',
      section: '主歌末句',
      chords: 'Bm7♭5 → E → Am',
      source: 'https://chord4.com/tabs/1138',
      note: '谱例属和弦为 E；本练习采用加七音的 E7 配法。',
    },
  ],
  'minor:1451': [
    {
      title: '白桦林',
      artist: '朴树',
      section: '副歌末句',
      chords: 'Em → Am → B7 → Em',
      source: 'https://chord4.com/tabs/4239',
    },
    {
      title: '贝加尔湖畔',
      artist: '李健',
      section: '主歌末句、副歌末句',
      chords: 'Am → Dm → E → Am',
      source: 'https://www.jita.com/doc/m9oi4mk839',
      note: '谱例属和弦为 E；本练习采用加七音的 E7 配法。',
    },
  ],
};

export function songsForProgression(pattern: ChordProgression): readonly ProgressionSong[] {
  return SONGS[`${pattern.minor ? 'minor:' : ''}${progressionCode(pattern)}`] ?? [];
}
