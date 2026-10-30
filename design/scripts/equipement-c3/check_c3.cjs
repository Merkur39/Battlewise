// Board C3 under node: every {{ binding }} resolves, and a walk through the shared flow.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const src = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
class DCLogic { constructor(props) { this.props = props; this.state = {}; } setState(s) { Object.assign(this.state, s); } }
const Component = new Function('DCLogic', src + '\nreturn Component;')(DCLogic);
const c = new Component({});
const template = html.split('<script type="text/x-dc"')[0];
const used = [...template.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => m[1]);
const v = c.renderVals();
const scopes = { p: v.sheets[2], q: v.sims[0] };
scopes.s = scopes.p.sections[0];
scopes.r = scopes.s.rows.find((r) => r.switchable);
scopes.c = scopes.p.chips[0];
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
const hexes = new Set((html.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()));
const ORIGINE = ['#0D1214', '#151C1F', '#1D3344', '#2C383D', '#1F2A2E', '#E2E8E8', '#97A5AA', '#7D8B91', '#8EBDE3', '#B5D4F0', '#6CC08A', '#2E7A4B', '#D9A043', '#B5760C', '#E36B5E', '#7A2A24'];
console.log('off-token colours', [...hexes].filter((h) => !ORIGINE.includes(h)));
const say = (label) => {
  const x = c.renderVals();
  console.log(label, JSON.stringify({
    s1: [x.sheets[0].label, x.sheets[0].adviceText, x.sheets[0].chips.map((k) => k.name)],
    s3: [x.sheets[2].adviceText, x.sheets[2].chips.map((k) => k.name)],
    m1: [x.sims[0].adviceText, x.sims[0].chips.map((k) => k.name), x.sims[0].cards.map((k) => k.word + ' ' + k.taken)],
    m2open: x.sims[1].open,
  }));
};
say('start');
c.renderVals().sheets[0].openHelp(); say('s1 open');
c.renderVals().sheets[0].sections[1].rows.find((r) => r.id === 's1-fader').toggle();
c.renderVals().sheets[0].apply(); say('s1 fader applied');
c.renderVals().sheets[2].chips.find((k) => k.name.includes('Fader')).remove(); say('s3 removes Fader (shared)');
c.renderVals().sims[0].barOpts[2].pick();
const open = c.renderVals().sims[0];
open.openHelp();
const m1 = c.renderVals().sims[0];
console.log('m1 at 50 %', m1.against, '|', m1.sections.map((s) => s.title + ': ' + s.rows.map((r) => r.id.split('-')[1] + (r.switchable ? (r.checked === 'true' ? '+' : '-') : '') + ' ' + r.text).join(' / ')).join('\n   '));
c.renderVals().reset(); say('reset');
const s2 = c.renderVals().sheets[1];
console.log('s2 rows', s2.sections.flatMap((s) => s.rows).map((r) => r.id.split('-')[1] + (r.switchable ? (r.checked === 'true' ? '[on]' : '[off]') : '[-]') + (r.nameColor === '#97A5AA' ? '(m)' : '')).join(' '));
