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

export function findPersonByAnswer(input: string, people: Person[]): Person | null {
  const matches = people.filter((person) => isCorrectAnswer(input, person));
  return matches.length === 1 ? matches[0] : null;
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

export function pickNextPerson(people: Person[], random = Math.random): Person | null {
  if (!people.length) return null;
  return people[Math.floor(random() * people.length)];
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function makeChoices(correct: Person, people: Person[], random = Math.random): Person[] {
  const wrong = shuffle(people.filter((person) => person.id !== correct.id), random).slice(0, 3);
  return shuffle([correct, ...wrong], random);
}
