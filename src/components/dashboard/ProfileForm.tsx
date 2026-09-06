'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type ProfileValues = {
  firstName: string
  lastName: string
  phone: string
  company: string
  jobTitle: string
  country: string
  industry: string
  website: string
  preferredLocale: 'fr' | 'en'
  timezone: string
  notificationPreferences: {
    messages: boolean
    proposals: boolean
    invoices: boolean
    appointments: boolean
    community: boolean
  }
  newsletterOptIn: boolean
}

const NOTIFICATION_LABELS: { key: keyof ProfileValues['notificationPreferences']; label: string }[] =
  [
    { key: 'messages', label: 'Nouveaux messages' },
    { key: 'proposals', label: 'Propositions et devis' },
    { key: 'invoices', label: 'Factures et rappels' },
    { key: 'appointments', label: 'Rendez-vous' },
    { key: 'community', label: 'Réponses aux commentaires et au forum' },
  ]

/**
 * Formulaire de profil.
 *
 * N'envoie que les champs que la personne a le droit de modifier. Le rôle, la
 * suspension et le blocage communautaire n'y figurent pas : ils sont refusés
 * par le schéma de la route **et** protégés au niveau de la collection, donc
 * les ajouter ici resterait sans effet.
 */
export const ProfileForm = ({
  initial,
  email,
}: {
  initial: ProfileValues
  email: string
}) => {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    setSaved(false)

    try {
      const response = await fetch('/api/profil', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      const payload = (await response.json()) as { ok: boolean; message?: string }

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? 'Vos modifications n’ont pas pu être enregistrées.')
        setPending(false)
        return
      }

      setSaved(true)
      setPending(false)
      router.refresh()
    } catch {
      setError('Le service est momentanément indisponible.')
      setPending(false)
    }
  }

  const field = (
    key: keyof ProfileValues,
    label: string,
    type = 'text',
    placeholder?: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={String(values[key] ?? '')}
        placeholder={placeholder}
        onChange={(event) => set(key, event.target.value as never)}
        disabled={pending}
      />
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identité</CardTitle>
          <CardDescription>
            L’adresse de connexion ({email}) ne se modifie pas depuis cet écran.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field('firstName', 'Prénom')}
          {field('lastName', 'Nom')}
          {field('phone', 'Téléphone', 'tel')}
          {field('country', 'Pays')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organisation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field('company', 'Entreprise')}
          {field('jobTitle', 'Fonction')}
          {field('industry', 'Secteur d’activité')}
          {field('website', 'Site web', 'url', 'https://exemple.com')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Préférences</CardTitle>
          <CardDescription>
            Le fuseau horaire détermine l’affichage de vos rendez-vous.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferredLocale">Langue préférée</Label>
              <select
                id="preferredLocale"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={values.preferredLocale}
                onChange={(event) => set('preferredLocale', event.target.value as 'fr' | 'en')}
                disabled={pending}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            {field('timezone', 'Fuseau horaire', 'text', 'America/Port-au-Prince')}
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Notifications par courriel</legend>
            {NOTIFICATION_LABELS.map((item) => (
              <label key={item.key} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={values.notificationPreferences[item.key]}
                  onChange={(event) =>
                    set('notificationPreferences', {
                      ...values.notificationPreferences,
                      [item.key]: event.target.checked,
                    })
                  }
                  disabled={pending}
                />
                {item.label}
              </label>
            ))}
          </fieldset>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={values.newsletterOptIn}
              onChange={(event) => set('newsletterOptIn', event.target.checked)}
              disabled={pending}
            />
            Recevoir l’infolettre
          </label>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          Vos modifications sont enregistrées.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  )
}
