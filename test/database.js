const levelup = require('levelup')
const memdown = require('memdown')
const objectdown = require('./objectdown')

const init = async (db, root) => {
  const id = root.id()
  await db.put(Buffer.alloc(16), id)
  await db.put(id, root.encode())
}

module.exports = {
  init,
  memdown: () => levelup(memdown()),
  objectdown: () => levelup(objectdown())
}
