import type { Metadata } from 'next'
import Link from 'next/link'

import { QuoteRequestForm } from '@/components/commerce/QuoteRequestForm'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Demander un devis' }

/** Création d'une demande de devis. */
const NewQuotePage = async () => {
  await requireUser()
  const payload = await getPayloadClient()

  // Seuls les services publiés sont proposés.
  const services = await payload.find({
    collection: 'services',
    where: { _status: { equals: 'published' } },
    sort: 'order',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Demander un devis</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          <Link href="/espace-client/devis" className="underline underline-offset-2">
            Retour à mes demandes
          </Link>
        </p>
      </div>

      <QuoteRequestForm
        services={services.docs.map((service) => ({
          id: String(service.id),
          title: service.title,
        }))}
      />
    </div>
  )
}

export default NewQuotePage
