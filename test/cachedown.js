const util = require('util')
const AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN

function CacheDown (backend) {
  AbstractLevelDOWN.call(this)
  this.backend_ = backend
}

// Our new prototype inherits from AbstractLevelDOWN
util.inherits(CacheDown, AbstractLevelDOWN)

CacheDown.prototype._open = function (options, callback) {
  this._store = {}
  process.nextTick(callback)
}

CacheDown.prototype._serializeKey = function (key) {
  // console.log('[CacheDown] _serializeKey', key)
  // return key.toString('hex')
  return key
}

CacheDown.prototype._put = function (key, value, options, callback) {
  // console.log('[CacheDown] _put', key, value)
  this._store[key] = value
  process.nextTick(callback)
}

CacheDown.prototype._get = function (key, options, callback) {
  // console.log('[CacheDown] _get', key, options, callback)
  const value = this._store[key]
  if (value) return process.nextTick(callback, null, value)
  this.backend_.get(key).then(value => {
    this._store[key] = value
    process.nextTick(callback, null, value)
  })
}

CacheDown.prototype._del = function (key, options, callback) {
  delete this._store[key]
  process.nextTick(callback)
}

CacheDown.prototype._batch = function () {
  throw new Error('unsupported')
}

module.exports = (backend) => new CacheDown(backend)
