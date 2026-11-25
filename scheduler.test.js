const test = require('node:test');
const assert = require('node:assert/strict');
const { generateSchedule } = require('./scheduler.js');

function randomSeed(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function players(count) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Player ${i + 1}`,
    age: 10 + i * 2,
    skill: ['Beginner', 'Intermediate', 'Advanced'][i % 3]
  }));
}

test('fills as many seats as possible without double-booking games or players', () => {
  const games = [
    { name: 'Four', capacity: 4 },
    { name: 'Two A', capacity: 2 },
    { name: 'Two B', capacity: 2 }
  ];
  const rounds = generateSchedule(players(6), games, 8, randomSeed(10));
  assert.equal(rounds.length, 8);
  for (const round of rounds) {
    assert.equal(round.sittingOut.length, 0);
    assert.equal(new Set(round.groups.map(group => group.game)).size, round.groups.length);
    const assigned = round.groups.flatMap(group => {
      assert.equal(group.players.length, group.game.capacity);
      return group.players;
    });
    assert.equal(assigned.length, 6);
    assert.equal(new Set(assigned).size, 6);
  }
});

test('distributes unavoidable sit-outs fairly across rounds', () => {
  const rounds = generateSchedule(players(5), [{ name: 'Four', capacity: 4 }], 10, randomSeed(42));
  const counts = Array(5).fill(0);
  for (const round of rounds) {
    assert.equal(round.sittingOut.length, 1);
    round.sittingOut.forEach(index => counts[index]++);
    const all = [...round.sittingOut, ...round.groups.flatMap(group => group.players)];
    assert.equal(new Set(all).size, 5);
  }
  assert.deepEqual(counts, [2, 2, 2, 2, 2]);
});

test('finds different pairings for four players across three rounds', () => {
  const games = [{ name: 'A', capacity: 2 }, { name: 'A', capacity: 2 }];
  const rounds = generateSchedule(players(4), games, 3, randomSeed(3));
  const pairs = rounds.flatMap(round => round.groups.map(group => group.players.slice().sort().join(':')));
  assert.equal(new Set(pairs).size, 6);
});

test('prioritizes full game coverage when it conflicts with unique pairings', () => {
  const games = [{ name: 'A', capacity: 2 }, { name: 'B', capacity: 2 }];
  const rounds = generateSchedule(players(4), games, 2, randomSeed(3));
  const played = Array.from({ length: 4 }, () => new Set());
  for (const round of rounds) {
    for (const group of round.groups) group.players.forEach(index => played[index].add(group.game.name));
  }
  assert.ok(played.every(names => names.size === 2));
});

test('gives every player all six games within twelve rounds when feasible', () => {
  const games = Array.from({ length: 6 }, (_, index) => ({
    name: `Game ${index + 1}`,
    capacity: 2
  }));
  for (let seed = 1; seed <= 10; seed++) {
    const rounds = generateSchedule(players(12), games, 12, randomSeed(seed));
    const played = Array.from({ length: 12 }, () => new Set());
    for (const round of rounds) {
      for (const group of round.groups) {
        group.players.forEach(index => played[index].add(group.game.name));
      }
    }
    assert.ok(played.every(names => names.size === 6), `seed ${seed}: ${played.map(names => names.size)}`);
  }
});

test('covers games of different capacities while keeping sit-outs fair', () => {
  const games = [{ name: 'Four', capacity: 4 }, { name: 'Two A', capacity: 2 }, { name: 'Two B', capacity: 2 }];
  const rounds = generateSchedule(players(5), games, 12, randomSeed(11));
  const played = Array.from({ length: 5 }, () => new Set());
  const sitOuts = Array(5).fill(0);
  for (const round of rounds) {
    round.sittingOut.forEach(index => sitOuts[index]++);
    for (const group of round.groups) group.players.forEach(index => played[index].add(group.game.name));
  }
  assert.ok(played.every(names => names.size === games.length));
  assert.ok(Math.max(...sitOuts) - Math.min(...sitOuts) <= 1);
});

test('covers six mixed-capacity games within twelve rounds when feasible', () => {
  const games = [2, 2, 2, 4, 4, 4].map((capacity, index) => ({ name: `Game ${index + 1}`, capacity }));
  for (let seed = 1; seed <= 30; seed++) {
    const rounds = generateSchedule(players(12), games, 12, randomSeed(seed));
    const played = Array.from({ length: 12 }, () => new Set());
    for (const round of rounds) {
      for (const group of round.groups) group.players.forEach(index => played[index].add(group.game.name));
    }
    assert.ok(played.every(names => names.size === games.length), `seed ${seed}: ${played.map(names => names.size)}`);
  }
});

test('rejects schedules where no game can be played', () => {
  assert.throws(() => generateSchedule(players(3), [{ name: 'Four', capacity: 4 }], 1), /valid schedule/);
});
