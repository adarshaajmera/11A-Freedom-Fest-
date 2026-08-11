# Sanyal's Newsstand — 3D Archive Game

A first-person newspaper shop in WebGL that runs back into the Cellular Jail.

Eight areas in a chain — the shop floor, the composing room, the passage, the
jail wing, the labour yard, and then the museum wing built inside the jail after
it became a national memorial: a reconstructed safe house, the colonial record
office, and a memorial hall. Fifty-five exhibits, every one of which asks a
question about what you just read. You file your score in the ledger on the
counter, and it goes to a global leaderboard.

The material for the museum wing is drawn from the sibling Freedom Archive
project's exhibit data — its REVOLUTIONARY ACTIVITIES, BRITISH INTELLIGENCE,
INFLUENCE and LEGACY halls — rather than being written fresh, so the two stay
consistent and the sourcing carries over.

A police officer walks the whole map looking for you — a figure built from
primitives in `officer.js` with a hand-driven walk cycle, carrying a lantern that
gives him away down a dark passage. When he catches you he asks a question drawn
from wherever you are standing: right and he waves you on, wrong and he takes one
of your three hearts. At zero hearts the run ends and you file what you have.

He moves at 2.05 m/s against your 3.3 walking and 5.9 running, so he is always
outrunnable and never shakeable.

Sound is synthesised in `sound.js` — oscillators and filtered noise, no audio
files. Footsteps fire on distance covered rather than on a timer, so they stay in
step at any speed, and the floor changes from boards to stone at the jail. A
heartbeat quickens as he closes, which is the only warning you get when he is
behind you.

Built from the earlier single-file `sanyal-newspaper-shop-mobile-game.html`,
which was a top-down 2D canvas game with an on-device board.

## Controls

| | |
|---|---|
| Walk | Joystick (touch), `W` `A` `S` `D`, or the arrow keys |
| Run | Hold `Shift`, or push the joystick to the rim — 1.8× |
| Look | Drag anywhere on the shop |
| Turn | Hold `Shift` with `←` / `→` |
| Open / close | The `OPEN` button, or `E`. `Esc` closes. |
| Sound | The `♪` button in the top bar |

Arrow keys walk by default — `←` / `→` strafe. Holding `Shift` switches those
two to swinging the view instead, so the whole shop is reachable from the
keyboard without ever touching the mouse. `Shift` does not affect `↑` / `↓`.

## Scoring

| Award | Points |
|---|---|
| Reading an exhibit | **+40**, once each, 55 across the map |
| Correct answer | **100** |
| Speed bonus | up to **+100**, decaying to zero over 20s |
| Streak | **×1.25** at two in a row, rising to **×2.00** at five |

A perfect run — everything read, all fifty-five answered instantly on an
unbroken streak — is 24,200 points.

## Lighting, and why there are only nine lights

Every point light is evaluated by every material's fragment shader for every
pixel it covers. Thirty of them made standing near a wall crawl: the wall fills
the screen and each pixel pays for all thirty.

So the map registers light *fixtures* as data, and a fixed pool of five real
point lights follows the player, snapping to the nearest fixtures and fading
between them. One directional light and one hemisphere light serve the whole map,
retinted and repositioned per area. The per-pixel cost is then the same wherever
you stand, and because the light *count* never changes, Three.js never recompiles
a material mid-walk.

The Inspector's questions score the same way, so being caught is not purely a
loss: answering it correctly is worth points, and it keeps your streak.

There is no separate examination. Each question is attached to the exhibit it
comes from and asked immediately underneath it, so nothing is ever asked that
the shop has not just told you. A question is posed once per run: answering it
right, wrong, or letting the clock run out all close it, so it cannot be farmed
by reopening a drawer. Walking away from an open question forfeits it — the
timer is the tension, and pausing would be a free way to stop the clock.

The rules live in one file, [`public/js/scoring.js`](public/js/scoring.js), which
is both served to the browser and bundled into the Worker. The exhibit and
question counts are derived from `content.js` rather than written down twice, so
adding an exhibit cannot silently break the server's ceiling. The Worker uses
that ceiling to compute the highest score physically reachable for a given run
and rejects anything above it, so a forged POST cannot invent points.

