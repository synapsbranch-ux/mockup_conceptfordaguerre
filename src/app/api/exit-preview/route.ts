import { draftMode } from 'next/headers'
import { NextResponse } from 'next/server'

/** Ferme la session de previsualisation et revient au contenu publie. */
export const GET = async (): Promise<NextResponse> => {
  const draft = await draftMode()
  draft.disable()
  return NextResponse.json({ status: 'preview-disabled' })
}
