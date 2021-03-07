const uuid = require('uuid-random')
const { emptyMemdown } = require('./database')
const PickSplit = require('../lib/gist/picksplit-nr')
const Penalty = require('../lib/gist/penalty')
const { Entry, Node: NodeFN } = require('../lib/gist/node')

const createContext = async (options = {}) => {
  const M = options.M || 5
  const k = options.k || 0.4
  const initdb = options.initdb || emptyMemdown
  const Node = {
    of: (id, entries, leaf) => NodeFN.of(M, id, entries, leaf),
    decode: NodeFN.decode
  }

  const rootkey = Buffer.alloc(16)
  const db = await initdb(Node)
  const getNode = async id => Node.decode(id, await db.get(id))

  const putNode = async (node, root) => {
    await db.put(node.id, node.buf)
    if (root) await db.put(rootkey, node.id)
    return node
  }

  const context = {
    key: () => uuid.bin(),
    root: () => db.get(rootkey),
    createLeaf: (id, entries) => Node.of(id, entries, true),
    createNode: (id, entries) => Node.of(id, entries, false),
    createEntry: (mbr, id) => Entry.of(mbr, id),
    createRoot: (id, entries) => Node.of(id, entries, false),
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
