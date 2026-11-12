import type { SusGuitarRoot } from '../lib/guitarSusChords';
import { ChordConnectionPractice } from './ChordConnectionPractice';

/** Retain the embedded entry while sharing the connection engine and records. */
export function GuitarSusConnection({ root }: { root: SusGuitarRoot }) {
  return <ChordConnectionPractice family="sus" fixedRoot={root} />;
}
