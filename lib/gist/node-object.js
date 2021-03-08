
/**
 *
 */
const MBR = function (mbr) {
  this.mbr_ = mbr
}

MBR.encode = mbr => new MBR(mbr)
MBR.area = mbr => (mbr[1][0] - mbr[0][0]) * (mbr[1][1] - mbr[0][1])

MBR.union = entries => {
  const acc = [
    [entries[0].xmin(), entries[0].ymin()],
    [entries[0].xmax(), entries[0].ymax()]
  ]

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].xmin() < acc[0][0]) acc[0][0] = entries[i].xmin()
    if (entries[i].ymin() < acc[0][1]) acc[0][1] = entries[i].ymin()
    if (entries[i].xmax() > acc[1][0]) acc[1][0] = entries[i].xmax()
    if (entries[i].ymax() > acc[1][1]) acc[1][1] = entries[i].ymax()
  }

  return new MBR(acc)
}

MBR.prototype.decode = function () {
  return this.mbr_
}

MBR.prototype.area = function () {
  return MBR.area(this.mbr_)
}


/**
 *
 */
const Entry = function (mbr, id) {
  if (mbr.mbr_) throw Error('this is unexpected')
  this.mbr_ = mbr,
  this.id_ = id
}

Entry.encode = ({ mbr, id }) => {
  const encodedId = Buffer.from(id.replace(/-/g, ''), 'hex')
  return new Entry(mbr, encodedId)
}

Entry.of = (mbr, id) => {
  if (!Buffer.isBuffer(id)) throw new Error('buffer expected')
  return new Entry(mbr.mbr_, id)
}

Entry.prototype.id = function () { return this.id_ }
Entry.prototype.xmin = function () { return this.mbr_[0][0] }
Entry.prototype.ymin = function () { return this.mbr_[0][1] }
Entry.prototype.xmax = function () { return this.mbr_[1][0] }
Entry.prototype.ymax = function () { return this.mbr_[1][1] }
Entry.prototype.union = function (other) { return MBR.union([this, other]) }
Entry.prototype.area = function () { return MBR.area(this.mbr_) }
Entry.prototype.getMBR = function () { return new MBR(this.mbr_) }
Entry.prototype.setMBR = function (mbr) { this.mbr_ = mbr.mbr_ }

const format = s => `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
Entry.prototype.decodeId = function () {
  return format(this.id_.toString('hex'))
}

Entry.prototype.decode = function () {
  return {
    mbr: this.mbr_,
    id: this.decodeId()
  }
}

Entry.prototype.intersects = function ([[xmin, ymin], [xmax, ymax]]) {
  // a.max < b.min || b.max < a.min
  if (this.xmax() < xmin || xmax < this.xmin()) return false
  if (this.ymax() < ymin || ymax < this.ymin()) return false
  return true
}


/**
 *
 */
const Node = function (capacity, id, entries, leaf) {
  this.capacity_ = capacity,
  this.id_ = id
  this.entries_ = entries,
  this.leaf_ = leaf
}

Node.type = 'object'

Node.of = (capacity, id, entries = [], leaf = false) => {
  return new Node(capacity, id, entries, leaf)
}

Node.decode = (capacity, id, buf) => {
  const { entries, leaf} = JSON.parse(buf.toString())
  return Node.of(capacity, id, entries.map(Entry.encode), leaf)
}

Node.prototype.encode = function () {
  const entries = this.entries_.map(entry => entry.decode())
  const json = JSON.stringify({ entries, leaf: this.leaf_ })
  return Buffer.from(json)
}

Node.prototype.capacity = function() { return this.capacity_ }
Node.prototype.id = function () { return this.id_ }
Node.prototype.length = function () { return this.entries_.length }
Node.prototype.leaf = function () { return this.leaf_ }

Node.prototype.add = function (entries) {
  if (!Array.isArray(entries)) return this.add([entries])
  entries.forEach(entry => this.entries_.push(entry))
  return this
}

Node.prototype.entries = function (indices) {
  if (!indices) return this.entries(Array(this.length()).fill().map((_, i) => i))
  return indices.reduce((acc, index) => {
    acc.push(this.entries_[index])
    return acc
  }, [])
}

Node.prototype.mbr = function () {
  return MBR.union(this.entries())
}

module.exports = {
  MBR,
  Entry,
  Node
}