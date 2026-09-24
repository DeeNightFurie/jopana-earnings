/**
 * Single source of truth for Jopana professional earning rates.
 *
 * Framework-free on purpose: no React imports, no icons. Everything here is
 * plain data + pure functions so the rates can be unit-tested, and later swapped
 * for an API response, without touching the UI.
 *
 * All amounts are in INR.
 *   - "fixed" specialities bill an hourly rate: daily = hourlyRate * hours
 *   - "slab"  specialities bill a flat day rate per shift length: daily = slabs[hours]
 */

export type FixedPricing = {
  type: "fixed"
  /** INR earned per hour worked. */
  hourlyRate: number
}

export type SlabPricing = {
  type: "slab"
  /** Shift length (hours) -> flat INR for the whole day. */
  slabs: Record<number, number>
}

export type Speciality = {
  id: string
  name: string
  /** Short line shown under the rate badge. */
  blurb: string
  /**
   * Shift lengths this speciality may be booked for. Omit to allow any length
   * from 1h to 24h (the calculator then uses a continuous slider).
   */
  allowedHours?: number[]
} & (FixedPricing | SlabPricing)

export type Profession = {
  id: ProfessionId
  name: string
  /** One-liner shown on the profession tile. */
  tagline: string
  specialities: Speciality[]
}

export type ProfessionId = "nursing" | "physio" | "doctor" | "gda"

/** Shift lengths offered when a speciality does not restrict them. */
export const DEFAULT_HOUR_PRESETS = [1, 2, 4, 6, 8, 12, 24] as const

