/**
 * DiskiTrack — comprehensive multi-tenant demo data seeder.
 *
 * Each South African Betway Premiership club is its own TENANT (club), with
 * its own Club Admin + Coach, a senior men's team, a youth (U17) team and a
 * ladies (women's) team. Clubs/teams get a crest and EVERY player gets a photo.
 *
 * Images are stored in the DB as self-contained base64 SVG data URIs (no
 * external image hosting), so they render directly in <img>/Avatar on the
 * frontend and survive DB resets.
 *
 * Idempotent: clubs are matched by slug; each club's demo content is wiped and
 * regenerated on every run.
 *
 * Run:
 *   $env:DATABASE_URL="<render external url>"; node src/scripts/seedDemo.js
 *   (or locally with the PG* vars in backend/.env)  npm run seed-demo
 */
import { pool, query } from '../db/pool.js';

// bcrypt hash of "password123"
const PW_HASH = '$2a$10$Rdnoma3fR5/YTDsAHeoZKeqwAEJyhCzsuaGVyiNgp0zHlU6d4WOeu';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const splitName = (full) => {
  const parts = full.trim().split(' ');
  return { first: parts[0], last: parts.slice(1).join(' ') || parts[0] };
};
const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const initials = (name, max = 3) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, max).toUpperCase();

const svgToDataUri = (svg) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

