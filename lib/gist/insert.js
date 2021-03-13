const uuid = require('uuid-random')
const { union, area } = require('./box')

/**
 * Penalty :: E1 -> E2 -> Number
 *
 * Given two entries E1 = (p1, ptr1), E2 = (p2, ptr2),
 * returns a domain-specific penalty for inserting E2
 * into the subtree rooted at E1. This is used to aid
 * the Split and Insert algorithms. Typically, the penalty
 * metric is some representation of the increase of size
 * from p1 to Union({E1, E2}). For example, Penalty for keys
 * in R2 can be defined as area(Union({E1, E2})) - area(p1).
 */
const penalty = function (E1, E2) {
  return area(union([E1, E2])) - area(E1.box)
}


/**
 * The insertion routines guarantee that the GiST remains balanced.
 * They are very similar to the insertion routines of R-trees,
 * which generalize the simpler insertion routines for B+-trees.
 * Insertion allows specification of the level at which to insert.
 * This allows subsequent methods to use Insert for reinserting
 * entries from internal nodes of the tree.
 * We will assume that level numbers increase as one ascends
 * the tree, with leaf nodes being at level 0.
 */
 const Insert = M => async function (entry) {

  const concat = (leaf, entries, entry) => {
    entries.push(entry)
    return [{ entries, leaf }]
  }

  const split = (leaf, entries, entry) => this.pickSplit(entries.concat(entry))
    .map(entries => ({ entries, leaf }))

  const add = (leaf, entries, entry) => entries.length < M
    ? concat(leaf, entries, entry)
    : split(leaf, entries, entry)

  const insert = async key => {
    const { entries, leaf } = await this.get(key)

    // Add entry to leaf node with enough capacity or
    // split node into two partitions containing all
    // original entries and the new entry.
    if (leaf) return add(true, entries, entry)

    // Choose path F with minimal penalty.
    const [F] = entries
      .map(F => [F, penalty(F, entry)])
      .sort((a, b) => a[1] - b[1])
      .map(F => F[0])

    const children = await insert(F.key)

    // Update F.box from entries of first child
    // and save one or both children. Second child
    // is assigned a new key when F was split.
    F.box = union(children[0].entries)
    const keys = children.length === 1 ? [F.key] : [F.key, uuid()]
    await Promise.all(keys.map((key, index) => this.put(key, children[index])))
    return children.length === 1
      ? [{ entries, leaf: false }]
      : add(false, entries, { box: union(children[1].entries), key: keys[1] })
  }

  const key = await this.get(this.root)
  const children = await insert(key)

  if (children.length === 1) return this.put(key, children[0])

  // Save new root key and root node, update old root
  // with new set of entries from first child and
  // save new node with entries from second child.
  const root = uuid()
  const keys = [key, uuid()]
  const entries = keys.map((key, index) => ({ box: union(children[index].entries), key }))
  await this.put(this.root, root)
  await this.put(root, { entries, leaf: false })
  await this.put(key, children[0])
  await this.put(entries[1].key, children[1])
}

module.exports = Insert