export const PROGRESSION_GROUPS = ['基础连接', '流行循环', '长进行', '小调进行'] as const;
export type ProgressionGroup = (typeof PROGRESSION_GROUPS)[number];
export interface ChordProgression {
  degrees: number[];
  group: ProgressionGroup;
  description: string;
  minor?: boolean;
}

// Keep the first three positions stable for existing saved practice settings.
export const CHORD_PROGRESSIONS: ChordProgression[] = [
  { degrees: [1, 4, 5, 1], group: '基础连接', description: '基础回归' },
  { degrees: [1, 5, 6, 4], group: '流行循环', description: '经典流行' },
  { degrees: [2, 5, 1], group: '基础连接', description: '收束解决' },
  { degrees: [1, 6, 4, 5], group: '流行循环', description: '经典老歌' },
  { degrees: [1, 6, 2, 5], group: '基础连接', description: '回转连接' },
  { degrees: [6, 4, 1, 5], group: '流行循环', description: '小和弦起步' },
  { degrees: [6, 1, 5, 4], group: '流行循环', description: '换序循环' },
  { degrees: [1, 5, 4, 5], group: '基础连接', description: '三和弦切换' },
  { degrees: [1, 3, 4, 5], group: '流行循环', description: '逐步推进' },
  { degrees: [4, 5, 3, 6], group: '流行循环', description: '四级起步' },
  { degrees: [4, 3, 6, 5], group: '流行循环', description: '柔和转折' },
  { degrees: [4, 5, 3, 6, 2, 5, 1], group: '长进行', description: '完整收束' },
  { degrees: [1, 5, 6, 3, 4, 1, 4, 5], group: '长进行', description: '卡农式进行' },
  { degrees: [7, 3, 6], group: '小调进行', description: '小调收束', minor: true },
  { degrees: [6, 2, 3, 6], group: '小调进行', description: '小调回归', minor: true },
];

// Minor progressions use the relative minor's tonic as 1 in the interface.
export const progressionDegree = (degree: number, minor = false) =>
  minor ? ((degree + 1) % 7) + 1 : degree;
export const progressionCode = (pattern: ChordProgression) =>
  pattern.degrees.map((degree) => progressionDegree(degree, pattern.minor)).join('');
export const PROGRESSIONS = CHORD_PROGRESSIONS.map((pattern) => pattern.degrees);
