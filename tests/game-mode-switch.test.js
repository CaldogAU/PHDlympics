const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup({ mode = 'grand-prix', confirmed = true, failSave = false } = {}) {
  const game = {
    id: 'kart', name: 'Mario Kart 8 Deluxe', mode,
    capacity: { maxPlayersPerConsole: 4, maxPlayersPerLobby: 8, configured: true },
    minutesPerRound: 60, plannedRounds: 1,
    competitorEntries: { office: 4 }, consoleEntries: { office: 1 },
    completed: true, completedAt: 'yesterday'
  };
  const values = {
    gameName: game.name, gamePlatform: '', gameMode: 'time-trial',
    gameLogoUrl: '', gameMaxPlayersPerConsole: '4',
    gameMaxPlayersPerLobby: '8', gameMinutesPerRound: '60'
  };
  const state = {
    games: [game, { id: 'other', name: 'Other game', mode: 'grand-prix' }], teams: [], tournament: {},
    events: [
      { id: 'old', gameId: 'kart', mode: 'grand-prix', results: [{ finishPosition: 1 }] },
      { id: 'keep', gameId: 'other', mode: 'grand-prix', results: [] }
    ], rounds: []
  };
  const context = {
    PHDTournament: { state, editingGameId: 'kart', modules: [] },
    structuredClone, console: { error() {} },
    getValue: key => values[key], setValue() {}, getElement: () => null,
    isBlank: value => !value, alert() {}, confirm: () => confirmed,
    render() {}, saveState: async () => { if (failSave) throw new Error('offline'); },
    window: {
      PHDSessionPlanner: {
        getWeeklyAllowance: () => 60, getPlannedRoundCount: () => 1,
        getRoundDuration: () => 60
      },
      PHDGameCapacity: {
        validateCapacity: value => ({ valid: true, value }),
        getEntryValidation: () => ({ valid: true }),
        normaliseCapacity: value => value
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/games.js'), 'utf8'), context);
  return context;
}

for (const mode of ['grand-prix', 'time-trial']) {
  test(`saving time trial resets old Grand Prix events when current mode is ${mode}`, async () => {
    const context = setup({ mode });
    await context.saveGameFromForm();
    const state = context.PHDTournament.state;
    assert.equal(state.games[0].mode, 'time-trial');
    assert.equal(state.games[0].completed, false);
    assert.deepEqual(state.games[0].competitorEntries, { office: 4 });
    assert.deepEqual(state.games[0].consoleEntries, { office: 1 });
    assert.deepEqual(state.events.map(event => event.id), ['keep']);
  });
}

test('cancelling a mode reset leaves all state untouched', async () => {
  const context = setup({ confirmed: false });
  const before = JSON.stringify(context.PHDTournament.state);
  await context.saveGameFromForm();
  assert.equal(JSON.stringify(context.PHDTournament.state), before);
});

test('failed save restores the old mode and results', async () => {
  const context = setup({ failSave: true });
  const before = JSON.stringify(context.PHDTournament.state);
  await context.saveGameFromForm();
  assert.equal(JSON.stringify(context.PHDTournament.state), before);
});

test('ordinary edits preserve compatible events', async () => {
  const context = setup({ mode: 'time-trial' });
  context.PHDTournament.state.events[0].mode = 'time-trial';
  const before = JSON.stringify(context.PHDTournament.state.events);
  await context.saveGameFromForm();
  assert.equal(JSON.stringify(context.PHDTournament.state.events), before);
});

test('mode reset removes game-specific engines and preserves other matches', () => {
  const context = setup();
  const state = context.PHDTournament.state;
  state.games[0].fourPlayerSwiss = { rounds: [{}] };
  state.games[0].fallGuysGrandPrix = { heats: [{}] };
  state.rounds = [
    { gameId: 'kart', matches: [] },
    { matches: [{ gameId: 'kart' }, { gameId: 'other', completed: true }] }
  ];
  context.resetGameModeProgress(state.games[0]);
  assert.equal(state.rounds.length, 1);
  assert.equal(state.rounds[0].matches.length, 1);
  assert.equal(state.rounds[0].matches[0].gameId, 'other');
  assert.equal(state.rounds[0].completed, true);
  assert.equal(state.games[0].fourPlayerSwiss, undefined);
  assert.equal(state.games[0].fallGuysGrandPrix, undefined);
});
