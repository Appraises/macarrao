import path from 'node:path';
import { readdir, rename } from 'node:fs/promises';

const UNSAFE_FILE_SEGMENT = /[<>:"/\\|?*\u0000-\u001f]/;

export const decodeStaticFileSegment = (segment: string): string | null => {
  if (!segment.includes('%')) return null;

  try {
    const decoded = decodeURIComponent(segment);
    if (
      decoded === segment
      || decoded === '.'
      || decoded === '..'
      || decoded.endsWith('.')
      || decoded.endsWith(' ')
      || UNSAFE_FILE_SEGMENT.test(decoded)
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

const normalizeDirectoryEntries = async (directory: string): Promise<number> => {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw error;
  }

  let renamed = 0;
  for (const entry of entries) {
    const decodedName = decodeStaticFileSegment(entry.name);
    if (!decodedName) continue;
    await rename(path.join(directory, entry.name), path.join(directory, decodedName));
    renamed++;
  }
  return renamed;
};

export const normalizeStaticOutputPaths = async (outputDirectory: string): Promise<number> => {
  const directories = [
    path.join(outputDirectory, 'term'),
    path.join(outputDirectory, 'static-loader-data', 'term'),
    path.join(outputDirectory, 'og', 'term'),
  ];

  const counts = await Promise.all(directories.map(normalizeDirectoryEntries));
  return counts.reduce((total, count) => total + count, 0);
};
