import { readFile, writeFile } from 'node:fs/promises';
let html = await readFile('dist/index.html', 'utf8');
let css = await readFile('dist/style.css', 'utf8');
const game = (await readFile('dist/game.js', 'utf8')).replaceAll('export ', '');
let app = (await readFile('dist/app.js', 'utf8')).replace(/^import[^\n]+\n/, '');
for (const name of ['ruby', 'sapphire', 'crown', 'diamond']) {
  const uri = 'data:image/png;base64,' + (await readFile(`dist/assets/${name}.png`)).toString('base64');
  app = app.replaceAll(`assets/${name}.png`, uri);
  html = html.replaceAll(`assets/${name}.png`, uri);
}
const background = (await readFile('dist/assets/casino-bg.png')).toString('base64');
const host = (await readFile('dist/assets/host.png')).toString('base64');
css = css.replace("url('assets/casino-bg.png')", `url('data:image/png;base64,${background}')`);
html = html.replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)
  .replace('src="assets/host.png"', `src="data:image/png;base64,${host}"`)
  .replace('<script type="module" src="app.js"></script>', () => `<script type="module">${game}\n${app}</script>`);
await writeFile('Бархатный кот.html', html);
console.log('Standalone HTML ready; all game code and imagery embedded.');
