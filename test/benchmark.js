const fs = require('fs/promises')
const {loadEntries} = require('./shapefile')
const { createContext } = require('./context')
const Insert = require('../lib/gist/insert')

describe.skip('benchmark', function() {

  beforeEach(async function() {
    await fs.rm('db/index', { recursive: true, force: true })
  })

  const setups = ['buffer', 'object']
    .flatMap(type => ['memdown', 'objectdown', 'leveldown']
      .map(database => [type, database])
    )

  setups.forEach(([type, database]) => {
    it(`${type}/${database}`, async function () {
      this.timeout(0)

      const stats = { type, database, writes: 0, bytesWritten: 0, reads: 0, bytesRead: 0 }
      const context = await createContext({ M: 50, k: 0.5, database, type, stats })
      const insert = Insert.bind(context)
      const entries = await loadEntries()

      const now = Date.now()
      for(const entry of entries) await insert(entry)
      stats.time = Date.now() - now

      console.log(stats)
    })
  })
})
