const assert = require('assert')
const { PassThrough } = require('stream')
const levelup = require('levelup')
const memdown = require('memdown')
const encode = require('encoding-down')
const uuid = require('uuid-random')
const shapefile = require('./shapefile')
const { Entry, NodeFN } = require('../lib/gist/node')
const Insert = require('../lib/gist/insert')
const Search = require('../lib/gist/search')
const PickSplit = require('../lib/gist/picksplit-nr')
const Penalty = require('../lib/gist/penalty')

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
  const k = 0.4 // minimum fill factor

  var writes = 0
  var bytesWritten = 0
  var reads = 0
  var bytesRead = 0

  const encoding = () => ({
    type: 'rtree-value',
    buffer: true,
    encode: buffer => {
      writes += 1
      bytesWritten += buffer.length
      return buffer
    },
    decode: buffer => {
      reads += 1
      bytesRead += buffer.length
      return buffer
    }
  })

  const createContext = async (options) => {
    const M = options.M || 5
    const k = options.k || 0.4

    const db = levelup(encode(memdown(), { valueEncoding: encoding() }))
    const Node = NodeFN({ M, put: db.put.bind(db) })
    const root = Node.of(uuid.bin(), [], true, true)
    await root.write()

    const getNode = async id => new Node(id, await db.get(id))
    const getRoot = async () => {
      const id = await db.get(Buffer.alloc(16))
      return new Node(id, await db.get(id), true, false)
    }

    const context = {
      k,
      db,
      key: () => uuid.bin(),
      createLeaf: (id, entries) => Node.of(id, entries, true),
      createNode: (id, entries) => Node.of(id, entries, false),
      createEntry: (mbr, id) => Entry.of(mbr, id),
      createRoot: (id, entries) => Node.of(id, entries, false, true),
      getRoot,
      getNode,

      writes: () => writes,
      bytesWritten: () => bytesWritten,
      reads: () => reads,
      bytesRead: () => bytesRead
    }

    context.pickSplit = options.PickSplit.bind(context)
    context.penalty = options.Penalty.bind(context)

    return context
  }

  it('insert single index entry - root (leaf)', async function () {
    const context = await createContext({ PickSplit, Penalty })
    const insert = Insert.bind(context)
    const entries = await loadEntries(1)
    for(const entry of entries) await insert(Entry.encode(entry))

    const R = await context.getRoot()
    assert.strictEqual(R.length(), 1)
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('fill node to capacity - root (leaf)', async function () {
    const context = await createContext({ PickSplit, Penalty })
    const insert = Insert.bind(context)
    const entries = await loadEntries(M)
    for(const entry of entries) await insert(Entry.encode(entry))

    const R = await context.getRoot()
    assert.strictEqual(R.length(), M)
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('split leaf (root)', async function () {
    const context = await createContext({ PickSplit, Penalty })
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 1)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 2)
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('find leaf to insert entry', async function () {
    const context = await createContext({ PickSplit, Penalty })
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 2)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 2)

    // NOTE: Inserting entry M + 2 does not change parent/root MBR,
    //       thus no check is performed.
  })

  it('split leaf (non-root)', async function () {
    const context = await createContext({ PickSplit, Penalty })
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 4)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 3)
  })

  it('delegate split (non-leaf)', async function () {
    const context = await createContext({ PickSplit, Penalty })
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 11)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()
    assert.strictEqual(R.length(), 2)
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('delegate MBR update after split', async function () {
    const context = await createContext({ PickSplit, Penalty })
    const insert = Insert.bind(context)
    const entries = await loadEntries(M + 71)
    for(const entry of entries) await insert(Entry.encode(entry))
    const R = await context.getRoot()

    // NOTE: M + 71 is the first entry which changes root MBR.
    assert.deepStrictEqual(Entry.decodeMBR(R.mbr()), mbr(entries))
  })

  it('search single index entry', async function () {
    const context = await createContext({ PickSplit, Penalty, M: 9, k: 0.4 })
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