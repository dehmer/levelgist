const { rm } = require('fs/promises')
const fs = require('fs')
const pretty = require('prettysize')
const { loadEntries } = require('./shapefile')
const { createContext } = require('./context')

describe.skip('benchmark', async function () {
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

  const setups = ['memdown/json', 'leveldown/json']
  setups.forEach(database => {
    it(`${database}`, async function () {
      this.timeout(0)

      const M = 50
      const k = 0.4
      const stats = { database, n: entries.length, M, k, writes: 0, bytesWritten: 0, reads: 0, bytesRead: 0 }
      const context = await createContext({ M, k, database, stats })

      const now = Date.now()
      await context.bulk(entries)
      stats.time = Date.now() - now
      acc.push(stats)
    })
  })
})
