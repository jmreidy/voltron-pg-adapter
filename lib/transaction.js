var Q = require('q');;

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
    value: function () {
      var self = this;
      var client = self.client;
      return self.adapter.executeQuery('COMMIT', client)
        .then(function () {
          client.resumeDrain();
        });
    }
  },

  end: {
    value: function (promise) {
      var self = this;
      var result;
      var err;
      var token = Q.defer();
      promise
        .then(function (value) {
          result = value;
          return self.commit();
        }, function (value) {
          err = value;
          return self.rollback();
        })
        .then(function () {
          if (err) {
            token.reject(err);
          }
          else {
            token.resolve(result);
          }
        });

      return token.promise;
    }
  },

  rollback: {
    value: function (err) {
      var self = this;
      var client = self.client;
      return self.adapter.executeQuery('ROLLBACK', client)
        .then(function () {
          client.resumeDrain();
        });
    }
  }
});

