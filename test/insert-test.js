const assert = require('assert')
const { createContext } = require('./context')
const { loadEntries } = require('./shapefile')

const mbr = entries => entries.reduce((acc, entry) => {
  if (entry.mbr[0][0] < acc[0][0]) acc[0][0] = entry.mbr[0][0]
  if (entry.mbr[0][1] < acc[0][1]) acc[0][1] = entry.mbr[0][1]
  if (entry.mbr[1][0] > acc[1][0]) acc[1][0] = entry.mbr[1][0]
  if (entry.mbr[1][1] > acc[1][1]) acc[1][1] = entry.mbr[1][1]
  return acc
}, [[Infinity, Infinity], [-Infinity, -Infinity]])

describe('Insert', function () {
  const M = 5 // capacity

  const load = async entries => {
    const context = await createContext()
    // for (const entry of entries) await context.insert(entry)
    await context.bulk(entries)
    return context
  }

  it('insert single index entry - root (leaf)', async function () {
    const entries = await loadEntries(1)
    const context = await load(entries)
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 1)
    assert.deepStrictEqual(R.mbr().decode(), mbr(entries))
  })

  it('fill node to capacity - root (leaf)', async function () {
    const entries = await loadEntries(M)
    const context = await load(entries)
    const R = await context.getRoot()
    assert.strictEqual(R.length(), M)
    assert.deepStrictEqual(R.mbr().decode(), mbr(entries))
  })

  it('split leaf (root)', async function () {
    const entries = await loadEntries(M + 1)
    const context = await load(entries)
    const key = await context.root()
    const R = await context.getNode(key)
    assert.strictEqual(R.length(), 2)
    assert.deepStrictEqual(R.mbr().decode(), mbr(entries))
  })

  it('find leaf to insert entry', async function () {
    const entries = await loadEntries(M + 2)
    const context = await load(entries)
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 2)

    // NOTE: Inserting entry M + 2 does not change parent/root MBR,
    //       thus no check is performed.
  })

  it('split leaf (non-root)', async function () {
    const entries = await loadEntries(M + 4)
    const context = await load(entries)
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 3)
  })

  it('delegate split (non-leaf)', async function () {
    const entries = await loadEntries(M + 11)
    const context = await load(entries)
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 2)
    assert.deepStrictEqual(R.mbr().decode(), mbr(entries))
  })

  it('delegate MBR update after split', async function () {
    const entries = await loadEntries(M + 71)
    const context = await load(entries)
    const R = await context.getRoot()

    // NOTE: M + 71 is the first entry which changes root MBR.
    assert.deepStrictEqual(R.mbr().decode(), mbr(entries))
  })

  it('search single index entry', async function () {
    const entries = await loadEntries(50)
    const context = await load(entries)
    const S = entries[20].mbr
    const hits = await context.search(S)
    assert.strictEqual(hits.length, 1)
    assert.strictEqual(hits[0], entries[20].id)
  })
})
