const { MBR } = require('./node')
const area = MBR.area

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
const Penalty = function (E1, E2) {
  return area(E1.union(E2)) - area(E1.mbr())
}

module.exports = Penalty
