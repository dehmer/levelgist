const uuid = require('uuid-random')
const levelup = require('levelup')
const memdown = require('memdown')
const leveldown = require('leveldown')
const encode = require('encoding-down')

module.exports = {
  'leveldown/json': () => levelup(encode(leveldown(`db/${uuid()}`), { valueEncoding: 'json' })),
  'memdown/json': () => levelup(encode(memdown(), { valueEncoding: 'json' })),
}
