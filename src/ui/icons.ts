/** Shared SVG set, with no icon font or network request. */
const paths = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 3v9l6-6M3 12h3M12 18v3M18 12h3"/>',
  instruments: '<path d="M4 19a9 9 0 1 1 16 0M12 12l4-5M6 8l1 1M17 8l1-1M4 14h2M18 14h2M9 19h6"/>',
  center: '<circle cx="12" cy="12" r="6"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  horn: '<path d="M4 10h5l9-5v14l-9-5H4ZM7 14v5h4l-2-5M21 9v6"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4ZM17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14"/>',
  muted: '<path d="M4 9h4l5-4v14l-5-4H4ZM17 9l5 6M22 9l-5 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  tour: '<path d="m12 3 8 5v8l-8 5-8-5V8ZM12 8v5M12 16v.1"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17v.1"/>',
} as const;
export function icon(name: keyof typeof paths): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
