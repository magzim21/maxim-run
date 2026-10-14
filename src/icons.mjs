// SVG sprite served as /assets/icons.svg: brand logos from simple-icons (CC0) and hand-drawn line icons.
import * as si from 'simple-icons';

const BRANDS = {
  github: si.siGithub,
  youtube: si.siYoutube,
  instagram: si.siInstagram,
  telegram: si.siTelegram,
  medium: si.siMedium,
  credly: si.siCredly,
};

// 24x24 filled glyphs for brands simple-icons no longer ships.
const FILLED = {
  linkedin:
    'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2.5 7v7.5H9V10H6.5Zm1.25-4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM11 10v7.5h2.5v-3.9c0-1.1.6-1.7 1.4-1.7.8 0 1.2.6 1.2 1.7v3.9h2.5v-4.5c0-2.3-1.2-3.2-2.9-3.2-1.1 0-1.9.5-2.3 1.1V10H11Z',
};

// 24x24 line icons (stroke = currentColor).
const LINES = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3V9Z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/>',
  brush: '<path d="M14 4 20 10l-7.5 7.5-6-6L14 4ZM6.5 11.5 4 14c-1 1-1 3 0 4s3 1 4 0l2.5-2.5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/><circle cx="12" cy="12" r="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M12 15h5"/>',
};

export function sprite() {
  const brand = Object.entries(BRANDS).map(
    ([id, ic]) => `<symbol id="${id}" viewBox="0 0 24 24"><path fill="currentColor" d="${ic.path}"/></symbol>`,
  );
  const filled = Object.entries(FILLED).map(
    ([id, d]) => `<symbol id="${id}" viewBox="0 0 24 24"><path fill="currentColor" d="${d}"/></symbol>`,
  );
  // YouTube as a red badge with a white play mark, readable on any button or theme.
  const badge = '<symbol id="youtube-badge" viewBox="0 0 24 24"><rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0033"/><path d="M9.75 8.5v7l6-3.5-6-3.5Z" fill="#fff"/></symbol>';
  const lines = Object.entries(LINES).map(
    ([id, body]) =>
      `<symbol id="${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg">${[...brand, ...filled, badge, ...lines].join('')}</svg>`;
}

export const ICON_IDS = [...Object.keys(BRANDS), ...Object.keys(FILLED), 'youtube-badge', ...Object.keys(LINES)];
