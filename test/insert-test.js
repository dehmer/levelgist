const assert = require('assert')
const { PassThrough } = require('stream')
const { createContext } = require('./context')
const shapefile = require('./shapefile')
const { Entry } = require('../lib/gist/node')
const Insert = require('../lib/gist/insert')
const Search = require('../lib/gist/search')

const mbr = entries => entries.reduce((acc, entry) => {
  if (entry.mbr[0][0] < acc[0][0]) acc[0][0] = entry.mbr[0][0]
  if (entry.mbr[0][1] < acc[0][1]) acc[0][1] = entry.mbr[0][1]
  if (entry.mbr[1][0] > acc[1][0]) acc[1][0] = entry.mbr[1][0]
  if (entry.mbr[1][1] > acc[1][1]) acc[1][1] = entry.mbr[1][1]
  return acc
}, [[Infinity, Infinity], [-Infinity, -Infinity]])

const loadEntries = n => shapefile.entries('tl_2020_us_county', n)

describe('Insert', function () {
  const M = 5 // capacity

  it('insert single index entry - root (leaf)', async function () {
    const context = await createContext()
    const insert = Insert.bind(context)
    const entries = await loadEntries(1)
    for(const entry of entries) await insert(Entry.encode(entry))

    const R = await context.getRoot()
    assert.strictEqual(R.length(), 1)
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('fill node to capacity - root (leaf)', async function () {
    const context = await createContext()
    const insert = Insert.bind(context)
    const entries = await loadEntries(M)
    for(const entry of entries) await insert(Entry.encode(entry))

    const R = await context.getRoot()
    assert.strictEqual(R.length(), M)
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('split leaf (root)', async function () {
    const context = await createContext()
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 1)
    for(const entry of entries) await insert(Entry.encode(entry))
    const key = await context.root()
    const R = await context.getNode(key)
    assert.strictEqual(R.length(), 2)
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('find leaf to insert entry', async function () {
    const context = await createContext()
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 2)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 2)

    // NOTE: Inserting entry M + 2 does not change parent/root MBR,
    //       thus no check is performed.
  })

  it('split leaf (non-root)', async function () {
    const context = await createContext()
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 4)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 3)
  })

  it('delegate split (non-leaf)', async function () {
    const context = await createContext()
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 11)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 2)
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('delegate MBR update after split', async function () {
    const context = await createContext()
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 71)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()

    // NOTE: M + 71 is the first entry which changes root MBR.
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('search single index entry', async function () {
    const context = await createContext()
    const insert = Insert.bind(context)
    const search = Search.bind(context)
    const entries = await loadEntries(50)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()

    const result = S => new Promise(async (resolve, reject) => {
      const acc = []
      const writable = new PassThrough({ objectMode: true })
      await search(R, S, writable)
      writable.end()

      writable
        .on('data', data => acc.push(Entry.decodeId(data)))
        .on('end', () => resolve(acc))
    })

    const S = entries[20].mbr
    const hits = await result(S)
    assert.strictEqual(hits.length, 1)
    assert.strictEqual(hits[0], entries[20].id)
  })
})
