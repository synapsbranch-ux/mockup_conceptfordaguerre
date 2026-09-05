import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { NewTopicForm } from '@/components/forum/NewTopicForm'
import { SiteShell } from '@/components/site/SiteShell'
import { getSessionUser } from '@/lib/auth/dal'
import { getForumCategories } from '@/lib/forum'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Ouvrir une discussion',
  robots: { index: false, follow: false },
}

/**
 * Ouverture d'une discussion.
 *
 * La session est exigée côté serveur, avant tout rendu : on ne se contente pas
 * de masquer le formulaire. La route d'API refait la même vérification, si bien
 * qu'un appel direct sans session échoue également.
 */
const NewTopicPage = async () => {
  const user = await getSessionUser()
  if (!user) redirect('/connexion?next=/forum/nouvelle-discussion')

  const payload = await getPayloadClient()
  const community = await payload
    .findGlobal({ slug: 'communitySettings', depth: 0 })
    .catch(() => null)
  if (community?.forumEnabled === false) notFound()

  const categories = await getForumCategories()

  // Sans catégorie, il n'y a nulle part où publier : on le dit franchement
  // plutôt que d'afficher un formulaire qui échouera.
  const canPublish = !user.suspended && !user.forumBanned

  return (
    <SiteShell>
      <section className="shell forum-page forum-new">
        <header className="forum-header">
          <p className="eyebrow">Communauté</p>
          <h1>Ouvrir une discussion</h1>
          {community?.forumRules && <p className="forum-intro">{community.forumRules}</p>}
        </header>

        {!canPublish ? (
          <p className="forum-cta" role="status">
            Votre compte ne permet pas de publier pour le moment.
          </p>
        ) : categories.length === 0 ? (
          <p className="forum-cta" role="status">
            Aucune catégorie n’est ouverte à la publication pour le moment.
          </p>
        ) : (
          <NewTopicForm
            categories={categories.map((category) => ({
              id: String(category.id),
              title: category.title,
            }))}
          />
        )}
      </section>
    </SiteShell>
  )
}

export default NewTopicPage
