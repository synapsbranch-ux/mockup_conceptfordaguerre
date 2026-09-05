'use client'

import { useState } from 'react'

import type { AuthPrototypeBlock } from '@/payload-types'

/**
 * Maquette d'espace utilisateur.
 * Aucune authentification n'est branchée : le formulaire ne soumet rien, comme
 * dans le prototype. Seuls les textes sont administrables.
 */
export const SpaceAuthForm = ({ block }: { block: AuthPrototypeBlock }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const fields = block.fields

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          {block.tabs?.login}
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          {block.tabs?.register}
        </button>
      </div>

      <form onSubmit={(event) => event.preventDefault()}>
        {mode === 'register' && (
          <label>
            {fields?.name}
            <input placeholder={fields?.namePlaceholder ?? undefined} />
          </label>
        )}
        <label>
          {fields?.email}
          <input type="email" placeholder={fields?.emailPlaceholder ?? undefined} />
        </label>
        <label>
          {fields?.password}
          <input type="password" placeholder={fields?.passwordPlaceholder ?? undefined} />
        </label>
        {mode === 'register' && (
          <label className="checkbox">
            <input type="checkbox" />
            <span>{fields?.consent}</span>
          </label>
        )}
        <button className="button button-dark" type="submit">
          {mode === 'login' ? block.buttons?.login : block.buttons?.register} ↗
        </button>
      </form>

      {block.caption && <p className="prototype-caption">{block.caption}</p>}
    </div>
  )
}
