import type { Field } from 'payload'

import { staffWriteOnly } from '../access/ownership'

/**
 * Lignes de prix, partagées par les propositions et les factures.
 *
 * Les montants sont saisis et stockés en **centimes entiers** : aucun flottant
 * n'entre dans une somme d'argent.
 *
 * Les totaux ne sont pas des champs saisissables. Ils sont recalculés par
 * `computeTotals()` dans un hook `beforeChange`, à partir des seules lignes.
 * Un total transmis par le navigateur est donc systématiquement écrasé.
 */
export const lineItemsField: Field = {
  name: 'lines',
  type: 'array',
  label: 'Lignes',
  labels: { singular: 'Ligne', plural: 'Lignes' },
  minRows: 1,
  access: { create: staffWriteOnly, update: staffWriteOnly },
  admin: {
    description: 'Les montants sont exprimés en centimes. Les totaux sont calculés par le serveur.',
    initCollapsed: false,
  },
  fields: [
    {
      name: 'description',
      type: 'text',
      label: 'Désignation',
      required: true,
      maxLength: 300,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'quantity',
          type: 'number',
          label: 'Quantité',
          required: true,
          defaultValue: 1,
          min: 0,
        },
        {
          name: 'unitPrice',
          type: 'number',
          label: 'Prix unitaire (centimes)',
          required: true,
          defaultValue: 0,
          min: 0,
          admin: { description: 'Ex. 125000 pour 1 250,00 $.' },
        },
        {
          name: 'taxRate',
          type: 'number',
          label: 'Taxe (%)',
          defaultValue: 0,
          min: 0,
          max: 100,
        },
      ],
    },
  ],
}

/**
 * Champs de remise, d'acompte et de totaux calculés.
 * Tous les champs `computed*` sont en lecture seule : ils reflètent le dernier
 * calcul serveur et n'acceptent aucune écriture depuis une requête.
 */
export const totalsFields: Field[] = [
  {
    type: 'row',
    fields: [
      {
        name: 'discountKind',
        type: 'select',
        label: 'Remise',
        defaultValue: 'none',
        options: [
          { label: 'Aucune', value: 'none' },
          { label: 'Montant fixe', value: 'fixed' },
          { label: 'Pourcentage', value: 'percent' },
        ],
        access: { create: staffWriteOnly, update: staffWriteOnly },
      },
      {
        name: 'discountValue',
        type: 'number',
        label: 'Valeur de la remise',
        defaultValue: 0,
        min: 0,
        access: { create: staffWriteOnly, update: staffWriteOnly },
        admin: {
          condition: (data) => data?.discountKind && data.discountKind !== 'none',
          description: 'Centimes si montant fixe, pourcentage sinon.',
        },
      },
    ],
  },
  {
    name: 'currency',
    type: 'select',
    label: 'Devise',
    defaultValue: 'CAD',
    options: [
      { label: 'Dollar canadien (CAD)', value: 'CAD' },
      { label: 'Dollar américain (USD)', value: 'USD' },
      { label: 'Euro (EUR)', value: 'EUR' },
      { label: 'Gourde (HTG)', value: 'HTG' },
    ],
    access: { create: staffWriteOnly, update: staffWriteOnly },
    admin: { position: 'sidebar' },
  },
  {
    name: 'totals',
    type: 'group',
    label: 'Totaux calculés',
    admin: {
      description:
        'Recalculés par le serveur à chaque enregistrement, à partir des lignes. Non modifiables.',
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'subtotal',
            type: 'number',
            label: 'Sous-total',
            defaultValue: 0,
            admin: { readOnly: true },
          },
          {
            name: 'discountAmount',
            type: 'number',
            label: 'Remise',
            defaultValue: 0,
            admin: { readOnly: true },
          },
        ],
      },
      {
        type: 'row',
        fields: [
          {
            name: 'taxAmount',
            type: 'number',
            label: 'Taxes',
            defaultValue: 0,
            admin: { readOnly: true },
          },
          {
            name: 'total',
            type: 'number',
            label: 'Total',
            defaultValue: 0,
            admin: { readOnly: true },
          },
        ],
      },
      {
        name: 'balanceDue',
        type: 'number',
        label: 'Reste à payer',
        defaultValue: 0,
        admin: { readOnly: true },
      },
    ],
  },
]
