import { Router } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
    AdminTermAttention,
    AdminTermError,
    AdminTermState,
    archiveAdminTerm,
    createAdminTerm,
    findAdminTermDuplicates,
    getAdminTerm,
    getAdminTermHistory,
    listAdminTerms,
    permanentlyDeleteAdminTerm,
    restoreAdminTerm,
    updateAdminTerm,
} from '../../services/adminTerms';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';
import { parseTermPayload } from '../../utils/terms';
import {
    createTermMeaning,
    deleteTermMeaning,
    listPendingMeanings,
    moderateTermMeaning,
    parseMeaningPayload,
    TermMeaningError,
    updateTermMeaning,
} from '../../services/termMeanings';
import { TermStatus } from '@prisma/client';
import { listPendingForAdmin } from '../../services/termMedia';

const router = Router();

const handleError = (error: unknown, res: any) => {
    if (error instanceof AdminTermError) {
        return res.status(error.statusCode).json({ error: error.message, details: error.details });
    }
    console.error('[dashboard/terms] Request failed:', error);
    return res.status(500).json({ error: 'Falha ao processar o catalogo.' });
};

const single = (value: unknown, name: string, max = 100) => {
    if (value === undefined) return { valid: true as const, value: undefined };
    if (typeof value !== 'string') return { valid: false as const, error: `${name} deve ser um unico texto.` };
    if (value.length > max) return { valid: false as const, error: `${name} deve ter no maximo ${max} caracteres.` };
    return { valid: true as const, value: value.trim() || undefined };
};

