import { Layers } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/dal'
import { formatMoney } from '@/lib/commerce/money'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Services' }

/**
 * Catalogue des services et prestations en cours du client.
 *
 * Le prix affiché est explicitement indicatif : le montant ferme n'existe que
 * sur une proposition.
 */
const ServicesPage = async () => {
  const user = await requireUser()
  const payload = await getPayloadClient()

  const [services, engaged] = await Promise.all([
    payload.find({
      collection: 'services',
      where: {
        and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }],
      },
      sort: 'order',
      limit: 50,
      depth: 1,
      overrideAccess: true,
    }),
    // Prestations réellement engagées : les projets du client.
    payload.find({
      collection: 'clientProjects',
      where: { customer: { equals: user.id } },
      sort: '-createdAt',
      limit: 50,
      depth: 1,
      overrideAccess: false,
      user: { ...user, collection: 'users' },
    }),
  ])

  const priceLabel = (service: { pricing?: { kind?: string | null; amount?: number | null } | null }) => {
    const kind = service.pricing?.kind ?? 'quote'
    if (kind === 'quote' || !service.pricing?.amount) return 'Sur devis'
    const amount = formatMoney(service.pricing.amount, 'CAD')
    return kind === 'from' ? `À partir de ${amount}` : amount
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Le catalogue, et les prestations que vous avez engagées.
        </p>
      </div>

      {engaged.docs.length > 0 && (
        <section>
          <SectionHeading title="Vos prestations en cours" />
          <ul className="space-y-2">
            {engaged.docs.map((project) => {
              const service =
                typeof project.service === 'object' && project.service
                  ? (project.service as { title?: string }).title
                  : null
              return (
                <li
                  key={project.id}
                  className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{project.title}</p>
                    {service && <p className="text-muted-foreground text-xs">{service}</p>}
                  </div>
                  <span className="text-sm tabular-nums">{project.progress ?? 0} %</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <SectionHeading title="Catalogue" />

        {services.docs.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Aucun service"
            description="Le catalogue est momentanément vide."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {services.docs.map((service) => {
              const deliverables = Array.isArray(service.deliverables) ? service.deliverables : []
              return (
                <li key={service.id} className="border-border bg-card rounded-lg border p-5">
                  <h3 className="font-medium">{service.title}</h3>
                  {service.category && (
                    <p className="text-muted-foreground mt-0.5 text-xs">{service.category}</p>
                  )}
                  {service.summary && (
                    <p className="text-muted-foreground mt-2 text-sm">{service.summary}</p>
                  )}

                  {deliverables.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm">
                      {deliverables.slice(0, 4).map((item, index) => (
                        <li key={index} className="text-muted-foreground">
                          — {item.label}
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-3 text-sm font-medium">{priceLabel(service)}</p>

                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link href={`/espace-client/devis/nouveau?service=${service.id}`}>
                      Demander un devis
                    </Link>
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default ServicesPage
