const {loadEntries} = require('./shapefile')
const { createContext } = require('./context')
const Insert = require('../lib/gist/insert')

;(async () => {
  const database = 'memdown'
  const type = 'buffer'
  const context = await createContext({ M: 50, k: 0.5, database, type })
  const entries = await loadEntries()
  await context.bulk(entries)
})()
