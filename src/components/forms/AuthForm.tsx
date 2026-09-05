'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { authClient } from '@/lib/auth/client'
import { safeRedirect } from '@/lib/auth/redirect'

/**
 * Formulaire de connexion et d'inscription.
 *
 * Aucune décision d'autorisation n'est prise ici : le composant ne fait
 * qu'appeler Better Auth. Le rôle n'est jamais transmis — il est fixé côté
 * serveur — et la destination de retour repasse par `safeRedirect` avant
 * d'être suivie, y compris après un aller-retour OAuth.
 */

type Mode = 'login' | 'register'

export const AuthForm = ({
  initialMode = 'login',
  googleEnabled,
}: {
  initialMode?: Mode
  googleEnabled: boolean
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // La valeur brute vient de l'URL : elle est assainie avant tout usage.
  const next = safeRedirect(searchParams.get('next'))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setPending(true)

    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '')
      .trim()
      .toLowerCase()
    const password = String(data.get('password') ?? '')
    const name = String(data.get('name') ?? '').trim()

    try {
      const result =
        mode === 'register'
          ? await authClient.signUp.email({ email, password, name, callbackURL: next })
          : await authClient.signIn.email({ email, password, callbackURL: next })

      if (result.error) {
        setError(
          mode === 'register'
            ? 'Inscription impossible. Vérifier l’adresse et la longueur du mot de passe (12 caractères minimum).'
            : 'Adresse ou mot de passe incorrect.',
        )
        setPending(false)
        return
      }

      router.push(next)
      router.refresh()
    } catch {
      setError('Le service est momentanément indisponible. Réessayer dans un instant.')
      setPending(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setPending(true)
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: next })
    } catch {
      setError('La connexion Google a échoué. Réessayer dans un instant.')
      setPending(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => {
            setMode('login')
            setError(null)
          }}
          aria-pressed={mode === 'login'}
        >
          Connexion
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => {
            setMode('register')
            setError(null)
          }}
          aria-pressed={mode === 'register'}
        >
          Créer un compte
        </button>
      </div>

      {googleEnabled && (
        <>
          <button
            type="button"
            className="button button-light"
            style={{ width: '100%', border: '1px solid var(--line)' }}
            onClick={handleGoogle}
            disabled={pending}
          >
            Continuer avec Google
          </button>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 12,
              margin: '24px 0',
            }}
          >
            ou
          </p>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {mode === 'register' && (
          <label>
            Nom complet
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
        )}

        <label>
          Adresse courriel
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>

        <label>
          Mot de passe
          <input
            name="password"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
            minLength={12}
          />
        </label>

        {mode === 'register' && (
          <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 24 }}>
            12 caractères minimum. Votre compte donne accès à l’espace client.
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: '#a3231b', fontSize: 13, marginBottom: 20 }}>
            {error}
          </p>
        )}

        <button className="button button-dark" type="submit" disabled={pending}>
          {pending ? 'Un instant…' : mode === 'login' ? 'Se connecter ↗' : 'Créer mon compte ↗'}
        </button>
      </form>

      <p style={{ marginTop: 28, fontSize: 12, color: 'var(--muted)' }}>
        En continuant, vous acceptez la{' '}
        <Link href="/politique-de-confidentialite" style={{ textDecoration: 'underline' }}>
          politique de confidentialité
        </Link>
        .
      </p>
    </div>
  )
}
