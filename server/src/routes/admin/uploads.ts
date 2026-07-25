import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { PUBLIC_API_URL } from '../../utils/config';
import { MediaFolder, resolveMediaUrl, storeImage } from '../../services/media';

const router = Router();
const allowedFolders = new Set<MediaFolder>(['games', 'maps']);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 }
});

const acceptSingleImage = (req: Request, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'A imagem deve ter no maximo 8 MB.'
                : 'Nao foi possivel processar o upload.';
            return res.status(400).json({ error: message });
        }
        if (error) return res.status(400).json({ error: 'Arquivo de imagem invalido.' });
        next();
    });
};

router.post('/:folder', acceptSingleImage, async (req, res) => {
    const folder = req.params.folder as MediaFolder;
    if (!allowedFolders.has(folder)) {
        return res.status(400).json({ error: 'Destino de upload invalido.' });
    }
    if (!req.file) return res.status(400).json({ error: 'Selecione uma imagem.' });

    try {
        const stored = await storeImage(req.file, folder);
        if (!stored) {
            return res.status(400).json({ error: 'Use uma imagem PNG, JPEG, GIF ou WebP valida.' });
        }
        const baseUrl = PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
        res.status(201).json({
            url: resolveMediaUrl(stored.pathname, baseUrl),
            mimeType: stored.mimeType,
            size: stored.size
        });
    } catch (error) {
        console.error('[admin/uploads] Upload failed:', error);
        res.status(500).json({ error: 'Falha ao salvar a imagem.' });
    }
});

export default router;
