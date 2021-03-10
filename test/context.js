const uuid = require('uuid-random')
const levelup = require('levelup')
const database = require('./database')
const CacheDown = require('./cachedown')
const PickSplit = require('../lib/gist/picksplit-nr')
const Penalty = require('../lib/gist/penalty')
const Insert = require('../lib/gist/insert')

const createContext = async (options = {}) => {
  const M = options.M || 5
  const k = options.k || 0.4
  const type = options.type || 'buffer'

  const { Node, Entry } = type === 'buffer'
    ? require('../lib/gist/node-buffer')
    : require('../lib/gist/node-object')

  const rootkey = Buffer.alloc(16)
  const codec = options.stats
    ? database.statsCodec(options.stats)
    : database.defaultCodec

  const db = database[options.database || 'memdown'](codec)

  // Create empty root if necessary:
  try {
    await db.get(Buffer.alloc(16))
  } catch (err) {
    await database.init(db, Node.of(M, uuid.bin(), [], true))
  }

  let batch
  const getNode = async id => Node.decode(M, id, await db.get(id))

  const putNode = async (node, root) => {
    const backend = batch ? batch : db
    await backend.put(node.id(), node.encode())
    if (root) await backend.put(rootkey, node.id())
    return node
  }

  const context = {
    key: () => uuid.bin(),
    root: () => db.get(rootkey),
    createLeaf: (id, entries) => Node.of(M, id, entries, true),
    createNode: (id, entries) => Node.of(M, id, entries, false),
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
    await Insert.bind(context)(entry)
    await batch.write()
    batch = null
  }

  context.bulk = async entries => {
    const cache = levelup(CacheDown(db))
    const batch = db.batch()
    const getNode = async id => Node.decode(M, id, await cache.get(id))

    const put = (key, value) => {
      // TODO: overwrite existing entry
      batch.put(key, value)
      cache.put(key, value)
    }

    const putNode = async (node, root) => {
      await put(node.id(), node.encode())
      if (root) await put(rootkey, node.id())
      return node
    }

    const context = {
      key: () => uuid.bin(),
      root: () => cache.get(rootkey),
      createLeaf: (id, entries) => Node.of(M, id, entries, true),
      createNode: (id, entries) => Node.of(M, id, entries, false),
      createEntry: (mbr, id) => Entry.of(mbr, id),
      encodeEntry: entry => Entry.encode(entry),
      getRoot: async () => getNode(await cache.get(rootkey)), // convenience only
      getNode,
      putNode
    }

    context.pickSplit = (options.PickSplit || PickSplit(k)).bind(context)
    context.penalty = (options.Penalty || Penalty).bind(context)
    const insert = Insert.bind(context)
    for(const entry of entries) await insert(entry)
    await batch.write()
  }

  return context
}

module.exports = {
  createContext
}
