export type ReviewStats = {
  totalAttempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  consecutiveCorrect: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  easeFactor: number;
  intervalDays: number;
};

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  kana: string;
  team: string;
  memo: string;
  aliases: string[];
  imageDataUrl: string;
  createdAt: string;
  updatedAt: string;
  stats: ReviewStats;
};

export type QuizMode = 'input' | 'multiple';
