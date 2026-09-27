export const SYMBOLS = ['ruby', 'sapphire', 'crown', '7', 'diamond'];
export const COIN_REWARDS = [100, 200, 400, 600, 1000];
// Unused weight becomes a loss; other rewards retain their absolute probability.
const WIN_WEIGHTS = [45, 22.5, 10, 5, 0.25];
export const WELCOME_SPINS = 3;
export function drawOutcome(random = Math.random, completedSpins = WELCOME_SPINS) {
  let won = random() < (completedSpins < WELCOME_SPINS ? 0.55 : 0.4);
  let first;
  if (won) {
    const ticket = random() * 100;
    let cumulative = 0;
    first = WIN_WEIGHTS.findIndex(weight => (cumulative += weight) > ticket);
    won = first !== -1;
  }
  if (!won) {
    first = Math.floor(random() * SYMBOLS.length);
  }
  const indexes = won ? [first, first, first] : [first, Math.floor(random() * SYMBOLS.length), Math.floor(random() * SYMBOLS.length)];
  if (!won && indexes.every(value => value === first)) indexes[2] = (first + 1) % SYMBOLS.length;
  return { won, payout: won ? 1 : 0, coinReward: won ? COIN_REWARDS[first] : 0, symbols: indexes.map(index => SYMBOLS[index]) };
}
export function creditOutcome(state, outcome) {
  return { ...state, tokens: state.tokens + outcome.payout, coins: state.coins + outcome.coinReward, spinning: false };
}
export function buyTokens(state, quantity) {
  if (![1, 3, 5].includes(quantity)) throw new Error('Выбери пакет из магазина.');
  const cost = quantity * 100;
  if (state.coins < cost) throw new Error('Не хватает монет. Получи бесплатные монеты ниже.');
  return { ...state, coins: state.coins - cost, tokens: state.tokens + quantity };
}
