const intersects = (a, b) => {
  // a.max < b.min || b.max < a.min
  if (a[1][0] < b[0][0] || b[1][0] < a[0][0]) return false
  if (a[1][1] < b[0][1] || b[1][1] < a[0][1]) return false
  return true
}

const union = entries => {
  const box = [
    [entries[0].box[0][0], entries[0].box[0][1]],
    [entries[0].box[1][0], entries[0].box[1][1]]
  ]

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].box[0][0] < box[0][0]) box[0][0] = entries[i].box[0][0]
    if (entries[i].box[0][1] < box[0][1]) box[0][1] = entries[i].box[0][1]
    if (entries[i].box[1][0] > box[1][0]) box[1][0] = entries[i].box[1][0]
    if (entries[i].box[1][1] > box[1][1]) box[1][1] = entries[i].box[1][1]
  }

  return box
}

const area = box =>
  (box[1][0] - box[0][0]) * (box[1][1] - box[0][1])

module.exports = {
  intersects,
  union,
  area
}