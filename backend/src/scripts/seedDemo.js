/**
 * DiskiTrack — comprehensive demo data seeder.
 *
 * Populates the Soweto FC tenant with recognizable South African Betway
 * Premiership squads (2024/25) plus the existing youth teams, then generates
 * fixtures, lineups, match events, player stats, announcements and training
 * sessions so every screen of the app has something to show.
 *
 * Idempotent: it wipes the Soweto-tenant demo content (matches/events/stats/
 * lineups/announcements/training/players) and regenerates it on each run.
 *
 * Run:
 *   $env:DATABASE_URL="<render external url>"; node src/scripts/seedDemo.js
 */
import { pool, query } from '../db/pool.js';

const SOWETO_TENANT = '9fead09c-317c-4893-8285-980c5826a7c8';
const COACH_ID = '5ae332ec-3955-478d-a17b-9fbd9b2022da'; // coach@soweto.fc
const ADMIN_ID = 'a4ce4e2b-ca3a-4269-a434-9ad6b24d490a'; // clubadmin@soweto.fc
const TEAM_U17 = '8f75a220-9d37-4fdf-b67b-cc6caeb3c0ed';
const TEAM_U17B = '07aa447a-cf6d-4ff8-9540-fd7993f6ea9b';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const splitName = (full) => {
  const parts = full.trim().split(' ');
  return { first: parts[0], last: parts.slice(1).join(' ') || parts[0] };
};

// --- Real Betway Premiership squads (jersey, name, position) -----------------
const SQUADS = {
  'Mamelodi Sundowns': [
    [1, 'Ronwen Williams', 'GK'],
    [16, 'Reyaad Pieterse', 'GK'],
    [22, 'Khuliso Mudau', 'DEF'],
    [3, 'Mosa Lebusa', 'DEF'],
    [5, 'Grant Kekana', 'DEF'],
    [17, 'Aubrey Modiba', 'DEF'],
    [23, 'Divine Lunga', 'DEF'],
    [4, 'Rushine De Reuck', 'DEF'],
    [6, 'Mothobi Mvala', 'DEF'],
    [8, 'Teboho Mokoena', 'MID'],
    [13, 'Sphelele Mkhulise', 'MID'],
    [10, 'Marcelo Allende', 'MID'],
    [28, 'Bathusi Aubaas', 'MID'],
    [15, 'Jamie Webber', 'MID'],
    [11, 'Themba Zwane', 'MID'],
    [7, 'Lucas Ribeiro', 'FWD'],
    [9, 'Peter Shalulile', 'FWD'],
    [20, 'Lebo Mothiba', 'FWD'],
    [14, 'Tashreeq Matthews', 'FWD'],
    [26, 'Iqraam Rayners', 'FWD'],
  ],
  'Orlando Pirates': [
    [1, 'Sipho Chaine', 'GK'],
    [30, 'Melusi Buthelezi', 'GK'],
    [3, 'Olisa Ndah', 'DEF'],
    [4, 'Tapelo Xoki', 'DEF'],
    [25, 'Nkosinathi Sibisi', 'DEF'],
    [21, 'Paseka Mako', 'DEF'],
    [2, 'Bandile Shandu', 'DEF'],
    [6, 'Thabang Monare', 'MID'],
    [8, 'Makhehlene Makhaula', 'MID'],
    [10, 'Kabelo Dlamini', 'MID'],
    [15, 'Goodman Mosele', 'MID'],
    [18, 'Deon Hotto', 'MID'],
    [19, 'Patrick Maswanganyi', 'MID'],
    [11, 'Monnapule Saleng', 'FWD'],
    [7, 'Relebohile Mofokeng', 'FWD'],
    [9, 'Tshegofatso Mabasa', 'FWD'],
    [17, 'Evidence Makgopa', 'FWD'],
    [23, 'Karim Kimvuidi', 'MID'],
  ],
  'Kaizer Chiefs': [
    [1, 'Brandon Petersen', 'GK'],
    [16, 'Bruce Bvuma', 'GK'],
    [3, 'Given Msimango', 'DEF'],
    [4, 'Zitha Kwinika', 'DEF'],
    [5, 'Rushwin Dortley', 'DEF'],
    [20, 'Inacio Miguel', 'DEF'],
    [6, 'Edmilson Dove', 'DEF'],
    [8, 'Yusuf Maart', 'MID'],
    [10, 'Mduduzi Shabalala', 'MID'],
    [15, 'Sabelo Radebe', 'MID'],
    [12, 'Mfundo Vilakazi', 'MID'],
    [22, 'Gaston Sirino', 'MID'],
    [23, 'Tebogo Potsane', 'MID'],
    [7, 'Pule Mmodi', 'FWD'],
    [11, 'Ashley Du Preez', 'FWD'],
    [9, 'Ranga Chivaviro', 'FWD'],
    [18, 'Wandile Duba', 'FWD'],
  ],
  'Stellenbosch FC': [
    [1, 'Sage Stephens', 'GK'],
    [16, 'Jarrod Moroole', 'GK'],
    [2, 'Thabo Moloisane', 'DEF'],
    [4, 'Fawaaz Basadien', 'DEF'],
    [5, 'Ismael Toure', 'DEF'],
    [3, 'Olwethu Makhanya', 'DEF'],
    [10, 'Deano van Rooyen', 'DEF'],
    [6, 'Sanele Barns', 'MID'],
    [8, 'Jayden Adams', 'MID'],
    [7, 'Devin Titus', 'MID'],
    [14, 'Antonio van Wyk', 'MID'],
    [21, 'Thabang Sesinyi', 'MID'],
    [11, 'Ashley Cupido', 'FWD'],
    [9, 'Andre De Jong', 'FWD'],
    [17, 'Lehlohonolo Mojela', 'FWD'],
    [19, 'Khanyisa Mayo', 'FWD'],
  ],
};