export const PROFESSIONS: Profession[] = [
  {
    id: "nursing",
    name: "Nursing",
    tagline: "Visits & continuous care",
    specialities: [
      {
        id: "nursing-visits",
        name: "Nursing Visits",
        blurb: "Single-visit procedures billed per visit",
        type: "fixed",
        hourlyRate: 600,
        allowedHours: [1],
      },
      {
        id: "continuous-care-nursing",
        name: "Continuous Care",
        blurb: "Flat shift rate, higher for longer shifts",
        type: "slab",
        slabs: { 6: 1300, 12: 1500, 24: 1800 },
        allowedHours: [6, 12, 24],
      },
    ],
  },
  {
    id: "physio",
    name: "Physiotherapist",
    tagline: "Rehab & mobility",
    specialities: [
      {
        id: "basic-care",
        name: "Basic Care",
        blurb: "General mobility and recovery support",
        type: "fixed",
        hourlyRate: 400,
      },
      {
        id: "advanced-physio",
        name: "Advanced Physio Care",
        blurb: "Post-operative and neuro rehabilitation",
        type: "fixed",
        hourlyRate: 600,
      },
      {
        id: "sports-physio",
        name: "Sports Physio",
        blurb: "Performance and sports-injury specialisation",
        type: "fixed",
        hourlyRate: 800,
      },
    ],
  },
  {
    id: "doctor",
    name: "Doctor",
    tagline: "Online & at-home consults",
    specialities: [
      {
        id: "online-consultation",
        name: "Online Consultation",
        blurb: "Teleconsultation from anywhere",
        type: "fixed",
        hourlyRate: 1000,
      },
      {
        id: "home-consultation",
        name: "At Home Consultation",
        blurb: "In-person consultation at the patient's home",
        type: "fixed",
        hourlyRate: 1500,
      },
    ],
  },
  {
    id: "gda",
    name: "Caregiver (GDA)",
    tagline: "Daily living assistance",
    specialities: [
      {
        id: "continuous-care-gda",
        name: "Continuous Care",
        blurb: "Flat shift rate for attendant care",
        type: "slab",
        slabs: { 12: 800, 24: 900 },
        allowedHours: [12, 24],
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Derivation helpers — pure, no state                                  */
/* ------------------------------------------------------------------ */

export function findProfession(id: string | null): Profession | null {
  return PROFESSIONS.find((p) => p.id === id) ?? null
}

export function findSpeciality(
  professionId: string | null,
  specialityId: string | null
): Speciality | null {
  const profession = findProfession(professionId)
  if (!profession) return null
  return profession.specialities.find((s) => s.id === specialityId) ?? null
}

/**
 * Describes how the hours control should behave for a speciality.
 *
 *  - "single"     one legal shift length, so there is nothing to slide
 *  - "stops"      a few discrete shift lengths (slab pricing) — snap between them
 *  - "continuous" any length from 1h to 24h — slide freely
 */
export type HourMode =
  | { kind: "single"; hours: number }
  | { kind: "stops"; stops: number[] }
  | { kind: "continuous"; min: number; max: number; presets: number[] }

export function getHourMode(speciality: Speciality | null): HourMode {
  if (!speciality) {
    return { kind: "continuous", min: 1, max: 24, presets: [...DEFAULT_HOUR_PRESETS] }
  }

  const allowed = speciality.allowedHours
  if (allowed && allowed.length === 1) {
    return { kind: "single", hours: allowed[0] }
  }
  if (allowed && allowed.length > 1) {
    return { kind: "stops", stops: [...allowed].sort((a, b) => a - b) }
  }
  return { kind: "continuous", min: 1, max: 24, presets: [...DEFAULT_HOUR_PRESETS] }
}

/** Clamps an arbitrary hour value onto the nearest legal shift length. */
export function snapHours(speciality: Speciality | null, hours: number): number {
  const mode = getHourMode(speciality)
  switch (mode.kind) {
    case "single":
      return mode.hours
    case "stops":
      return mode.stops.reduce((best, stop) =>
        Math.abs(stop - hours) < Math.abs(best - hours) ? stop : best
      )
    case "continuous":
      return Math.min(mode.max, Math.max(mode.min, Math.round(hours)))
  }
}

/** INR earned for one day at the given shift length, or null if illegal. */
export function getDailyRate(
  speciality: Speciality | null,
  hours: number
): number | null {
  if (!speciality) return null

  if (speciality.type === "slab") {
    return speciality.slabs[hours] ?? null
  }

  if (speciality.allowedHours && !speciality.allowedHours.includes(hours)) {
    return null
  }
  return speciality.hourlyRate * hours
}

/** What the professional actually earns per hour at this shift length. */
export function getEffectiveHourlyRate(
  speciality: Speciality | null,
  hours: number
): number | null {
  const daily = getDailyRate(speciality, hours)
  if (daily === null || hours <= 0) return null
  return Math.round(daily / hours)
}

export function getMonthlyIncome(
  speciality: Speciality | null,
  hours: number,
  workingDays: number
): number {
  const daily = getDailyRate(speciality, hours)
  if (daily === null || workingDays <= 0) return 0
  return Math.round(daily * workingDays)
}

const INR = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
})

export function formatINR(value: number): string {
  return INR.format(Math.max(0, Math.round(value)))
}

/* ------------------------------------------------------------------ */
/* Sensible opening state                                              */
/* ------------------------------------------------------------------ */

/**
 * Preferred speciality to land on for a profession.
 *
 * Favours one with a choice of shift lengths, so the calculator opens with a
 * usable slider rather than a locked single-visit rate. Falls back to the first
 * speciality when every option is fixed-length.
 */
export function getDefaultSpeciality(profession: Profession): Speciality {
  const slidable = profession.specialities.find(
    (s) => getHourMode(s).kind !== "single"
  )
  return slidable ?? profession.specialities[0]
}

/** A shift length that is legal for `speciality` and reads well on first paint. */
export function getDefaultHours(speciality: Speciality): number {
  const mode = getHourMode(speciality)
  switch (mode.kind) {
    case "single":
      return mode.hours
    case "stops":
      // Lower-middle tier, so an even number of stops opens on the shorter
      // shift rather than pinning the slider to its maximum.
      return mode.stops[Math.floor((mode.stops.length - 1) / 2)]
    case "continuous":
      return 8
  }
}

/**
 * The next legal shift length above `hours`, and what moving to it adds to the
 * monthly total. Returns null at the top of the range, or when the next tier
 * pays no more (some slabs plateau).
 *
 * Drives the "slide up to earn more" nudge in the result panel.
 */
export function getNextStepUp(
  speciality: Speciality | null,
  hours: number,
  workingDays: number
): { hours: number; uplift: number } | null {
  if (!speciality) return null

  const mode = getHourMode(speciality)
  let nextHours: number | null = null

  if (mode.kind === "stops") {
    nextHours = mode.stops.find((stop) => stop > hours) ?? null
  } else if (mode.kind === "continuous") {
    nextHours = hours < mode.max ? hours + 1 : null
  }

  if (nextHours === null) return null

  const uplift =
    getMonthlyIncome(speciality, nextHours, workingDays) -
    getMonthlyIncome(speciality, hours, workingDays)

  return uplift > 0 ? { hours: nextHours, uplift } : null
}
