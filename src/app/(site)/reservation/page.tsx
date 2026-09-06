import type { Metadata } from 'next'
import Link from 'next/link'

import { SiteShell } from '@/components/site/SiteShell'
import { getSessionUser } from '@/lib/auth/dal'
import { getAvailableSlots, listMeetingTypes } from '@/lib/booking/availability'
import { groupSlotsByDay } from '@/lib/booking/slots'
import { env } from '@/lib/env'
import { getClientSpaceSettings } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Réserver une rencontre',
  description:
    'Consultez les disponibilités et réservez un échange. La réservation se fait depuis l’espace client.',
  alternates: { canonical: `${env.serverURL}/reservation` },
  openGraph: {
    title: 'Réserver une rencontre',
    description: 'Consultez les disponibilités et réservez un échange.',
    url: `${env.serverURL}/reservation`,
    type: 'website',
  },
}

/**
 * Réservation, côté public.
 *
 * Les disponibilités réelles sont affichées à tous — ce n'est pas une donnée
 * confidentielle, et les voir avant de créer un compte évite une inscription
 * inutile si aucun créneau ne convient.
 *
 * La réservation elle-même exige un compte : elle crée un rendez-vous rattaché
 * à une personne, avec des rappels et un droit d'annulation. Sans identité
 * vérifiée, n'importe qui pourrait bloquer un créneau ou annuler celui d'un
 * autre.
 */
const PublicBookingPage = async () => {
  const [sessionUser, meetingTypes, settings] = await Promise.all([
    getSessionUser(),
    listMeetingTypes(),
    getClientSpaceSettings(),
  ])

  const open = settings.bookingEnabled !== false && meetingTypes.length > 0

  // Aperçu des prochaines disponibilités du premier format proposé.
  const preview = open
    ? groupSlotsByDay(await getAvailableSlots(meetingTypes[0]), 'America/Toronto').slice(0, 4)
    : []

  const formatDay = (iso: string): string => {
    const [year, month, day] = iso.split('-').map(Number)
    return new Intl.DateTimeFormat('fr-CA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(Date.UTC(year, month - 1, day, 12)))
  }

  const formatTime = (date: Date): string =>
    new Intl.DateTimeFormat('fr-CA', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Toronto',
    }).format(date)

  return (
    <SiteShell>
      <main id="contenu" className="section-pad">
        <div className="shell">
          <header style={{ maxWidth: '46rem' }}>
            <p className="eyebrow">Rendez-vous</p>
            <h1 className="display-2">
              {settings.bookingTitle ?? (
                <>
                  Réserver <em>une rencontre</em>
                </>
              )}
            </h1>
            <p className="lede">
              {settings.bookingIntro ??
                'Choisissez un format de rencontre, puis un créneau qui vous convient.'}
            </p>
          </header>

          {!open ? (
            <p className="muted" style={{ marginTop: '3rem' }}>
              La prise de rendez-vous est momentanément indisponible.{' '}
              <Link href="/contact">Écrivez-nous</Link> et nous conviendrons d’un moment.
            </p>
          ) : (
            <>
              <section style={{ marginTop: '3.5rem' }}>
                <h2 className="display-4">Formats proposés</h2>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    marginTop: '1.5rem',
                    display: 'grid',
                    gap: '1rem',
                  }}
                >
                  {meetingTypes.map((type) => (
                    <li
                      key={type.id}
                      style={{
                        border: '1px solid var(--line)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        background: 'var(--white)',
                      }}
                    >
                      <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{type.title}</h3>
                      {type.description && (
                        <p className="muted" style={{ marginTop: '.5rem', marginBottom: 0 }}>
                          {type.description}
                        </p>
                      )}
                      <p
                        className="muted"
                        style={{ marginTop: '.6rem', marginBottom: 0, fontSize: '.82rem' }}
                      >
                        {type.durationMinutes} minutes
                        {type.locationKind === 'video' ? ' · visioconférence' : ''}
                        {type.requiresConfirmation ? ' · confirmation manuelle' : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {preview.length > 0 && (
                <section style={{ marginTop: '3rem' }}>
                  <h2 className="display-4">Prochaines disponibilités</h2>
                  <p className="muted" style={{ marginTop: '.5rem' }}>
                    Horaires indiqués à l’heure de Montréal. Les créneaux seront affichés dans votre
                    propre fuseau lors de la réservation.
                  </p>

                  <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1.25rem' }}>
                    {preview.map((day) => (
                      <div key={day.date}>
                        <h3
                          style={{
                            fontSize: '.95rem',
                            margin: 0,
                            textTransform: 'capitalize',
                          }}
                        >
                          {formatDay(day.date)}
                        </h3>
                        <p className="muted" style={{ marginTop: '.4rem', marginBottom: 0 }}>
                          {day.slots.slice(0, 8).map((slot) => formatTime(slot.startAt)).join(' · ')}
                          {day.slots.length > 8 ? ' …' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div style={{ marginTop: '3rem' }}>
                {sessionUser ? (
                  <Link className="btn btn-primary" href="/espace-client/rendez-vous/reserver">
                    Choisir un créneau
                  </Link>
                ) : (
                  <>
                    <Link
                      className="btn btn-primary"
                      href="/connexion?next=%2Fespace-client%2Frendez-vous%2Freserver"
                    >
                      Se connecter pour réserver
                    </Link>
                    <p className="muted" style={{ marginTop: '1rem' }}>
                      Un compte est nécessaire pour réserver : il permet de recevoir les rappels et
                      de reporter ou annuler la rencontre.{' '}
                      <Link href="/inscription">Créer un compte</Link>.
                    </p>
                  </>
                )}
              </div>

              {settings.bookingPolicy && (
                <section
                  style={{ marginTop: '3rem', borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}
                >
                  <h2 style={{ fontSize: '1rem' }}>Conditions d’annulation</h2>
                  <p className="muted" style={{ whiteSpace: 'pre-line' }}>
                    {settings.bookingPolicy}
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </SiteShell>
  )
}

export default PublicBookingPage
