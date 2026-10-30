// Board C4 under node: every {{ binding }} resolves, colours are tokens, and the folding card works.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const src = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
class DCLogic { constructor(props) { this.props = props; this.state = {}; } setState(s) { Object.assign(this.state, s); } }
const Component = new Function('DCLogic', src + '\nreturn Component;')(DCLogic);
const c = new Component({});
const template = html.split('<script type="text/x-dc"')[0];
const used = [...template.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => m[1]);
const v = c.renderVals();
const scopes = { p: v.sheets[1], q: v.sims[0] };
scopes.r = scopes.p.rows.find((r) => r.switchable);
scopes.k = scopes.q.cards[0];
scopes.o = scopes.q.barOpts[0];
const missing = new Set();
for (const path of used) {
  if (path === 'true' || path === 'false') continue;
  const [head, ...rest] = path.split('.');
  let value = head in scopes ? scopes[head] : v[head];
  for (const key of rest) value = value == null ? undefined : value[key];
  if (value === undefined) missing.add(path);
}
console.log('bindings', new Set(used).size, 'missing', [...missing]);
const ORIGINE = ['#0D1214', '#151C1F', '#1D3344', '#2C383D', '#1F2A2E', '#E2E8E8', '#97A5AA', '#7D8B91', '#8EBDE3', '#B5D4F0', '#6CC08A', '#2E7A4B', '#D9A043', '#B5760C', '#E36B5E', '#7A2A24'];
console.log('off-token colours', [...new Set((html.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()))].filter((h) => !ORIGINE.includes(h)));
const say = (label) => {
  const x = c.renderVals();
  console.log(label, JSON.stringify(x.sheets.map((s) => [s.open, s.summary, s.adviceText, s.rows.map((r) => r.name.slice(0, 6) + (r.switchable ? (r.checked === 'true' ? '+' : '-') : '·'))]).concat([[x.sims[0].open, x.sims[0].summary, x.sims[0].adviceText, x.sims[0].cards.map((k) => k.word + ' ' + k.taken)]])));
};
say('start');
c.renderVals().sheets[0].fold(); say('phone 3 unfolded');
c.renderVals().sheets[0].rows[0].toggle(); say('phone 3 Brooch on');
c.renderVals().sheets[1].rows[1].toggle(); say('phone 4 Bonemass off (shared)');
c.renderVals().sims[0].barOpts[2].pick(); c.renderVals().sims[0].fold(); say('phone 5 bar 50 %, unfolded');
c.renderVals().reset(); say('reset');
