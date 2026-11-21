import 'dotenv/config';
import path from 'path';

// UPLOAD_DIR lets production keep uploads outside the code checkout (for
// example /var/lib/dicionario/uploads), so a redeploy or re-clone of the
// repository can never take the media with it.
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(__dirname, '../../uploads');
export const NEWS_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'news');
export const GAME_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'games');
export const MAP_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'maps');
export const TERM_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'terms');
