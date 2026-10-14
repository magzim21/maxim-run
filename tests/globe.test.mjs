// The location chip flies the globe to a place: the view math puts that place in the middle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestTurn, project, viewFacing } from '../src/globe-math.js';

const RAD = Math.PI / 180;
const home = { lat: 48.4284, lon: -123.3656 }; // config person.location (Vancouver Island)

test('viewFacing puts the place in the centre, on the near side', () => {
  for (const p of [home, { lat: 0, lon: 0 }, { lat: -33.9, lon: 151.2 }, { lat: 64.1, lon: -21.9 }]) {
    const at = project(p.lat * RAD, p.lon * RAD, viewFacing(p.lat, p.lon));
    assert.ok(Math.abs(at.x) < 1e-9 && Math.abs(at.y) < 1e-9, `${p.lat},${p.lon} not centred: ${at.x},${at.y}`);
    assert.ok(Math.abs(at.d - 1) < 1e-9);
  }
});

test('north is up after the fly-to', () => {
  const view = viewFacing(home.lat, home.lon);
  const north = project((home.lat + 5) * RAD, home.lon * RAD, view);
  assert.ok(north.y < 0, 'a point further north is drawn higher');
});

test('the globe turns the short way round', () => {
  const to = nearestTurn(10 * Math.PI + 0.1, -0.2);
  assert.ok(Math.abs(to - (10 * Math.PI + 0.1)) <= Math.PI);
  assert.ok(Math.abs(Math.sin(to) - Math.sin(-0.2)) < 1e-9 && Math.abs(Math.cos(to) - Math.cos(-0.2)) < 1e-9);
});
