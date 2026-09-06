import type { Metadata } from 'next'

import { ProfileForm } from '@/components/dashboard/ProfileForm'
import type { ProfileValues } from '@/components/dashboard/ProfileForm'
import { SectionHeading } from '@/components/dashboard/states'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Mon profil' }

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Profil du client.
 *
 * Le document est relu en base plutôt que pris depuis la session : la session
 * ne porte que l'identité, pas les champs de profil, et elle peut être plus
 * ancienne qu'une modification récente.
 */
const ProfilPage = async () => {
  const user = await requireUser('/espace-client/profil')
  const payload = await getPayloadClient()

  const doc = await payload.findByID({
    collection: 'users',
    id: user.id,
    depth: 0,
    overrideAccess: true,
  })

  const preferences = (doc.notificationPreferences ?? {}) as Record<string, boolean | null>

  const initial: ProfileValues = {
    firstName: text(doc.firstName),
    lastName: text(doc.lastName),
    phone: text(doc.phone),
    company: text(doc.company),
    jobTitle: text(doc.jobTitle),
    country: text(doc.country),
    industry: text(doc.industry),
    website: text(doc.website),
    preferredLocale: doc.preferredLocale === 'en' ? 'en' : 'fr',
    timezone: text(doc.timezone) || 'America/Toronto',
    notificationPreferences: {
      // Par défaut à vrai : ne pas prévenir quelqu'un qui n'a jamais rien
      // choisi serait plus surprenant que l'inverse.
      messages: preferences.messages !== false,
      proposals: preferences.proposals !== false,
      invoices: preferences.invoices !== false,
      appointments: preferences.appointments !== false,
      community: preferences.community !== false,
    },
    newsletterOptIn: doc.newsletterOptIn === true,
  }

  return (
    <div className="max-w-3xl space-y-8">
      <SectionHeading
        title="Mon profil"
        description="Ces informations servent à préparer vos devis, vos factures et vos rendez-vous."
      />
      <ProfileForm initial={initial} email={user.email} />
    </div>
  )
}

export default ProfilPage
