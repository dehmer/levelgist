const ID_SIZE = 36
const ENTRY_SIZE = 32 + ID_SIZE
const ENTRY_OFFSET = 1
const ID_OFFSET = 32

const encoding = {
  valueEncoding: {
    encode: data => {
      if (typeof data === 'string') return Buffer.from(data)
      else {
        // encode node as buffer.
        const { entries, leaf } = data
        const size = 1 + entries.length * (32 + 36)
        const buf = Buffer.allocUnsafe(size)
        buf.writeUInt8(leaf ? 0x01 : 0x00)
        entries.forEach((entry, i) => {
          const offset = ENTRY_OFFSET + i * ENTRY_SIZE
          buf.writeDoubleLE(entry.box[0][0], offset)
          buf.writeDoubleLE(entry.box[0][1], offset + 8)
          buf.writeDoubleLE(entry.box[1][0], offset + 16)
          buf.writeDoubleLE(entry.box[1][1], offset + 24)
          buf.write(entry.key, offset + 32)
        })

        return buf
      }
    },
    decode: buf => {
      if (buf.length === ID_SIZE) return buf.toString()
      else {
        // decode node from buffer.
        const entries = []
        const leaf = ((buf.readUInt8()) & 0x01) === 0x01
        let offset = ENTRY_OFFSET

        while (offset < buf.length) {
          const box = [[], []]
          box[0][0] = buf.readDoubleLE(offset)
          box[0][1] = buf.readDoubleLE(offset + 8)
          box[1][0] = buf.readDoubleLE(offset + 16)
          box[1][1] = buf.readDoubleLE(offset + 24)
          const key = buf.toString('utf8', offset + ID_OFFSET, offset + ID_OFFSET + ID_SIZE)
          entries.push({ box, key })
          offset += ENTRY_SIZE
        }

        return { entries, leaf }
      }
    },
    buffer: true
  }
}

module.exports = encoding