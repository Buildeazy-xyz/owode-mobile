export const phoneToAccountNumber = (phone?: string | null): string => {
  const d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('234')) return d.slice(3);
  if (d.startsWith('0')) return d.slice(1);
  return d;
};

export const formatAccountNumber = (acct?: string | null): string => {
  const d = (acct || '').replace(/\D/g, '');
  if (d.length !== 10) return d;
  return d.slice(0, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7);
};

export const hasProvisionedAccount = (acct?: string | null): boolean =>
  !!acct && acct.replace(/\D/g, '').length === 10;
