const levelup = require('levelup')
const memdown = require('memdown')

/**
 * Database (memdown) with empty root node.
 */
const emptyMemdown = async root => {
  const db = levelup(memdown())

  // Create optional root node.
  if (root) {
    const id = root.id()
    await db.put(Buffer.alloc(16), id)
    await db.put(id, root.encode())
  }

  return db
}

module.exports = {
  emptyMemdown
}
