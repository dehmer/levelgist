const uuid = require('uuid-random')
const levelup = require('levelup')
const memdown = require('memdown')
const leveldown = require('leveldown')
const encode = require('encoding-down')
const encoding = require('../lib/gist/encoding')

module.exports = {
  'leveldown/json': () => levelup(encode(leveldown(`db/${uuid()}`), encoding)),
  'memdown/json': () => levelup(encode(memdown(), encoding)),
}
