const uuid = require('uuid-random')
const levelup = require('levelup')
const memdown = require('memdown')
const leveldown = require('leveldown')
const encode = require('encoding-down')
const objectdown = require('./objectdown')

const init = async (db, root) => {
  const id = root.id()
  await db.put(Buffer.alloc(16), id)
  await db.put(id, root.encode())
}

const defaultCodec = db => db

const statsCodec = stats => db => {
  return encode(db, {
    valueEncoding: {
      buffer: true,
      encode: buffer => {
        stats.writes += 1
        stats.bytesWritten += buffer.length
        return buffer
      },
      decode: buffer => {
        stats.reads += 1
        stats.bytesRead += buffer.length
        return buffer
      }
    }
  })
}

module.exports = {
  init,
  statsCodec,
  defaultCodec,
  memdown: codec => levelup(codec(memdown())),
  objectdown: codec => levelup(codec(objectdown())),
  leveldown: codec => levelup(codec(leveldown(`db/${uuid()}`)))
}
