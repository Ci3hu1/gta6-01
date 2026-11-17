// Solmar Bay — config: tuning, palette, districts and shared constants.
// One job: every magic number the other modules need lives here.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_SPACING = 400;
export const ROAD_W = 96;
export const SAVE_KEY = 'solmar-bay-save-v1';
export const STEP = 1 / 60;
export const VIEW_W = 1280;
export const VIEW_H = 800;

export const PLAYER_SPEED = 230;
export const PLAYER_RADIUS = 13;
export const CAR_LENGTH = 46;
export const CAR_WIDTH = 24;

export const COLORS = {
  grass: '#7fae62', sand: '#e8d9a0', road: '#3a3f4a', roadLine: '#e8d24a',
  sidewalk: '#b9b3a4', water: '#2f7fb8', park: '#5f9e52',
};

export const DISTRICTS = [
  { name: 'MARINA', x: 0, y: 2000, w: 800, h: 400 },
  { name: 'OLD MARKET', x: 800, y: 1200, w: 800, h: 800 },
  { name: 'NEON STRIP', x: 1600, y: 800, w: 800, h: 800 },
  { name: 'HARBOR EAST', x: 2400, y: 0, w: 800, h: 800 },
  { name: 'PALM HEIGHTS', x: 0, y: 0, w: 1600, h: 800 },
  { name: 'AZURA BANK', x: 1600, y: 0, w: 800, h: 800 },
];

// Named locations the HUD, minimap and missions point at.
export const PLACES = {
  garage: { name: "Benny's Garage", x: 520, y: 1560, label: "Benny's Garage — Upgrades" },
  bank: { name: 'Azura Bank', x: 1960, y: 360, label: 'AZURA BANK' },
  market: { name: 'Old Market', x: 1160, y: 1560, label: 'OLD MARKET' },
  hotel: { name: 'Hotel Brisa', x: 760, y: 360, label: 'HOTEL BRISA' },
  cannery: { name: 'The Cannery', x: 2760, y: 1160, label: 'THE CANNERY' },
  casino: { name: 'Casino Royale', x: 1960, y: 1160, label: 'CASINO ROYALE' },
  surf: { name: 'Surf Shack', x: 360, y: 1960, label: 'SURF SHACK' },
  gym: { name: 'Neon Gym', x: 2360, y: 760, label: 'NEON GYM' },
  marina: { name: 'Marina Pier', x: 360, y: 2160, label: 'MARINA PIER' },
  motors: { name: 'Vela Motors', x: 2360, y: 1560, label: 'VELA MOTORS' },
};

export const CAR_MODELS = [
  { name: 'Vela Coupe', color: '#e8b13a', top: 340, accel: 260 },
  { name: 'Azul GT', color: '#3a86e8', top: 380, accel: 300 },
  { name: 'Solmar Sedan', color: '#c94a4a', top: 300, accel: 220 },
  { name: 'Palm Pickup', color: '#4aa86e', top: 290, accel: 210 },
  { name: 'Harbor Van', color: '#e8e8e8', top: 260, accel: 190 },
];

export const UPGRADE_COSTS = { speed: 400, armor: 350, repair: 120 };
export const WANTED_DECAY_SECONDS = 14;
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