// Club crest: shield-style badge with the club's initials and brand colors.
function crestDataUri(name, bg, fg) {
  const text = initials(name, 3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#${bg}"/><stop offset="1" stop-color="#${bg}" stop-opacity="0.82"/>
  </linearGradient></defs>
  <path d="M64 6 L116 22 V66 C116 96 92 114 64 122 C36 114 12 96 12 66 V22 Z"
        fill="url(#g)" stroke="#${fg}" stroke-width="4"/>
  <text x="64" y="74" font-family="Arial, Helvetica, sans-serif" font-size="34"
        font-weight="bold" fill="#${fg}" text-anchor="middle">${text}</text>
</svg>`;
  return svgToDataUri(svg);
}

// Player photo: circular portrait avatar with the player's initials.
function playerPhotoDataUri(name, bg, fg) {
  const text = initials(name, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="#${bg}"/>
  <circle cx="64" cy="50" r="26" fill="#${fg}" opacity="0.9"/>
  <path d="M24 116 C24 88 44 78 64 78 C84 78 104 88 104 116 Z" fill="#${fg}" opacity="0.9"/>
  <text x="64" y="58" font-family="Arial, Helvetica, sans-serif" font-size="22"
        font-weight="bold" fill="#${bg}" text-anchor="middle">${text}</text>
</svg>`;
  return svgToDataUri(svg);
}

const SQUADS = {
  'Mamelodi Sundowns': [
    [1, 'Ronwen Williams', 'GK'], [16, 'Reyaad Pieterse', 'GK'],
    [22, 'Khuliso Mudau', 'DEF'], [3, 'Mosa Lebusa', 'DEF'], [5, 'Grant Kekana', 'DEF'],
    [17, 'Aubrey Modiba', 'DEF'], [23, 'Divine Lunga', 'DEF'], [4, 'Rushine De Reuck', 'DEF'],
    [6, 'Mothobi Mvala', 'DEF'], [8, 'Teboho Mokoena', 'MID'], [13, 'Sphelele Mkhulise', 'MID'],
    [10, 'Marcelo Allende', 'MID'], [28, 'Bathusi Aubaas', 'MID'], [15, 'Jamie Webber', 'MID'],
    [11, 'Themba Zwane', 'MID'], [7, 'Lucas Ribeiro', 'FWD'], [9, 'Peter Shalulile', 'FWD'],
    [20, 'Lebo Mothiba', 'FWD'], [14, 'Tashreeq Matthews', 'FWD'], [26, 'Iqraam Rayners', 'FWD'],
  ],
  'Orlando Pirates': [
    [1, 'Sipho Chaine', 'GK'], [30, 'Melusi Buthelezi', 'GK'],
    [3, 'Olisa Ndah', 'DEF'], [4, 'Tapelo Xoki', 'DEF'], [25, 'Nkosinathi Sibisi', 'DEF'],
    [21, 'Paseka Mako', 'DEF'], [2, 'Bandile Shandu', 'DEF'], [6, 'Thabang Monare', 'MID'],
    [8, 'Makhehlene Makhaula', 'MID'], [10, 'Kabelo Dlamini', 'MID'], [15, 'Goodman Mosele', 'MID'],
    [18, 'Deon Hotto', 'MID'], [19, 'Patrick Maswanganyi', 'MID'], [11, 'Monnapule Saleng', 'FWD'],
    [7, 'Relebohile Mofokeng', 'FWD'], [9, 'Tshegofatso Mabasa', 'FWD'], [17, 'Evidence Makgopa', 'FWD'],
    [23, 'Karim Kimvuidi', 'MID'],
  ],
  'Kaizer Chiefs': [
    [1, 'Brandon Petersen', 'GK'], [16, 'Bruce Bvuma', 'GK'],
    [3, 'Given Msimango', 'DEF'], [4, 'Zitha Kwinika', 'DEF'], [5, 'Rushwin Dortley', 'DEF'],
    [20, 'Inacio Miguel', 'DEF'], [6, 'Edmilson Dove', 'DEF'], [8, 'Yusuf Maart', 'MID'],
    [10, 'Mduduzi Shabalala', 'MID'], [15, 'Sabelo Radebe', 'MID'], [12, 'Mfundo Vilakazi', 'MID'],
    [22, 'Gaston Sirino', 'MID'], [23, 'Tebogo Potsane', 'MID'], [7, 'Pule Mmodi', 'FWD'],
    [11, 'Ashley Du Preez', 'FWD'], [9, 'Ranga Chivaviro', 'FWD'], [18, 'Wandile Duba', 'FWD'],
  ],
  'Stellenbosch FC': [
    [1, 'Sage Stephens', 'GK'], [16, 'Jarrod Moroole', 'GK'],
    [2, 'Thabo Moloisane', 'DEF'], [4, 'Fawaaz Basadien', 'DEF'], [5, 'Ismael Toure', 'DEF'],
    [3, 'Olwethu Makhanya', 'DEF'], [10, 'Deano van Rooyen', 'DEF'], [6, 'Sanele Barns', 'MID'],
    [8, 'Jayden Adams', 'MID'], [7, 'Devin Titus', 'MID'], [14, 'Antonio van Wyk', 'MID'],
    [21, 'Thabang Sesinyi', 'MID'], [11, 'Ashley Cupido', 'FWD'], [9, 'Andre De Jong', 'FWD'],
    [17, 'Lehlohonolo Mojela', 'FWD'], [19, 'Khanyisa Mayo', 'FWD'],
  ],
};

const CLUBS = {
  'Mamelodi Sundowns': {
    city: 'Pretoria', stadium: 'Loftus Versfeld', bg: 'FFD100', color: '0A1A4F',
    admin: { email: 'admin@sundowns.co.za', first: 'Tlhopie', last: 'Motsepe' },
    coach: { email: 'coach@sundowns.co.za', first: 'Manqoba', last: 'Mngqithi' },
  },
  'Orlando Pirates': {
    city: 'Johannesburg', stadium: 'Orlando Stadium', bg: '111111', color: 'FFFFFF',
    admin: { email: 'admin@orlandopirates.co.za', first: 'Floyd', last: 'Mbele' },
    coach: { email: 'coach@orlandopirates.co.za', first: 'Jose', last: 'Riveiro' },
  },
  'Kaizer Chiefs': {
    city: 'Johannesburg', stadium: 'FNB Stadium', bg: 'F2A900', color: '111111',
    admin: { email: 'admin@kaizerchiefs.co.za', first: 'Kaizer', last: 'Motaung' },
    coach: { email: 'coach@kaizerchiefs.co.za', first: 'Nasreddine', last: 'Nabi' },
  },
  'Stellenbosch FC': {
    city: 'Stellenbosch', stadium: 'Danie Craven Stadium', bg: '7A1F2B', color: 'FFFFFF',
    admin: { email: 'admin@stellenboschfc.co.za', first: 'Rob', last: 'Benadie' },
    coach: { email: 'coach@stellenboschfc.co.za', first: 'Steve', last: 'Barker' },
  },
};

const M_FIRST = ['Sibusiso', 'Katlego', 'Lwazi', 'Bongani', 'Thando', 'Sphiwe', 'Junior', 'Kagiso', 'Tshepo', 'Mpho', 'Lungelo', 'Andile', 'Siyabonga', 'Nkosi', 'Banele', 'Owami', 'Ayanda', 'Mandla'];
const W_FIRST = ['Thembi', 'Refiloe', 'Nomvula', 'Busi', 'Lerato', 'Zinhle', 'Palesa', 'Noxolo', 'Amanda', 'Bongiwe', 'Karabo', 'Naledi', 'Ntombi', 'Dineo', 'Hlengiwe', 'Precious', 'Sindi', 'Boitumelo'];
const LASTS = ['Nkosi', 'Mahlangu', 'Khumalo', 'Ndlovu', 'Sithole', 'Zulu', 'Mthembu', 'Radebe', 'Maseko', 'Cele', 'Dube', 'Ngcobo', 'Mabaso', 'Khoza', 'Buthelezi', 'Mokoena', 'Gumede', 'Shabangu'];
const POS_TEMPLATE = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'DEF', 'MID', 'FWD', 'GK', 'DEF', 'MID'];

