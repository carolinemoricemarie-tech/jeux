export const GROUND = 402;
export const HORSE_X = 180;
export const FINISH = 10500;
export const COURSES = {
  prairie: { name: 'La prairie fleurie', icon: '🌼', count: 8, gap: 760, height: 42, description: 'De petites barrières pour prendre confiance.' },
  garden: { name: 'Le jardin des rubans', icon: '🎀', count: 10, gap: 680, height: 54, description: 'Des obstacles colorés et de jolis sauts.' },
  forest: { name: 'La forêt enchantée', icon: '🌲', count: 13, gap: 710, height: 62, description: 'Un grand parcours au milieu des arbres.' }
};

// All distances are in scene coordinates, independently of the screen size.
export function createGame(pace = 'gentle', course = null) {
  const config = COURSES[course] || { count: 13, gap: 710, height: 46 };
  const obstacles = [];
  const stars = [];
  for (let i = 0; i < config.count; i++) {
    const x = 950 + i * config.gap;
    obstacles.push({ x, width: 48, height: config.height + (i % 2) * 8, touched: false, passed: false });
    stars.push({ x: x - 180, height: 43, collected: false });
    stars.push({ x: x + 20, height: 137, collected: false });
    stars.push({ x: x + 210, height: 62, collected: false });
  }
  return { distance: 0, height: 0, velocity: 0, stars: 0, bumps: 0, cleared: 0,
    course: COURSES[course] ? course : 'forest',
    finish: COURSES[course] ? 950 + (config.count - 1) * config.gap + 950 : FINISH,
    speed: pace === 'trot' ? 270 : 210, status: 'playing', obstacles, collectibles: stars };
}

export function jump(game) {
  if (game.status !== 'playing' || game.height > 0 || game.velocity !== 0) return false;
  game.velocity = 550;
  return true;
}

export function advance(game, dt) {
  if (game.status !== 'playing') return [];
  // Small steps prevent passing through a fence when a frame is delayed.
  let remaining = Math.max(0, Math.min(dt, 0.1));
  const events = [];
  while (remaining > 0 && game.status === 'playing') {
    const step = Math.min(remaining, 1 / 120);
    remaining -= step;
    game.distance = Math.min(game.finish, game.distance + game.speed * step);
    if (game.velocity !== 0 || game.height > 0) {
      game.height = Math.max(0, game.height + game.velocity * step);
      game.velocity -= 1150 * step;
      if (game.height === 0) game.velocity = 0;
    }
    for (const obstacle of game.obstacles) {
      const x = obstacle.x - game.distance;
      if (!obstacle.touched && x < HORSE_X + 34 && x + obstacle.width > HORSE_X - 30 && game.height < obstacle.height - 6) {
        obstacle.touched = true;
        game.bumps++;
        events.push('bump');
      }
      if (!obstacle.passed && x + obstacle.width < HORSE_X - 30) {
        obstacle.passed = true;
        if (!obstacle.touched) { game.cleared++; events.push('clear'); }
      }
    }
    for (const star of game.collectibles) {
      const x = star.x - game.distance;
      if (!star.collected && Math.abs(x - HORSE_X) < 47 && Math.abs(star.height - (game.height + 60)) < 52) {
        star.collected = true;
        game.stars++;
        events.push('star');
      }
    }
    if (game.distance >= game.finish) {
      game.status = 'finished';
      events.push('finish');
    }
  }
  return events;
}
