import { validCharacter } from './characters.mjs';
import { COURSES } from './engine.mjs';
import { PONIES } from './ponies.mjs';
export const SAVE_KEY = 'crins-magiques-ecurie-v1';
export const PONY_IDS = Object.keys(PONIES);
export const NEEDS = ['food', 'clean', 'energy', 'bond'];
export const TACK_ORDER = ['pad', 'saddle', 'bridle'];
export const TACK_NAMES = { pad: 'le tapis', saddle: 'la selle', bridle: 'le filet' };
export const ACTIONS = {
  hay: { food: 28, energy: 3, bond: 3 },
  carrot: { food: 12, bond: 9 },
  brush: { clean: 24, bond: 7 },
  pet: { bond: 18 },
  rest: { energy: 32, food: -3 }
};
const clamp = n => Math.min(100, Math.max(0, n));
export function createStable() {
  return { version: 1, challengeVersion: 4, chosen: 'noisette', character: 'emmy', ponies: Object.fromEntries(PONY_IDS.map(id =>
    [id, { food: 58, clean: 44, energy: 78, bond: 48, resting:false, tack: { pad: false, saddle: false, bridle: false } }])), rides: 0, walks:0, stars: 0, records: {},centre:{doors:{},jobs:{}} };
}
export function restoreStable(raw) {
  const fresh = createStable();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return fresh;
    fresh.character = validCharacter(parsed.character);
    for(const id of ['box0','box1','box2','box3','box4','box5','sellerie'])if(parsed.centre?.doors?.[id]===true)fresh.centre.doors[id]=true;
    for(const type of ['water','hay','clean'])for(const id of ['box0','box1','box2'])if(parsed.centre?.jobs?.[type+':'+id]===true)fresh.centre.jobs[type+':'+id]=true;
    if(parsed.chosen==='caramel')parsed.chosen='etoile';
    if(parsed.ponies?.caramel&&!parsed.ponies.etoile)parsed.ponies.etoile=parsed.ponies.caramel;
    if (PONY_IDS.includes(parsed.chosen)) fresh.chosen = parsed.chosen;
    for (const id of PONY_IDS) for (const need of NEEDS) {
      const n = parsed.ponies?.[id]?.[need];
      if (typeof n === 'number' && Number.isFinite(n)) fresh.ponies[id][need] = clamp(n);
    }
    for (const id of PONY_IDS) {
      fresh.ponies[id].resting=parsed.ponies?.[id]?.resting===true;
      const saved = parsed.ponies?.[id]?.tack;
      const tack = fresh.ponies[id].tack;
      tack.pad = saved?.pad === true;
      tack.saddle = tack.pad && saved?.saddle === true;
      tack.bridle = tack.saddle && saved?.bridle === true;
    }
    for (const key of ['rides', 'walks', 'stars']) {
      if (Number.isSafeInteger(parsed[key]) && parsed[key] >= 0) fresh[key] = parsed[key];
    }
    for (const course of [...Object.keys(COURSES),...['emmy','louane'].flatMap(id=>Object.keys(COURSES).map(course=>id+':'+course))]) {
      const record = parsed.challengeVersion === 4 ? parsed.records?.[course] : null;
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
  pony.resting=action==='rest';
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
export function tackReadiness(pony) {
  const missing = TACK_ORDER.find(key => !pony.tack?.[key]);
  return missing ? `Installe d’abord ${TACK_NAMES[missing]} en cliquant dessus dans l’écurie.` : '';
}
export function fitTack(pony, item) {
  if (!TACK_ORDER.includes(item)) return { ok: false, message: 'Cet équipement est inconnu.' };
  pony.tack ||= { pad: false, saddle: false, bridle: false };
  const index = TACK_ORDER.indexOf(item);
  if (pony.tack[item]) return { ok: false, message: `${TACK_NAMES[item][0].toUpperCase()+TACK_NAMES[item].slice(1)} est déjà en place.` };
  const prerequisite = TACK_ORDER.slice(0, index).find(key => !pony.tack[key]);
  if (prerequisite) return { ok: false, message: `Commence par ${TACK_NAMES[prerequisite]}.` };
  pony.tack[item] = true;
  pony.resting=false;
  return { ok: true, message: `${TACK_NAMES[item][0].toUpperCase()+TACK_NAMES[item].slice(1)} est installé${item === 'saddle' ? 'e' : ''} !` };
}
export function removeTack(pony) {
  const wasEquipped = TACK_ORDER.some(key => pony.tack?.[key]);
  pony.tack = { pad: false, saddle: false, bridle: false };
  return wasEquipped;
}
export function prepareForRide(pony) {
  pony.resting=false;
  const actions = [];
  if (rideReadiness(pony)) {
    removeTack(pony);
    // Rest first: it uses a little food, which is replenished before saddling.
    for (const [need, minimum, action] of [['energy', 25, 'rest'], ['food', 25, 'hay'], ['clean', 20, 'brush']]) {
      while (pony[need] < minimum) { care(pony, action); actions.push(action); }
    }
  }
  for (const item of TACK_ORDER) {
    if (!pony.tack?.[item] && fitTack(pony, item).ok) actions.push(item);
  }
  return actions;
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
    if(game.activity==='trail'){stable.walks=(stable.walks||0)+1;pony.bond=clamp(pony.bond+4);return true;}
    stable.rides++;
    stable.stars += game.stars;
    const key=game.character?game.character+':'+game.course:game.course;
    const previous = stable.records[key];
    if (!previous || game.cleared > previous.clear || (game.cleared === previous.clear && game.stars > previous.stars)) {
      stable.records[key] = { clear: game.cleared, stars: game.stars };
    }
  }
  return true;
}
