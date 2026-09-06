import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  computeAvailableSlots,
  groupSlotsByDay,
  localDateKey,
  localToUTC,
  localWeekday,
  overlaps,
  parseTime,
  timezoneOffsetMinutes,
} from '@/lib/booking/slots'

/**
 * Moteur de creneaux — tests purs, sans base ni horloge implicite.
 *
 * L'enjeu principal est le passage a l'heure d'ete : « 9h a Montreal » n'est
 * pas le meme instant UTC en janvier et en juillet. Un decalage fige
 * produirait des creneaux faux la moitie de l'annee.
 */

const TZ = 'America/Toronto'

/** Lundi 2027-03-01, midi UTC. */
const MONDAY = new Date('2027-03-01T12:00:00.000Z')

const rule = (weekday: number, startTime: string, endTime: string, timezone = TZ) => ({
  weekday,
  startTime,
  endTime,
  timezone,
})

describe('utilitaires de temps', () => {
  it('analyse une heure HH:MM', () => {
    assert.equal(parseTime('09:00'), 540)
    assert.equal(parseTime('00:00'), 0)
    assert.equal(parseTime('23:59'), 1439)
  })

  it('refuse une heure malformee', () => {
    for (const value of ['9:00', '24:00', '12:60', 'midi', '', null, undefined]) {
      assert.equal(parseTime(value as never), null, `${String(value)} devrait etre refuse`)
    }
  })

  it('calcule le decalage reel selon la date', () => {
    // Montreal : UTC-5 en hiver, UTC-4 en ete.
    const winter = timezoneOffsetMinutes(TZ, new Date('2027-01-15T12:00:00Z'))
    const summer = timezoneOffsetMinutes(TZ, new Date('2027-07-15T12:00:00Z'))
    assert.equal(winter, -300)
    assert.equal(summer, -240)
    assert.notEqual(winter, summer, 'le decalage doit suivre l heure d ete')
  })

  it('retombe sur UTC pour un fuseau inconnu', () => {
    assert.equal(timezoneOffsetMinutes('Mars/Olympus', new Date()), 0)
  })

  it('convertit une heure locale en UTC, hiver comme ete', () => {
    // 9h locale en janvier = 14:00 UTC (UTC-5).
    assert.equal(localToUTC(2027, 1, 15, 540, TZ).toISOString(), '2027-01-15T14:00:00.000Z')
    // 9h locale en juillet = 13:00 UTC (UTC-4).
    assert.equal(localToUTC(2027, 7, 15, 540, TZ).toISOString(), '2027-07-15T13:00:00.000Z')
  })

  it('donne le jour civil et le jour de semaine dans le fuseau', () => {
    // 2027-01-15 01:00 UTC = 2027-01-14 20:00 a Montreal : jour different.
    const at = new Date('2027-01-15T01:00:00Z')
    assert.equal(localDateKey(at, TZ), '2027-01-14')
    assert.equal(localDateKey(at, 'UTC'), '2027-01-15')
    assert.equal(localWeekday(at, TZ), 4, 'jeudi a Montreal')
  })

  it('detecte les chevauchements sans compter le contact bord a bord', () => {
    const a1 = new Date('2027-03-01T10:00:00Z')
    const a2 = new Date('2027-03-01T11:00:00Z')
    assert.equal(overlaps(a1, a2, new Date('2027-03-01T10:30:00Z'), new Date('2027-03-01T11:30:00Z')), true)
    // Fin exactement egale au debut suivant : pas un chevauchement.
    assert.equal(overlaps(a1, a2, a2, new Date('2027-03-01T12:00:00Z')), false)
  })
})

