const assert = require('assert')
const gist = require('../lib/gist')
const { loadEntries } = require('./shapefile')
const database = require('./database')

const box = entries => entries.reduce((acc, entry) => {
  if (entry.box[0][0] < acc[0][0]) acc[0][0] = entry.box[0][0]
  if (entry.box[0][1] < acc[0][1]) acc[0][1] = entry.box[0][1]
  if (entry.box[1][0] > acc[1][0]) acc[1][0] = entry.box[1][0]
  if (entry.box[1][1] > acc[1][1]) acc[1][1] = entry.box[1][1]
  return acc
}, [[Infinity, Infinity], [-Infinity, -Infinity]])

describe('Insert', function () {
  const M = 5 // capacity

  const createIndex = () => gist(database['memdown/json'](), { M })

  it('insert single index entry - root (leaf)', async function () {
    const index = await createIndex()
    const entries = await loadEntries(1)
    for(const entry of entries) await index.insert(entry)
    const result = await index.search(box(entries))
    assert.strictEqual(result.length, 1)
    for(const entry of entries) {
      const result = await index.search(entry.box)
      assert(result.includes(entry.key))
    }
  })

  it('fill node to capacity - root (leaf)', async function () {
    const index = await createIndex()
    const entries = await loadEntries(M)
    for(const entry of entries) await index.insert(entry)
    const result = await index.search(box(entries))
    assert.strictEqual(result.length, M)
    for(const entry of entries) {
      const result = await index.search(entry.box)
      assert(result.includes(entry.key))
    }
  })

  it('split leaf (root)', async function () {
    const index = await createIndex()
    const entries = await loadEntries(M + 1)
    for(const entry of entries) await index.insert(entry)
    const result = await index.search(box(entries))
    assert.strictEqual(result.length, M + 1)
    for(const entry of entries) {
      const result = await index.search(entry.box)
      assert(result.includes(entry.key))
    }
  })

  it('find leaf to insert entry', async function () {
    const index = await createIndex()
    const entries = await loadEntries(M + 2)
    for(const entry of entries) await index.insert(entry)
    const result = await index.search(box(entries))
    assert.strictEqual(result.length, M + 2)
    for(const entry of entries) {
      const result = await index.search(entry.box)
      assert(result.includes(entry.key))
    }
  })

  it('split leaf (non-root)', async function () {
    const index = await createIndex()
    const entries = await loadEntries(M + 4)
    for(const entry of entries) await index.insert(entry)
    const result = await index.search(box(entries))
    assert.strictEqual(result.length, M + 4)
    for(const entry of entries) {
      const result = await index.search(entry.box)
      assert(result.includes(entry.key))
    }
  })

  it('delegate split (non-leaf)', async function () {
    const index = await createIndex()
    const entries = await loadEntries(M + 17)
    for(const entry of entries) await index.insert(entry)
    const result = await index.search(box(entries))
    assert.strictEqual(result.length, M + 17)
    for(const entry of entries) {
      const result = await index.search(entry.box)
      assert(result.includes(entry.key))
    }
  })

  it('delegate MBR update after split', async function () {
    const index = await createIndex()
    const entries = await loadEntries(M + 71)
    for(const entry of entries) await index.insert(entry)
    const result = await index.search(box(entries))
    assert.strictEqual(result.length, M + 71)
    for(const entry of entries) {
      const result = await index.search(entry.box)
      assert(result.includes(entry.key))
    }
  })
})