const FORMATIONS = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2'];

async function getOrCreateClub(name, meta) {
  const slug = slugify(name);
  const logo = crestDataUri(name, meta.bg, meta.color);
  const existing = await query('SELECT id FROM clubs WHERE slug = $1', [slug]);
  if (existing.rows[0]) {
    await query('UPDATE clubs SET name=$2, country=$3, city=$4, logo_url=$5 WHERE id=$1',
      [existing.rows[0].id, name, 'South Africa', meta.city, logo]);
    return existing.rows[0].id;
  }
  const ins = await query(
    `INSERT INTO clubs (name, slug, country, city, logo_url)
     VALUES ($1,$2,'South Africa',$3,$4) RETURNING id`,
    [name, slug, meta.city, logo]
  );
  return ins.rows[0].id;
}

async function getOrCreateUser(tenantId, { email, first, last }, role) {
  const existing = await query('SELECT id FROM users WHERE tenant_id=$1 AND email=$2', [tenantId, email]);
  if (existing.rows[0]) return existing.rows[0].id;
  const ins = await query(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [tenantId, email, PW_HASH, first, last, role]
  );
  return ins.rows[0].id;
}

async function clearTenant(tenantId) {
  await query('DELETE FROM match_events WHERE tenant_id=$1', [tenantId]);
  await query('DELETE FROM player_stats WHERE tenant_id=$1', [tenantId]);
  await query('DELETE FROM match_lineups WHERE tenant_id=$1', [tenantId]);
  await query('DELETE FROM matches WHERE tenant_id=$1', [tenantId]);
  await query('DELETE FROM training_attendance WHERE tenant_id=$1', [tenantId]);
  await query('DELETE FROM training_sessions WHERE tenant_id=$1', [tenantId]);
  await query('DELETE FROM announcements WHERE tenant_id=$1', [tenantId]);
  await query('DELETE FROM players WHERE tenant_id=$1', [tenantId]);
  await query('DELETE FROM teams WHERE tenant_id=$1', [tenantId]);
}

async function createTeam(tenantId, name, ageGroup, category, coachId, logo) {
  const ins = await query(
    `INSERT INTO teams (tenant_id, name, age_group, category, logo_url, coach_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [tenantId, name, ageGroup, category, logo, coachId]
  );
  return ins.rows[0].id;
}

async function insertNamedSquad(tenantId, teamId, squad, meta) {
  const ids = [];
  for (const [num, full, pos] of squad) {
    const { first, last } = splitName(full);
    const age = pos === 'GK' ? rnd(22, 34) : rnd(18, 33);
    const dob = `${2025 - age}-0${rnd(1, 9)}-${String(rnd(1, 28)).padStart(2, '0')}`;
    const photo = playerPhotoDataUri(full, meta.bg, meta.color);
    const r = await query(
      `INSERT INTO players (tenant_id, team_id, first_name, last_name, date_of_birth, position, jersey_number, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [tenantId, teamId, first, last, dob, pos, num, photo]
    );
    ids.push({ id: r.rows[0].id, num, pos, name: full });
  }
  return ids;
}

