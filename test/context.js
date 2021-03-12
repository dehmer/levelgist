const { PassThrough } = require('stream')
const uuid = require('uuid-random')
const levelup = require('levelup')
const database = require('./database')
const CacheDown = require('./cachedown')
const PickSplit = require('../lib/gist/picksplit-nr')
const Penalty = require('../lib/gist/penalty')
const Insert = require('../lib/gist/insert')
const Search = require('../lib/gist/search')

const createContext = async (options = {}) => {
  const M = options.M || 5
  const k = options.k || 0.4

  const rootkey = '00000000-0000-0000-0000-000000000000'
  const { Node, Entry } = require('../lib/gist/node')
  const db = database[options.database || 'memdown/json']()

  // Create empty root if necessary:
  try {
    await db.get(rootkey)
  } catch (err) {
    const root = Node.of(uuid(), [], true)
    await db.put(rootkey, root.id())
    await db.put(root.id(), root.encode())
  }

  let batch
  const getNode = async id => Node.decode(id, await db.get(id))

  const putNode = async (node, root) => {
    const backend = batch ? batch : db
    await backend.put(node.id(), node.encode())
    if (root) await backend.put(rootkey, node.id())
    return node
  }

  const context = {
    key: () => uuid(),
    root: () => db.get(rootkey),
    createLeaf: (id, entries) => Node.of(id, entries, true),
    createNode: (id, entries) => Node.of(id, entries, false),
    createEntry: (mbr, id) => Entry.of(mbr, id),
    encodeEntry: entry => Entry.encode(entry),
    getRoot: async () => getNode(await db.get(rootkey)), // convenience only
    getNode,
    putNode
  }

  context.pickSplit = (options.PickSplit || PickSplit(k)).bind(context)
  context.penalty = (options.Penalty || Penalty).bind(context)

  context.insert = async entry => {
    batch = db.batch()
    await Insert(M).bind(context)(entry)
    await batch.write()
    batch = null
  }

  context.bulk = async entries => {
    const cache = levelup(CacheDown(db))
    const puts = {}
    const getNode = async id => Node.decode(id, await cache.get(id))

    const put = (key, value) => {
      // TODO: overwrite existing entry
      puts[key] = value
      cache.put(key, value)
    }

    const putNode = async (node, root) => {
      await put(node.id(), node.encode())
      if (root) await put(rootkey, node.id())
      return node
    }

    const context = {
      key: () => uuid(),
      root: () => cache.get(rootkey),
      createLeaf: (id, entries) => Node.of(id, entries, true),
      createNode: (id, entries) => Node.of(id, entries, false),
      createEntry: (mbr, id) => Entry.of(mbr, id),
      encodeEntry: entry => Entry.encode(entry),
      getRoot: async () => getNode(await cache.get(rootkey)), // convenience only
      getNode,
      putNode
    }

    context.pickSplit = (options.PickSplit || PickSplit(k)).bind(context)
    context.penalty = (options.Penalty || Penalty).bind(context)
    const insert = Insert(M).bind(context)
    for(const entry of entries) await insert(entry)
    const batch = Object.entries(puts).reduce((acc, [k, v]) => acc.put(k, v), db.batch())
    await batch.write()
  }

  context.search = S => new Promise(async (resolve, reject) => {
    const acc = []
    const writable = new PassThrough({ objectMode: true })
    const R = await context.getRoot()
    await Search.bind(context)(R, S, writable)
    writable.end()

    writable
      .on('data', data => acc.push(data))
      .on('error', err => reject(err))
      .on('end', () => resolve(acc))
  })

  return context
}

module.exports = {
  createContext
}
