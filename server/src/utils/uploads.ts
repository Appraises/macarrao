import path from 'path';

export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
export const NEWS_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'news');
export const GAME_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'games');
export const MAP_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'maps');
