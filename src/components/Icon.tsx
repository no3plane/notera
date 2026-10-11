const paths = {
  guitar: ['m7 3 2 2-1 3 4 4c3-1 5 1 4 4s-5 4-7 1c-3 1-5-1-4-4l3-4 1-3-2-2Z', 'm8 8 6 6m-4-1 3-3'],
  piano: ['M7 4v10h3V4m4 0v10h3V4M8 14v6m8-6v6'],
  steps: ['M3 20h6v-6h6V8h6V3'],
  speaker: ['m10 5-5 4H2v6h3l5 4V5Z', 'M14 8a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14'],
  play: ['m8 4 12 8-12 8V4Z'],
  shuffle: ['m3 5 4 0 10 14h4m-4-4 4 4-4 3M3 19h4L17 5h4m-4-3 4 3-4 4'],
  bulb: ['M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z'],
  headphones: [
    'M4 13v-2a8 8 0 0 1 16 0v2M4 12h3v8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Zm16 0h-3v8h3a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Z',
  ],
};
export type IconName = keyof typeof paths;
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'piano' && <rect x="3" y="4" width="18" height="16" rx="2" />}
      {paths[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
