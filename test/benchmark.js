const {loadEntries} = require('./shapefile')
const { createContext } = require('./context')
const Insert = require('../lib/gist/insert')

describe.skip('benchmark', function() {

  const setups = ['buffer', 'object']
    .flatMap(type => ['memdown', 'objectdown']
      .map(database => [type, database]))

  setups.forEach(([type, database]) => {
    it(`${database}/${type}`, async function () {
      this.timeout(0)
      const context = await createContext({ M: 50, k: 0.5, database, type })
      const insert = Insert.bind(context)
      const entries = await loadEntries()
      for(const entry of entries) await insert(entry)
    })
  })
})
