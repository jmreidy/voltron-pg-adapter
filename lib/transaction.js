module.exports = Transaction;

function Transaction(adapter) {
  this.adapter = adapter;
}

Transaction.prototype = Object.create(Object, {
  constructor: Transaction,

  execute: {
    value: function () {
      var self = this;
      return self.adapter.retrieveClient(self.adapter.config)
        .then(function (c) {
          self.client = c;
          c.pauseDrain();
          return self.adapter.executeQuery('BEGIN', c);
        })
        .then(function () {
          return self.client;
        });
    }
  },

  client: {
    set: function (c) {
      this._client = c;
    },
    get: function () {
      return this._client;
    }
  },

  commit: {
    value: function (value) {
      var self = this;
      var client = self.client;
      return self.adapter.executeQuery('COMMIT', client)
        .then(function () {
          client.resumeDrain();
          return value;
        });
    }
  },

  end: {
    value: function (promise) {
      return promise.then(
        this.commit.bind(this),
        this.rollback.bind(this)
      );
    }
  },

  rollback: {
    value: function (err) {
      var self = this;
      var client = self.client;
      return self.adapter.executeQuery('ROLLBACK', client)
        .then(function () {
          console.log('rolled back');
          console.log(err.stack);
          client.resumeDrain();
          throw err;
        });
    }
  }
});

