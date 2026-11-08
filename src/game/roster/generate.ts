import { clampRating } from './ratings'
import type { CourtPos, League, RosterPlayer, TeamRoster } from './types'

const FIRST = [
  'Ace', 'Ben', 'Cam', 'Drew', 'Eli', 'Finn', 'Gus', 'Hank', 'Ike', 'Jay',
  'Kai', 'Leo', 'Max', 'Nate', 'Omar', 'Pete', 'Quinn', 'Ray', 'Sam', 'Theo',
  'Uri', 'Vince', 'Wes', 'Xander', 'Yves', 'Zane'
]

const LAST = [
  'Adler', 'Brooks', 'Carter', 'Dunn', 'Ellis', 'Frost', 'Grant', 'Hayes',
  'Ingram', 'Jones', 'Klein', 'Lane', 'Moore', 'Nash', 'Ortiz', 'Price',
  'Quinn', 'Reed', 'Shaw', 'Turner', 'Underwood', 'Vega', 'Walsh', 'Young'
]

const POSITIONS: CourtPos[] = ['PG', 'SG', 'SF', 'PF', 'C', 'SG', 'SF', 'PF', 'PG', 'C']

type TeamTemplate = {
  id: string
  name: string
  abbrev: string
  color: string
  /** Average overall bias */
  strength: number
}

const TEMPLATES: TeamTemplate[] = [
  { id: 'river-city', name: 'River City Foxes', abbrev: 'RC', color: '#1f4b99', strength: 82 },
  { id: 'lakeview', name: 'Lakeview Lynx', abbrev: 'LV', color: '#b22222', strength: 74 },
  { id: 'cedar-falls', name: 'Cedar Falls Hawks', abbrev: 'CF', color: '#2f6b3a', strength: 76 },
  { id: 'ironwood', name: 'Ironwood Forge', abbrev: 'IW', color: '#6b4f2a', strength: 71 },
  { id: 'bayfront', name: 'Bayfront Gulls', abbrev: 'BF', color: '#1a6b7a', strength: 78 },
  { id: 'summit', name: 'Summit Wolves', abbrev: 'SM', color: '#4a4a5a', strength: 73 }
]

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickName(rand: () => number, used: Set<string>): string {
  for (let i = 0; i < 40; i++) {
    const name = `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  return `Player ${Math.floor(rand() * 900 + 100)}`
}

function roleBias(pos: CourtPos): Partial<RosterPlayer> {
  switch (pos) {
    case 'PG':
      return { speed: 8, shooting: 6, finishing: 0, rebounding: -8, defense: 2, stamina: 4 }
    case 'SG':
      return { speed: 4, shooting: 10, finishing: 2, rebounding: -6, defense: 0, stamina: 2 }
    case 'SF':
      return { speed: 2, shooting: 4, finishing: 4, rebounding: 0, defense: 2, stamina: 2 }
    case 'PF':
      return { speed: -4, shooting: -2, finishing: 8, rebounding: 8, defense: 4, stamina: 0 }
    case 'C':
      return { speed: -8, shooting: -6, finishing: 10, rebounding: 12, defense: 6, stamina: -2 }
  }
}

function makePlayer(
  teamId: string,
  index: number,
  strength: number,
  rand: () => number,
  usedNames: Set<string>
): RosterPlayer {
  const pos = POSITIONS[index] ?? 'SF'
  const bias = roleBias(pos)
  const jitter = () => (rand() - 0.5) * 14
  const base = strength + jitter()

  return {
    id: `${teamId}-p${index + 1}`,
    name: pickName(rand, usedNames),
    number: index + 1,
    pos,
    speed: clampRating((bias.speed ?? 0) + base + jitter()),
    shooting: clampRating((bias.shooting ?? 0) + base + jitter()),
    finishing: clampRating((bias.finishing ?? 0) + base + jitter()),
    rebounding: clampRating((bias.rebounding ?? 0) + base + jitter()),
    defense: clampRating((bias.defense ?? 0) + base + jitter()),
    stamina: clampRating((bias.stamina ?? 0) + base + jitter())
  }
}

function makeTeam(template: TeamTemplate, seed: number): TeamRoster {
  const rand = mulberry32(seed)
  const usedNames = new Set<string>()
  const players = Array.from({ length: 10 }, (_, i) =>
    makePlayer(template.id, i, template.strength, rand, usedNames)
  )

  // Starters: best available by rough fit — first of each primary pos, then fill
  const starterIds: string[] = []
  for (const pos of ['PG', 'SG', 'SF', 'PF', 'C'] as CourtPos[]) {
    const pick = players.find((p) => p.pos === pos && !starterIds.includes(p.id))
    if (pick) starterIds.push(pick.id)
  }
  while (starterIds.length < 5) {
    const next = players.find((p) => !starterIds.includes(p.id))
    if (!next) break
    starterIds.push(next.id)
  }

  return {
    id: template.id,
    name: template.name,
    abbrev: template.abbrev,
    color: template.color,
    players,
    starterIds
  }
}

export function createDefaultLeague(seed = 42): League {
  const teams = TEMPLATES.map((t, i) => makeTeam(t, seed + i * 97))
  return {
    userTeamId: teams[0]!.id,
    teams
  }
}

export function getTeam(league: League, teamId: string): TeamRoster | undefined {
  return league.teams.find((t) => t.id === teamId)
}

export function getUserTeam(league: League): TeamRoster {
  return getTeam(league, league.userTeamId) ?? league.teams[0]!
}

export function getOpponentTeams(league: League): TeamRoster[] {
  return league.teams.filter((t) => t.id !== league.userTeamId)
}

export function startersOf(team: TeamRoster): RosterPlayer[] {
  return team.starterIds
    .map((id) => team.players.find((p) => p.id === id))
    .filter((p): p is RosterPlayer => p != null)
}

export function benchOf(team: TeamRoster): RosterPlayer[] {
  return team.players.filter((p) => !team.starterIds.includes(p.id))
}

/** Swap a starter with a bench player. Returns a new team object. */
export function swapLineup(
  team: TeamRoster,
  starterId: string,
  benchId: string
): TeamRoster {
  if (!team.starterIds.includes(starterId)) return team
  if (team.starterIds.includes(benchId)) return team
  if (!team.players.some((p) => p.id === benchId)) return team

  return {
    ...team,
    starterIds: team.starterIds.map((id) => (id === starterId ? benchId : id))
  }
}

export function updateLeagueTeam(league: League, team: TeamRoster): League {
  return {
    ...league,
    teams: league.teams.map((t) => (t.id === team.id ? team : t))
  }
}
