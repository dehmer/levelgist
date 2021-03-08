var levelup = require('levelup')
const uuid = require('uuid-random')
const shapefile = require('./shapefile')
const { createContext } = require('./context')
const node = require('../lib/gist/node-buffer')
const Insert = require('../lib/gist/insert')
const ObjectDown = require('./objectdown')

const { Entry } = node
const loadEntries = n => shapefile.entries('tl_2020_us_county', n)

describe.skip('benchmark', function() {
  it('objectdown (buffer)', async function () {
    const initdb = async Node => {
      const db = levelup(new ObjectDown())
      const id = uuid.bin()

      // Create empty root node.
      await db.put(Buffer.alloc(16), id)
      await db.put(id, Node.of(id, [], true).buf)
      return db
    }

    const context = await createContext({ initdb, M: 50, k: 0.5 })
    const insert = Insert.bind(context)
    const entries = await loadEntries()

    console.time('insert')
    for(const entry of entries) await insert(Entry.encode(entry))
    console.timeEnd('insert')
  })

  it('memdown (buffer)', async function () {
    const context = await createContext({ M: 50, k: 0.5 })
    const insert = Insert.bind(context)
    const entries = await loadEntries()

    console.time('insert')
    for(const entry of entries) await insert(Entry.encode(entry))
    console.timeEnd('insert')
  })
})
