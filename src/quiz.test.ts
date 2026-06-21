import { describe, expect, it } from 'vitest';
import { calculateNextReview, createInitialStats, isCorrectAnswer, makeChoices, normalizeAnswer, pickNextPerson } from './quiz';
import type { Person } from './types';

const person: Person = { id:'1', firstName:'太郎', lastName:'佐藤', displayName:'佐藤 太郎', kana:'さとう たろう', team:'infra', memo:'', aliases:['佐藤さん','satou','サトウ'], imageDataUrl:'x', createdAt:'', updatedAt:'', stats:createInitialStats(new Date('2026-01-01T00:00:00Z')) };

describe('normalizeAnswer', () => {
  it('removes spaces, honorifics, case differences and converts katakana', () => {
    expect(normalizeAnswer(' サトウ　さん ')).toBe('さとう');
    expect(normalizeAnswer('SATOU')).toBe('satou');
  });
});

describe('isCorrectAnswer', () => {
  it('accepts display name, base names, kana and aliases', () => {
    expect(isCorrectAnswer('佐藤太郎', person)).toBe(true);
    expect(isCorrectAnswer('サトウ', person)).toBe(true);
    expect(isCorrectAnswer('satou', person)).toBe(true);
    expect(isCorrectAnswer('田中', person)).toBe(false);
  });
});

describe('calculateNextReview', () => {
  it('schedules first correct answer one day later', () => {
    const next = calculateNextReview(createInitialStats(new Date('2026-01-01T00:00:00Z')), true, new Date('2026-01-01T00:00:00Z'));
    expect(next.totalAttempts).toBe(1);
    expect(next.correctAttempts).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.nextReviewAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('resets wrong answers and schedules after ten minutes', () => {
    const next = calculateNextReview({ ...createInitialStats(new Date('2026-01-01T00:00:00Z')), consecutiveCorrect: 2, easeFactor: 1.4 }, false, new Date('2026-01-01T00:00:00Z'));
    expect(next.wrongAttempts).toBe(1);
    expect(next.consecutiveCorrect).toBe(0);
    expect(next.easeFactor).toBe(1.3);
    expect(next.nextReviewAt).toBe('2026-01-01T00:10:00.000Z');
  });
});

describe('pickNextPerson', () => {
  const people = ['1', '2', '3', '4'].map((id) => ({ ...person, id }));

  it('selects uniformly from all registered people', () => {
    expect(pickNextPerson(people, () => 0)?.id).toBe('1');
    expect(pickNextPerson(people, () => 0.25)?.id).toBe('2');
    expect(pickNextPerson(people, () => 0.5)?.id).toBe('3');
    expect(pickNextPerson(people, () => 0.75)?.id).toBe('4');
  });

  it('returns null when nobody is registered', () => {
    expect(pickNextPerson([], () => 0)).toBeNull();
  });
});

describe('makeChoices', () => {
  it('returns the correct person and three distinct random alternatives', () => {
    const people = ['1', '2', '3', '4', '5'].map((id) => ({ ...person, id }));
    const choices = makeChoices(people[0], people, () => 0);

    expect(choices).toHaveLength(4);
    expect(new Set(choices.map(({ id }) => id)).size).toBe(4);
    expect(choices.some(({ id }) => id === people[0].id)).toBe(true);
  });
});
