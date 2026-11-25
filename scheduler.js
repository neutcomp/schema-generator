(function (root) {
  'use strict';

  function shuffle(items, random) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Select a random maximum-capacity subset of the available games.
  function selectGames(games, playerCount, random) {
    const paths = Array(playerCount + 1).fill(null);
    paths[0] = [];
    for (const game of shuffle(games, random)) {
      for (let n = playerCount; n >= game.capacity; n--) {
        if (paths[n] === null && paths[n - game.capacity] !== null) {
          paths[n] = paths[n - game.capacity].concat(game);
        }
      }
    }
    for (let n = playerCount; n >= 0; n--) {
      if (paths[n] !== null) return paths[n];
    }
    return [];
  }

  function pairKey(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  function addCosts(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  function compareCosts(a, b, focusGames) {
    if (focusGames) return a[0] - b[0] || a[2] - b[2] || a[1] - b[1];
    return (a[0] * 80 + a[2]) - (b[0] * 80 + b[2]) || a[1] - b[1];
  }

  function groupCost(group, players, history) {
    const cost = [0, 0, 0];
    const gameKey = history.gameKeys.get(group.game);
    for (const player of group.players) {
      const visits = history.gameVisits[player].get(gameKey) || 0;
      if (visits > 0) cost[0]++;
      cost[1] += visits;
    }
    for (let i = 0; i < group.players.length; i++) {
      for (let j = i + 1; j < group.players.length; j++) {
        const a = group.players[i];
        const b = group.players[j];
        const similarAge = Math.abs(players[a].age - players[b].age) <= 3;
        const differentSkill = players[a].skill !== players[b].skill;
        let pairCost = (history.pairs.get(pairKey(a, b)) || 0) * 100;
        // Favor whichever age and skill experiences each player has had less often.
        pairCost += similarAge ? history.similarAge[a] + history.similarAge[b]
          : history.differentAge[a] + history.differentAge[b];
        pairCost += differentSkill ? history.differentSkill[a] + history.differentSkill[b]
          : history.sameSkill[a] + history.sameSkill[b] + 2;
        cost[2] += pairCost / (group.players.length - 1);
      }
    }
    return cost;
  }

  function candidate(players, games, history, random, focusGames) {
    const selected = selectGames(games, players.length, random);
    const slots = selected.reduce((sum, game) => sum + game.capacity, 0);
    const ranked = shuffle(players.map((_, index) => index), random)
      .sort((a, b) => history.sitOuts[a] - history.sitOuts[b]);
    const sittingOut = ranked.slice(0, players.length - slots);
    const active = shuffle(ranked.slice(players.length - slots), random);
    const groups = [];
    let offset = 0;
    for (const game of selected) {
      groups.push({ game, players: active.slice(offset, offset + game.capacity) });
      offset += game.capacity;
    }

    // Swapping players between groups improves matchups without changing capacity.
    for (let attempt = 0; attempt < active.length * 3 && groups.length > 1; attempt++) {
      const first = Math.floor(random() * groups.length);
      let second = Math.floor(random() * (groups.length - 1));
      if (second >= first) second++;
      const a = groups[first].players;
      const b = groups[second].players;
      const i = Math.floor(random() * a.length);
      const j = Math.floor(random() * b.length);
      const before = addCosts(groupCost(groups[first], players, history), groupCost(groups[second], players, history));
      [a[i], b[j]] = [b[j], a[i]];
      const after = addCosts(groupCost(groups[first], players, history), groupCost(groups[second], players, history));
      if (compareCosts(after, before, focusGames) > 0) {
        [a[i], b[j]] = [b[j], a[i]];
      }
    }
    return {
      groups,
      sittingOut,
      cost: groups.reduce((sum, group) => addCosts(sum, groupCost(group, players, history)), [0, 0, 0])
    };
  }

  function buildSchedule(players, games, rounds, random, focusGames) {
    const history = {
      pairs: new Map(),
      gameKeys: new Map(games.map(game => [game, game.name.trim().toLocaleLowerCase()])),
      gameVisits: players.map(() => new Map()),
      sitOuts: players.map(() => 0),
      similarAge: players.map(() => 0),
      differentAge: players.map(() => 0),
      sameSkill: players.map(() => 0),
      differentSkill: players.map(() => 0)
    };
    const result = [];
    for (let round = 0; round < rounds; round++) {
      let best = null;
      for (let attempt = 0; attempt < 24; attempt++) {
        const next = candidate(players, games, history, random, focusGames);
        if (best === null || compareCosts(next.cost, best.cost, focusGames) < 0) best = next;
      }
      for (const player of best.sittingOut) history.sitOuts[player]++;
      for (const group of best.groups) {
        const gameKey = history.gameKeys.get(group.game);
        for (const player of group.players) {
          const visits = history.gameVisits[player].get(gameKey) || 0;
          history.gameVisits[player].set(gameKey, visits + 1);
        }
        for (let i = 0; i < group.players.length; i++) {
          for (let j = i + 1; j < group.players.length; j++) {
            const a = group.players[i];
            const b = group.players[j];
            const key = pairKey(a, b);
            history.pairs.set(key, (history.pairs.get(key) || 0) + 1);
            const ageCounts = Math.abs(players[a].age - players[b].age) <= 3
              ? history.similarAge : history.differentAge;
            const skillCounts = players[a].skill === players[b].skill
              ? history.sameSkill : history.differentSkill;
            ageCounts[a]++; ageCounts[b]++;
            skillCounts[a]++; skillCounts[b]++;
          }
        }
      }
      result.push({ groups: best.groups, sittingOut: best.sittingOut });
    }
    const gameCount = new Set(history.gameKeys.values()).size;
    const missingGames = history.gameVisits.reduce((sum, visits) => sum + gameCount - visits.size, 0);
    return { rounds: result, missingGames };
  }

  function generateSchedule(players, games, rounds, random = Math.random) {
    if (!Array.isArray(players) || !Array.isArray(games) || !Number.isInteger(rounds) || rounds < 1 ||
        players.length < 2 || games.length === 0 ||
        games.some(game => ![2, 4].includes(game.capacity)) ||
        !games.some(game => game.capacity <= players.length)) {
      throw new Error('The players, games, or rounds cannot make a valid schedule.');
    }
    let best = buildSchedule(players, games, rounds, random);
    const distinctGames = new Set(games.map(game => game.name.trim().toLocaleLowerCase()));
    const maxSlots = selectGames(games, players.length, random)
      .reduce((sum, game) => sum + game.capacity, 0);
    const allGamesPlayable = [...distinctGames].every(key => games.some(game =>
      game.name.trim().toLocaleLowerCase() === key && game.capacity <= players.length));
    const coveragePossible = allGamesPlayable && rounds >= distinctGames.size &&
      rounds * maxSlots >= players.length * distinctGames.size;
    for (let attempt = 1; coveragePossible && best.missingGames > 0 && attempt < 5; attempt++) {
      const next = buildSchedule(players, games, rounds, random, true);
      if (next.missingGames < best.missingGames) best = next;
    }
    return best.rounds;
  }

  const api = { generateSchedule };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ScheduleGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
