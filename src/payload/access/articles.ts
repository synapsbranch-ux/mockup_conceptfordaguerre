import type { Access, Where } from 'payload'

import { isCMSUser } from './index'

/**
 * Lecture des articles, tenant compte de la visibilité.
 *
 * La règle renvoie une clause `Where` que Payload applique **à la requête
 * MongoDB**. C'est le point essentiel : un article réservé n'est pas seulement
 * masqué dans les listes, il devient introuvable — y compris par lecture
 * directe sur son identifiant, par l'API REST, par GraphQL, par le plan du
 * site et par la génération statique. Aucune fuite n'est possible via une
 * surface publique oubliée.
 *
 * Matrice appliquée :
 *
 *  - Personnel : tout, brouillons compris.
 *  - Anonyme : articles publiés **et** de visibilité `public`.
 *  - Connecté : ci-dessus, plus les articles `authenticated`, plus les articles
 *    `private` dont il figure explicitement parmi les clients autorisés.
 */

/** Clause restreignant aux articles réellement publics. */
export const PUBLIC_ARTICLE_WHERE: Where = {
  and: [{ _status: { equals: 'published' } }, { visibility: { equals: 'public' } }],
}

export const articleReadAccess: Access = ({ req: { user } }) => {
  if (isCMSUser(user)) return true

  if (!user) return PUBLIC_ARTICLE_WHERE

  return {
    and: [
      { _status: { equals: 'published' } },
      {
        or: [
          { visibility: { equals: 'public' } },
          { visibility: { equals: 'authenticated' } },
          {
            and: [
              { visibility: { equals: 'private' } },
              { authorizedCustomers: { contains: user.id } },
            ],
          },
        ],
      },
    ],
  }
}
