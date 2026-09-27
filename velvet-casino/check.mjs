import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const source = await readFile('dist/game.js', 'utf8');
const { drawOutcome, buyTokens, creditOutcome, SYMBOLS, COIN_REWARDS } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
for (const sample of [0, .399999, .4, .999999]) {
  const result = drawOutcome(() => sample);
  assert.equal(result.won, sample < .4);
  assert.equal(result.payout, sample < .4 ? 1 : 0);
  assert.equal(result.symbols.every(s => s === result.symbols[0]), result.won);
}
let seed = 123456, wins = 0;
const counts = Array(5).fill(0);
for (const [index, ticket] of [.2, .55, .7, .8, .826].entries()) {
  let call = 0;
  const outcome = drawOutcome(() => call++ === 0 ? 0 : ticket);
  assert.deepEqual(outcome.symbols, Array(3).fill(SYMBOLS[index]));
  assert.equal(outcome.coinReward, COIN_REWARDS[index]);
  assert.deepEqual(creditOutcome({tokens:2,coins:300,spinning:true},outcome), {tokens:3,coins:300+COIN_REWARDS[index],spinning:false});
}
const loss = drawOutcome(() => .99);
let rejectedCalls = 0;
const rejected = drawOutcome(() => rejectedCalls++ === 0 ? 0 : .99);
assert.equal(rejected.won, false);
assert.equal(rejected.coinReward, 0);
assert.equal(rejected.payout, 0);
assert.equal(rejected.symbols.every(symbol => symbol === rejected.symbols[0]), false);
assert.equal(loss.coinReward, 0);
assert.deepEqual(creditOutcome({tokens:2,coins:300,spinning:true},loss), {tokens:2,coins:300,spinning:false});
for (const spin of [0,1,2]) {
  assert.equal(drawOutcome(()=>.52,spin).won,true);
  assert.equal(drawOutcome(()=>.55,spin).won,false);
}
for (const spin of [3,4,100]) assert.equal(drawOutcome(()=>.52,spin).won,false);
const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
for(let i=0;i<100000;i++) { const result=drawOutcome(random); wins+=Number(result.won); if(result.won) counts[SYMBOLS.indexOf(result.symbols[0])]++; assert.equal(result.symbols.every(s=>s===result.symbols[0]), result.won); }
assert.ok(wins > 32100 && wins < 34100);
for (const [index, expected] of [18000,9000,4000,2000,100].entries()) assert.ok(Math.abs(counts[index]-expected)<(index===4 ? 50 : 600));
const valueReturned = counts.reduce((sum,count,index)=>sum+count*(COIN_REWARDS[index]+100),0)/100000;
assert.ok(valueReturned>94 && valueReturned<102);
assert.equal(COIN_REWARDS[SYMBOLS.indexOf('diamond')],1000);
assert.ok(counts.every((count,index)=>index===0 || counts[index-1]>count));
assert.deepEqual(buyTokens({tokens:3,coins:300},3),{tokens:6,coins:0});
assert.throws(()=>buyTokens({tokens:0,coins:0},1));
assert.throws(()=>buyTokens({tokens:3,coins:300},-1));
assert.throws(()=>buyTokens({tokens:3,coins:300},1.5));
for(const file of ['dist/assets/casino-bg.png','dist/assets/host.png','dist/app.js','dist/style.css']) await access(file);
console.log(`Checks passed. ${wins}/100000 returns; symbol wins ${counts.join(', ')}. Payouts, rarity and shop arithmetic correct.`);