async function insertGeneratedSquad(tenantId, teamId, count, firstPool, ageBase, meta) {
  const used = new Set();
  const ids = [];
  for (let i = 0; i < count; i++) {
    const first = firstPool[i % firstPool.length];
    const last = LASTS[(i * 7) % LASTS.length];
    const pos = POS_TEMPLATE[i % POS_TEMPLATE.length];
    let num = i + 1;
    while (used.has(num)) num++;
    used.add(num);
    const dob = `${ageBase - rnd(0, 1)}-0${rnd(1, 9)}-${String(rnd(1, 28)).padStart(2, '0')}`;
    const full = `${first} ${last}`;
    const photo = playerPhotoDataUri(full, meta.bg, meta.color);
    const r = await query(
      `INSERT INTO players (tenant_id, team_id, first_name, last_name, date_of_birth, position, jersey_number, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [tenantId, teamId, first, last, dob, pos, num, photo]
    );
    ids.push({ id: r.rows[0].id, num, pos, name: full });
  }
  return ids;
}

async function createMatch(tenantId, { homeTeam, awayLabel, venue, status, homeScore, awayScore, daysFromNow, formationH, formationA }) {
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + daysFromNow);
  scheduled.setHours(rnd(15, 20), pick([0, 30]), 0, 0);
  const kickoff = status !== 'SCHEDULED' ? scheduled.toISOString() : null;
  const finished = status === 'FINISHED' ? scheduled.toISOString() : null;
  const r = await query(
    `INSERT INTO matches
       (tenant_id, home_team_id, away_team_label, venue,
        scheduled_at, status, home_score, away_score, kickoff_at, finished_at,
        home_formation, away_formation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      tenantId, homeTeam, awayLabel, venue, scheduled.toISOString(), status,
      status === 'SCHEDULED' ? 0 : homeScore,
      status === 'SCHEDULED' ? 0 : awayScore,
      kickoff, finished, formationH, formationA,
    ]
  );
  return r.rows[0].id;
}

async function addLineup(tenantId, matchId, teamId, players) {
  const starters = players.slice(0, 11);
  const subs = players.slice(11, 18);
  for (const p of starters) {
    await query(
      `INSERT INTO match_lineups (tenant_id, match_id, team_id, player_id, is_starting, jersey_number, position)
       VALUES ($1,$2,$3,$4,TRUE,$5,$6)`,
      [tenantId, matchId, teamId, p.id, p.num, p.pos]
    );
  }
  for (const p of subs) {
    await query(
      `INSERT INTO match_lineups (tenant_id, match_id, team_id, player_id, is_starting, jersey_number, position)
       VALUES ($1,$2,$3,$4,FALSE,$5,$6)`,
      [tenantId, matchId, teamId, p.id, p.num, p.pos]
    );
  }
}

async function addEvent(tenantId, matchId, teamId, playerId, relatedId, type, minute, createdBy) {
  await query(
    `INSERT INTO match_events (tenant_id, match_id, team_id, player_id, related_player_id, event_type, minute, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [tenantId, matchId, teamId, playerId, relatedId, type, minute, createdBy]
  );
}

async function generateOwnSide(tenantId, matchId, teamId, players, goalsFor, live, coachId) {
  await addLineup(tenantId, matchId, teamId, players);
  const attackers = players.filter((p) => p.pos === 'FWD' || p.pos === 'MID');
  const goalTally = {};
  const assistTally = {};
  const usedMins = new Set();
  for (let i = 0; i < goalsFor; i++) {
    const scorer = pick(attackers);
    let assister = pick(attackers);
    let guard = 0;
    while (assister.id === scorer.id && guard++ < 5) assister = pick(attackers);
    let minute = rnd(5, live ? 60 : 89);
    while (usedMins.has(minute)) minute = rnd(5, live ? 60 : 89);
    usedMins.add(minute);
    await addEvent(tenantId, matchId, teamId, scorer.id, assister.id, 'GOAL', minute, coachId);
    await addEvent(tenantId, matchId, teamId, assister.id, scorer.id, 'ASSIST', minute, coachId);
    goalTally[scorer.id] = (goalTally[scorer.id] || 0) + 1;
    assistTally[assister.id] = (assistTally[assister.id] || 0) + 1;
  }
  for (let i = 0; i < rnd(2, 4); i++) await addEvent(tenantId, matchId, teamId, pick(players.slice(0, 14)).id, null, 'FOUL', rnd(5, 89), coachId);
  if (rnd(0, 1)) await addEvent(tenantId, matchId, teamId, pick(players.slice(0, 14)).id, null, 'YELLOW_CARD', rnd(20, 88), coachId);
  for (let i = 0; i < rnd(2, 5); i++) await addEvent(tenantId, matchId, teamId, pick(attackers).id, null, 'SHOT', rnd(5, 89), coachId);
  for (let i = 0; i < rnd(2, 6); i++) await addEvent(tenantId, matchId, teamId, pick(players.slice(0, 14)).id, null, 'CORNER', rnd(5, 89), coachId);

  const starters = players.slice(0, 11);
  const subs = players.slice(11, 16);
  for (const p of starters) {
    await query(
      `INSERT INTO player_stats
         (tenant_id, match_id, player_id, goals, assists, shots, fouls, yellow_cards, red_cards, minutes_played)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8)
       ON CONFLICT (match_id, player_id) DO NOTHING`,
      [tenantId, matchId, p.id, goalTally[p.id] || 0, assistTally[p.id] || 0,
       (goalTally[p.id] || 0) + rnd(0, 3), rnd(0, 3), live ? rnd(45, 60) : 90]
    );
  }
  for (const p of subs) {
    if (rnd(0, 1) === 0) continue;
    await query(
      `INSERT INTO player_stats
         (tenant_id, match_id, player_id, goals, assists, shots, fouls, yellow_cards, red_cards, minutes_played)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8)
       ON CONFLICT (match_id, player_id) DO NOTHING`,
      [tenantId, matchId, p.id, goalTally[p.id] || 0, assistTally[p.id] || 0, rnd(0, 2), rnd(0, 1), live ? rnd(5, 20) : rnd(10, 35)]
    );
  }
}

async function seedAnnouncements(tenantId, authorId, teamId, clubName) {
  const items = [
    [`Welcome to the 2024/25 Betway Premiership season!`, `Pre-season is complete at ${clubName}. Let's push for the title this campaign. Full squad reporting Monday 08:00.`, true, null],
    ['Derby week preparations', 'Tickets are selling fast for the big one. Extra video analysis session scheduled Thursday.', true, null],
    ['Medical screening reminder', 'All players must complete their seasonal medical screening before Friday training.', false, null],
    ['Travel itinerary: away fixture', 'Bus departs the training ground at 09:00 sharp. Bring your travel kit and ID.', false, teamId],
    ['New gym programme released', 'Strength & conditioning blocks updated on the player portal. Speak to the fitness coach with questions.', false, null],
  ];
  for (const [title, body, pinned, tId] of items) {
    await query(
      `INSERT INTO announcements (tenant_id, author_id, team_id, title, body, is_pinned)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [tenantId, authorId, tId, title, body, pinned]
    );
  }
}

async function seedTraining(tenantId, teamId, players, coachId, stadium) {
  const sessions = [
    ['Tactical shape & pressing triggers', `${stadium} Training Ground`, 'High press patterns and defensive transitions', -3, 90],
    ['Recovery & mobility', 'Club Gym', 'Light recovery, stretching, core stability', -1, 60],
    ['Set-piece rehearsal', `${stadium} Training Ground`, 'Attacking and defending corners and free kicks', 1, 75],
    ['Match-day -1 activation', 'Stadium Pitch', 'Light activation, finishing drills, team shape', 2, 60],
  ];
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'EXCUSED', 'INJURED', 'ABSENT'];
  for (const [title, location, focus, days, dur] of sessions) {
    const when = new Date();
    when.setDate(when.getDate() + days);
    when.setHours(9, 0, 0, 0);
    const s = await query(
      `INSERT INTO training_sessions (tenant_id, team_id, title, location, focus, scheduled_at, duration_min, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [tenantId, teamId, title, location, focus, when.toISOString(), dur, coachId]
    );
    if (days <= 1) {
      for (const p of players.slice(0, 18)) {
        await query(
          `INSERT INTO training_attendance (tenant_id, session_id, player_id, status)
           VALUES ($1,$2,$3,$4) ON CONFLICT (session_id, player_id) DO NOTHING`,
          [tenantId, s.rows[0].id, p.id, pick(statuses)]
        );
      }
    }
  }
}

