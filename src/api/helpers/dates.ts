export function addDays(dateValue: string | Date, days: number) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

export function toSqlDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function getPlanLabel(validityDays: number) {
  if (validityDays >= 365) return 'Plano Anual';
  if (validityDays >= 180) return 'Plano Semestral';
  if (validityDays >= 90) return 'Plano Trimestral';
  return 'Trial 30 dias';
}

export function getTenantContractStatus(expiresAt?: string | null, status?: string | null) {
  if (status === 'Suspenso') return 'Suspenso';
  if (!expiresAt) return status || 'Ativo';

  const today = new Date();
  const expiration = new Date(expiresAt);

  if (expiration.getTime() < today.getTime()) return 'Expirado';

  const diffDays = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 'Vencendo';

  return status || 'Ativo';
}
