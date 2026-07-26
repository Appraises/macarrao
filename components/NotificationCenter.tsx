import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../src/context/NotificationsContext';

export const NotificationCenter: React.FC = () => {
  const { items, unreadCount, loading, markClicked, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const openNotification = async (id: string, link: string) => {
    await markClicked(id).catch(() => undefined);
    setOpen(false);
    navigate(link);
  };

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`} aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-black text-dark-950">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && <div className="fixed inset-x-3 top-20 z-[90] max-h-[75vh] overflow-hidden rounded-lg border border-white/10 bg-dark-900 shadow-2xl md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-3 md:w-[380px]">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><h2 className="font-bold text-white">Notificações</h2><p className="text-xs text-gray-500">{unreadCount} não lida{unreadCount === 1 ? '' : 's'}</p></div>{unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300"><CheckCheck className="h-4 w-4" /> Marcar todas</button>}</header>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && items.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">Carregando...</div> : items.length === 0 ? <div className="p-10 text-center"><Inbox className="mx-auto h-8 w-8 text-gray-700" /><p className="mt-3 text-sm text-gray-500">Nenhuma notificação ainda.</p></div> : items.map((item) => <button type="button" key={item.id} onClick={() => void openNotification(item.id, item.link)} className={`block w-full border-b border-white/5 px-4 py-4 text-left transition-colors hover:bg-white/5 ${item.readAt ? 'opacity-65' : 'bg-brand-500/[0.04]'}`}><div className="flex gap-3"><span className={`mt-1 h-2 w-2 flex-none rounded-full ${item.readAt ? 'bg-gray-700' : 'bg-brand-400'}`} /><div className="min-w-0"><p className="text-sm font-bold text-white">{item.title}</p><p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-400">{item.message}</p><p className="mt-2 text-xs text-gray-600">{new Date(item.createdAt).toLocaleString('pt-BR')}</p></div></div></button>)}
        </div>
      </div>}
    </div>
  );
};
