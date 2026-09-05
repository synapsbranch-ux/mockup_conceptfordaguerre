/* Fichier requis par Payload. Modifier avec précaution. */
import config from '@payload-config'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

export const GET = REST_GET(config)
// `HEAD` n'est pas fourni par Payload. Sans lui, toute requete HEAD sur l'API —
// y compris sur un binaire media — repond 404, ce qui gene les CDN et les
// verificateurs de liens. Next execute le gestionnaire et supprime le corps.
export const HEAD = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
