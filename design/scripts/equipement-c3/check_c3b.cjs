// The second review's two logic fixes, under node.
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const src = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
class DCLogic { constructor(props) { this.props = props; this.state = {}; } setState(s) { Object.assign(this.state, s); } }
const Component = new Function('DCLogic', src + '\nreturn Component;')(DCLogic);
const c = new Component({});
const row = (phone, id) => phone.sections.flatMap((s) => s.rows).find((r) => r.id.endsWith('-' + id));
// 1. A muted switch that is on stays once switched off.
c.renderVals().sims[0].barOpts[3].pick();
c.renderVals().sims[0].openHelp();
let fader = row(c.renderVals().sims[0], 'fader');
console.log('75 % fader before:', fader.switchable, fader.checked, fader.nameColor === '#97A5AA' ? 'greyed' : 'plain');
fader.toggle();
fader = row(c.renderVals().sims[0], 'fader');
console.log('75 % fader after :', fader.switchable, fader.checked, fader.nameColor === '#97A5AA' ? 'greyed' : 'plain');
fader.toggle();
console.log('back on          :', row(c.renderVals().sims[0], 'fader').checked);
// 2. Applying on phone 4 restarts the open dialog of phone 7 from the new set.
c.renderVals().reset();
row(c.renderVals().sheets[1], 'fader').toggle();
c.renderVals().sheets[1].apply();
const v = c.renderVals();
console.log('applied', c.state.applied, '| phone 7 draft', c.state.m2.draft, v.sims[1].applyLabel, '| phone 4 open', v.sheets[1].open);
