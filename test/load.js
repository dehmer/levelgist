const gist = require('../lib/gist')
const { loadEntries } = require('./shapefile')
const database = require('./database')

;(async () => {
  const M = 50
  const k = 0.5
  const createIndex = () => gist(database['memdown/json'](), { M, k })
  const index = await createIndex()
  const entries = await loadEntries()
  console.time('bulk')
  await index.bulk(entries)
  console.timeEnd('bulk')
})
