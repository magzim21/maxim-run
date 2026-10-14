// Globe view math. The globe turns by `lon` around the poles, then tips by `tilt` towards the viewer.

const RAD = Math.PI / 180;

// The view that puts a place in the middle of the globe, facing the viewer.
export function viewFacing(latDeg, lonDeg) {
  return { lon: -lonDeg * RAD, tilt: -latDeg * RAD };
}

// The same angle as `to`, moved by whole turns to be as close as possible to `from` (no long way round).
export function nearestTurn(from, to) {
  const turn = 2 * Math.PI;
  return to + Math.round((from - to) / turn) * turn;
}

// Project a lat/lon point with a view: x right, y down (unit sphere), d > 0 on the visible side.
export function project(latRad, lonRad, view) {
  const v = [Math.cos(latRad) * Math.cos(lonRad), Math.cos(latRad) * Math.sin(lonRad), Math.sin(latRad)];
  const cl = Math.cos(view.lon);
  const sl = Math.sin(view.lon);
  const x1 = v[0] * cl - v[1] * sl;
  const y1 = v[0] * sl + v[1] * cl;
  const ct = Math.cos(view.tilt);
  const st = Math.sin(view.tilt);
  return { x: y1, y: -(x1 * st + v[2] * ct), d: x1 * ct - v[2] * st };
}

export const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
