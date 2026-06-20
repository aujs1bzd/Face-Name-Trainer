import type { Person, ReviewStats } from './types';

const HONORIFICS = ['さん', '様', 'さま', 'くん', '君', 'ちゃん', '殿', '氏', '先生'];

export function katakanaToHiragana(value: string): string {
  return value.replace(/[ァ-ン]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

export function normalizeAnswer(value: string): string {
  let normalized = katakanaToHiragana(value.trim().replace(/　/g, ' ').toLowerCase()).replace(/\s+/g, '');
  for (const honorific of HONORIFICS) {
    const normalizedHonorific = katakanaToHiragana(honorific.toLowerCase());
    if (normalized.endsWith(normalizedHonorific)) {
      normalized = normalized.slice(0, -normalizedHonorific.length);
      break;
    }
  }
  return normalized;
}

export function isCorrectAnswer(input: string, person: Person): boolean {
  const acceptable = [person.displayName, person.lastName, person.firstName, person.kana, ...person.aliases]
    .filter(Boolean)
    .map(normalizeAnswer);
  return acceptable.includes(normalizeAnswer(input));
}

export function createInitialStats(now = new Date()): ReviewStats {
  return {
    totalAttempts: 0,
    correctAttempts: 0,
    wrongAttempts: 0,
    consecutiveCorrect: 0,
    lastReviewedAt: null,
    nextReviewAt: now.toISOString(),
    easeFactor: 2.5,
    intervalDays: 0,
  };
}

export function calculateNextReview(stats: ReviewStats, correct: boolean, now = new Date()): ReviewStats {
  if (!correct) {
    const next = new Date(now.getTime() + 10 * 60 * 1000);
    return {
      ...stats,
      totalAttempts: stats.totalAttempts + 1,
      wrongAttempts: stats.wrongAttempts + 1,
      consecutiveCorrect: 0,
      lastReviewedAt: now.toISOString(),
      nextReviewAt: next.toISOString(),
      easeFactor: Math.max(1.3, Number((stats.easeFactor - 0.2).toFixed(2))),
      intervalDays: 0,
    };
  }

  const consecutiveCorrect = stats.consecutiveCorrect + 1;
  let intervalDays = 1;
  if (consecutiveCorrect === 2) intervalDays = 3;
  else if (consecutiveCorrect === 3) intervalDays = 7;
  else if (consecutiveCorrect >= 4) intervalDays = Math.max(1, Math.ceil(Math.max(stats.intervalDays, 1) * stats.easeFactor));
  const next = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return {
    ...stats,
    totalAttempts: stats.totalAttempts + 1,
    correctAttempts: stats.correctAttempts + 1,
    consecutiveCorrect,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: next.toISOString(),
    intervalDays,
  };
}

export function pickNextPerson(people: Person[], now = new Date()): Person | null {
  if (!people.length) return null;
  const due = people.filter((person) => new Date(person.stats.nextReviewAt) <= now);
  const pool = due.length ? due : [...people].sort((a, b) => +new Date(a.stats.nextReviewAt) - +new Date(b.stats.nextReviewAt)).slice(0, 3);
  const weighted = pool.flatMap((person) => Array(Math.max(1, person.stats.wrongAttempts + (new Date(person.stats.nextReviewAt) <= now ? 2 : 0))).fill(person));
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export function makeChoices(correct: Person, people: Person[]): Person[] {
  const wrong = people.filter((p) => p.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
  return [correct, ...wrong].sort(() => Math.random() - 0.5);
}
