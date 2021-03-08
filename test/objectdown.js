const util = require('util')
const AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN

function ObjectDown () {
  AbstractLevelDOWN.call(this)
}

// Our new prototype inherits from AbstractLevelDOWN
util.inherits(ObjectDown, AbstractLevelDOWN)

ObjectDown.prototype._open = function (options, callback) {
  this._store = {}
  process.nextTick(callback)
}

ObjectDown.prototype._serializeKey = function (key) {
  return key.toString('hex')
}

ObjectDown.prototype._put = function (key, value, options, callback) {
  this._store[key] = value
  process.nextTick(callback)
}

ObjectDown.prototype._get = function (key, options, callback) {
  var value = this._store[key]

  if (value === undefined) {
    // 'NotFound' error, consistent with LevelDOWN API
    return process.nextTick(callback, new Error('NotFound'))
  }

  process.nextTick(callback, null, value)
}

ObjectDown.prototype._del = function (key, options, callback) {
  delete this._store[key]
  process.nextTick(callback)
}

module.exports = ObjectDown
