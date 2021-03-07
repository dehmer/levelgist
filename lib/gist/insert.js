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
 const Insert = async function (E) {

  const insert = async (R, E) => {
    if (R.leaf()) {
      if (R.length() < R.capacity()) return [await this.putNode(R.add(E))]
      else {
        const partitions = this.pickSplit([...R.entries(), E])
        const nodes = [R.id, this.key()].map((id, i) => this.createLeaf(id, partitions[i]))
        await Promise.all(nodes.map(N => this.putNode(N)))
        return nodes
      }
    } else {
      const [F] = R.entries()
        .map(F => [F, this.penalty(F, E)])
        .sort((a, b) => a[1] - b[1])

      const N = await this.getNode(F[0].id())
      const nodes = await insert(N, E)

      if (nodes.length === 1) {

        // Update F MBR in R with nodes[0].
        F[0].updateMBR(nodes[0].mbr())
        return [await this.putNode(R)]
      } else {
        const E = this.createEntry(nodes[1].mbr(), nodes[1].id)
        if (R.length() < R.capacity()) {

          // Update F MBR in R with nodes[0] MBR and
          // add entry E for nodes[1] into R
          F[0].updateMBR(nodes[0].mbr())
          return [await this.putNode(R.add(E))]
        } else {
          const partitions = this.pickSplit([...R.entries(), E])
          const nodes = [R.id, this.key()].map((id, i) => this.createNode(id, partitions[i]))
          await Promise.all(nodes.map(N => this.putNode(N)))
          return nodes
        }
      }
    }
  }

  const key = await this.root()
  const R = await this.getNode(key)
  const nodes = await insert(R, E)
  if (nodes.length === 2) {
    const entries = nodes.map(N => this.createEntry(N.mbr(), N.id))
    const root = this.createRoot(this.key(), entries)
    await this.putNode(root, true)
  }
}

module.exports = Insert