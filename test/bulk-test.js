const assert = require('assert')
const gist = require('../lib/gist')
const { loadEntries } = require('./shapefile')
const database = require('./database')

describe('Bulk Load', function () {
  this.timeout(0)
  const createIndex = () => gist(database['memdown/json']())

  it('just loads', async function () {
    const index = await createIndex()
    const entries = await loadEntries()
    await index.bulk(entries)

    for(let i = 0; i < 20; i++) {
      const entry = entries[Math.floor(Math.random() * entries.length)]
      const result = await index.search(entry.box)
      assert(result.includes(entry.key))
    }
  })
})
