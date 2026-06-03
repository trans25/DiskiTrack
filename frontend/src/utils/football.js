// Football domain reference used across the club admin experience.
// Built to mirror how real clubs and academies structure their sides, so the
// product reads as if it was made by someone who knows the game.

// The full age ladder: mini-football, youth, senior and reserve sides.
export const AGE_GROUP_OPTIONS = [
  { value: 'U7', label: 'Under 7', band: 'Mini football' },
  { value: 'U8', label: 'Under 8', band: 'Mini football' },
  { value: 'U9', label: 'Under 9', band: 'Mini football' },
  { value: 'U10', label: 'Under 10', band: 'Mini football' },
  { value: 'U11', label: 'Under 11', band: 'Mini football' },
  { value: 'U12', label: 'Under 12', band: 'Mini football' },
  { value: 'U13', label: 'Under 13', band: 'Youth' },
  { value: 'U14', label: 'Under 14', band: 'Youth' },
  { value: 'U15', label: 'Under 15', band: 'Youth' },
  { value: 'U16', label: 'Under 16', band: 'Youth' },
  { value: 'U17', label: 'Under 17', band: 'Youth' },
  { value: 'U18', label: 'Under 18', band: 'Youth' },
  { value: 'U19', label: 'Under 19', band: 'Youth' },
  { value: 'U20', label: 'Under 20', band: 'Junior' },
  { value: 'U21', label: 'Under 21', band: 'Junior' },
  { value: 'U23', label: 'Under 23', band: 'Junior' },
  { value: 'SENIOR', label: 'Senior (first team)', band: 'Senior' },
  { value: 'RESERVE', label: 'Reserves', band: 'Senior' },
];

// Gender / category. Youth sides are normally Boys/Girls; senior sides Men/Women.
export const CATEGORY_OPTIONS = [
  { value: 'BOYS', label: 'Boys', gender: 'male', stage: 'youth' },
  { value: 'GIRLS', label: 'Girls', gender: 'female', stage: 'youth' },
  { value: 'MEN', label: 'Men', gender: 'male', stage: 'senior' },
  { value: 'WOMEN', label: 'Women', gender: 'female', stage: 'senior' },
];

const AGE_LABEL = Object.fromEntries(AGE_GROUP_OPTIONS.map((a) => [a.value, a.label]));
const AGE_BAND = Object.fromEntries(AGE_GROUP_OPTIONS.map((a) => [a.value, a.band]));
const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));

export const ageGroupLabel = (value) => AGE_LABEL[value] || value;
export const ageGroupBand = (value) => AGE_BAND[value] || '';
export const categoryLabel = (value) => CATEGORY_LABEL[value] || value;

const isSeniorBand = (ageGroup) =>
  ['SENIOR', 'RESERVE', 'U23', 'U21', 'U20'].includes(ageGroup);

// Keep the gender, switch youth<->senior wording when the age group changes.
// e.g. picking SENIOR with "Boys" selected upgrades it to "Men".
export const suggestCategory = (ageGroup, currentCategory) => {
  const current = CATEGORY_OPTIONS.find((c) => c.value === currentCategory);
  const gender = current?.gender || 'male';
  const stage = isSeniorBand(ageGroup) ? 'senior' : 'youth';
  const match = CATEGORY_OPTIONS.find((c) => c.gender === gender && c.stage === stage);
  return match?.value || currentCategory;
};

// Suggest a clean, conventional team name, e.g. "Under 15 Boys", "Senior Women".
export const suggestTeamName = (ageGroup, category) => {
  const age = ageGroupLabel(ageGroup).replace(' (first team)', '');
  const cat = categoryLabel(category);
  if (ageGroup === 'SENIOR') return `Senior ${cat}`;
  if (ageGroup === 'RESERVE') return `Reserve ${cat}`;
  return `${age} ${cat}`;
};

// Human one-line summary for previews, e.g. "Under 15 - Boys (Youth)".
export const teamSummary = (ageGroup, category) =>
  `${ageGroupLabel(ageGroup)} · ${categoryLabel(category)}`;

