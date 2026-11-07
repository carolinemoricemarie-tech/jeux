export const CHARACTERS = {
  emmy: { name: 'Emmy', age: 5, ageLabel: '5 ans', accent: '#74a892' },
  louane: { name: 'Louane', age: 7.5, ageLabel: '7 ans et demi', accent: '#ab93c4' }
};
export function validCharacter(id) {
  return Object.hasOwn(CHARACTERS, id) ? id : 'emmy';
}
