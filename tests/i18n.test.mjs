// Translations: every language mirrors en.json, and the build refuses a broken one (failure path).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkTranslations } from '../src/i18n-check.mjs';

const config = JSON.parse(readFileSync('config/site.config.json', 'utf8'));
const load = () => Object.fromEntries(config.languages.map((l) => [l.code, JSON.parse(readFileSync(`i18n/${l.code}.json`, 'utf8'))]));

test('all six languages are configured, Hebrew is right-to-left', () => {
  assert.deepEqual(config.languages.map((l) => l.code), ['en', 'ru', 'uk', 'es', 'zh', 'he']);
  assert.equal(config.languages.find((l) => l.code === 'he').dir, 'rtl');
});

test('every translation has the shape of en.json', () => {
  assert.deepEqual(checkTranslations(load()), []);
});

test('a missing key is reported', () => {
  const i18n = load();
  delete i18n.ru.hero.lede;
  assert.ok(checkTranslations(i18n).some((p) => p === 'ru.hero.lede: missing'));
});

test('an extra key, an empty string, a short list and a lost placeholder are reported', () => {
  const i18n = load();
  i18n.es.hero.extra = 'x';
  i18n.uk.contact.copy = '  ';
  i18n.zh.talents.items.pop();
  i18n.he.shell.uptime = 'no placeholder';
  const problems = checkTranslations(i18n);
  assert.ok(problems.includes('es.hero.extra: not in en'));
  assert.ok(problems.includes('uk.contact.copy: empty'));
  assert.ok(problems.some((p) => p.startsWith('zh.talents.items: 7 items')));
  assert.ok(problems.some((p) => p.startsWith('he.shell.uptime: placeholders')));
});

test('pages in other languages are not English copies', () => {
  const i18n = load();
  for (const code of ['ru', 'uk', 'es', 'zh', 'he']) {
    assert.notEqual(i18n[code].hero.lede, i18n.en.hero.lede, `${code}: hero.lede is English`);
    assert.notEqual(i18n[code].about.p1, i18n.en.about.p1, `${code}: about.p1 is English`);
    assert.notEqual(i18n[code].shell.help, i18n.en.shell.help, `${code}: shell.help is English`);
  }
});