router.get('/', async (req, res) => {
    const parsed = parsePagination(req.query, {
        allowedSorts: ['word', 'views28d', 'upvotes', 'pendingReports', 'createdAt', 'updatedAt'] as const,
        defaultSort: 'updatedAt',
        defaultOrder: 'desc',
        defaultPageSize: 20,
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const gameId = single(req.query.gameId, 'gameId');
    const tag = single(req.query.tag, 'tag', 40);
    const letter = single(req.query.letter, 'letter', 1);
    if (!gameId.valid || !tag.valid || !letter.valid) return res.status(400).json({ error: (gameId as any).error || (tag as any).error || (letter as any).error });
    if (letter.value && !/^[a-z#]$/i.test(letter.value)) return res.status(400).json({ error: 'letter deve ser uma letra de A a Z ou #.' });
    const state = typeof req.query.state === 'string' ? req.query.state : 'ACTIVE';
    if (!['ACTIVE', 'ARCHIVED'].includes(state)) return res.status(400).json({ error: 'state deve ser ACTIVE ou ARCHIVED.' });
    const attention = typeof req.query.attention === 'string' ? req.query.attention : undefined;
    if (attention && !['ANY', 'REPORTED', 'MISSING_TAGS', 'MISSING_EXAMPLES'].includes(attention)) {
        return res.status(400).json({ error: 'Filtro de atencao invalido.' });
    }
    try {
        const result = await listAdminTerms({
            search: parsed.value.search,
            gameId: gameId.value,
            tag: tag.value,
            letter: letter.value?.toUpperCase(),
            state: state as AdminTermState,
            attention: attention as AdminTermAttention | undefined,
            sort: parsed.value.sort,
            order: parsed.value.order,
            skip: parsed.value.skip,
            take: parsed.value.take,
        });
        res.json({
            items: result.items,
            summary: result.summary,
            pagination: buildPaginationMeta(result.total, parsed.value),
        });
    } catch (error) {
        handleError(error, res);
    }
});

router.get('/duplicates', async (req, res) => {
    const word = single(req.query.word, 'word');
    const excludeId = single(req.query.excludeId, 'excludeId');
    if (!word.valid || !word.value || !excludeId.valid) return res.status(400).json({ error: 'Informe uma palavra valida.' });
    try {
        res.json(await findAdminTermDuplicates(word.value, excludeId.value));
    } catch (error) {
        handleError(error, res);
    }
});

router.get('/:id/history', async (req, res) => {
    try {
        res.json(await getAdminTermHistory(req.params.id));
    } catch (error) {
        handleError(error, res);
    }
});

router.get('/:id', async (req, res) => {
    try {
        res.json(await getAdminTerm(req.params.id));
    } catch (error) {
        handleError(error, res);
    }
});

router.post('/', async (req: AuthRequest, res) => {
    const parsed = parseTermPayload(req.body);
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    try {
        res.status(201).json(await createAdminTerm(parsed.data, req.user!.id));
    } catch (error) {
        handleError(error, res);
    }
});

router.put('/:id', async (req: AuthRequest, res) => {
    const parsed = parseTermPayload(req.body, { requireDefinition: false });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const expectedRevision = Number(req.body?.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
        return res.status(400).json({ error: 'expectedRevision deve ser um inteiro positivo.' });
    }
    try {
        res.json(await updateAdminTerm(req.params.id, parsed.data, expectedRevision, req.user!.id));
    } catch (error) {
        handleError(error, res);
    }
});

router.post('/:id/archive', async (req: AuthRequest, res) => {
    try {
        res.json(await archiveAdminTerm(req.params.id, req.user!.id));
    } catch (error) {
        handleError(error, res);
    }
});

router.post('/:id/restore', async (req: AuthRequest, res) => {
    try {
        res.json(await restoreAdminTerm(req.params.id, req.user!.id));
    } catch (error) {
        handleError(error, res);
    }
});

router.delete('/:id', async (req: AuthRequest, res) => {
    const confirmation = typeof req.body?.confirmation === 'string' ? req.body.confirmation : '';
    try {
        const deleted = await permanentlyDeleteAdminTerm(req.params.id, confirmation, req.user!.id);
        res.json({ message: 'Termo excluido definitivamente.', ...deleted });
    } catch (error) {
        handleError(error, res);
    }
});

/* -------------------------------------------------------------------------- */
/* Significados (sentidos) de um termo                                        */
/* -------------------------------------------------------------------------- */

const handleMeaningError = (error: unknown, res: any) => {
    if (error instanceof TermMeaningError) return res.status(error.status).json({ error: error.message });
    console.error('[admin/terms] meaning:', error);
    res.status(500).json({ error: 'Nao foi possivel concluir a operacao.' });
};

// Fila de significados propostos pela comunidade, aguardando moderacao.
router.get('/meanings/pending', async (_req, res) => {
    try {
        res.json(await listPendingMeanings());
    } catch (error) {
        handleMeaningError(error, res);
    }
});

router.patch('/meanings/:id/status', async (req, res) => {
    const status = String(req.body?.status || '').toUpperCase();
    if (status !== TermStatus.APPROVED && status !== TermStatus.REJECTED) {
        return res.status(400).json({ error: 'Estado invalido.' });
    }
    try {
        res.json(await moderateTermMeaning(req.params.id, status as TermStatus));
    } catch (error) {
        handleMeaningError(error, res);
    }
});

router.post('/:id/meanings', async (req, res) => {
    try {
        res.status(201).json(await createTermMeaning(req.params.id, parseMeaningPayload(req.body)));
    } catch (error) {
        handleMeaningError(error, res);
    }
});

router.put('/meanings/:id', async (req, res) => {
    try {
        res.json(await updateTermMeaning(req.params.id, parseMeaningPayload(req.body)));
    } catch (error) {
        handleMeaningError(error, res);
    }
});

router.delete('/meanings/:id', async (req, res) => {
    try {
        await deleteTermMeaning(req.params.id);
        res.status(204).end();
    } catch (error) {
        handleMeaningError(error, res);
    }
});

/* -------------------------------------------------------------------------- */
/* Midias da comunidade (origem + imagens) - fila do admin, inclui flagged     */
/* -------------------------------------------------------------------------- */

router.get('/media/pending', async (_req, res) => {
    try {
        res.json(await listPendingForAdmin());
    } catch (error) {
        console.error('[admin/terms] media pending:', error);
        res.status(500).json({ error: 'Nao foi possivel carregar a fila de midias.' });
    }
});

export default router;
