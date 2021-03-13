const uuid = require('uuid-random')
const PickSplit = require('./picksplit-nr')
const Insert = require('./insert')
const Search = require('./search')

const gist = async (db, options = {}) => {
  const M = options.M || 50
  const k = options.k || 0.4
  const pickSplit = PickSplit(k)
  const root = '00000000-0000-0000-0000-000000000000'

  // Create empty root if necessary:
  try {
    await db.get(rootkey)
  } catch (err) {
    const key = uuid()
    await db.put(root, key)
    await db.put(key, { entries: [], leaf: true })
  }

  const insert = async entry => {
    const context = {
      pickSplit,
      root,
      get: key => db.get(key),
      put: (key, value) => db.put(key, value),
    }

    const insert = Insert(M).bind(context)
    await insert(entry)
  }

  const bulk = async entries => {
    const cache = {}
    const batch = {}

    const get = async key => {
      const value = cache[key] || await db.get(key)
      cache[key] = value
      return value
    }

    const put = async (key, value) => {
      batch[key] = value
      cache[key] = value
    }

    const context = { pickSplit, root, get, put }
    const insert = Insert(M).bind(context)
    for (const entry of entries) await insert(entry)

    const ops = Object.entries(batch).map(([key, value]) => ({ type: 'put', key, value }))
    await db.batch(ops)
  }

  const search = async box => {
    const context = { get: key => db.get(key) }
    const search = Search.bind(context)

    const acc = []
    const key = await db.get(root)
    const { entries, leaf } = await db.get(key)
    await search(entries, leaf, box, acc)
    return acc
  }

  return { insert, bulk, search }
}

module.exports = gist
