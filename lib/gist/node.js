const FLAG_LEAF = 0x01
const OFFSET_FLAGS = 0
const OFFSET_NUM_ENTRIES = 1
const OFFSET_ENTRIES = 2

const SIZE_P = 4 * 8
const SIZE_PTR = 16
const SIZE_ENTRY = SIZE_P + SIZE_PTR

// Offsets relative to entry E:
const OFFSET_XMIN =  0
const OFFSET_YMIN =  8
const OFFSET_XMAX = 16
const OFFSET_YMAX = 24
const OFFSET_ID   = 32


const size = capacity => 2 + capacity * SIZE_ENTRY

const Entry = function (buf) {
  this.buf = buf
}

Entry.prototype.xmin = function () { return this.buf.readDoubleLE(OFFSET_XMIN) }
Entry.prototype.ymin = function () { return this.buf.readDoubleLE(OFFSET_YMIN) }
Entry.prototype.xmax = function () { return this.buf.readDoubleLE(OFFSET_XMAX) }
Entry.prototype.ymax = function () { return this.buf.readDoubleLE(OFFSET_YMAX) }
Entry.prototype.id = function () { return this.buf.slice(OFFSET_ID) }
Entry.prototype.mbr = function () { return this.buf.slice(0, OFFSET_ID)}
Entry.prototype.union = function (entry) { return Entry.mbr([this, entry]) }
Entry.prototype.updateMBR = function (mbr) { mbr.copy(this.buf) }

Entry.prototype.intersects = function ([[xmin, ymin], [xmax, ymax]]) {
  // a.max < b.min || b.max < a.min
  if (this.xmax() < xmin || xmax < this.xmin()) return false
  if (this.ymax() < ymin || ymax < this.ymin()) return false
  return true
}

Entry.encode = ({ mbr, id }) => {
  const buf = Buffer.allocUnsafe(SIZE_ENTRY)
  buf.writeDoubleLE(mbr[0][0], OFFSET_XMIN)
  buf.writeDoubleLE(mbr[0][1], OFFSET_YMIN)
  buf.writeDoubleLE(mbr[1][0], OFFSET_XMAX)
  buf.writeDoubleLE(mbr[1][1], OFFSET_YMAX)
  Buffer.from(id.replace(/-/g, ''), 'hex').copy(buf, OFFSET_ID)
  return new Entry(buf)
}

Entry.of = (mbr, id) => {
  const buf = Buffer.allocUnsafe(SIZE_ENTRY)
  mbr.copy(buf)
  id.copy(buf, OFFSET_ID)
  return new Entry(buf)
}

Entry.decodeMBR = buf => {
  return [
    [buf.readDoubleLE(OFFSET_XMIN), buf.readDoubleLE(OFFSET_YMIN)],
    [buf.readDoubleLE(OFFSET_XMAX), buf.readDoubleLE(OFFSET_YMAX)]
  ]
}

Entry.decodeId = buf => {
  const format = s => `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
  return format(buf.toString('hex'))
}

Entry.mbr = entries => {
  const acc = [
    entries[0].xmin(),
    entries[0].ymin(),
    entries[0].xmax(),
    entries[0].ymax()
  ]

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].xmin() < acc[0]) acc[0] = entries[i].xmin()
    if (entries[i].ymin() < acc[1]) acc[1] = entries[i].ymin()
    if (entries[i].xmax() > acc[2]) acc[2] = entries[i].xmax()
    if (entries[i].ymax() > acc[3]) acc[3] = entries[i].ymax()
  }

  return acc.reduce((buf, value, i) => {
    buf.writeDoubleLE(value, i * 8)
    return buf
  }, Buffer.allocUnsafe(OFFSET_ID))
}

const MBR = {}

MBR.area = buf =>
  (buf.readDoubleLE(OFFSET_XMAX) - buf.readDoubleLE(OFFSET_XMIN)) *
  (buf.readDoubleLE(OFFSET_YMAX) - buf.readDoubleLE(OFFSET_YMIN))

const Node = function (id, buf) {
  this.id = id
  this.buf = buf
}

Node.prototype.leaf = function () {
  return (this.buf.readUInt8(OFFSET_FLAGS) & FLAG_LEAF) === FLAG_LEAF
}

Node.prototype.length = function () {
  return this.buf.readUInt8(OFFSET_NUM_ENTRIES)
}

Node.prototype.capacity = function() {
  return (this.buf.length - OFFSET_ENTRIES) / SIZE_ENTRY
}

Node.prototype.add = function (entries) {
  if (!Array.isArray(entries)) return this.add([entries])
  const m = this.length()
  this.buf.writeUInt8(m + entries.length, OFFSET_NUM_ENTRIES)
  entries.forEach((entry, i) => entry.buf.copy(this.buf, OFFSET_ENTRIES + (m + i) * SIZE_ENTRY))
  return this
}

Node.prototype.entries = function (indices) {
  if (!indices) return this.entries(Array(this.length()).fill().map((_, i) => i))
  return indices.reduce((acc, index) => {
    const start = OFFSET_ENTRIES + index * SIZE_ENTRY
    const end = start + SIZE_ENTRY
    acc.push(new Entry(this.buf.slice(start, end)))
    return acc
  }, [])
}

Node.prototype.mbr = function () {
  return Entry.mbr(this.entries())
}

Node.of = (capacity, id, entries = [], leaf = false) => {
  const buf = Buffer.allocUnsafe(size(capacity))
  buf.writeUInt8(leaf ? FLAG_LEAF : 0x00, OFFSET_FLAGS)
  buf.writeUInt8(entries.length, OFFSET_NUM_ENTRIES)
  entries.forEach((entry, i) => entry.buf.copy(buf, OFFSET_ENTRIES + i * SIZE_ENTRY))
  return new Node(id, buf)
}

module.exports = {
  MBR,
  Entry,
  Node
}
