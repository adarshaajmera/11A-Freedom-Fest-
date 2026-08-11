/**
 * The puzzles.
 *
 * One per area, and each answer is somewhere in that area's exhibits — the
 * chronology on the memorial plinths, the cell count on a jail wall, the shift
 * cipher the safe house teaches. Reading is not decoration: it is how you get
 * the answer.
 *
 * Solving a puzzle yields a seal. Seven seals open the final lock in the
 * memorial hall, and that is the win.
 *
 * Every puzzle is DOM rather than 3D. A combination dial you can actually read
 * beats a beautiful one you have to squint at, and it keeps the whole thing
 * usable on a phone.
 */

export const PUZZLES = {
  // ------------------------------------------------------------------ shop --
  shop: {
    seal: 'PRESS',
    station: 'THE DATE STAMP',
    title: 'Set the date stamp',
    blurb:
      'The counter stamp is set to the wrong year. Set it to the year of the ' +
      'train action at Kakori — it is on the rack, front page, VOL. I.',
    kind: 'dial',
    digits: 4,
    answer: '1925',
    hint: 'The print rack. The last issue on it.',
  },

  // ------------------------------------------------------------- composing --
  composing: {
    seal: 'FORME',
    station: 'THE COMPOSING FORME',
    title: 'Lock up the forme',
    blurb:
      'The type for the association’s 1925 manifesto has been knocked out of ' +
      'order. Put the words back in sequence.',
    kind: 'order',
    items: ['THE', 'REVOLUTIONARY'],
    scramble: [1, 0],
    hint: 'The composing bench, second plate.',
  },

  // ------------------------------------------------------------------ jail --
  jail: {
    seal: 'CELL',
    station: 'THE WING LOCK',
    title: 'The wing lock',
    blurb:
      'The lock takes the number of cells this jail was built with. It is ' +
      'written up on one of the cell walls.',
    kind: 'dial',
    digits: 3,
    answer: '696',
    hint: 'Cell 02.',
  },

  // ------------------------------------------------------------------ yard --
  yard: {
    seal: 'KOLHU',
    station: 'THE QUOTA BOARD',
    title: 'The day’s quota',
    blurb:
      'The overseer’s board lists the yard’s work. Mark only the labour ' +
      'prisoners were actually set to here.',
    kind: 'select',
    options: [
      'Turning the oil mill',
      'Weaving silk',
      'Pounding coir',
      'Cutting stone',
      'Printing forms',
    ],
    answer: [0, 2],
    hint: 'Yard 01 and Yard 02.',
  },

  // ------------------------------------------------------------- safehouse --
  safehouse: {
    seal: 'CIPHER',
    station: 'THE CIPHER DESK',
    title: 'Break the shift',
    blurb:
      'An intercepted word, enciphered with the fixed shift the desk keeps. ' +
      'Turn the wheel until it reads as English, then type what it says.',
    kind: 'cipher',
    ciphertext: 'EDQGL MLYDQ',
    shift: 3,
    answer: 'BANDI JIVAN',
    hint: 'Room 04 — a fixed shift of the alphabet.',
  },

  // --------------------------------------------------------------- records --
  records: {
    seal: 'FILE',
    station: 'THE CASE INDEX',
    title: 'File the cases',
    blurb:
      'Two conspiracy cases, two years. The index has come apart — put each ' +
      'case against its year.',
    kind: 'match',
    left: ['Banaras Conspiracy Case', 'Kakori Conspiracy Case'],
    right: ['1915', '1925'],
    answer: [0, 1],
    hint: 'File 05, and the papers on the rack.',
  },

  // -------------------------------------------------------------- memorial --
  memorial: {
    seal: 'ORDER',
    station: 'THE CHRONOLOGY LOCK',
    title: 'Set the chronology',
    blurb:
      'The chronology plinth has been disordered. Put these four back into the ' +
      'order they happened.',
    kind: 'order',
    items: [
      'Born in Varanasi',
      'Transported to the Cellular Jail',
      'Bandi Jivan published',
      'The H.R.A. founded',
    ],
    scramble: [2, 0, 3, 1],
    hint: 'The chronology plinth: 1893, 1915, 1922, 1924.',
  },
};

export const SEAL_ORDER = [
  'shop', 'composing', 'jail', 'yard', 'safehouse', 'records', 'memorial',
];

/** Points for solving a puzzle first time, and for solving it without a hint. */
export const PUZZLE_POINTS = 500;
export const NO_HINT_BONUS = 250;

/**
 * Build a puzzle's interface into `host`.
 *
 * Returns nothing — it calls `onSolve` when the player gets it right, and
 * `onWrong` when they submit something wrong, so the caller owns the scoring.
 */