async function seedClub(name) {
  const meta = CLUBS[name];
  console.log(`\n[seed] === ${name} ===`);
  const tenantId = await getOrCreateClub(name, meta);
  const coachId = await getOrCreateUser(tenantId, meta.coach, 'COACH');
  const adminId = await getOrCreateUser(tenantId, meta.admin, 'CLUB_ADMIN');

  await clearTenant(tenantId);

  const teamLogo = crestDataUri(name, meta.bg, meta.color);

  const seniorId = await createTeam(tenantId, name, 'SENIOR', 'MEN', coachId, teamLogo);
  const seniorPlayers = await insertNamedSquad(tenantId, seniorId, SQUADS[name], meta);

  const youthId = await createTeam(tenantId, `${name} U17`, 'U17', 'BOYS', coachId, teamLogo);
  const youthPlayers = await insertGeneratedSquad(tenantId, youthId, 18, M_FIRST, 2008, meta);

  const ladiesId = await createTeam(tenantId, `${name} Ladies`, 'SENIOR', 'WOMEN', coachId, teamLogo);
  const ladiesPlayers = await insertGeneratedSquad(tenantId, ladiesId, 18, W_FIRST, 1998, meta);

  console.log(`   teams: senior(${seniorPlayers.length}) youth(${youthPlayers.length}) ladies(${ladiesPlayers.length})`);

  const rivals = Object.keys(CLUBS).filter((c) => c !== name);
  const fixtures = [
    { rival: rivals[0], status: 'FINISHED', gf: 2, ga: 1, days: -14 },
    { rival: rivals[1], status: 'FINISHED', gf: 1, ga: 1, days: -10 },
    { rival: rivals[2], status: 'FINISHED', gf: 3, ga: 0, days: -6 },
    { rival: rivals[0], status: 'LIVE', gf: 1, ga: 0, days: 0 },
    { rival: rivals[1], status: 'SCHEDULED', gf: 0, ga: 0, days: 5 },
    { rival: rivals[2], status: 'SCHEDULED', gf: 0, ga: 0, days: 9 },
  ];

  for (const f of fixtures) {
    const matchId = await createMatch(tenantId, {
      homeTeam: seniorId,
      awayLabel: f.rival,
      venue: meta.stadium,
      status: f.status,
      homeScore: f.gf,
      awayScore: f.ga,
      daysFromNow: f.days,
      formationH: pick(FORMATIONS),
      formationA: pick(FORMATIONS),
    });
    if (f.status !== 'SCHEDULED') {
      await generateOwnSide(tenantId, matchId, seniorId, seniorPlayers, f.gf, f.status === 'LIVE', coachId);
    }
  }

  await seedAnnouncements(tenantId, adminId, seniorId, name);
  await seedTraining(tenantId, seniorId, seniorPlayers, coachId, meta.stadium);

  return tenantId;
}