// Compact age-group chip shown beside a player's name, e.g. "U15", "Senior".
export const ageGroupShort = (value) => {
  if (!value) return '';
  if (value === 'SENIOR') return 'Senior';
  if (value === 'RESERVE') return 'Reserves';
  return value; // already short, e.g. "U15"
};

// ---------------------------------------------------------------------------
// Player contracts. The backend sends `contract: { status, yearsLeft, monthsLeft }`
// derived from the contract end date. These helpers turn that into the
// short, club-style wording and colours used on roster cards.
// ---------------------------------------------------------------------------

// "2 yrs left", "5 mo left", "Expired", "No contract".
export const contractLabel = (contract) => {
  if (!contract || contract.status === 'UNKNOWN') return 'No contract';
  if (contract.status === 'EXPIRED') return 'Expired';
  const { yearsLeft, monthsLeft } = contract;
  if (yearsLeft != null && yearsLeft >= 1) {
    const y = Math.round(yearsLeft);
    return `${y} yr${y === 1 ? '' : 's'} left`;
  }
  const m = monthsLeft ?? 0;
  return `${m} mo left`;
};

// Colour key for the contract chip.
export const contractColor = (contract) => {
  switch (contract?.status) {
    case 'ACTIVE':
      return { fg: '#16a34a', bg: 'rgba(22,163,74,0.12)' };
    case 'EXPIRING':
      return { fg: '#d97706', bg: 'rgba(217,119,6,0.14)' };
    case 'EXPIRED':
      return { fg: '#dc2626', bg: 'rgba(220,38,38,0.12)' };
    default:
      return { fg: '#64748b', bg: 'rgba(100,116,139,0.14)' };
  }
};

// Full set of football positions, grouped the way coaches think about a side:
// goalkeeper, defenders, midfielders and forwards. `value` is the short code
// stored on the player (e.g. "ST"), `label` is the readable name.
export const POSITION_OPTIONS = [
  { value: 'GK', label: 'Goalkeeper', group: 'Goalkeeper' },
  { value: 'RB', label: 'Right Back', group: 'Defence' },
  { value: 'RWB', label: 'Right Wing Back', group: 'Defence' },
  { value: 'CB', label: 'Centre Back', group: 'Defence' },
  { value: 'LB', label: 'Left Back', group: 'Defence' },
  { value: 'LWB', label: 'Left Wing Back', group: 'Defence' },
  { value: 'SW', label: 'Sweeper', group: 'Defence' },
  { value: 'CDM', label: 'Defensive Midfielder', group: 'Midfield' },
  { value: 'CM', label: 'Central Midfielder', group: 'Midfield' },
  { value: 'CAM', label: 'Attacking Midfielder', group: 'Midfield' },
  { value: 'RM', label: 'Right Midfielder', group: 'Midfield' },
  { value: 'LM', label: 'Left Midfielder', group: 'Midfield' },
  { value: 'RW', label: 'Right Winger', group: 'Attack' },
  { value: 'LW', label: 'Left Winger', group: 'Attack' },
  { value: 'SS', label: 'Second Striker', group: 'Attack' },
  { value: 'CF', label: 'Centre Forward', group: 'Attack' },
  { value: 'ST', label: 'Striker', group: 'Attack' },
];

const POSITION_LABEL = Object.fromEntries(
  POSITION_OPTIONS.map((p) => [p.value, p.label])
);

// Readable label for a stored position code, e.g. "ST" -> "Striker".
export const positionLabel = (value) => POSITION_LABEL[value] || value || '';

// Squad numbers a club can assign (1-99).
export const ALL_JERSEY_NUMBERS = Array.from({ length: 99 }, (_, i) => i + 1);

// Given the numbers already taken in a team, return the ones still free so the
// jersey picker only ever offers available shirts.
export const availableJerseyNumbers = (takenNumbers = []) => {
  const taken = new Set(takenNumbers.map((n) => Number(n)).filter((n) => !Number.isNaN(n)));
  return ALL_JERSEY_NUMBERS.filter((n) => !taken.has(n));
};
