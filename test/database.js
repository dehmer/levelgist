const levelup = require('levelup')
const memdown = require('memdown')
const uuid = require('uuid-random')

/**
 * Database (memdown) with empty root node.
 */
const emptyMemdown = async Node => {
  const db = levelup(memdown())
  const id = uuid.bin()

  // Create empty root node.
  await db.put(Buffer.alloc(16), id)
  await db.put(id, Node.of(id, [], true).buf)
  return db
}

module.exports = {
  emptyMemdown
}
