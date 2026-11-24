export interface AudioFileHandle extends FileSystemFileHandle {
  queryPermission(options: { mode: 'read' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'read' }): Promise<PermissionState>;
}

type OpenPicker = (options: {
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<AudioFileHandle[]>;

const audioExtensions = [
  '.mp3',
  '.wav',
  '.m4a',
  '.ogg',
  '.opus',
  '.flac',
  '.aac',
  '.aiff',
  '.aif',
  '.wma',
  '.webm',
];
export const AUDIO_FILES = ['audio/*', ...audioExtensions].join(',');
export const READ_AUDIO = { mode: 'read' } as const;

export function audioPicker(includeProject: boolean) {
  const picker = (window as Window & { showOpenFilePicker?: OpenPicker }).showOpenFilePicker;
  if (!picker) return null;
  return async () => {
    const [handle] = await picker.call(window, {
      types: includeProject
        ? [
            { description: '歌曲文件', accept: { 'audio/*': audioExtensions } },
            { description: 'Notera 工程', accept: { 'application/octet-stream': ['.notera'] } },
          ]
        : [{ description: '歌曲文件', accept: { 'audio/*': audioExtensions } }],
    });
    if (!handle) throw new DOMException('No file selected', 'AbortError');
    return { handle, file: await handle.getFile() };
  };
}
