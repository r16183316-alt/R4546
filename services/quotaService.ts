
import { QuotaData } from '../types';

const QUOTA_KEY = 'gemini_enhancer_quota';
const DAILY_LIMIT = 300;

export const quotaService = {
  getQuota: (): QuotaData => {
    const stored = localStorage.getItem(QUOTA_KEY);
    const today = new Date().toDateString();

    if (stored) {
      const data: QuotaData = JSON.parse(stored);
      if (new Date(data.lastReset).toDateString() !== today) {
        // New day, reset quota
        const newData = { used: 0, limit: DAILY_LIMIT, lastReset: new Date().toISOString() };
        quotaService.saveQuota(newData);
        return newData;
      }
      return data;
    }

    const initialData = { used: 0, limit: DAILY_LIMIT, lastReset: new Date().toISOString() };
    quotaService.saveQuota(initialData);
    return initialData;
  },

  saveQuota: (data: QuotaData) => {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(data));
  },

  useQuota: (): boolean => {
    const quota = quotaService.getQuota();
    if (quota.used >= quota.limit) return false;

    quota.used += 1;
    quotaService.saveQuota(quota);
    return true;
  },

  getRemaining: (): number => {
    const quota = quotaService.getQuota();
    return Math.max(0, quota.limit - quota.used);
  }
};