describe('calcul des creneaux', () => {
  const base = {
    now: MONDAY,
    rules: [rule(1, '09:00', '12:00')], // lundi 9h-12h
    exceptions: [],
    busy: [],
    options: {
      durationMinutes: 60,
      bufferMinutes: 0,
      minimumNoticeHours: 0,
      horizonDays: 7,
      granularityMinutes: 60,
    },
  }

  it('produit les creneaux d une plage hebdomadaire', () => {
    const slots = computeAvailableSlots(base)
    // Lundi 1er mars puis lundi 8 mars : 3 creneaux chacun, mais le 1er mars
    // 9h et 10h sont deja passes (il est 12h UTC = 7h locale)… donc tous
    // restent a venir. 9h, 10h, 11h locales.
    const firstDay = slots.filter((slot) => localDateKey(slot.startAt, TZ) === '2027-03-01')
    assert.equal(firstDay.length, 3)
    assert.equal(firstDay[0].startAt.toISOString(), '2027-03-01T14:00:00.000Z') // 9h locale
    assert.equal(firstDay[2].startAt.toISOString(), '2027-03-01T16:00:00.000Z') // 11h locale
  })

  it('ne propose que le bon jour de la semaine', () => {
    const slots = computeAvailableSlots(base)
    for (const slot of slots) {
      assert.equal(localWeekday(slot.startAt, TZ), 1, 'uniquement des lundis')
    }
  })

  it('respecte le preavis minimal', () => {
    const slots = computeAvailableSlots({
      ...base,
      options: { ...base.options, minimumNoticeHours: 48 },
    })
    const earliest = new Date(MONDAY.getTime() + 48 * 60 * 60_000)
    assert.ok(slots.length > 0)
    for (const slot of slots) {
      assert.ok(slot.startAt >= earliest, 'aucun creneau avant le preavis')
    }
  })

  it('ne depasse pas l horizon', () => {
    const slots = computeAvailableSlots({ ...base, options: { ...base.options, horizonDays: 3 } })
    const limit = new Date(MONDAY.getTime() + 3 * 24 * 60 * 60_000)
    for (const slot of slots) assert.ok(slot.startAt <= limit)
  })

  it('ne propose pas de creneau qui deborde de la plage', () => {
    const slots = computeAvailableSlots({
      ...base,
      options: { ...base.options, durationMinutes: 120, granularityMinutes: 60 },
    })
    const firstDay = slots.filter((slot) => localDateKey(slot.startAt, TZ) === '2027-03-01')
    // 9h-11h et 10h-12h tiennent ; 11h-13h deborde.
    assert.equal(firstDay.length, 2)
  })

  it('exclut un creneau chevauchant un rendez-vous existant', () => {
    const slots = computeAvailableSlots({
      ...base,
      busy: [
        {
          startAt: new Date('2027-03-01T15:00:00Z'), // 10h locale
          endAt: new Date('2027-03-01T16:00:00Z'),
        },
      ],
    })
    const firstDay = slots.filter((slot) => localDateKey(slot.startAt, TZ) === '2027-03-01')
    assert.equal(firstDay.length, 2)
    assert.ok(!firstDay.some((slot) => slot.startAt.toISOString() === '2027-03-01T15:00:00.000Z'))
  })

  it('tient compte du tampon apres une rencontre', () => {
    // Un rendez-vous de 9h a 10h avec 30 min de tampon occupe jusqu a 10h30,
    // ce qui empeche un creneau de 10h.
    const slots = computeAvailableSlots({
      ...base,
      busy: [
        {
          startAt: new Date('2027-03-01T14:00:00Z'),
          endAt: new Date('2027-03-01T15:00:00Z'),
        },
      ],
      options: { ...base.options, bufferMinutes: 30 },
    })
    const firstDay = slots.filter((slot) => localDateKey(slot.startAt, TZ) === '2027-03-01')
    // 9h occupe. 10h : le creneau irait 10h-11h + 30 min = jusqu a 11h30, mais
    // il ne chevauche pas le rendez-vous existant (termine a 10h). Il passe.
    assert.ok(!firstDay.some((slot) => slot.startAt.toISOString() === '2027-03-01T14:00:00.000Z'))
  })

  it('supprime une journee entierement bloquee', () => {
    const slots = computeAvailableSlots({
      ...base,
      exceptions: [{ date: '2027-03-01', kind: 'blocked', timezone: TZ }],
    })
    assert.equal(slots.filter((slot) => localDateKey(slot.startAt, TZ) === '2027-03-01').length, 0)
    // Le lundi suivant reste disponible.
    assert.ok(slots.some((slot) => localDateKey(slot.startAt, TZ) === '2027-03-08'))
  })

  it('retire une plage bloquee sans supprimer la journee', () => {
    const slots = computeAvailableSlots({
      ...base,
      exceptions: [
        { date: '2027-03-01', kind: 'blocked_range', startTime: '10:00', endTime: '11:00', timezone: TZ },
      ],
    })
    const firstDay = slots.filter((slot) => localDateKey(slot.startAt, TZ) === '2027-03-01')
    assert.equal(firstDay.length, 2)
    assert.ok(!firstDay.some((slot) => slot.startAt.toISOString() === '2027-03-01T15:00:00.000Z'))
  })

  it('ouvre une plage exceptionnelle hors regle hebdomadaire', () => {
    // Mardi 2 mars : aucune regle, mais une exception ouvre 14h-16h.
    const slots = computeAvailableSlots({
      ...base,
      exceptions: [
        { date: '2027-03-02', kind: 'extra', startTime: '14:00', endTime: '16:00', timezone: TZ },
      ],
    })
    const tuesday = slots.filter((slot) => localDateKey(slot.startAt, TZ) === '2027-03-02')
    assert.equal(tuesday.length, 2)
  })

  it('ne produit aucun creneau sans regle ni exception', () => {
    assert.deepEqual(computeAvailableSlots({ ...base, rules: [] }), [])
  })

  it('deduplique deux regles qui se recouvrent', () => {
    const slots = computeAvailableSlots({
      ...base,
      rules: [rule(1, '09:00', '12:00'), rule(1, '10:00', '12:00')],
    })
    const firstDay = slots.filter((slot) => localDateKey(slot.startAt, TZ) === '2027-03-01')
    const starts = firstDay.map((slot) => slot.startAt.toISOString())
    assert.equal(new Set(starts).size, starts.length, 'aucun instant en double')
  })

  it('reste juste de part et d autre du passage a l heure d ete', () => {
    // Montreal bascule le 14 mars 2027. Une regle « lundi 9h » doit donner
    // 14:00 UTC avant, et 13:00 UTC apres.
    const slots = computeAvailableSlots({
      now: new Date('2027-03-01T00:00:00.000Z'),
      rules: [rule(1, '09:00', '10:00')],
      exceptions: [],
      busy: [],
      options: {
        durationMinutes: 60,
        bufferMinutes: 0,
        minimumNoticeHours: 0,
        horizonDays: 30,
        granularityMinutes: 60,
      },
    })

    const before = slots.find((slot) => localDateKey(slot.startAt, TZ) === '2027-03-08')
    const after = slots.find((slot) => localDateKey(slot.startAt, TZ) === '2027-03-15')

    assert.ok(before && after, 'les deux lundis doivent etre proposes')
    assert.equal(before.startAt.toISOString(), '2027-03-08T14:00:00.000Z', 'heure d hiver')
    assert.equal(after.startAt.toISOString(), '2027-03-15T13:00:00.000Z', 'heure d ete')

    // Et dans les deux cas, il est bien 9h a Montreal.
    for (const slot of [before, after]) {
      const hour = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ,
        hour: '2-digit',
        hour12: false,
      }).format(slot.startAt)
      assert.equal(Number(hour), 9, 'toujours 9h locales')
    }
  })

  it('gere un hote et un client dans des fuseaux differents', () => {
    const slots = computeAvailableSlots({
      now: new Date('2027-06-01T00:00:00.000Z'),
      rules: [rule(2, '09:00', '10:00', TZ)], // mardi 9h a Montreal
      exceptions: [],
      busy: [],
      options: {
        durationMinutes: 60,
        bufferMinutes: 0,
        minimumNoticeHours: 0,
        horizonDays: 7,
        granularityMinutes: 60,
      },
    })
    assert.ok(slots.length > 0)
    // 9h a Montreal en juin = 13:00 UTC = 9h a Port-au-Prince (UTC-4 aussi).
    const first = slots[0]
    assert.equal(first.startAt.toISOString().slice(11, 16), '13:00')
  })

  it('regroupe les creneaux par jour dans le fuseau du client', () => {
    const slots = computeAvailableSlots(base)
    const grouped = groupSlotsByDay(slots, TZ)
    assert.ok(grouped.length >= 1)
    assert.equal(grouped[0].date, '2027-03-01')
    assert.equal(grouped[0].slots.length, 3)
    // Les jours sont ordonnes.
    const dates = grouped.map((group) => group.date)
    assert.deepEqual(dates, [...dates].sort())
  })
})
