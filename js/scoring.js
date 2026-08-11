/**
 * The scoring rules, in one place.
 *
 * This file is imported by the Worker (to bound what it will accept) and served
 * to the browser (to compute what the player earns). Keeping one copy is the
 * point: if the two drifted, the server would start rejecting scores the game
 * legitimately handed out.
 *
 * The counts come from `content.js` rather than being written down twice, so
 * adding an exhibit cannot silently break the server's ceiling.
 */

import { EXHIBIT_COUNT, QUESTION_COUNT } from './content.js';

export const RULES = {
  /** Exhibits in the shop, each worth RESEARCH on first read. */
  EXHIBITS: EXHIBIT_COUNT,

  /** How many of those exhibits ask a question. */
  QUESTIONS: QUESTION_COUNT,

  /** Flat award for a correct answer. */
  BASE: 100,

  /** Seconds allowed per question before the speed bonus reaches zero. */
  TIME_LIMIT: 20,

  /** Maximum speed bonus, earned by answering instantly. */
  MAX_SPEED: 100,

  /** Each consecutive correct answer adds this, up to MAX_MULTIPLIER. */
  STREAK_STEP: 0.25,
  MAX_MULTIPLIER: 2,

  /** Awarded the first time each exhibit is read. */
  RESEARCH: 40,
};

/** Speed bonus for answering a question with `remaining` seconds left. */
export function speedBonus(remaining) {
  const frac = Math.max(0, Math.min(1, remaining / RULES.TIME_LIMIT));
  return Math.round(RULES.MAX_SPEED * frac);
}

/** Multiplier for a run of `streak` consecutive correct answers (1-based). */
export function multiplier(streak) {
  if (streak < 1) return 1;
  return Math.min(RULES.MAX_MULTIPLIER, 1 + (streak - 1) * RULES.STREAK_STEP);
}

/** Points for one correct answer, given time left and the streak it continues. */
export function questionPoints(remaining, streak) {
  return Math.round((RULES.BASE + speedBonus(remaining)) * multiplier(streak));
}

/** Points awarded for exhibits read. */
export function researchPoints(researched) {
  const capped = Math.max(0, Math.min(RULES.EXHIBITS, researched | 0));
  return capped * RULES.RESEARCH;
}

/**
 * The highest score physically reachable with `correct` correct answers and
 * `researched` exhibits read — every answer instant, every one extending the
 * streak. The Worker rejects anything above this.
 */
export function maxAttainable(correct, researched) {
  const best = (RULES.BASE + RULES.MAX_SPEED) * RULES.MAX_MULTIPLIER;
  return Math.max(0, correct | 0) * best + researchPoints(researched);
}
