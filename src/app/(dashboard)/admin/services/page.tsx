import { Layers, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireStaff } from '@/lib/auth/dal'
import { formatMoney } from '@/lib/commerce/money'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Services' }

/** Catalogue des services, avec leur usage réel. */
const AdminServicesPage = async () => {
  await requireStaff()
  const payload = await getPayloadClient()

  const services = await payload.find({
    collection: 'services',
    sort: 'order',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // Usage réel : nombre de demandes de devis par service.
  const usage = await Promise.all(
    services.docs.map(async (service) => ({
      id: String(service.id),
      quotes: (
        await payload.count({
          collection: 'quoteRequests',
          where: { service: { equals: service.id } },
          overrideAccess: true,
        })
      ).totalDocs,
    })),
  )
  const quotesByService = new Map(usage.map((entry) => [entry.id, entry.quotes]))

  const priceLabel = (service: { pricing?: { kind?: string | null; amount?: number | null } | null }) => {
    const kind = service.pricing?.kind ?? 'quote'
    if (kind === 'quote' || !service.pricing?.amount) return 'Sur devis'
    const amount = formatMoney(service.pricing.amount, 'CAD')
    return kind === 'from' ? `Dès ${amount}` : amount
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Catalogue public. L’édition détaillée se fait dans le CMS.
          </p>
        </div>
        <Button asChild>
          <Link href="/cms/collections/services/create">
            <Plus className="mr-1.5 size-4" aria-hidden />
            Nouveau service
          </Link>
        </Button>
      </div>

      <section>
        <SectionHeading title={`${services.totalDocs} service${services.totalDocs > 1 ? 's' : ''}`} />

        {services.docs.length === 0 ? (
          <EmptyState icon={Layers} title="Aucun service" description="Le catalogue est vide." />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 font-medium">Catégorie</th>
                  <th className="px-4 py-2 font-medium">Tarif</th>
                  <th className="px-4 py-2 font-medium">État</th>
                  <th className="px-4 py-2 text-right font-medium">Demandes</th>
                  <th className="px-4 py-2 text-right font-medium">Ordre</th>
                </tr>
              </thead>
              <tbody>
                {services.docs.map((service) => (
                  <tr key={service.id} className="border-border border-t">
                    <td className="px-4 py-2">
                      <Link
                        href={`/cms/collections/services/${service.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {service.title}
                      </Link>
                      {service.featured && (
                        <span className="text-muted-foreground ml-2 text-xs">à la une</span>
                      )}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">{service.category ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-2">{priceLabel(service)}</td>
                    <td className="px-4 py-2">
                      {service.archived
                        ? 'Archivé'
                        : service._status === 'published'
                          ? 'Publié'
                          : 'Brouillon'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {quotesByService.get(String(service.id)) ?? 0}
                    </td>
                    <td className="text-muted-foreground px-4 py-2 text-right tabular-nums">
                      {service.order ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminServicesPage
