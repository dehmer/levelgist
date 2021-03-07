const encoding = () => {
  var writes = 0
  var bytesWritten = 0
  var reads = 0
  var bytesRead = 0

  return {
    type: 'rtree/value',
    buffer: true,
    stats: () => ({ writes, bytesWritten, reads, bytesRead }),
    encode: buffer => {
      writes += 1
      bytesWritten += buffer.length
      return buffer
    },
    decode: buffer => {
      reads += 1
      bytesRead += buffer.length
      return buffer
    }
  }
}

module.exports = encoding
