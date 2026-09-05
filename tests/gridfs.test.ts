import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import mongoose from 'mongoose'
import type { Payload } from 'payload'

import { env } from '@/lib/env'
import { gridfsInternals } from '@/payload/storage/gridfsAdapter'

/**
 * Tests d'integration de l'adaptateur GridFS, contre la base reelle.
 *
 * Tous les fichiers crees portent un prefixe unique et sont supprimes en fin de
 * suite : les 25 medias migres ne sont jamais touches.
 */

const PREFIX = `zz-test-${Date.now()}`
let connection: mongoose.Connection
/** Objet minimal expose par l'adaptateur : seul `db.connection` est lu. */
let payloadStub: Payload

const bucketOf = () => gridfsInternals.getBucket(payloadStub)

const write = (filename: string, content: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const stream = bucketOf().openUploadStream(filename, { contentType: 'image/webp' })
    stream.on('error', reject)
    stream.on('finish', () => resolve())
    stream.end(Buffer.from(content))
  })

const read = (filename: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const stream = bucketOf().openDownloadStreamByName(filename)
    stream.on('data', (chunk) => chunks.push(chunk as Buffer))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString()))
  })

const countFiles = async (filename: string): Promise<number> =>
  (await bucketOf().find({ filename }).toArray()).length

describe('adaptateur GridFS', () => {
  before(async () => {
    connection = await mongoose
      .createConnection(env.databaseURI, { serverSelectionTimeoutMS: 20000 })
      .asPromise()
    payloadStub = { db: { connection } } as unknown as Payload
  })

  after(async () => {
    const bucket = bucketOf()
    const stale = await bucket.find({ filename: { $regex: `^${PREFIX}` } }).toArray()
    await Promise.all(stale.map((file) => bucket.delete(file._id)))
    await connection.close()
  })

  it('ecrit puis relit un binaire a l identique', async () => {
    const filename = `${PREFIX}-aller-retour.webp`
    await write(filename, 'contenu-original')

    const file = await gridfsInternals.findFile(bucketOf(), filename)
    assert.ok(file, 'le fichier devrait exister')
    assert.equal(file?.contentType, 'image/webp')
    assert.equal(await read(filename), 'contenu-original')
  })

  it('ne conserve qu une revision apres des ecritures concurrentes de meme nom', async () => {
    // Reproduit le cas reel : `withoutEnlargement` fait que deux tailles cibles
    // produisent le meme nom de fichier, et Payload les televerse en parallele.
    const filename = `${PREFIX}-concurrent.webp`
    await Promise.all([
      write(filename, 'revision-a'),
      write(filename, 'revision-b'),
      write(filename, 'revision-c'),
    ])
    assert.equal(await countFiles(filename), 3, 'les trois ecritures devraient coexister avant elagage')

    const removed = await gridfsInternals.pruneOlderRevisions(bucketOf(), filename)
    assert.equal(removed, 2, 'deux revisions obsoletes devraient etre supprimees')
    assert.equal(await countFiles(filename), 1, 'une seule revision doit subsister')
  })

  it('remplace un binaire sans laisser d orphelin', async () => {
    const filename = `${PREFIX}-remplacement.webp`
    await write(filename, 'version-1')
    await write(filename, 'version-2')
    await gridfsInternals.pruneOlderRevisions(bucketOf(), filename)

    assert.equal(await countFiles(filename), 1)
    assert.equal(await read(filename), 'version-2', 'la revision la plus recente doit etre servie')
  })

  it('supprime le fichier et ses chunks', async () => {
    const filename = `${PREFIX}-suppression.webp`
    await write(filename, 'a-supprimer')

    const before = await bucketOf().find({ filename }).toArray()
    const fileId = before[0]._id
    const chunksBefore = await connection.db!.collection('media.chunks').countDocuments({
      files_id: fileId,
    })
    assert.ok(chunksBefore > 0, 'des chunks devraient exister')

    const deleted = await gridfsInternals.deleteByFilename(bucketOf(), filename)
    assert.equal(deleted, 1)
    assert.equal(await countFiles(filename), 0)

    const chunksAfter = await connection.db!.collection('media.chunks').countDocuments({
      files_id: fileId,
    })
    assert.equal(chunksAfter, 0, 'aucun chunk orphelin ne doit subsister')
  })

  it('tolere la suppression concurrente du meme fichier', async () => {
    // Payload appelle `handleDelete` une fois par declinaison ; deux
    // declinaisons partageant un nom declenchent deux suppressions simultanees.
    const filename = `${PREFIX}-double-suppression.webp`
    await write(filename, 'contenu')

    const results = await Promise.all([
      gridfsInternals.deleteByFilename(bucketOf(), filename),
      gridfsInternals.deleteByFilename(bucketOf(), filename),
    ])

    assert.equal(results.reduce((a, b) => a + b, 0), 1, 'un seul fichier reellement supprime')
    assert.equal(await countFiles(filename), 0)
  })

  it('ne trouve rien pour un nom inexistant', async () => {
    const file = await gridfsInternals.findFile(bucketOf(), `${PREFIX}-inexistant.webp`)
    assert.equal(file, null)
    assert.equal(await gridfsInternals.deleteByFilename(bucketOf(), `${PREFIX}-inexistant.webp`), 0)
  })

  it('laisse intacts les medias migres', async () => {
    const migrated = await bucketOf().find({ filename: 'hero-executive.webp' }).toArray()
    assert.equal(migrated.length, 1, 'le media migre doit etre present et unique')
  })
})
