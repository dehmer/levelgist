const {loadEntries} = require('./shapefile')
const { createContext } = require('./context')
const Insert = require('../lib/gist/insert')

;(async () => {
  const database = 'objectdown'
  const type = 'object'
  const context = await createContext({ M: 50, k: 0.5, database, type })
  const insert = Insert.bind(context)
  const entries = await loadEntries()
  for(const entry of entries) await insert(entry)
})()