// Generic youth squads for the existing U17 teams.
const YOUTH_FIRST = ['Sibusiso', 'Katlego', 'Lwazi', 'Bongani', 'Thando', 'Sphiwe', 'Junior', 'Kagiso', 'Tshepo', 'Mpho', 'Lungelo', 'Andile', 'Siyabonga', 'Nkosi', 'Banele', 'Owami', 'Ayanda', 'Mandla'];
const YOUTH_LAST = ['Nkosi', 'Mahlangu', 'Khumalo', 'Ndlovu', 'Sithole', 'Zulu', 'Mthembu', 'Radebe', 'Maseko', 'Cele', 'Dube', 'Ngcobo', 'Mabaso', 'Khoza', 'Buthelezi', 'Mokoena', 'Gumede', 'Shabangu'];
const YOUTH_POS = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'DEF', 'MID', 'FWD', 'GK', 'DEF', 'MID'];

async function clearTenantDemo() {
  console.log('[seed] Clearing existing Soweto-tenant demo data...');
  await query('DELETE FROM match_events WHERE tenant_id = $1', [SOWETO_TENANT]);
  await query('DELETE FROM player_stats WHERE tenant_id = $1', [SOWETO_TENANT]);
  await query('DELETE FROM match_lineups WHERE tenant_id = $1', [SOWETO_TENANT]);
  await query('DELETE FROM matches WHERE tenant_id = $1', [SOWETO_TENANT]);
  await query('DELETE FROM training_attendance WHERE tenant_id = $1', [SOWETO_TENANT]);
  await query('DELETE FROM training_sessions WHERE tenant_id = $1', [SOWETO_TENANT]);
  await query('DELETE FROM announcements WHERE tenant_id = $1', [SOWETO_TENANT]);
  await query('DELETE FROM players WHERE tenant_id = $1', [SOWETO_TENANT]);
}

async function upsertTeam(name) {
  const existing = await query(
    `SELECT id FROM teams WHERE tenant_id = $1 AND name = $2 AND age_group = 'SENIOR' AND category = 'MEN'`,
    [SOWETO_TENANT, name]
  );
  if (existing.rows[0]) {
    await query('UPDATE teams SET coach_id = $2 WHERE id = $1', [existing.rows[0].id, COACH_ID]);
    return existing.rows[0].id;
  }
  const ins = await query(
    `INSERT INTO teams (tenant_id, name, age_group, category, coach_id)
     VALUES ($1, $2, 'SENIOR', 'MEN', $3) RETURNING id`,
    [SOWETO_TENANT, name, COACH_ID]
  );
  return ins.rows[0].id;
}

