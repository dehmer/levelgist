const { intersects } = require('./box')


/**
 * Algorithm Search.
 *
 * Given an R-tree whose root node is R, find all index records whose
 * rectangles overlap a search rectangle S.
 */
const Search = async function (entries, leaf, box, acc) {
  const search = Search.bind(this)

  for(let i = 0; i < entries.length; i++) {
    const key = entries[i].key
    if (!intersects(entries[i].box, box)) continue
    if (leaf) acc.push(key)
    else {
      const { entries, leaf } = await this.get(key)
      await search(entries, leaf, box, acc)
    }
  }
}

module.exports = Search
