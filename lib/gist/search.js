/**
 * Algorithm Search.
 *
 * Given an R-tree whose root node is R, find all index records whose
 * rectangles overlap a search rectangle S.
 */
 const Search = async function (R, S, writable, level = 1) {
  const search = Search.bind(this)
  const entries = R.entries()

  for(let i = 0; i < entries.length; i++) {
    if (!entries[i].intersects(S)) continue
    const id = entries[i].id()
    if (R.leaf()) writable.write(id)
    else await search(await this.getNode(id), S, writable, level + 1)
  }
}

module.exports = Search
