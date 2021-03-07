const fs = require('fs')
const uuid = require('uuid-random')
const { decode } = require('../lib/shapefile/shapefile')

const entry = ({ box }) => {
  return {
    mbr: [[box.xmin, box.ymin], [box.xmax, box.ymax]],
    id: uuid()
  }
}

const entries = (dataset, n) => new Promise((resolve, reject) => {
  const basename = `./data/${dataset}`
  const shapefile = `${basename}.shp`

  const acc = []
  const data = data => {
    if (acc.length === n) stream.end()
    else acc.push(data)
  }

  const stream = fs.createReadStream(shapefile)
    .pipe(decode(entry))
    .on('data', data)
    .on('error', err => reject(err))
    .on('end', () => resolve(acc))
})

module.exports = {
  entries
}
