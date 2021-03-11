const assert = require('assert')
const uuid = require('uuid-random')
const node = require('../lib/gist/node')

describe('object class compliance', function () {

  const classes = [
    ['object', node]
  ]

  classes.forEach(([type, { MBR, Entry, Node }]) => {

    describe(`MBR (${type})`, function () {
      it('#encode/decode', function () {
        const expected = [[0, 5], [10, 15]]
        const actual = MBR.encode(expected).decode()
        assert.deepStrictEqual(actual, expected)
      })

      it('#area', function() {
        const expected = MBR.encode([[0, 5], [10, 15]]).area()
        assert.strictEqual(100, expected)
      })

      it('#union', function() {
        const entries = [
          Entry.encode({ mbr: [[0, 5], [10, 15]], id: uuid() }),
          Entry.encode({ mbr: [[-2, 5], [12, 5]], id: uuid() }),
          Entry.encode({ mbr: [[0, -5], [10, 25]], id: uuid() })
        ]

        const actual = MBR.union(entries).decode()
        const expected = [[-2, -5], [12, 25]]
        assert.deepStrictEqual(actual, expected)
      })
    })

    describe(`Entry (${type})`, function () {
      it('#encode/decode', function () {
        const mbr = [[0, 5], [10, 15]]
        const id = uuid()
        const expected = { mbr, id }
        const actual = Entry.encode(expected).decode()
        assert.deepStrictEqual(actual, expected)
      })

      it('#id', function() {
        const id = uuid.bin()
        const mbr = MBR.encode([[0, 5], [10, 15]])
        const entry = Entry.of(mbr, id)
        assert.deepStrictEqual(entry.id(), id)
      })

      it('#xmin,ymin,xmax,ymax', function () {
        const entry = Entry.encode({ mbr: [[0, 5], [10, 15]], id: uuid() })
        assert.strictEqual(entry.xmin(), 0)
        assert.strictEqual(entry.ymin(), 5)
        assert.strictEqual(entry.xmax(), 10)
        assert.strictEqual(entry.ymax(), 15)
      })

      it('#of', function () {
        const mbr = MBR.encode([[0, 5], [10, 15]])
        const id = uuid.bin()
        const entry = Entry.of(mbr, id)
        assert.deepStrictEqual(entry.id(), id)
        // TODO: better assertions?
        assert(entry)
      })

      it('#union', function () {
        const E1 = Entry.encode({ mbr: [[0, 5], [10, 15]], id: uuid() })
        const E2 = Entry.encode({ mbr: [[-2, 2], [8, 25]], id: uuid() })
        const actual = E1.union(E2).decode()
        assert.notDeepStrictEqual(actual, [[-2, 5], [10, 25]])
      })

      it('#area', function () {
        const entry = Entry.encode({ mbr: [[-2, 2], [8, 25]], id: uuid() })
        const actual = entry.area()
        assert.strictEqual(actual, 230)
      })

      it('#setMBR/getMBR', function () {
        const initial = [[0, 5], [10, 15]]
        const entry = Entry.encode({ mbr: initial, id: uuid() })
        assert.deepStrictEqual(entry.getMBR().decode(), initial)
        const expected = [[-1, -5], [1, 2]]
        entry.setMBR(MBR.encode(expected))
        assert.deepStrictEqual(entry.getMBR().decode(), expected)
      })

      it('#intersects', function () {
        const entry = Entry.encode({ mbr: [[0, 5], [10, 15]], id: uuid() })
        assert.strictEqual(entry.intersects([[-2, 3], [-1, 4]]), false)
        assert.strictEqual(entry.intersects([[2, 3], [8, 20]]), true)
      })
    })

    describe(`Node (${type})`, function () {
      it('#of', function () {
        const id = uuid.bin()
        const node = Node.of(9, id, [], true)
        assert.strictEqual(node.capacity(), 9)
        assert.strictEqual(node.id(), id)
        assert.deepStrictEqual(node.length(), 0)
        assert.strictEqual(node.leaf(), true)
      })

      it('#add', function () {
        const node = Node.of(9, uuid.bin(), [], true)
        const entry = Entry.encode({ mbr: [[0, 5], [10, 15]], id: uuid() })
        node.add([entry])
        assert.deepStrictEqual(node.length(), 1)
      })

      it('#entries', function () {
        const node = Node.of(9, uuid.bin(), [], true)
        const expected = { mbr: [[0, 5], [10, 15]], id: uuid() }
        const entry = Entry.encode(expected)
        node.add([entry])
        assert.deepStrictEqual(node.entries()[0].decode(), expected)
      })
    })
  })
})