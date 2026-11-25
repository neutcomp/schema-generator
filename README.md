# Play Together: schedule generator

An offline browser tool for making randomized, printable game schedules.

## Get started

Open `index.html` in a modern browser. No installation, account, server, or
internet connection is required.

1. Add players with unique names, ages, and beginner, intermediate, or advanced
   skill levels.
2. Add games and choose whether each takes two or four players. Each listed
   game can host one group per round; add another entry if another copy of a
   game is available.
3. Enter the number of rounds and, optionally, the time per round in minutes.
   The total time is calculated automatically. Select **Generate schedule**.
4. Review the per-player schedules and select **Print schedule** to print or
   save to PDF using your browser's print dialog.

Player and game details, the number of rounds, and the time per round are saved
automatically in this browser on this device, including incomplete edits. They should still be
there after closing and reopening the tool in the same browser. Browser storage
can be cleared by the user or browser settings; private browsing and restricted
file storage may not retain it. The tool reports storage failures. Schedules
themselves are not saved: generate a new one after reopening or editing inputs.

## Back up or transfer data

Select **Exporteer gegevens** to download a JSON file containing players, games,
rounds, and time per round, including incomplete edits. Copy the file to the
other computer or browser and select **Importeer gegevens** there. Importing
replaces the current inputs after confirmation; export them first if you want to
keep a backup. Generated schedules are not included.

The file is not encrypted and may contain children's names and ages. Store and
transfer it securely. This is a manual transfer, not automatic synchronization:
changes made on one device do not automatically appear on another.

## How scheduling works

- Each round uses the available games to play as many people as possible. Each
  player plays at most once per round; remaining players sit out.
- Sit-outs are distributed as evenly as possible across rounds.
- Matchups are randomized and favor less-repeated pairings, a mixture of
  similar and different ages, and a mixture of skill levels. These are
  best-effort goals, not guarantees: available games, player numbers, and
  round count constrain what is possible.
- The generator also favors games a player has not yet played and tries
  alternative schedules if coverage is incomplete. Entries with the same game
  name count as copies of the same game. A warning appears if any player still
  misses a game; full coverage is not always possible or guaranteed.
- Four-player games are groups without assigned teams. Every pair in a group
  counts as having played together for matchup variety.
- The printable schedule lists each player's game and fellow players or a
  sit-out for every round. When a round time is provided, it also shows the
  time per round and total time (excluding breaks).

The tool accepts 2–100 players, 1–50 games, and 1–100 rounds. Ages must be
whole numbers from 0 to 120; time per round, if entered, must be a positive
whole number of minutes. At least one game must have enough players to run.

## Tests

With Node.js installed, run `node --test scheduler.test.js`.