async function main() {
  const tenantIds = [];
  for (const name of Object.keys(CLUBS)) {
    tenantIds.push(await seedClub(name));
  }

  const counts = await query(
    `SELECT
       (SELECT COUNT(*) FROM clubs  WHERE id = ANY($1))                    AS clubs,
       (SELECT COUNT(*) FROM teams  WHERE tenant_id = ANY($1))             AS teams,
       (SELECT COUNT(*) FROM players WHERE tenant_id = ANY($1))            AS players,
       (SELECT COUNT(*) FROM players WHERE tenant_id = ANY($1) AND photo_url IS NOT NULL) AS player_photos,
       (SELECT COUNT(*) FROM matches WHERE tenant_id = ANY($1))           AS matches,
       (SELECT COUNT(*) FROM match_events WHERE tenant_id = ANY($1))      AS events,
       (SELECT COUNT(*) FROM match_lineups WHERE tenant_id = ANY($1))     AS lineups,
       (SELECT COUNT(*) FROM player_stats WHERE tenant_id = ANY($1))      AS stats,
       (SELECT COUNT(*) FROM announcements WHERE tenant_id = ANY($1))     AS announcements,
       (SELECT COUNT(*) FROM training_sessions WHERE tenant_id = ANY($1)) AS training`,
    [tenantIds]
  );
  console.log('\n[seed] Done. Totals:', counts.rows[0]);
  console.log('[seed] Demo logins (password: password123):');
  for (const name of Object.keys(CLUBS)) {
    console.log(`   ${name}: ${CLUBS[name].admin.email} (admin) / ${CLUBS[name].coach.email} (coach)`);
  }
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed] FAILED:', e);
  process.exit(1);
});
