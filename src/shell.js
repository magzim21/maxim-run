// The "Talk to my shell" commands. Pure: takes the typed line and the page data, returns the
// lines to print and at most one action for the page to perform (theme, language, mail, clear).

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

export function runCommand(input, data) {
  const t = data.text;
  const line = String(input).trim().replace(/\s+/g, ' ');
  const [cmd = '', ...args] = line.toLowerCase().split(' ');
  const out = (text, cls = 'ok') => ({ lines: [{ cls, text }] });

  switch (cmd) {
    case '':
      return { lines: [] };
    case 'help':
    case '?':
      return out(t.help, '');
    case 'whoami':
      return out(t.whoami);
    case 'skills':
    case 'stack':
    case 'ls':
      return out(data.stack.join('  ·  '), '');
    case 'certs':
      return out(data.certs.map((c) => `✓ ${c}`).join('\n'));
    case 'travel':
      return out(t.travel);
    case 'contact':
    case 'email':
      return out(t.contact);
    case 'socials':
    case 'links':
      return { lines: data.socials.map(([label, url]) => ({ cls: 'link', text: label, href: url })) };
    case 'uptime':
      return out(fill(t.uptime, { years: data.years }));
    case 'date':
      return out(new Date().toString(), '');
    case 'clear':
    case 'cls':
      return { lines: [], action: { type: 'clear' } };
    case 'theme': {
      const id = args[0];
      if (!data.themes.includes(id)) return out(t.themeUnknown, 'err');
      return { lines: [{ cls: 'ok', text: fill(t.themeSet, { name: id }) }], action: { type: 'theme', id } };
    }
    case 'lang': {
      const hit = data.langs.find(([code]) => code === args[0]);
      if (!hit) return out(t.langUnknown, 'err');
      return { lines: [{ cls: 'ok', text: t.langSwitch }], action: { type: 'lang', code: hit[0], path: hit[1] } };
    }
    case 'sudo':
      if (args.join(' ') === 'hire max') {
        return { lines: [{ cls: 'ok', text: t.hire }], action: { type: 'mail', href: `mailto:${data.email}?subject=Hi%20Max` } };
      }
      return out(fill(t.notFound, { cmd: line }), 'err');
    case 'exit':
      return { lines: [{ cls: '', text: 'logout' }], action: { type: 'clear' } };
    default:
      return out(fill(t.notFound, { cmd }), 'err');
  }
}
