import { z } from 'zod'

export const parseNumber = (val: unknown): number | undefined => {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === 'string') {
    const parsed = Number(val.replace(',', '.'));
    return isNaN(parsed) ? undefined : parsed;
  }
  return Number(val);
};
