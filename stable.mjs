export const SAVE_KEY = 'crins-magiques-ecurie-v1';
export const PONY_IDS = ['noisette', 'nuage', 'caramel'];
export const NEEDS = ['food', 'clean', 'energy', 'bond'];
export const ACTIONS = {
  hay: { food: 28, energy: 3, bond: 3 },
  carrot: { food: 12, bond: 9 },
  brush: { clean: 24, bond: 7 },
  pet: { bond: 18 },
  rest: { energy: 32, food: -3 }
};
const clamp = n => Math.min(100, Math.max(0, n));
export function createStable() {
  return { version: 1, challengeVersion: 3, chosen: 'noisette', ponies: Object.fromEntries(PONY_IDS.map(id =>
    [id, { food: 58, clean: 44, energy: 78, bond: 48 }])), rides: 0, stars: 0, records: {} };
}
export function restoreStable(raw) {
  const fresh = createStable();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return fresh;
    if (PONY_IDS.includes(parsed.chosen)) fresh.chosen = parsed.chosen;
    for (const id of PONY_IDS) for (const need of NEEDS) {
      const n = parsed.ponies?.[id]?.[need];
      if (typeof n === 'number' && Number.isFinite(n)) fresh.ponies[id][need] = clamp(n);
    }
    for (const key of ['rides', 'stars']) {
      if (Number.isSafeInteger(parsed[key]) && parsed[key] >= 0) fresh[key] = parsed[key];
    }
    for (const course of ['prairie', 'garden', 'forest']) {
      const record = parsed.challengeVersion === 3 ? parsed.records?.[course] : null;
      const count = 10;
      if (record && Number.isInteger(record.clear) && record.clear >= 0 && record.clear <= count &&
          Number.isInteger(record.stars) && record.stars >= 0 && record.stars <= count * 3) {
        fresh.records[course] = { clear: record.clear, stars: record.stars };
      }
    }
  } catch { /* An unavailable or damaged save starts a new, playable stable. */ }
  return fresh;
}
export function care(pony, action) {
  if (!Object.hasOwn(ACTIONS, action)) return false;
  for (const [key, amount] of Object.entries(ACTIONS[action])) pony[key] = clamp(pony[key] + amount);
  return true;
}
export function mood(pony) {
  if (pony.energy < 30) return { icon: '😴', label: 'Un peu fatigué', hint: 'Un petit repos lui ferait du bien.' };
  if (pony.food < 30) return { icon: '🥕', label: 'Un petit creux', hint: 'Propose-lui du foin dans son râtelier.' };
  if (pony.clean < 30) return { icon: '🧽', label: 'Envie d’un brossage', hint: 'Un coup de brosse et il sera tout beau !' };
  const average = NEEDS.reduce((sum, key) => sum + pony[key], 0) / NEEDS.length;
  if (average >= 80) return { icon: '🥰', label: 'Au comble du bonheur', hint: 'Il se sent aimé et prêt pour l’aventure !' };
  if (average >= 60) return { icon: '😊', label: 'Heureux', hint: 'Il aime passer du temps avec toi.' };
  return { icon: '🙂', label: 'Tout tranquille', hint: 'Quelques petites attentions lui feront plaisir.' };
}
export function rideReadiness(pony) {
  if (pony.energy < 25) return 'Ton poney a besoin d’un petit repos avant de partir.';
  if (pony.food < 25) return 'Un peu de foin avant le parcours lui fera du bien.';
  if (pony.clean < 20) return 'Brosse ton poney avant de lui mettre sa selle.';
  return '';
}
export function settleRide(stable, id, game) {
  // Each ride is charged once, including an early return. No needs decay offline.
  if (!game || game.settled) return false;
  game.settled = true;
  const fraction = Math.min(1, Math.max(game.distance / game.finish, game.effort || 0));
  const pony = stable.ponies[id];
  pony.energy = clamp(pony.energy - 25 * fraction);
  pony.food = clamp(pony.food - 20 * fraction);
  pony.clean = clamp(pony.clean - 28 * fraction);
  pony.bond = clamp(pony.bond + 8 * fraction);
  if (game.status === 'finished') {
    stable.rides++;
    stable.stars += game.stars;
    const previous = stable.records[game.course];
    if (!previous || game.cleared > previous.clear || (game.cleared === previous.clear && game.stars > previous.stars)) {
      stable.records[game.course] = { clear: game.cleared, stars: game.stars };
    }
  }
  return true;
}
