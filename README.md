# Fish Dodge: Count to Survive

CIS045-3 Distributed Service Architectures - Assignment 1.
A 2D underwater game (20 levels) with a Fish Count mini-game powered by the Fish Game API.
Plain HTML + CSS + JavaScript (ES modules). No build step, no framework.

## 1. Run it (works right now, no Supabase needed)
ES modules do not work from `file://`, so serve the folder:
- **VS Code:** install the "Live Server" extension, right-click `index.html` > *Open with Live Server*, or
- **Terminal:** `npm start` (runs `npx serve . -l 5173`), then open http://localhost:5173

With empty Supabase settings the game runs in **local mode**: accounts, progress and the
personal leaderboard are saved in this browser (localStorage; password stored as a salted SHA-256 hash).

## 2. Switch to Supabase (when you have your project)
1. Supabase dashboard > **SQL Editor** > paste `supabase/schema.sql` > Run (creates 3 tables + Row Level Security).
2. **Authentication > Providers > Email**: turn **OFF "Confirm email"** (players log in with a username, not a real email).
3. **Project Settings > API**: copy the *Project URL* and the *anon public* key.
4. Paste them into `js/config.js`. That is the only file you change. Never put the `service_role` key in the frontend.
5. Reload. The game now uses Supabase Auth + database automatically.

Usernames become `username@fishdodge.app` internally for Supabase Auth.

## 3. Fish Game API
`js/api.js` is the only file that calls it (`GET https://marcconrad.com/uob/fish/api.php?out=json&base64=no`).
It returns a link to an image and the solution. **Open the browser console (F12) after your first
challenge**: the raw response is logged as `[Fish API] raw response`. If the field names differ from
`question` / `solution`, change the two lines marked `FIELD NAMES` in `api.js`.

## 4. Game rules implemented
- 20 levels, same screen/controls/speed (constant). Level length = 3000 + 400 x level px (about 16 s at level 1, 52 s at level 20).
- Every level is a series of **rock walls with one free gap** the fish must line up with. Walls: 6 (L1) up to 23 (L20). Gap height shrinks from 186 px (L1) to 110 px (L20), and the gap moves between walls, so you must keep swimming. A path always exists (an autopilot test clears all 20 levels).
- Arrow Up/Down or W/S (or the on-screen buttons on phones) move the fish. Esc / P pauses.
- Passing a rock wall: +25 and saves the **last safe position** (kept internally, not shown). Hitting a rock: -1 life and return to it. Lives 1-2: play on.
- 0 lives: Fish Count mini-game (60 s, new API image each attempt). Correct: +50, 3 lives, **level restarts from the beginning**. Wrong / timeout: feedback screen, then a new challenge (unlimited tries).
- Finish a level: +250 and Level Complete. After Level 20: Game Completed.
- Scores are per level and the run total is the sum. A restarted level resets its own level score to 0, then +50.
- A **run** (date, level reached, score) is saved when Level 20 is finished, on *Main Menu* or on *Quit to Login*. The leaderboard is personal (your best 10 runs). "Play" continues from your saved current level; the run score starts at 0 each time you press Play.

## 4b. Accounts
- Register -> you are sent to the Login screen with a success message (you log in yourself).
- Live validation while typing: username 3-16 letters/numbers/_; password 8+ characters with a letter and a number; confirm must match.
- **Account** screen (Main Menu): change password (current password is checked) and delete account (type DELETE). The username is the login name and cannot be changed.
- For *Delete account* with Supabase, run `supabase/delete_account.sql` once in the SQL Editor (a small function that deletes only the logged-in user; their data is removed by cascade).

## 4c. Phones and tablets
Layout adapts to small screens. On touch devices two big on-screen buttons (up on the left, down on the right) appear over the play area; turn the phone sideways for the biggest view.

## 5. Files and the four video themes
| File | Job | Theme |
|---|---|---|
| `index.html` | All 16 screens as `<section>`s, one shown at a time | - |
| `css/main.css`, `css/hud.css` | Look of screens, HUD, overlays | - |
| `js/app.js` | Wires clicks, forms and game events to screens | Event-driven |
| `js/events.js` | Tiny event bus (`emit` / `on`) | Event-driven, low coupling |
| `js/input.js` | Keyboard events | Event-driven |
| `js/game.js` | Loop, scrolling, collisions, lives, safe position, drawing | High cohesion |
| `js/levels.js` | Level lengths, rock generation, safe gap | High cohesion |
| `js/scoring.js` | Point values | High cohesion |
| `js/fish-count.js` | Mini-game, 60 s timer, answer check | Event-driven |
| `js/api.js` | Only code that calls the Fish API | Interoperability |
| `js/auth.js` | Register / login / logout, cookie | Virtual identity |
| `js/progress.js` | Per-user progress, scores, runs | Virtual identity |
| `js/supabase.js`, `js/config.js` | Supabase client and settings | Interoperability |
| `js/ui.js` | HUD, menu, leaderboard, toasts, live hints | High cohesion |
| `js/validation.js` | Username / password rules (no DOM) | High cohesion |

Things to say in the video: why `game.js` never touches the DOM or the API; how `events.js` lets modules
talk without importing each other; HTTP + JSON with the Fish API; Supabase Auth, cookies and Row Level
Security for identity; alternatives (server-side sessions, a custom backend, React).

## 6. Test checklist
Register / login / wrong password / reload (cookie auto-login) / logout - hit a rock (life lost, back to safe
position) - lose 3 lives (Out of Lives) - correct, wrong and timed-out answers - restart from the beginning
after a correct answer - finish Level 1 and go to Next Level - pause, resume, restart, how to play, quit -
leaderboard after a run - try levels 10 and 20 (edit the saved `current_level` or play through).
