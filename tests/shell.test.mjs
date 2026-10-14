// The "Talk to my shell" command parser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runCommand } from '../src/shell.js';

const en = JSON.parse(readFileSync('i18n/en.json', 'utf8'));
const data = {
  years: 7,
  email: 'me@maxim.run',
  stack: ['Terraform', 'Kubernetes'],
  certs: ['CKA'],
  socials: [['GitHub', 'https://github.com/magzim21']],
  langs: [['en', '/'], ['ru', '/ru/'], ['he', '/he/']],
  themes: ['terminal', 'nebula', 'blueprint'],
  text: en.shell,
};

test('help lists the commands', () => {
  assert.match(runCommand('help', data).lines[0].text, /theme <name>/);
});

test('theme switches only to a known theme', () => {
  assert.deepEqual(runCommand('theme nebula', data).action, { type: 'theme', id: 'nebula' });
  const bad = runCommand('theme pink', data);
  assert.equal(bad.action, undefined);
  assert.equal(bad.lines[0].cls, 'err');
});

test('lang goes to the language page', () => {
  assert.deepEqual(runCommand('  LANG   ru ', data).action, { type: 'lang', code: 'ru', path: '/ru/' });
  assert.equal(runCommand('lang xx', data).action, undefined);
});

test('uptime fills the years', () => {
  assert.match(runCommand('uptime', data).lines[0].text, /up 7 years/);
});

test('sudo hire max opens a mail draft to the configured address', () => {
  assert.equal(runCommand('sudo hire max', data).action.href, 'mailto:me@maxim.run?subject=Hi%20Max');
});

test('socials print links, clear clears, unknown commands say so', () => {
  assert.equal(runCommand('socials', data).lines[0].href, 'https://github.com/magzim21');
  assert.deepEqual(runCommand('clear', data).action, { type: 'clear' });
  const r = runCommand('rm -rf /', data);
  assert.equal(r.lines[0].cls, 'err');
  assert.match(r.lines[0].text, /command not found: rm/);
  assert.deepEqual(runCommand('   ', data).lines, []);
});