async function insertPlayers(teamId, squad) {
  const ids = [];
  for (const [num, full, pos] of squad) {
    const { first, last } = splitName(full);
    const age = pos === 'GK' ? rnd(22, 34) : rnd(18, 33);
    const dob = `${2025 - age}-0${rnd(1, 9)}-${String(rnd(1, 28)).padStart(2, '0')}`;
    const r = await query(
      `INSERT INTO players (tenant_id, team_id, first_name, last_name, date_of_birth, position, jersey_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [SOWETO_TENANT, teamId, first, last, dob, pos, num]
    );
    ids.push({ id: r.rows[0].id, num, pos, name: full });
  }
  return ids;
}

async function insertYouth(teamId, count, ageBase) {
  const used = new Set();
  for (let i = 0; i < count; i++) {
    const first = YOUTH_FIRST[i % YOUTH_FIRST.length];
    const last = YOUTH_LAST[(i * 7) % YOUTH_LAST.length];
    const pos = YOUTH_POS[i % YOUTH_POS.length];
    let num = i + 1;
    while (used.has(num)) num++;
    used.add(num);
    const dob = `${ageBase - rnd(0, 1)}-0${rnd(1, 9)}-${String(rnd(1, 28)).padStart(2, '0')}`;
    await query(
      `INSERT INTO players (tenant_id, team_id, first_name, last_name, date_of_birth, position, jersey_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [SOWETO_TENANT, teamId, first, last, dob, pos, num]
    );
  }
}

const FORMATIONS = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2'];

async function createMatch({ home, away, status, homeScore, awayScore, daysFromNow, formationH, formationA }) {
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + daysFromNow);
  scheduled.setHours(rnd(15, 20), pick([0, 30]), 0, 0);

  const kickoff = status !== 'SCHEDULED' ? scheduled.toISOString() : null;
  const finished = status === 'FINISHED' ? scheduled.toISOString() : null;

  const r = await query(
    `INSERT INTO matches
       (tenant_id, home_team_id, away_team_id, venue, scheduled_at, status,
        home_score, away_score, kickoff_at, finished_at, home_formation, away_formation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      SOWETO_TENANT, home.id, away.id, pick(['Loftus Versfeld', 'Orlando Stadium', 'FNB Stadium', 'Cape Town Stadium', 'Dobsonville Stadium']),
      scheduled.toISOString(), status,
      status === 'SCHEDULED' ? 0 : homeScore,
      status === 'SCHEDULED' ? 0 : awayScore,
      kickoff, finished, formationH, formationA,
    ]
  );
  return r.rows[0].id;
}

async function addLineup(matchId, teamId, players) {
  const starters = players.slice(0, 11);
  const subs = players.slice(11, 18);
  for (const p of starters) {
    await query(
      `INSERT INTO match_lineups (tenant_id, match_id, team_id, player_id, is_starting, jersey_number, position)
       VALUES ($1,$2,$3,$4,TRUE,$5,$6)`,
      [SOWETO_TENANT, matchId, teamId, p.id, p.num, p.pos]
    );
  }
  for (const p of subs) {
    await query(
      `INSERT INTO match_lineups (tenant_id, match_id, team_id, player_id, is_starting, jersey_number, position)
       VALUES ($1,$2,$3,$4,FALSE,$5,$6)`,
      [SOWETO_TENANT, matchId, teamId, p.id, p.num, p.pos]
    );
  }
}

async function addEvent(matchId, teamId, playerId, relatedId, type, minute) {
  await query(
    `INSERT INTO match_events (tenant_id, match_id, team_id, player_id, related_player_id, event_type, minute, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [SOWETO_TENANT, matchId, teamId, playerId, relatedId, type, minute, COACH_ID]
  );
}

async function generateMatchDetail(matchId, home, away, homePlayers, awayPlayers, homeScore, awayScore, live) {
  await addLineup(matchId, home.id, homePlayers);
  await addLineup(matchId, away.id, awayPlayers);

  const attackers = (ps) => ps.filter((p) => p.pos === 'FWD' || p.pos === 'MID');
  const goalTally = {}; // playerId -> goals
  const assistTally = {};

  const scoreGoals = async (teamId, players, n) => {
    const usedMins = new Set();
    for (let i = 0; i < n; i++) {
      const scorer = pick(attackers(players));
      let assister = pick(attackers(players));
      let guard = 0;
      while (assister.id === scorer.id && guard++ < 5) assister = pick(attackers(players));
      let minute = rnd(5, live ? 60 : 89);
      while (usedMins.has(minute)) minute = rnd(5, live ? 60 : 89);
      usedMins.add(minute);
      await addEvent(matchId, teamId, scorer.id, assister.id, 'GOAL', minute);
      await addEvent(matchId, teamId, assister.id, scorer.id, 'ASSIST', minute);
      goalTally[scorer.id] = (goalTally[scorer.id] || 0) + 1;
      assistTally[assister.id] = (assistTally[assister.id] || 0) + 1;
    }
  };

  await scoreGoals(home.id, homePlayers, homeScore);
  await scoreGoals(away.id, awayPlayers, awayScore);

  // A sprinkle of cards / fouls / corners / shots for a rich timeline.
  const extras = async (teamId, players) => {
    for (let i = 0; i < rnd(2, 4); i++) {
      const p = pick(players.slice(0, 14));
      await addEvent(matchId, teamId, p.id, null, 'FOUL', rnd(5, 89));
    }
    if (rnd(0, 1)) {
      const p = pick(players.slice(0, 14));
      await addEvent(matchId, teamId, p.id, null, 'YELLOW_CARD', rnd(20, 88));
    }
    for (let i = 0; i < rnd(2, 5); i++) {
      const p = pick(attackers(players));
      await addEvent(matchId, teamId, p.id, null, 'SHOT', rnd(5, 89));
    }
    for (let i = 0; i < rnd(2, 6); i++) {
      const p = pick(players.slice(0, 14));
      await addEvent(matchId, teamId, p.id, null, 'CORNER', rnd(5, 89));
    }
  };
  await extras(home.id, homePlayers);
  await extras(away.id, awayPlayers);

  // Aggregated player_stats for every player in both lineups (finished only,
  // or partial for live).
  const writeStats = async (players) => {
    const starters = players.slice(0, 11);
    const subs = players.slice(11, 16);
    for (const p of starters) {
      await query(
        `INSERT INTO player_stats
           (tenant_id, match_id, player_id, goals, assists, shots, fouls, yellow_cards, red_cards, minutes_played)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9)
         ON CONFLICT (match_id, player_id) DO NOTHING`,
        [
          SOWETO_TENANT, matchId, p.id,
          goalTally[p.id] || 0,
          assistTally[p.id] || 0,
          (goalTally[p.id] || 0) + rnd(0, 3),
          rnd(0, 3),
          rnd(0, 1) && (goalTally[p.id] === undefined) ? 0 : 0,
          live ? rnd(45, 60) : 90,
        ]
      );
    }
    for (const p of subs) {
      if (rnd(0, 1) === 0) continue; // not all subs feature
      await query(
        `INSERT INTO player_stats
           (tenant_id, match_id, player_id, goals, assists, shots, fouls, yellow_cards, red_cards, minutes_played)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8)
         ON CONFLICT (match_id, player_id) DO NOTHING`,
        [SOWETO_TENANT, matchId, p.id, goalTally[p.id] || 0, assistTally[p.id] || 0, rnd(0, 2), rnd(0, 1), live ? rnd(5, 20) : rnd(10, 35)]
      );
    }
  };
  if (!live) {
    await writeStats(homePlayers);
    await writeStats(awayPlayers);
  } else {
    await writeStats(homePlayers);
    await writeStats(awayPlayers);
  }
}

async function seedAnnouncements(teamIds) {
  const items = [
    ['Welcome to the 2024/25 Betway Premiership season!', 'Pre-season is complete. Let\'s push for the title this campaign. Full squad reporting Monday 08:00.', true, null],
    ['Derby week — Soweto Derby preparations', 'Tickets are selling fast for the big one. Extra video analysis session scheduled Thursday.', true, null],
    ['Medical screening reminder', 'All players must complete their seasonal medical screening before Friday training.', false, null],
    ['Travel itinerary: away fixture', 'Bus departs the training ground at 09:00 sharp. Bring your travel kit and ID.', false, teamIds[0]],
    ['New gym programme released', 'Strength & conditioning blocks updated on the player portal. Speak to the fitness coach with questions.', false, null],
  ];
  for (const [title, body, pinned, teamId] of items) {
    await query(
      `INSERT INTO announcements (tenant_id, author_id, team_id, title, body, is_pinned)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [SOWETO_TENANT, ADMIN_ID, teamId, title, body, pinned]
    );
  }
}

async function seedTraining(teamId, players) {
  const sessions = [
    ['Tactical shape & pressing triggers', 'Loftus Training Ground', 'High press patterns and defensive transitions', -3, 90],
    ['Recovery & mobility', 'Club Gym', 'Light recovery, stretching, core stability', -1, 60],
    ['Set-piece rehearsal', 'Loftus Training Ground', 'Attacking and defending corners and free kicks', 1, 75],
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
      [SOWETO_TENANT, teamId, title, location, focus, when.toISOString(), dur, COACH_ID]
    );
    // Only record attendance for past/near sessions.
    if (days <= 1) {
      for (const p of players.slice(0, 18)) {
        await query(
          `INSERT INTO training_attendance (tenant_id, session_id, player_id, status)
           VALUES ($1,$2,$3,$4) ON CONFLICT (session_id, player_id) DO NOTHING`,
          [SOWETO_TENANT, s.rows[0].id, p.id, pick(statuses)]
        );
      }
    }
  }
}

async function main() {
  await clearTenantDemo();

  console.log('[seed] Creating Betway Premiership teams + squads...');
  const teams = {};
  for (const name of Object.keys(SQUADS)) {
    const id = await upsertTeam(name);
    const players = await insertPlayers(id, SQUADS[name]);
    teams[name] = { id, name, players };
    console.log(`   ${name}: ${players.length} players`);
  }

  console.log('[seed] Populating youth teams...');
  await insertYouth(TEAM_U17, 18, 2008);
  await insertYouth(TEAM_U17B, 16, 2008);

  const SD = teams['Mamelodi Sundowns'];
  const OP = teams['Orlando Pirates'];
  const KC = teams['Kaizer Chiefs'];
  const ST = teams['Stellenbosch FC'];

  console.log('[seed] Creating fixtures with lineups, events & stats...');
  // Finished matches
  let m;
  m = await createMatch({ home: SD, away: OP, status: 'FINISHED', homeScore: 2, awayScore: 1, daysFromNow: -14, formationH: '4-3-3', formationA: '4-4-2' });
  await generateMatchDetail(m, SD, OP, SD.players, OP.players, 2, 1, false);

  m = await createMatch({ home: KC, away: ST, status: 'FINISHED', homeScore: 1, awayScore: 1, daysFromNow: -10, formationH: '4-2-3-1', formationA: '3-5-2' });
  await generateMatchDetail(m, KC, ST, KC.players, ST.players, 1, 1, false);

  m = await createMatch({ home: OP, away: KC, status: 'FINISHED', homeScore: 0, awayScore: 2, daysFromNow: -7, formationH: '4-3-3', formationA: '4-2-3-1' });
  await generateMatchDetail(m, OP, KC, OP.players, KC.players, 0, 2, false);

  m = await createMatch({ home: ST, away: SD, status: 'FINISHED', homeScore: 1, awayScore: 3, daysFromNow: -4, formationH: '4-4-2', formationA: '4-3-3' });
  await generateMatchDetail(m, ST, SD, ST.players, SD.players, 1, 3, false);

  // Live match
  m = await createMatch({ home: SD, away: KC, status: 'LIVE', homeScore: 1, awayScore: 0, daysFromNow: 0, formationH: '4-3-3', formationA: '4-2-3-1' });
  await generateMatchDetail(m, SD, KC, SD.players, KC.players, 1, 0, true);

  // Scheduled fixtures
  await createMatch({ home: OP, away: ST, status: 'SCHEDULED', homeScore: 0, awayScore: 0, daysFromNow: 4, formationH: '4-3-3', formationA: '4-4-2' });
  await createMatch({ home: KC, away: SD, status: 'SCHEDULED', homeScore: 0, awayScore: 0, daysFromNow: 7, formationH: '4-2-3-1', formationA: '4-3-3' });
  await createMatch({ home: ST, away: OP, status: 'SCHEDULED', homeScore: 0, awayScore: 0, daysFromNow: 11, formationH: '3-5-2', formationA: '4-3-3' });

  console.log('[seed] Adding announcements...');
  await seedAnnouncements([SD.id, OP.id]);

  console.log('[seed] Adding training sessions + attendance...');
  await seedTraining(SD.id, SD.players);

  // Summary
  const counts = await query(
    `SELECT
       (SELECT COUNT(*) FROM players WHERE tenant_id=$1) AS players,
       (SELECT COUNT(*) FROM teams WHERE tenant_id=$1) AS teams,
       (SELECT COUNT(*) FROM matches WHERE tenant_id=$1) AS matches,
       (SELECT COUNT(*) FROM match_events WHERE tenant_id=$1) AS events,
       (SELECT COUNT(*) FROM match_lineups WHERE tenant_id=$1) AS lineups,
       (SELECT COUNT(*) FROM player_stats WHERE tenant_id=$1) AS stats,
       (SELECT COUNT(*) FROM announcements WHERE tenant_id=$1) AS announcements,
       (SELECT COUNT(*) FROM training_sessions WHERE tenant_id=$1) AS training`,
    [SOWETO_TENANT]
  );
  console.log('[seed] Done. Totals:', counts.rows[0]);
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed] FAILED:', e);
  process.exit(1);
});
