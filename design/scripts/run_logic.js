// Runs an artboard's DCLogic component under node and prints selected render values.
const fs = require('fs');
const [file, ...steps] = process.argv.slice(2);
const html = fs.readFileSync(file, 'utf8');
const src = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
class DCLogic { constructor(props) { this.props = props; this.state = {}; } setState(s) { Object.assign(this.state, s); } }
const Component = new Function('DCLogic', src + '\nreturn Component;')(DCLogic);
const c = new Component({});
for (const s of steps) Object.assign(c.state, JSON.parse(s));
const v = c.renderVals();
const strip = (o) => JSON.parse(JSON.stringify(o, (k, x) => typeof x === 'function' ? undefined : x));
console.log(JSON.stringify(strip(v), null, 0));
