(function () {
  'use strict';

  const storageKey = 'play-together-data-v1';
  const emptyPlayer = () => ({ name: '', age: '', skill: '' });
  const emptyGame = () => ({ name: '', capacity: '2' });
  const defaults = () => ({ players: [emptyPlayer(), emptyPlayer()], games: [emptyGame()], rounds: '3', roundTime: '' });
  const playersList = document.getElementById('players-list');
  const gamesList = document.getElementById('games-list');
  const roundsInput = document.getElementById('rounds');
  const roundTimeInput = document.getElementById('round-time');
  const totalTime = document.getElementById('total-time');
  const error = document.getElementById('error');
  const results = document.getElementById('results');
  const saveStatus = document.getElementById('save-status');
  const transferStatus = document.getElementById('transfer-status');
  const importFile = document.getElementById('import-file');
  let state;

  function isSavedState(value) {
    return value && Array.isArray(value.players) && Array.isArray(value.games) &&
      typeof value.rounds === 'string' && (value.roundTime === undefined || typeof value.roundTime === 'string') &&
      value.players.every(player => player && typeof player.name === 'string' &&
        typeof player.age === 'string' && typeof player.skill === 'string') &&
      value.games.every(game => game && typeof game.name === 'string' && typeof game.capacity === 'string');
  }

  function isNumberInputValue(value) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    return input.value === value;
  }

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) {
      state = defaults();
    } else {
      state = JSON.parse(saved);
      if (!isSavedState(state)) throw new Error('The saved data has an unexpected format.');
      if (state.roundTime === undefined) state.roundTime = '';
    }
  } catch (exception) {
    state = defaults();
    saveStatus.textContent = 'Could not load saved data. Check browser storage before editing.';
    saveStatus.parentElement.classList.add('save-problem');
    console.error('Could not load saved data:', exception);
  }

  function save(data = state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      saveStatus.textContent = 'Saved on this device';
      saveStatus.parentElement.classList.remove('save-problem');
      return true;
    } catch (exception) {
      saveStatus.textContent = 'Could not save changes. Check browser storage.';
      saveStatus.parentElement.classList.add('save-problem');
      console.error('Could not save data:', exception);
      return false;
    }
  }

  function showTransferStatus(message, isError = false) {
    transferStatus.textContent = message;
    transferStatus.classList.toggle('transfer-error', isError);
  }

  function changed() {
    results.hidden = true;
    error.hidden = true;
    save();
  }

  function validWholeNumber(value, min, max) {
    return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) &&
      Number(value) >= min && Number(value) <= max;
  }

  function updateTotalTime() {
    if (!state.roundTime) {
      totalTime.textContent = 'Enter a time per round';
    } else if (!validWholeNumber(state.rounds, 1, 100) ||
      !validWholeNumber(state.roundTime, 1, Number.MAX_SAFE_INTEGER) ||
      !Number.isSafeInteger(Number(state.rounds) * Number(state.roundTime))) {
      totalTime.textContent = 'Enter valid whole numbers';
    } else {
      const minutes = Number(state.rounds) * Number(state.roundTime);
      totalTime.textContent = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function field(labelText, input) {
    const label = element('label', 'field');
    label.append(element('span', 'field-label', labelText), input);
    return label;
  }

  function input(value, placeholder, type, onChange) {
    const node = document.createElement('input');
    node.type = type;
    node.placeholder = placeholder;
    node.value = value;
    node.addEventListener('input', () => onChange(node.value));
    return node;
  }

  function select(value, choices, onChange) {
    const node = document.createElement('select');
    for (const [optionValue, text] of choices) {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = text;
      node.append(option);
    }
    node.value = value;
    node.addEventListener('change', () => onChange(node.value));
    return node;
  }

  function removeButton(label, callback) {
    const button = element('button', 'remove-button', '×');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.addEventListener('click', callback);
    return button;
  }

  function renderPlayers() {
    playersList.replaceChildren();
    document.getElementById('player-count').textContent = `${state.players.length} ${state.players.length === 1 ? 'player' : 'players'}`;
    if (!state.players.length) playersList.append(element('p', 'empty', 'No players yet. Add your first player below.'));
    state.players.forEach((player, index) => {
      const row = element('div', 'entry player-entry');
      const name = input(player.name, 'Player name', 'text', value => { player.name = value; changed(); });
      name.autocomplete = 'off';
      const age = input(player.age, 'Age', 'number', value => { player.age = value; changed(); });
      age.min = '0'; age.max = '120'; age.step = '1';
      const skill = select(player.skill, [['', 'Choose level'], ['Beginner', 'Beginner'], ['Intermediate', 'Intermediate'], ['Advanced', 'Advanced']],
        value => { player.skill = value; changed(); });
      row.append(field(`Player ${index + 1}`, name), field('Age', age), field('Skill level', skill),
        removeButton(`Remove player ${index + 1}`, () => { state.players.splice(index, 1); renderPlayers(); changed(); }));
      playersList.append(row);
    });
  }

  function renderGames() {
    gamesList.replaceChildren();
    document.getElementById('game-count').textContent = `${state.games.length} ${state.games.length === 1 ? 'game' : 'games'}`;
    if (!state.games.length) gamesList.append(element('p', 'empty', 'No games yet. Add your first game below.'));
    state.games.forEach((game, index) => {
      const row = element('div', 'entry game-entry');
      const name = input(game.name, 'Game name', 'text', value => { game.name = value; changed(); });
      name.autocomplete = 'off';
      const capacity = select(game.capacity, [['2', '2 players'], ['4', '4 players']],
        value => { game.capacity = value; changed(); });
      row.append(field(`Game ${index + 1}`, name), field('Group size', capacity),
        removeButton(`Remove game ${index + 1}`, () => { state.games.splice(index, 1); renderGames(); changed(); }));
      gamesList.append(row);
    });
  }

  function validate() {
    if (state.players.length < 2 || state.players.length > 100) throw new Error('Add between 2 and 100 players.');
    if (state.games.length < 1 || state.games.length > 50) throw new Error('Add between 1 and 50 games.');
    if (!validWholeNumber(state.rounds, 1, 100)) {
      throw new Error('Enter a whole number of rounds between 1 and 100.');
    }
    if (state.roundTime && (!validWholeNumber(state.roundTime, 1, Number.MAX_SAFE_INTEGER) ||
        !Number.isSafeInteger(Number(state.rounds) * Number(state.roundTime)))) {
      throw new Error('Enter a valid positive whole number of minutes per round.');
    }
    const names = new Set();
    const players = state.players.map((player, index) => {
      const name = player.name.trim();
      if (!name) throw new Error(`Enter a name for player ${index + 1}.`);
      const normalized = name.toLocaleLowerCase();
      if (names.has(normalized)) throw new Error(`Player names must be unique. Please distinguish "${name}".`);
      names.add(normalized);
      if (!/^\d+$/.test(player.age) || Number(player.age) > 120) throw new Error(`Enter an age from 0 to 120 for ${name}.`);
      if (!['Beginner', 'Intermediate', 'Advanced'].includes(player.skill)) throw new Error(`Choose a skill level for ${name}.`);
      return { name, age: Number(player.age), skill: player.skill };
    });
    const games = state.games.map((game, index) => {
      const name = game.name.trim();
      if (!name) throw new Error(`Enter a name for game ${index + 1}.`);
      if (!['2', '4'].includes(game.capacity)) throw new Error(`Choose a valid group size for ${name}.`);
      return { name, capacity: Number(game.capacity) };
    });
    if (!games.some(game => game.capacity <= players.length)) {
      throw new Error('There are not enough players for any of the games.');
    }
    return { players, games, rounds: Number(state.rounds), roundTime: state.roundTime ? Number(state.roundTime) : null };
  }

  function renderSchedule(players, games, rounds, roundTime) {
    const container = document.getElementById('schedule');
    container.replaceChildren();
    players.forEach((player, playerIndex) => {
      const card = element('article', 'schedule-card');
      card.append(element('h3', '', player.name));
      const list = element('ol', 'round-list');
      rounds.forEach((round, index) => {
        const row = element('li', 'round-item');
        row.append(element('span', 'round-label', `Ronde ${index + 1}`));
        const details = element('div', 'round-detail');
        const group = round.groups.find(item => item.players.includes(playerIndex));
        if (group) {
          details.append(element('strong', '', group.game.name));
          const others = group.players.filter(other => other !== playerIndex).map(other => players[other].name);
          details.append(element('span', 'playing-with', `Met ${others.join(', ')}`));
        } else {
          details.append(element('strong', 'sitting-out', 'Vrije ronde'));
        }
        row.append(details);
        list.append(row);
      });
      card.append(list);
      container.append(card);
    });
    const timeSummary = roundTime === null ? '' :
      ` · ${roundTime} ${roundTime === 1 ? 'minuut' : 'minuten'} per ronde · ${rounds.length * roundTime} ${rounds.length * roundTime === 1 ? 'minuut' : 'minuten'} totaal`;
    document.getElementById('results-summary').textContent =
      `${players.length} spelers · ${rounds.length} ${rounds.length === 1 ? 'ronde' : 'rondes'}${timeSummary} · De wedstrijden zijn willekeurig en geoptimaliseerd voor variatie.`;
    const gameNames = new Set(games.map(game => game.name.trim().toLocaleLowerCase()));
    const played = players.map(() => new Set());
    for (const round of rounds) {
      for (const group of round.groups) {
        const name = group.game.name.trim().toLocaleLowerCase();
        for (const player of group.players) played[player].add(name);
      }
    }
    const missingCount = played.filter(names => names.size < gameNames.size).length;
    const coverageWarning = document.getElementById('coverage-warning');
    coverageWarning.hidden = missingCount === 0;
    coverageWarning.textContent = missingCount === 0 ? '' :
      `Let op: ${missingCount} ${missingCount === 1 ? 'speler speelt' : 'spelers spelen'} niet alle verschillende spellen. Probeer opnieuw of wijzig het aantal rondes of spellen.`;
    results.hidden = false;
  }

  document.getElementById('export-data').addEventListener('click', () => {
    let url;
    try {
      const contents = JSON.stringify({ format: 'play-together-data', version: 1, data: state }, null, 2);
      url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pepernotentoernooi-gegevens.json';
      document.body.append(link);
      link.click();
      link.remove();
      showTransferStatus('Het bestand wordt gedownload. Bewaar het op een veilige plek.');
    } catch (exception) {
      showTransferStatus('Exporteren is mislukt. Probeer het opnieuw.', true);
      console.error('Exporteren mislukt:', exception);
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  });

  document.getElementById('import-data').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      let parsed;
      try {
        parsed = JSON.parse(await file.text());
      } catch (exception) {
        throw new Error('Het bestand kan niet als JSON worden gelezen.');
      }
      if (parsed && typeof parsed === 'object' && ('format' in parsed || 'version' in parsed) &&
          (parsed.format !== 'play-together-data' || parsed.version !== 1)) {
        throw new Error('Dit bestandsformaat wordt niet ondersteund.');
      }
      const data = parsed && parsed.format === 'play-together-data' ? parsed.data : parsed;
      if (!isSavedState(data) || data.players.length > 100 || data.games.length > 50 ||
          !isNumberInputValue(data.rounds) ||
          (data.roundTime !== undefined && !isNumberInputValue(data.roundTime)) ||
          data.players.some(player => !isNumberInputValue(player.age)) ||
          data.players.some(player => !['', 'Beginner', 'Intermediate', 'Advanced'].includes(player.skill)) ||
          data.games.some(game => !['2', '4'].includes(game.capacity))) {
        throw new Error('Dit bestand bevat geen geldige gegevens van de schema generator.');
      }
      if (!window.confirm('Importeren vervangt de huidige spelers, spellen en ronde-instellingen. Doorgaan?')) {
        showTransferStatus('Importeren geannuleerd.');
        return;
      }
      const imported = {
        players: data.players.map(({ name, age, skill }) => ({ name, age, skill })),
        games: data.games.map(({ name, capacity }) => ({ name, capacity })),
        rounds: data.rounds,
        roundTime: data.roundTime === undefined ? '' : data.roundTime
      };
      if (!save(imported)) throw new Error('Opslaan is mislukt. De huidige gegevens zijn niet vervangen.');
      state = imported;
      renderPlayers();
      renderGames();
      roundsInput.value = state.rounds;
      roundTimeInput.value = state.roundTime;
      updateTotalTime();
      results.hidden = true;
      error.hidden = true;
      showTransferStatus('Gegevens geïmporteerd en opgeslagen.');
    } catch (exception) {
      showTransferStatus(exception.message, true);
    } finally {
      importFile.value = '';
    }
  });

  document.getElementById('add-player').addEventListener('click', () => {
    if (state.players.length >= 100) {
      error.textContent = 'Een schema ondersteunt maximaal 100 spelers.';
      error.hidden = false;
      return;
    }
    state.players.push(emptyPlayer()); renderPlayers(); changed();
    playersList.lastElementChild.querySelector('input').focus();
  });
  document.getElementById('add-game').addEventListener('click', () => {
    if (state.games.length >= 50) {
      error.textContent = 'Een schema ondersteunt maximaal 50 spellen.';
      error.hidden = false;
      return;
    }
    state.games.push(emptyGame()); renderGames(); changed();
    gamesList.lastElementChild.querySelector('input').focus();
  });
  roundsInput.value = state.rounds;
  roundTimeInput.value = state.roundTime;
  updateTotalTime();
  roundsInput.addEventListener('input', () => { state.rounds = roundsInput.value; updateTotalTime(); changed(); });
  roundTimeInput.addEventListener('input', () => { state.roundTime = roundTimeInput.value; updateTotalTime(); changed(); });
  document.getElementById('generate').addEventListener('click', () => {
    try {
      const data = validate();
      const schedule = ScheduleGenerator.generateSchedule(data.players, data.games, data.rounds);
      error.hidden = true;
      renderSchedule(data.players, data.games, schedule, data.roundTime);
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (exception) {
      results.hidden = true;
      error.textContent = exception.message;
      error.hidden = false;
    }
  });
  document.getElementById('print').addEventListener('click', () => window.print());
  renderPlayers();
  renderGames();
})();
