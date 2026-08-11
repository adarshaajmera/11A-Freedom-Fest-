/**
 * Score state, the question flow, and the hearts.
 *
 * There is no examination. Reading an exhibit banks research points and, if that
 * exhibit asks something, puts the question straight underneath what you just
 * read. Score accumulates as you walk; you file it at the ledger on the counter.
 *
 * The Inspector runs on the same question machinery, in a different place: when
 * it catches you it asks something from the area it caught you in. Right answer
 * and it lets you go; wrong and it takes one of your ten hearts.
 */

import { RULES, questionPoints, researchPoints, speedBonus, multiplier } from './scoring.js';
import { questionsFor, AREA_NAMES } from './content.js';
import { submitScore, renderBoard } from './leaderboard.js';
import * as sfx from './sound.js';

export const MAX_HEARTS = 3;

/**
 * Build a timed multiple-choice question inside `host`.
 *
 * Shared by the exhibit questions and by the Inspector, which differ only in
 * where they are mounted and what happens afterwards. Returns a `cancel` for
 * when the player walks away mid-question.
 */
function askIn(host, question, { onDone, heading }) {
  const options = question.options
    .map((_, i) => `<button type="button" class="option" data-choice="${i}"></button>`)
    .join('');

  host.innerHTML =
    `<div class="ask-head"><span>${heading}</span><span data-clock></span></div>` +
    '<div class="bar-bg"><i class="bar" data-bar data-low="no"></i></div>' +
    `<div class="question">${question.q}</div>` +
    `<div class="options">${options}</div>` +
    '<div class="feedback" data-feedback></div>';

  const buttons = [...host.querySelectorAll('.option')];
  buttons.forEach((button, i) => {
    button.innerHTML = `<b>${'ABCD'[i]}</b><span>${question.options[i]}</span>`;
  });

  const bar = host.querySelector('[data-bar]');
  const clock = host.querySelector('[data-clock]');
  const feedback = host.querySelector('[data-feedback]');

  const startedAt = performance.now();
  let raf = 0;
  let settled = false;

  const remaining = () =>
    Math.max(0, RULES.TIME_LIMIT - (performance.now() - startedAt) / 1000);

  function settle(choice) {
    if (settled) return;
    settled = true;
    cancelAnimationFrame(raf);

    const left = remaining();
    const correct = choice === question.answer;

    buttons.forEach((button, i) => {
      button.disabled = true;
      if (i === question.answer) button.classList.add('correct');
      else if (i === choice) button.classList.add('wrong');
    });

    onDone({ correct, remaining: left, timedOut: choice === -1, feedback });
  }

  function tick() {
    const left = remaining();
    const frac = left / RULES.TIME_LIMIT;
    bar.style.width = `${frac * 100}%`;
    bar.dataset.low = frac < 0.3 ? 'yes' : 'no';
    clock.textContent = `${left.toFixed(1)}s`;
    if (left <= 0) return settle(-1);
    raf = requestAnimationFrame(tick);
  }

  for (const button of buttons) {
    button.addEventListener('click', () => settle(Number(button.dataset.choice)));
  }

  raf = requestAnimationFrame(tick);

  return {
    cancel: () => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(raf);
    },
    forfeit: () => settle(-1),
  };
}