## Running it

```bash
npm install
```

The database has to exist locally before the board will work:

```bash
npx wrangler d1 migrations apply sanyal-newsstand --local
```

Then:

```bash
npx wrangler dev
```

## Deploying

`wrangler.jsonc` deliberately omits `database_id`, so the first deploy
provisions the D1 database and writes the id back into the file:

```bash
npx wrangler deploy
```

Then create the table on the remote database:

```bash
npx wrangler d1 migrations apply sanyal-newsstand --remote
```

Optionally set a salt for the rate limiter's address hashing. Without it the
limiter still works, it just uses a known constant:

```bash
npx wrangler secret put SCORE_SALT
```

## The leaderboard

`GET /api/scores` returns the top 20, one row per player — their best run, ties
broken by the faster time. `POST /api/scores` records a run and answers with the
board and your rank.

Rows are append-only. A player who plays twice gets two rows and the board
collapses them at read time, so two people finishing at once can never overwrite
each other.

Three things are worth being straight about:

- **Scores are client-computed.** The server bounds them by what the rules allow,
  which stops invented numbers, but a determined player can still submit a real
  score they did not earn. Moving the question bank server-side would fix that,
  at the cost of a round trip per question.
- **Names are not identities.** Two players who type the same name share a row.
  There are no accounts.
- **The board degrades to on-device.** If `/api/scores` is unreachable — offline,
  not deployed yet, opened from disk — the game keeps playing and writes to
  `localStorage` instead. The heading changes to `ON THIS DEVICE · OFFLINE` so
  it never claims to be global when it is not.

Addresses are never stored. The rate limiter keeps a salted SHA-256 of the
address and nothing else.

## Content

Two constraints carried over from the rest of the Freedom Archive:

- **No invented quotations.** Sanyal is never made to "say" anything. The radio
  narrates the record; it does not quote him.
- **No invented facts.** Where the record is thin or contested — the language
  *Bandi Jivan* was first written in, for one — it is left out rather than
  guessed at.

Newspaper body copy is drawn as abstract line-runs rather than glyphs, so no
surface in the shop ever displays words Sanyal did not write. Only the mastheads
and headlines carry text, and those come from
[`public/js/content.js`](public/js/content.js).

The officer is deliberately nobody: a uniform, a cap and a lantern, no likeness
of any real person. Sanyal's own photograph hangs on the shop wall and is never
the thing hunting you — being pursued by the colonial authorities is the history,
wearing his face while doing it would not be.

The portrait on the shop wall is a genuine photograph —
public domain, from Wikimedia. It is fetched from `upload.wikimedia.org`
directly, because the tidier `Special:FilePath` URL redirects through
`commons.wikimedia.org`, which sends no `access-control-allow-origin` and so
fails a cross-origin texture load. If the fetch fails at all, the drawn mount
behind it stands on its own rather than leaving an empty frame.

## Layout

```
public/
  index.html        the shell: HUD, panels, importmap
  styles.css        the paper-and-ink layer over the 3D
  js/
    main.js         renderer, frame loop, panels, station wiring
    shop.js         all five areas, the eighteen stations, lighting
    controls.js     first-person movement, look, collision, floor zones
    chase.js        the officer's pursuit — steering, catching, release
    officer.js      the walking figure and his gait
    sound.js        every cue, synthesised — no audio files
    textures.js     every surface, drawn on canvas at runtime
    play.js         score state, the question flow, hearts, the ledger
    leaderboard.js  API client, offline fallback, board rendering
    content.js      exhibits, each carrying its own question and area
    scoring.js      the rules — shared with the Worker
src/worker.js       GET/POST /api/scores
migrations/         D1 schema
```

Three.js is loaded from a CDN via an import map, so `index.html` must be served
over HTTP — opening it with `file://` will not work, because ES modules are
blocked on that protocol.
