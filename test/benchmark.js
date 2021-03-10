const { rm } = require('fs/promises')
const fs = require('fs')
const pretty = require('prettysize')
const { loadEntries } = require('./shapefile')
const { createContext } = require('./context')
const Insert = require('../lib/gist/insert')

describe.only('benchmark', async function () {
  const acc = []
  let entries = null

  before(async function () {
    this.timeout(0)
    entries = await loadEntries()
  })

  after(async function () {
    const data = acc.map(stats => {
      const values = Object.values(stats).map((value, index) => {
        if (index === 6 || index === 8) return pretty(value)
        else return value
      })
      return values.join(', ')
    })

    fs.writeFileSync('benchmark.csv', data.join('\n'))
  })

  beforeEach(async function () {
    await rm('db/index', { recursive: true, force: true })
  })

  const setups = ['buffer', 'object']
    // .flatMap(type => ['memdown', 'objectdown', 'leveldown']
    .flatMap(type => ['memdown', 'leveldown']
      .map(database => [type, database])
    )

  setups.forEach(([type, database]) => {
    it(`${type}/${database}`, async function () {
      this.timeout(0)

      const M = 50
      const k = 0.4
      const stats = { type, database, n: entries.length, M, k, writes: 0, bytesWritten: 0, reads: 0, bytesRead: 0 }
      const context = await createContext({ M, k, database, type, stats })
      // const insert = Insert.bind(context)

      const now = Date.now()
      // for(const entry of entries) await context.insert(entry)
      await context.bulk(entries)
      stats.time = Date.now() - now
      acc.push(stats)
    })
  })
})
