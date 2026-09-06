import { Plus, Send } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import { isEmailConfigured } from '@/lib/email/send'

export const metadata: Metadata = { title: 'Campagnes' }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  scheduled: 'Programmée',
  sent: 'Envoyée',
  failed: 'Échec',
}

const stamp = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

/** Campagnes d'infolettre. */
const CampaignsPage = async () => {
  await requireStaff()
  const payload = await getPayloadClient()

  const campaigns = await payload.find({
    collection: 'newsletterCampaigns',
    sort: '-createdAt',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  const emailReady = isEmailConfigured()

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campagnes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Une campagne envoyée est définitive et ne peut pas être renvoyée.
          </p>
        </div>
        <Button asChild>
          <Link href="/cms/collections/newsletterCampaigns/create">
            <Plus className="mr-1.5 size-4" aria-hidden />
            Nouvelle campagne
          </Link>
        </Button>
      </div>

      {/* L'etat reel de la configuration d'envoi est affiche, sans detour. */}
      {!emailReady && (
        <div className="border-border bg-muted/40 rounded-lg border p-4 text-sm">
          <p className="font-medium">L’envoi de courriels n’est pas configuré.</p>
          <p className="text-muted-foreground mt-1">
            Renseigner <code className="font-mono text-xs">RESEND_API_KEY</code> et{' '}
            <code className="font-mono text-xs">RESEND_FROM_EMAIL</code> pour pouvoir expédier une
            campagne. Les campagnes peuvent être rédigées en attendant.
          </p>
        </div>
      )}

      <section>
        <SectionHeading title={`${campaigns.totalDocs} campagne${campaigns.totalDocs > 1 ? 's' : ''}`} />

        {campaigns.docs.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Aucune campagne"
            description="Aucune campagne n’a encore été rédigée."
            actionLabel="Nouvelle campagne"
            actionHref="/cms/collections/newsletterCampaigns/create"
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Objet</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 text-right font-medium">Destinataires</th>
                  <th className="px-4 py-2 text-right font-medium">Échecs</th>
                  <th className="px-4 py-2 font-medium">Envoyée</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.docs.map((campaign) => (
                  <tr key={campaign.id} className="border-border border-t">
                    <td className="px-4 py-2">
                      <Link
                        href={`/cms/collections/newsletterCampaigns/${campaign.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {campaign.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      {STATUS_LABELS[campaign.status as string] ?? campaign.status}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {campaign.recipientCount ?? 0}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {campaign.deliveryReport?.failed ?? 0}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">{stamp(campaign.sentAt)}</td>
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

export default CampaignsPage
