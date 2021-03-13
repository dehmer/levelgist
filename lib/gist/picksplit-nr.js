/**
 * Given a set P of M + 1 entries (p, ptr), splits P
 * into two sets of entries P1, P2, each of size at least
 * kM. The choice of the minimum fill factor k for a tree
 * is controlled here. Typically, it is desirable to split
 * in such a way as to minimize some badness metric akin
 * to a multi-way Penalty, but this is left open for the user.
 */
const PickSplit = k => function (P) {
  const m = Math.ceil(k * (P.length - 1))

  // LPickSeeds [7].

  let lowest = P[0].box[0][0] + P[0].box[0][1]
  let highest = P[0].box[1][0] + P[0].box[1][1]
  let S1 = P[0]
  let S2 = P[0]

  for (let i = 1; i < P.length; i++) {
    const lowxy = P[i].box[0][0] + P[i].box[0][1]
    if (lowxy < lowest) { lowest = lowxy; S1 = P[i] }
    const highxy = P[i].box[1][0] + P[i].box[1][1]
    if (highxy > highest) { highest = highxy; S2 = P[i]}
  }

  // NDistribute [7].

  const distance = (x1, y1, x2, y2) => {
    const a = x1 - x2
    const b = y1 - y2
    return Math.sqrt(a * a + b * b)
  }

  // Compute distance between M+1 entries in P and s1.
  // Sort node entries according to their distance from s1 and
  // assign first m entries in P to P1 (d1).
  const N1 = P
    .map(E => [E, distance(S1.box[0][0], S1.box[0][1], E.box[1][0], E.box[1][1])])
    .sort((a, b) => a[1] - b[1])
    .splice(0, m)
    .map(([E]) => E)

  N1.forEach(E => P.splice(P.indexOf(E), 1))

  // Compute the distance between remaining M-m+1 entries in P and s2.
  // Sort node entries according to their distance to s2 and
  // assign first m entries in P to P2 (d2).
  const N2 = P.filter(E => !N1.includes(E))
    .map(E => [E, distance(S2.box[1][0], S2.box[1][1], E.box[0][0], E.box[0][1])])
    .sort((a, b) => a[1] - b[1])
    .splice(0, m)
    .map(([E]) => E)

  N2.forEach(E => P.splice(P.indexOf(E), 1))

  // Assign remaining M-2m+1 entries to nearest node (P1 or P2).
  for (let i = 0; i < P.length; i++) {
    if (
      distance(S1.box[0][0], S1.box[0][1], P[i].box[1][0], P[i].box[1][1]) <
      distance(S2.box[1][0], S2.box[1][1], P[i].box[0][0], P[i].box[0][1])
    ) {
      N1.push(P[i])
    } else {
      N2.push(P[i])
    }
  }

  return [N1, N2]
}

module.exports = PickSplit