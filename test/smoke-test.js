const assert = require('assert')
const { PassThrough } = require('stream')
const { createContext } = require('./context')
const { loadEntries } = require('./shapefile')
const Insert = require('../lib/gist/insert')
const Search = require('../lib/gist/search')

describe('smoke test', function () {

  const classes = ['buffer', 'object']
  classes.forEach((type) => {
    it(`should never break (${type})`, async function () {
      const n = 100
      const context = await createContext({ M: 20, k: 0.5, type })
      const insert = Insert.bind(context)
      const search = Search.bind(context)
      const entries = await loadEntries(n)
      for(const entry of entries) await insert(entry)
      const R = await context.getRoot()

      const result = S => new Promise(async (resolve, reject) => {
        const acc = []
        const writable = new PassThrough({ objectMode: true })
        await search(R, S, writable)
        writable.end()

        writable
          .on('data', data => acc.push(data))
          .on('end', () => resolve(acc))
      })

      const S = entries[20].mbr
      const hits = await result(S)
      assert.strictEqual(hits.length, 1)
      assert.strictEqual(hits[0], entries[20].id)
    })
  })
})