export function createPlay({ els, onCaughtResolved, onGameOver }) {
  const state = {
    points: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    hearts: MAX_HEARTS,
    caughtCount: 0,
    read: new Set(),
    answered: new Set(),
    startedAt: performance.now(),
    name: '',
    over: false,
  };

  /** The exhibit question currently on screen, if any. */
  let live = null;
  /** The Inspector's question, if we are being held. */
  let held = null;

  // ------------------------------------------------------------------ hud ---

  function renderHearts() {
    els.hearts.innerHTML = Array.from({ length: MAX_HEARTS }, (_, i) =>
      `<i class="heart${i < state.hearts ? '' : ' gone'}"></i>`
    ).join('');
    els.hearts.dataset.low = state.hearts <= 3 ? 'yes' : 'no';
  }

  function refresh() {
    els.points.textContent = state.points.toLocaleString();
    els.readCount.textContent = `${state.read.size}/${RULES.EXHIBITS}`;
    els.readFill.style.width = `${(state.read.size / RULES.EXHIBITS) * 100}%`;
    els.answered.textContent = `${state.answered.size}/${RULES.QUESTIONS}`;
    els.streak.textContent = `×${multiplier(state.streak).toFixed(2)}`;
    els.streak.dataset.hot = state.streak >= 3 ? 'yes' : 'no';
    renderHearts();
  }

  function award(correct, remaining, feedback) {
    if (correct) {
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.correct += 1;

      const gained = questionPoints(remaining, state.streak);
      state.points += gained;

      feedback.className = 'feedback good';
      feedback.textContent =
        `+${gained}  (${RULES.BASE} base + ${speedBonus(remaining)} speed` +
        `${state.streak > 1 ? ` × ${multiplier(state.streak).toFixed(2)} streak` : ''})`;
      sfx.correct();
      return gained;
    }

    state.streak = 0;
    feedback.className = 'feedback bad';
    sfx.wrong();
    return 0;
  }

  // ------------------------------------------------------------- exhibits ---

  function open(key, item, host) {
    if (state.over) return;

    if (!state.read.has(key)) {
      state.read.add(key);
      state.points += RULES.RESEARCH;
      sfx.page();
    }

    if (item.question && !state.answered.has(key)) {
      els.ask.hidden = false;
      host.append(els.ask);
      live = askIn(els.ask, item.question, {
        heading: 'WORTH ANSWERING',
        onDone: ({ correct, remaining, timedOut, feedback }) => {
          state.answered.add(key);
          if (!award(correct, remaining, feedback)) {
            feedback.textContent = timedOut
              ? `Out of time. The answer was ${item.question.options[item.question.answer]}.`
              : `Not quite — the answer was ${item.question.options[item.question.answer]}.`;
          }
          live = null;
          refresh();
        },
      });
    } else {
      // Hidden rather than detached, so it stays findable and re-parents cleanly.
      els.ask.hidden = true;
    }

    refresh();
  }

  /** Drop any live exhibit question when the player walks away from a panel. */
  function dismiss() {
    if (live) {
      // Walking off mid-question forfeits it rather than pausing: the timer is
      // the tension, and a pause would be a free way to stop the clock.
      live.forfeit();
      live = null;
    }
    els.ask.hidden = true;
  }

  // ------------------------------------------------------------ the catch ---

  /**
   * The Inspector has you. Ask something from wherever this happened.
   *
   * Catch questions are drawn fresh each time and never touch `answered` — they
   * are a toll, not part of the archive you are working through.
   */
  function caught(area) {
    if (state.over || held) return;

    const pool = questionsFor(area);
    const question = pool[Math.floor(Math.random() * pool.length)];

    els.caughtWhere.textContent = AREA_NAMES[area] ?? 'THE SHOP';
    els.caught.classList.add('open');

    held = askIn(els.caughtBody, question, {
      heading: 'ANSWER TO PASS',
      onDone: ({ correct, remaining, timedOut, feedback }) => {
        if (correct) {
          award(true, remaining, feedback);
          feedback.textContent += ' — he waves you on.';
        } else {
          state.streak = 0;
          state.hearts = Math.max(0, state.hearts - 1);
          sfx.heartLost();
          feedback.className = 'feedback bad';
          feedback.textContent =
            (timedOut ? 'Too slow. ' : `The answer was ${question.options[question.answer]}. `) +
            'He takes a heart.';
        }

        refresh();

        setTimeout(() => {
          els.caught.classList.remove('open');
          held = null;
          if (state.hearts <= 0) finish();
          else onCaughtResolved?.();
        }, correct ? 1100 : 1900);
      },
    });

    state.caughtCount += 1;
    refresh();
  }

  // ----------------------------------------------------------- game over ----

  function finish() {
    state.over = true;
    els.overPoints.textContent = state.points.toLocaleString();
    els.overLines.innerHTML = [
      ['Exhibits read', `${state.read.size} / ${RULES.EXHIBITS}`],
      ['Questions answered', `${state.answered.size} / ${RULES.QUESTIONS}`],
      ['Correct', `${state.correct}`],
      ['Longest streak', `${state.bestStreak}`],
      ['Times caught', `${state.caughtCount}`],
    ]
      .map(([k, v]) => `<div class="line"><span>${k}</span><span>${v}</span></div>`)
      .join('');
    els.over.classList.add('open');
    sfx.gameOver();
    onGameOver?.();
  }

  // --------------------------------------------------------------- ledger ---

  async function file(button, status) {
    const name = els.name.value.trim();
    if (!name) {
      els.name.focus();
      els.name.classList.add('missing');
      setTimeout(() => els.name.classList.remove('missing'), 1200);
      return;
    }

    state.name = name.slice(0, 22);
    status.textContent = 'FILING…';
    button.disabled = true;

    const result = await submitScore({
      name: state.name,
      points: state.points,
      correct: state.correct,
      total: Math.min(state.answered.size, RULES.QUESTIONS),
      seconds: Math.round((performance.now() - state.startedAt) / 1000),
      researched: state.read.size,
    });

    button.disabled = false;
    sfx.scoreFiled();
    status.textContent = result.rank
      ? `RANK ${result.rank}${result.online ? ' IN THE WORLD' : ' ON THIS DEVICE'}`
      : 'SCORE FILED';

    renderBoard(els.leaders, result.board, { highlight: state.name, online: result.online });
  }

  els.file.addEventListener('click', () => file(els.file, els.status));
  els.name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') file(els.file, els.status);
  });
  els.overFile.addEventListener('click', () => {
    els.name.value = els.overName.value;
    file(els.overFile, els.overStatus);
  });
  els.restart.addEventListener('click', () => location.reload());

  refresh();

  return { state, open, dismiss, caught, refresh, isHeld: () => Boolean(held) };
}
