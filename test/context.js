const uuid = require('uuid-random')
const database = require('./database')
const PickSplit = require('../lib/gist/picksplit-nr')
const Penalty = require('../lib/gist/penalty')

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

  const db = database[options.database || 'objectdown'](codec)

  // Creat empty root if necessary:
  try {
    await db.get(Buffer.alloc(16))
  } catch (err) {
    await database.init(db, Node.of(M, uuid.bin(), [], true))
  }

  const getNode = async id => Node.decode(M, id, await db.get(id))
  const putNode = async (node, root) => {
    await db.put(node.id(), node.encode())
    if (root) await db.put(rootkey, node.id())
    return node
  }

  const context = {
    key: () => uuid.bin(),
    root: () => db.get(rootkey),
    createLeaf: (id, entries) => Node.of(M, id, entries, true),
    createNode: (id, entries) => Node.of(M, id, entries, false),
    createEntry: (mbr, id) => Entry.of(mbr, id),
    createRoot: (id, entries) => Node.of(M, id, entries, false),
    encodeEntry: entry => Entry.encode(entry),
    getRoot: async () => getNode(await db.get(rootkey)), // convenience only
    getNode,
    putNode
  }

  context.pickSplit = (options.PickSplit || PickSplit(k)).bind(context)
  context.penalty = (options.Penalty || Penalty).bind(context)

  return context
}

module.exports = {
  createContext
}
