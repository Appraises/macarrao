import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, Flag, ImageIcon, ScrollText, Upload, X } from 'lucide-react';
import { Button } from '../UI';
import { Avatar } from '../Avatar';
import { Term, PendingTermMedia, TermImage } from '../../types';
import {
    acceptTermMedia, declineTermMedia, getTermCuration, proposeOrigin, reportTermMedia,
    setTermOriginHidden, uploadTermImage,
} from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { trackAnalyticsEvent } from '../../src/lib/analytics';

const card = 'rounded-xl border border-white/5 bg-dark-900 p-6';
const heading = 'mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400';

/**
 * Origin note and image gallery for a term, plus community contribution and — for the
 * term's owners — inline curation of what others submitted. Nothing unreviewed shows
 * publicly; owners accept/decline, admins are the backstop.
 */
export const TermContributions: React.FC<{ term: Term; onChanged: () => void }> = ({ term, onChanged }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [canCurate, setCanCurate] = useState(false);
    const [pending, setPending] = useState<PendingTermMedia[]>([]);
    const [notice, setNotice] = useState('');

    const loadCuration = () => {
        if (!user) { setCanCurate(false); setPending([]); return; }
        getTermCuration(term.id)
            .then((r) => { setCanCurate(r.canCurate); setPending(r.pending); })
            .catch(() => { /* not a curator / not logged: ignore */ });
    };
    useEffect(loadCuration, [term.id, user]);

    const images = Array.isArray(term.images) ? term.images : [];
    const pendingOrigin = pending.filter((m) => m.kind === 'ORIGIN');
    const pendingImages = pending.filter((m) => m.kind === 'IMAGE');

    const curate = async (mediaId: string, accept: boolean) => {
        try {
            await (accept ? acceptTermMedia(mediaId) : declineTermMedia(mediaId));
            setPending((cur) => cur.filter((m) => m.id !== mediaId));
            onChanged();
        } catch (e: any) {
            setNotice(e?.response?.data?.error || 'Nao foi possivel concluir.');
        }
    };

    const hideOrigin = async () => {
        try { await setTermOriginHidden(term.id, true); onChanged(); }
        catch (e: any) { setNotice(e?.response?.data?.error || 'Falhou.'); }
    };

    return (
        <>
            {notice && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
                    <span>{notice}</span><button aria-label="Fechar" onClick={() => setNotice('')}><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Curadoria: itens aguardando o dono deste termo */}
            {canCurate && pending.length > 0 && (
                <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.04] p-6">
                    <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
                        <Check className="h-4 w-4 text-brand-400" /> Aguardando você
                    </h3>
                    <p className="mb-4 text-xs text-gray-500">Contribuições de outras pessoas para <span className="font-semibold text-gray-300">{term.word}</span>. Você decide o que entra.</p>
                    <div className="space-y-3">
                        {pending.map((m) => (
                            <div key={m.id} className="rounded-lg border border-white/10 bg-dark-950 p-4">
                                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                                    <span className="rounded bg-white/5 px-2 py-0.5 font-bold uppercase text-gray-400">
                                        {m.kind === 'ORIGIN' ? 'Origem' : 'Imagem'}
                                    </span>
                                    {m.flagged && <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-bold text-amber-300"><AlertTriangle className="h-3 w-3" /> Sinalizada</span>}
                                    {m.author && <span className="text-gray-500">por {m.author.name}</span>}
                                </div>
                                {m.kind === 'ORIGIN' ? (
                                    <p className="text-sm leading-relaxed text-gray-300">{m.content}</p>
                                ) : (
                                        <div className="flex gap-3">
                                            <img src={m.url || ''} alt="" className="h-24 w-32 flex-none rounded border border-white/10 object-cover" />
                                            {m.content && <p className="text-sm italic text-gray-400">"{m.content}"</p>}
                                        </div>
                                    )}
                                <div className="mt-3 flex justify-end gap-2">
                                    <button onClick={() => curate(m.id, false)} className="inline-flex h-8 items-center gap-1 rounded border border-white/10 px-3 text-xs text-gray-300 hover:bg-white/5"><X className="h-3.5 w-3.5" /> Recusar</button>
                                    <button onClick={() => curate(m.id, true)} className="inline-flex h-8 items-center gap-1 rounded bg-emerald-500/15 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"><Check className="h-3.5 w-3.5" /> Aceitar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Origem */}
            {term.origin ? (
                <div className={card}>
                    <h3 className={heading}><ScrollText className="h-4 w-4" /> Origem & curiosidades</h3>
                    <p className="text-sm leading-relaxed text-gray-300">{term.origin}</p>
                </div>
            ) : term.originHidden ? null : (
                <OriginInvite term={term} isLoggedIn={!!user} canCurate={canCurate} hasPending={pendingOrigin.length > 0}
                    onLogin={() => navigate('/login')} onHide={hideOrigin} onSent={loadCuration} onError={setNotice} />
            )}

            {/* Imagens */}
            <ImagesSection term={term} images={images} isLoggedIn={!!user} hasPending={pendingImages.length > 0}
                onLogin={() => navigate('/login')} onSent={loadCuration} onError={setNotice} />
        </>
    );
};

/* ------------------------------- Origin invite ------------------------------- */

const OriginInvite: React.FC<{
    term: Term; isLoggedIn: boolean; canCurate: boolean; hasPending: boolean;
    onLogin: () => void; onHide: () => void; onSent: () => void; onError: (m: string) => void;
}> = ({ term, isLoggedIn, canCurate, hasPending, onLogin, onHide, onSent, onError }) => {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const submit = async () => {
        setSending(true);
        try {
            await proposeOrigin(term.id, text.trim());
            trackAnalyticsEvent('Origin Proposed', { term: term.word });
            setSent(true); onSent();
        } catch (e: any) { onError(e?.response?.data?.error || 'Nao foi possivel enviar.'); }
        finally { setSending(false); }
    };

    return (
        <div className={card}>
            <h3 className={heading}><ScrollText className="h-4 w-4" /> Origem & curiosidades</h3>
            {sent ? (
                <p className="text-sm text-brand-300">Origem enviada! Aparece assim que o dono do termo aprovar.</p>
            ) : hasPending ? (
                <p className="text-sm text-gray-500">Há uma origem aguardando curadoria para este termo.</p>
            ) : open ? (
                <div>
                    <textarea rows={4} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)}
                        placeholder={`De onde vem "${term.word}"?`}
                        className="w-full rounded-lg border border-dark-700 bg-dark-950 px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-brand-500" />
                    <div className="mt-3 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={submit} disabled={sending || text.trim().length < 15}>{sending ? 'Enviando...' : 'Enviar origem'}</Button>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-sm leading-relaxed text-gray-400">
                        De onde vem <span className="font-bold text-gray-200">{term.word}</span>? Conte a história por trás do termo.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button onClick={() => (isLoggedIn ? setOpen(true) : onLogin())}>Adicionar origem</Button>
                        {canCurate && (
                            <button onClick={onHide} className="text-xs text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline">
                                Este termo não precisa de origem
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

/* -------------------------------- Images ---------------------------------- */

const ImagesSection: React.FC<{
    term: Term; images: NonNullable<Term['images']>; isLoggedIn: boolean; hasPending: boolean;
    onLogin: () => void; onSent: () => void; onError: (m: string) => void;
}> = ({ term, images, isLoggedIn, hasPending, onLogin, onSent, onError }) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [caption, setCaption] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [reporting, setReporting] = useState<TermImage | null>(null);

    const pick = () => (isLoggedIn ? fileRef.current?.click() : onLogin());

    const submit = async () => {
        if (!file) return;
        setSending(true);
        try {
            await uploadTermImage(term.id, file, caption.trim() || undefined);
            trackAnalyticsEvent('Image Submitted', { term: term.word });
            setSent(true); setFile(null); setCaption(''); onSent();
        } catch (e: any) { onError(e?.response?.data?.error || 'Nao foi possivel enviar a imagem.'); }
        finally { setSending(false); }
    };

    return (
        <div className={card}>
            <div className="mb-4 flex items-center justify-between">
                <h3 className={`${heading} mb-0`}><ImageIcon className="h-4 w-4" /> Imagens & referências</h3>
                {images.length > 0 && (
                    <button onClick={pick} className="text-xs font-medium text-brand-400 hover:text-brand-300">+ Enviar</button>
                )}
            </div>

            {images.length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((img) => (
                        <figure key={img.id} className="group relative overflow-hidden rounded-lg border border-white/10">
                            <img src={img.url} alt={img.content || `${term.word} — referência`} className="aspect-video w-full object-cover" />
                            <button
                                onClick={() => setReporting(img)}
                                title="Denunciar imagem"
                                aria-label="Denunciar imagem"
                                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded bg-dark-950/80 text-gray-400 opacity-0 transition-opacity hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                            >
                                <Flag className="h-3.5 w-3.5" />
                            </button>
                            {(img.content || img.author) && (
                                <figcaption className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-gray-500">
                                    {img.author && <Avatar name={img.author.name} src={img.author.avatar} size={14} className="flex-none" />}
                                    <span className="truncate">{img.content || img.author?.name}</span>
                                </figcaption>
                            )}
                        </figure>
                    ))}
                </div>
            )}

            {reporting && <ReportImageModal image={reporting} onClose={() => setReporting(null)} onError={onError} />}

            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />

            {sent ? (
                <p className="text-sm text-brand-300">Imagem enviada! Aparece quando o dono do termo aceitar.</p>
            ) : file ? (
                <div className="rounded-lg border border-dark-700 bg-dark-950 p-3">
                    <p className="mb-2 truncate text-xs text-gray-400">{file.name}</p>
                    <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={140} placeholder="Legenda (opcional) — ex.: ponto no mapa Ascent"
                        className="mb-3 w-full rounded border border-dark-700 bg-dark-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand-500" />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setFile(null)}>Cancelar</Button>
                        <Button onClick={submit} disabled={sending}>{sending ? 'Enviando...' : 'Enviar imagem'}</Button>
                    </div>
                </div>
            ) : images.length === 0 ? (
                <>
                    <p className="text-sm leading-relaxed text-gray-400">
                        Um print, um clipe ou um ponto no mapa que ilustra <span className="font-bold text-gray-200">{term.word}</span> vale mais que mil palavras.
                    </p>
                    <div className="mt-4">
                        <Button onClick={pick}><Upload className="mr-1.5 inline h-4 w-4" /> Enviar imagem</Button>
                    </div>
                    {hasPending && <p className="mt-2 text-xs text-gray-600">Há imagens aguardando curadoria.</p>}
                </>
            ) : null}
        </div>
    );
};

/* ----------------------------- Report an image ----------------------------- */

const REASONS = [
    { value: 'ofensivo', label: 'Conteúdo ofensivo ou impróprio' },
    { value: 'irrelevante', label: 'Não tem a ver com o termo' },
    { value: 'spam', label: 'Spam ou propaganda' },
    { value: 'direitos', label: 'Viola direitos autorais' },
    { value: 'outro', label: 'Outro' },
];

const ReportImageModal: React.FC<{ image: TermImage; onClose: () => void; onError: (m: string) => void }> = ({ image, onClose, onError }) => {
    const [reason, setReason] = useState('ofensivo');
    const [details, setDetails] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const submit = async () => {
        setSending(true);
        try {
            await reportTermMedia(image.id, reason, details.trim() || undefined);
            setSent(true);
        } catch (e: any) {
            onError(e?.response?.data?.error || 'Nao foi possivel enviar a denuncia.');
            onClose();
        } finally { setSending(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md rounded-xl border border-dark-700 bg-dark-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {sent ? (
                    <div className="py-2 text-center">
                        <Flag className="mx-auto mb-3 h-9 w-9 text-brand-500" />
                        <p className="font-bold text-white">Denúncia enviada</p>
                        <p className="mt-1 text-sm text-gray-400">A moderação vai revisar esta imagem. Obrigado.</p>
                        <div className="mt-5"><Button onClick={onClose}>Fechar</Button></div>
                    </div>
                ) : (
                    <>
                        <h3 className="mb-1 text-lg font-bold text-white">Denunciar imagem</h3>
                        <p className="mb-4 text-sm text-gray-400">O que há de errado com esta imagem?</p>
                        <img src={image.url} alt="" className="mb-4 h-28 w-full rounded border border-white/10 object-cover" />
                        <select value={reason} onChange={(e) => setReason(e.target.value)}
                            className="mb-3 w-full rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand-500">
                            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={500}
                            placeholder="Detalhes (opcional)"
                            className="mb-4 w-full resize-none rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand-500" />
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button onClick={submit} disabled={sending}>{sending ? 'Enviando...' : 'Enviar denúncia'}</Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
