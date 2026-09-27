import { SYMBOLS, drawOutcome, buyTokens, creditOutcome, WELCOME_SPINS } from './game.js';
const $ = id => document.getElementById(id);
let completedSpins = 0;
let state = { tokens: 0, coins: 300, spinning: false };
let sound = false;
let audio;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reels = [...document.querySelectorAll('.reel')];
const SYMBOL_ART = {
  ruby: { src: 'assets/ruby.png', label: 'Рубин' },
  sapphire: { src: 'assets/sapphire.png', label: 'Сапфир' },
  crown: { src: 'assets/crown.png', label: 'Корона' },
  diamond: { src: 'assets/diamond.png', label: 'Алмаз' }
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function say(message) { $('hostSpeech').textContent = message; }
function update() {
  $('tokens').textContent = state.tokens;
  $('coins').textContent = state.coins;
  $('shopCoins').textContent = state.coins;
  const remaining = Math.max(0, WELCOME_SPINS - completedSpins);
  $('welcomeStatus').textContent = remaining ? `Приветственный бонус · осталось вращений: ${remaining}` : 'Приветственный бонус завершён';
  $('lever').disabled = state.spinning || state.tokens < 1;
  $('lever').setAttribute('aria-label', state.tokens < 1 ? 'Нет токенов. Пополни баланс в магазине.' : 'Потянуть рычаг: вращение за 1 токен');
  document.querySelectorAll('[data-buy]').forEach(button => { button.disabled = state.spinning || state.coins < Number(button.dataset.buy) * 100; });
}
function tone(frequency, duration = .09, volume = .035) {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { sound = false; }
}
function setReel(reel, symbol) {
  const current = SYMBOLS.indexOf(symbol);
  const symbols = [SYMBOLS[(current + 1) % SYMBOLS.length], symbol, SYMBOLS[(current + 2) % SYMBOLS.length]];
  reel.firstElementChild.replaceChildren(...symbols.map(makeSymbol));
}
function makeSymbol(symbol) {
  const span = document.createElement('span');
  span.dataset.symbol = symbol;
  if (SYMBOL_ART[symbol]) {
    const img = document.createElement('img');
    img.src = SYMBOL_ART[symbol].src;
    img.alt = SYMBOL_ART[symbol].label;
    img.draggable = false;
    img.className = 'symbol-art';
    span.append(img);
  } else span.textContent = symbol;
  if (symbol === '7') span.className = 'seven';
  return span;
}
async function animateReel(reel, symbol, index) {
  if (reduced) { await wait(120 + index * 80); setReel(reel, symbol); return; }
  const strip = reel.firstElementChild;
  const height = strip.children[0].getBoundingClientRect().height;
  const initial = [...strip.children].map(span => span.dataset.symbol);
  const steps = 23 + index * 6;
  const sequence = [...initial];
  while (sequence.length < steps) sequence.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  const target = SYMBOLS.indexOf(symbol);
  sequence.push(SYMBOLS[(target + 1) % SYMBOLS.length], symbol, SYMBOLS[(target + 2) % SYMBOLS.length]);
  strip.replaceChildren(...sequence.map(makeSymbol));
  const start = reel.clientHeight / 2 - height * 1.5;
  const travel = steps * height;
  const transform = distance => `translate3d(0, ${start - distance}px, 0)`;
  reel.classList.add('rolling');
  const motion = strip.animate([
    { transform: transform(0), filter: 'blur(0px)', offset: 0, easing: 'cubic-bezier(.5,0,.8,.5)' },
    { transform: transform(travel * .15), filter: 'blur(1.7px)', offset: .2, easing: 'linear' },
    { transform: transform(travel * .7), filter: 'blur(1.7px)', offset: .55, easing: 'cubic-bezier(.15,.65,.25,1)' },
    { transform: transform(travel + 7), filter: 'blur(0px)', offset: .94, easing: 'ease-out' },
    { transform: transform(travel), filter: 'blur(0px)', offset: 1 }
  ], { duration: 2300 + index * 450, fill: 'forwards' });
  try { await motion.finished; } catch { /* Settle safely if animation is interrupted. */ }
  setReel(reel, symbol);
  motion.cancel();
  reel.classList.remove('rolling');
  tone(260 + index * 110);
}
let reactionIndex = 0;
async function spin() {
  if (state.spinning) return { error: 'Вращение уже идёт.' };
  if (state.tokens < 1) return { error: 'Нужен хотя бы 1 токен.' };
  state.spinning = true; state.tokens -= 1; update();
  $('machine').classList.remove('won'); $('machine').setAttribute('aria-busy', 'true');
  $('lever').classList.add('pulled'); $('result').textContent = 'БАРАБАНЫ КРУТЯТСЯ…';
  say('Крутим! Ждём, пока барабаны остановятся.');
  const outcome = drawOutcome(Math.random, completedSpins);
  completedSpins += 1;
  tone(160, .18);
  await wait(reduced ? 80 : 250);
  $('lever').classList.remove('pulled');
  await Promise.all(reels.map((reel, index) => animateReel(reel, outcome.symbols[index], index)));
  state = creditOutcome(state, outcome); update();
  $('machine').setAttribute('aria-busy', 'false');
  $('reels').setAttribute('aria-label', 'Результат: ' + outcome.symbols.map(symbol => SYMBOL_ART[symbol]?.label ?? symbol).join(', '));
  if (outcome.won) {
    $('machine').classList.add('won'); $('result').textContent = `СОВПАДЕНИЕ! +${outcome.coinReward} МОНЕТ · +1 ТОКЕН`;
    const cheers = ['Мур-р, красиво!', 'Отлично, три одинаковых!', 'Вот это совпадение!'];
    say(`${cheers[reactionIndex++ % cheers.length]} +${outcome.coinReward} монет, токен вернулся! Всего монет: ${state.coins}.`);
    tone(660, .25); setTimeout(() => tone(880, .3), 150);
  } else {
    $('result').textContent = state.tokens ? 'БЕЗ СОВПАДЕНИЯ · ТОКЕН НЕ ВЕРНУЛСЯ' : 'ТОКЕНЫ ЗАКОНЧИЛИСЬ · ЗАГЛЯНИ В МАГАЗИН';
    say(state.tokens ? `В этот раз без совпадения. −1 токен. На балансе: ${state.tokens}.` : 'Токены закончились. Новые можно взять в магазине за игровые монеты.');
  }
  return { ...outcome, tokens: state.tokens, coins: state.coins };
}
$('lever').addEventListener('click', () => { if (!suppressClick) void spin(); });
let dragStart = null, suppressClick = false;
$('lever').addEventListener('pointerdown', event => {
  if (event.button !== 0 || state.spinning || state.tokens < 1) return;
  suppressClick = false; dragStart = event.clientY; $('lever').setPointerCapture(event.pointerId);
});
$('lever').addEventListener('pointermove', event => {
  if (dragStart !== null && event.clientY - dragStart > 28) {
    dragStart = null; suppressClick = true; void spin();
  }
});
$('lever').addEventListener('pointerup', () => { dragStart = null; setTimeout(() => { suppressClick = false; }, 0); });
$('lever').addEventListener('pointercancel', () => { dragStart = null; suppressClick = false; });
$('shopOpen').addEventListener('click', () => { update(); $('shopDialog').showModal(); });
$('rulesOpen').addEventListener('click', () => $('rulesDialog').showModal());
$('helpButton').addEventListener('click', () => $('rulesDialog').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));
function purchase(quantity) {
  if (state.spinning) throw new Error('Дождись окончания вращения.');
  state = buyTokens(state, quantity); update();
  $('shopMessage').textContent = `Готово! Добавлено токенов: ${quantity}. Можно крутить.`;
  say('Токены на месте! Закрой магазин и потяни красный рычаг.');
  if (state.tokens > 0) $('result').textContent = 'ТОКЕНЫ НА МЕСТЕ · ПОТЯНИ РЫЧАГ';
  return { tokens: state.tokens, coins: state.coins };
}
document.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => {
  try { purchase(Number(button.dataset.buy)); } catch (error) { $('shopMessage').textContent = error.message; }
}));
$('freeCoins').addEventListener('click', () => {
  state.coins += 500; update(); $('shopMessage').textContent = '+500 игровых монет. Подарок от Барсика!';
});
$('soundToggle').addEventListener('click', () => {
  sound = !sound; $('soundToggle').setAttribute('aria-pressed', String(sound)); $('soundToggle').setAttribute('aria-label', sound ? 'Выключить звук' : 'Включить звук'); $('soundToggle').title = sound ? 'Выключить звук' : 'Включить звук'; $('soundState').textContent = sound ? 'вкл.' : 'выкл.'; tone(440);
});
reels.forEach((reel, index) => setReel(reel, ['ruby', '7', 'crown'][index]));
update();
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const register = tool => {
    try { void Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {}
  };
  register({ name: 'read_game_balance', description: 'Read current demo token and coin balance.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ ...state }) });
  register({ name: 'spin_reels', description: 'Spend one virtual token to spin the reels. Three matching symbols award virtual coins and return one token. Waits for completion.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: spin });
  register({ name: 'buy_virtual_tokens', description: 'Buy 1, 3 or 5 demo tokens for 100 virtual coins each. No real money.', inputSchema: { type: 'object', properties: { quantity: { type: 'integer', enum: [1, 3, 5] } }, required: ['quantity'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => { if (!input || Object.keys(input).some(key => key !== 'quantity')) throw new Error('Invalid input'); return purchase(input.quantity); } });
  addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
