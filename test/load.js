const {loadEntries} = require('./shapefile')
const { createContext } = require('./context')

;(async () => {
  const database = 'memdown/json'
  const type = 'object'
  const context = await createContext({ M: 50, k: 0.5, database, type })
  const entries = await loadEntries()
  await context.bulk(entries)
  // for (const entry of entries) await context.insert(entry)
})()
