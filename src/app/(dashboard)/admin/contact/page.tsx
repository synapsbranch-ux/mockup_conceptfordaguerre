import { Inbox } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireStaff } from '@/lib/auth/dal'
import { UserText } from '@/lib/content/userText'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Messages de contact' }

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  read: 'Lu',
  replied: 'Répondu',
  archived: 'Archivé',
}

const stamp = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

/** Soumissions du formulaire de contact public. */
const ContactPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) => {
  await requireStaff()
  const params = await searchParams
  const payload = await getPayloadClient()

  const status = (params.statut ?? '').trim()
  const filters: Where[] = []
  if (status && status in STATUS_LABELS) filters.push({ status: { equals: status } })

  const [submissions, fresh] = await Promise.all([
    payload.find({
      collection: 'contactSubmissions',
      where: filters.length > 0 ? { and: filters } : undefined,
      sort: '-submittedAt',
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'contactSubmissions',
      where: { status: { equals: 'new' } },
      overrideAccess: true,
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages de contact</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {fresh.totalDocs} message{fresh.totalDocs > 1 ? 's' : ''} non traité
          {fresh.totalDocs > 1 ? 's' : ''}.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="statut" className="mb-1 block text-sm font-medium">
            Statut
          </label>
          <select
            id="statut"
            name="statut"
            defaultValue={status}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Filtrer
        </button>
      </form>

      <section>
        <SectionHeading title={`${submissions.totalDocs} message${submissions.totalDocs > 1 ? 's' : ''}`} />

        {submissions.docs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aucun message"
            description="Aucun message ne correspond à ces critères."
          />
        ) : (
          <ul className="space-y-3">
            {submissions.docs.map((submission) => (
              <li key={submission.id} className="border-border bg-card rounded-lg border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {submission.name}
                    {submission.organisation && (
                      <span className="text-muted-foreground ml-2 text-sm">
                        {submission.organisation}
                      </span>
                    )}
                  </p>
                  <span className="text-muted-foreground text-xs">
                    {STATUS_LABELS[submission.status as string] ?? submission.status} ·{' '}
                    {stamp(submission.submittedAt)}
                  </span>
                </div>

                <p className="text-muted-foreground mt-0.5 text-sm">
                  <a
                    href={`mailto:${submission.email}`}
                    className="underline underline-offset-2"
                  >
                    {submission.email}
                  </a>
                  {submission.subject ? ` · ${submission.subject}` : ''}
                </p>

                {/* Contenu saisi par un visiteur : rendu en noeuds React. */}
                <UserText
                  text={String(submission.message ?? '')}
                  className="mt-3 text-sm"
                />

                <Link
                  href={`/cms/collections/contactSubmissions/${submission.id}`}
                  className="text-muted-foreground mt-3 inline-block text-xs underline underline-offset-2"
                >
                  Gérer dans le CMS
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default ContactPage
