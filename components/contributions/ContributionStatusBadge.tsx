import React from 'react';
import type { ContributionRejectionReason, TermModerationEventType, TermStatus } from '../../types';

export const STATUS_LABELS: Record<TermStatus, string> = {
  PENDING: 'Pendente',
  CHANGES_REQUESTED: 'Revisão solicitada',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
};

export const EVENT_LABELS: Record<TermModerationEventType, string> = {
  SUBMITTED: 'Contribuição enviada',
  AUTHOR_UPDATED: 'Conteúdo atualizado',
  CHANGES_REQUESTED: 'Revisão solicitada',
  RESUBMITTED: 'Correção reenviada',
  APPROVED: 'Contribuição aprovada',
  REJECTED: 'Contribuição rejeitada',
  MIGRATED: 'Conteúdo importado',
};

export const REJECTION_REASON_LABELS: Record<ContributionRejectionReason, string> = {
  DUPLICATE: 'Termo duplicado',
  INACCURATE: 'Informação incorreta',
  OUT_OF_SCOPE: 'Fora do escopo',
  INSUFFICIENT_DETAIL: 'Detalhes insuficientes',
  INAPPROPRIATE: 'Conteúdo inadequado',
  SPAM: 'Spam',
  OTHER: 'Outro motivo',
};

const styles: Record<TermStatus, string> = {
  PENDING: 'border-yellow-500/25 bg-yellow-500/10 text-yellow-300',
  CHANGES_REQUESTED: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
  APPROVED: 'border-green-500/25 bg-green-500/10 text-green-300',
  REJECTED: 'border-red-500/25 bg-red-500/10 text-red-300',
};

export const ContributionStatusBadge: React.FC<{ status: TermStatus }> = ({ status }) => (
  <span className={`inline-flex min-h-7 items-center rounded border px-2.5 py-1 text-xs font-bold ${styles[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);
