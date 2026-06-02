// Derives deterministic FIFA Ultimate Team–style attributes for a player so
// the same player always shows the same card (no DB columns required).
// Values are seeded from the player's UUID + position, weighted by role.

function hashSeed(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small deterministic PRNG (mulberry32) seeded from the hash.
function makeRng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const normalizePos = (pos = '') => {
  const p = pos.toUpperCase();
  if (['GK'].includes(p)) return 'GK';
  if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(p)) return 'DEF';
  if (['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM', 'MF'].includes(p)) return 'MID';
  if (['FWD', 'ST', 'CF', 'LW', 'RW', 'FW'].includes(p)) return 'FWD';
  return 'MID';
};

// Per-role attribute ranges [min, max] for PAC, SHO, PAS, DRI, DEF, PHY.
const RANGES = {
  GK:  { pac: [40, 60], sho: [25, 45], pas: [45, 65], dri: [40, 60], def: [60, 88], phy: [60, 82] },
  DEF: { pac: [55, 82], sho: [35, 60], pas: [55, 78], dri: [55, 75], def: [72, 90], phy: [70, 90] },
  MID: { pac: [62, 86], sho: [58, 82], pas: [70, 92], dri: [70, 90], def: [55, 80], phy: [60, 82] },
  FWD: { pac: [74, 95], sho: [74, 94], pas: [62, 85], dri: [74, 93], def: [25, 55], phy: [62, 86] },
};

const between = (rng, [min, max]) => Math.round(min + rng() * (max - min));

export function getPlayerCard(player) {
  const pos = normalizePos(player.position);
  const seed = hashSeed(`${player.id}-${pos}`);
  const rng = makeRng(seed);
  const r = RANGES[pos];

  const attrs = {
    pac: between(rng, r.pac),
    sho: between(rng, r.sho),
    pas: between(rng, r.pas),
    dri: between(rng, r.dri),
    def: between(rng, r.def),
    phy: between(rng, r.phy),
  };

  // Overall rating: weighted by role, mirroring how FUT emphasises attributes.
  const weights = {
    GK:  { pac: 0.1, sho: 0,    pas: 0.1,  dri: 0.1,  def: 0.4,  phy: 0.3 },
    DEF: { pac: 0.15, sho: 0.05, pas: 0.15, dri: 0.1,  def: 0.35, phy: 0.2 },
    MID: { pac: 0.15, sho: 0.15, pas: 0.25, dri: 0.25, def: 0.1,  phy: 0.1 },
    FWD: { pac: 0.2,  sho: 0.3,  pas: 0.1,  dri: 0.25, def: 0.0,  phy: 0.15 },
  }[pos];

  const overall = Math.round(
    attrs.pac * weights.pac +
    attrs.sho * weights.sho +
    attrs.pas * weights.pas +
    attrs.dri * weights.dri +
    attrs.def * weights.def +
    attrs.phy * weights.phy
  );

  return { position: pos, overall: Math.min(99, Math.max(48, overall)), attrs };
}

// Visual tier (gold / silver / bronze / special) used for the card gradient.
export function cardTier(overall) {
  if (overall >= 90) return 'icon';
  if (overall >= 82) return 'gold';
  if (overall >= 72) return 'silver';
  return 'bronze';
}

export const TIER_GRADIENTS = {
  icon:   { from: '#f5e6c8', to: '#c9a24b', text: '#3a2c05', sub: '#5a4406' },
  gold:   { from: '#f7e08a', to: '#caa23c', text: '#3a2c05', sub: '#5a4406' },
  silver: { from: '#e8ebef', to: '#b6bcc6', text: '#2b2f36', sub: '#454b54' },
  bronze: { from: '#e9b98a', to: '#a9683c', text: '#3a2206', sub: '#5a3712' },
};