export function renderPuzzle(host, puzzle, { onSolve, onWrong, onHint, solved }) {
  host.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'puzzle-head';
  head.innerHTML =
    `<span>${puzzle.kind.toUpperCase()}</span><span class="seal-name">SEAL · ${puzzle.seal}</span>`;
  host.append(head);

  const title = document.createElement('h3');
  title.textContent = puzzle.title;
  host.append(title);

  const blurb = document.createElement('p');
  blurb.className = 'puzzle-blurb';
  blurb.textContent = puzzle.blurb;
  host.append(blurb);

  if (solved) {
    const done = document.createElement('div');
    done.className = 'puzzle-solved';
    done.textContent = `SOLVED — seal ${puzzle.seal} taken.`;
    host.append(done);
    return;
  }

  const body = document.createElement('div');
  body.className = 'puzzle-body';
  host.append(body);

  const status = document.createElement('div');
  status.className = 'puzzle-status';
  host.append(status);

  /** Wire the common footer: check, and a hint that costs the bonus. */
  function footer(read) {
    const row = document.createElement('div');
    row.className = 'puzzle-actions';

    const check = document.createElement('button');
    check.className = 'begin small';
    check.textContent = 'CHECK';
    check.addEventListener('click', () => {
      if (read()) {
        status.className = 'puzzle-status good';
        status.textContent = `Correct. Seal ${puzzle.seal} is yours.`;
        row.remove();
        onSolve();
      } else {
        status.className = 'puzzle-status bad';
        status.textContent = 'Not that. Read the room again.';
        onWrong?.();
      }
    });

    const hint = document.createElement('button');
    hint.className = 'pill ghost';
    hint.textContent = 'HINT (−250)';
    hint.addEventListener('click', () => {
      status.className = 'puzzle-status';
      status.textContent = `Look at: ${puzzle.hint}`;
      hint.remove();
      onHint?.();
    });

    row.append(check, hint);
    host.append(row);
  }

  // ------------------------------------------------------------- by kind ---

  if (puzzle.kind === 'dial') {
    const wrap = document.createElement('div');
    wrap.className = 'dials';
    const values = Array(puzzle.digits).fill(0);

    for (let i = 0; i < puzzle.digits; i++) {
      const col = document.createElement('div');
      col.className = 'dial-col';

      const up = document.createElement('button');
      up.type = 'button';
      up.textContent = '▲';
      const num = document.createElement('b');
      num.textContent = '0';
      const down = document.createElement('button');
      down.type = 'button';
      down.textContent = '▼';

      up.addEventListener('click', () => {
        values[i] = (values[i] + 1) % 10;
        num.textContent = values[i];
      });
      down.addEventListener('click', () => {
        values[i] = (values[i] + 9) % 10;
        num.textContent = values[i];
      });

      col.append(up, num, down);
      wrap.append(col);
    }

    body.append(wrap);
    footer(() => values.join('') === puzzle.answer);
    return;
  }

  if (puzzle.kind === 'cipher') {
    let shift = 0;

    const text = document.createElement('div');
    text.className = 'cipher-text';

    const shiftBy = (s) =>
      puzzle.ciphertext.replace(/[A-Z]/g, (ch) =>
        String.fromCharCode(((ch.charCodeAt(0) - 65 - s + 26) % 26) + 65));

    const wheel = document.createElement('div');
    wheel.className = 'cipher-wheel';

    const label = document.createElement('span');
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = '◀';
    const fwd = document.createElement('button');
    fwd.type = 'button';
    fwd.textContent = '▶';

    const paint = () => {
      label.textContent = `SHIFT ${shift}`;
      text.textContent = shiftBy(shift);
    };

    back.addEventListener('click', () => { shift = (shift + 25) % 26; paint(); });
    fwd.addEventListener('click', () => { shift = (shift + 1) % 26; paint(); });

    wheel.append(back, label, fwd);

    const entry = document.createElement('input');
    entry.className = 'puzzle-input';
    entry.placeholder = 'TYPE THE PLAIN TEXT';
    entry.maxLength = 32;

    paint();
    body.append(text, wheel, entry);
    footer(() =>
      entry.value.trim().toUpperCase().replace(/\s+/g, ' ') === puzzle.answer);
    return;
  }

  if (puzzle.kind === 'order') {
    // Click two items to swap them. Simpler than drag on a phone, and it works
    // identically with a mouse.
    const current = puzzle.scramble.map((i) => puzzle.items[i]);
    let picked = -1;

    const list = document.createElement('div');
    list.className = 'order-list';

    const paint = () => {
      list.innerHTML = '';
      current.forEach((textValue, i) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = `order-row${picked === i ? ' picked' : ''}`;
        row.innerHTML = `<b>${i + 1}</b><span>${textValue}</span>`;
        row.addEventListener('click', () => {
          if (picked === -1) picked = i;
          else {
            [current[picked], current[i]] = [current[i], current[picked]];
            picked = -1;
          }
          paint();
        });
        list.append(row);
      });
    };

    paint();
    body.append(list);
    footer(() => current.every((v, i) => v === puzzle.items[i]));
    return;
  }

  if (puzzle.kind === 'select') {
    const chosen = new Set();
    const list = document.createElement('div');
    list.className = 'order-list';

    puzzle.options.forEach((option, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'order-row';
      row.innerHTML = `<b>·</b><span>${option}</span>`;
      row.addEventListener('click', () => {
        if (chosen.has(i)) chosen.delete(i);
        else chosen.add(i);
        row.classList.toggle('picked', chosen.has(i));
        row.querySelector('b').textContent = chosen.has(i) ? '✓' : '·';
      });
      list.append(row);
    });

    body.append(list);
    footer(() =>
      chosen.size === puzzle.answer.length &&
      puzzle.answer.every((i) => chosen.has(i)));
    return;
  }

  if (puzzle.kind === 'match') {
    // Each left item gets a select of the right-hand values.
    const picks = puzzle.left.map(() => -1);
    const list = document.createElement('div');
    list.className = 'match-list';

    puzzle.left.forEach((leftText, i) => {
      const row = document.createElement('div');
      row.className = 'match-row';

      const name = document.createElement('span');
      name.textContent = leftText;

      const select = document.createElement('select');
      select.className = 'puzzle-input';
      select.innerHTML =
        '<option value="-1">—</option>' +
        puzzle.right.map((r, j) => `<option value="${j}">${r}</option>`).join('');
      select.addEventListener('change', () => { picks[i] = Number(select.value); });

      row.append(name, select);
      list.append(row);
    });

    body.append(list);
    footer(() => picks.every((v, i) => v === puzzle.answer[i]));
    return;
  }

  status.textContent = 'This puzzle has no interface yet.';
}
