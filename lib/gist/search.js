/**
 * Algorithm Search.
 *
 * Given an R-tree whose root node is R, find all index records whose
 * rectangles overlap a search rectangle S.
 */
const Search = async function (R, S, writable) {
  const search = Search.bind(this)
  const entries = R.entries()

  for(let i = 0; i < entries.length; i++) {
    if (!entries[i].intersects(S)) continue
    if (R.leaf()) writable.write(entries[i].id())
    else await search(await this.getNode(entries[i].id()), S, writable)
  }
}

module.exports = Search
