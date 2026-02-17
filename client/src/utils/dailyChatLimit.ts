const STORAGE_KEY = 'chatbot_daily_creations';

interface DailyCreationData {
  date: string;
  count: number;
}

function getTodayDate(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function getDailyCreationCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const data: DailyCreationData = JSON.parse(raw);
    if (data.date !== getTodayDate()) return 0;
    return data.count;
  } catch {
    return 0;
  }
}

export function recordDailyCreation(): void {
  const today = getTodayDate();
  const current = getDailyCreationCount();
  const data: DailyCreationData = { date: today, count: current + 1 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
