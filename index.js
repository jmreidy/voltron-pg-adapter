var pg = require('pg');
var sql = require('sql');
var Q = require('q');
var Transaction = require('./lib/transaction');

module.exports = PostgresAdapter;


function PostgresAdapter(tableName, fields) {
  this.tableName = tableName;
  this.relation = sql.define({
    name: tableName,
    columns: fields
  });
}


/**
 * Universal configuration for all generated adapters
 */
PostgresAdapter.configure = function (config) {
  this.prototype.config = config;
};

/*
 * Convenience function to decorate a Model with adapter functions,
 * along with setting up a new adapter.
 * Requires: The Model Fn, options.tableName, options.columns array,
 * options.valueFn (which is passed the model instance on insertion),
 * optionally requires options.primaryKey
 * Requires model instances to a have this.id function
 *
 */
PostgresAdapter.decorate = function (Model, options) {
  var adapter = new PostgresAdapter(options.tableName, options.columns);
  var relation = adapter.relation;
  var pk = options.primaryKey;

  //statics
  if (pk) {
    Model.findById = function (id) {
      var query = relation
        .select(relation.star())
        .where(relation[pk].equals(id))
        .toQuery();
      return adapter.executeQuery(query)
        .then(function (result) {
          return new Model(result.rows[0]);
        });
    };
  }
  Model.all = function () {
    var query = relation.select(relation.star()).toQuery();
    return adapter.executeQuery(query)
      .then(function (result) {
        return result.rows.map(function (row) {
          return new Model(row);
        });
      });
  };

  //instance
  if (pk) {
    var values = function (model) {
      return options.valueFn.call(model);
    };
    Model.prototype.save = function (client) {
      var query;
      var model = this;
      if (model.id) {
        query = relation
          .update(values(model))
          .where(relation[pk].equals(model.id))
          .returning(pk);
      }
      else {
        query = relation
          .insert(values(model))
          .returning(pk);
      }
      return adapter.executeQuery(query, client)
        .then(function (result) {
          if (pk && result.rows && result.rows.length > 0) {
            var id = result.rows[0][pk];
            if (model.updateId) {
              model.updateId(id);
              return model;
            }
            else {
              return id;
            }
          }
        });
    };
    Model.prototype.del = function (client) {
      var query = relation
        .delete()
        .where(relation[pk].equals(this.id));
      return adapter.executeQuery(query, client);
    };
  }

  return adapter;
};


PostgresAdapter.prototype = Object.create(Object, {
  constructor: PostgresAdapter,

  config: {
    set: function (config) {
      this._config = config;
    },
    get: function () {
      return this._config;
    }
  },

  /**
   * Execute a query given the SQL string and values.
   * If supplied with a client, will use it; otherwise,
   * will retrieve one from the pool.

   * @param query A Node-SQL Query object
   * @param query.text The SQL to execute
   * @param query.values SQL query parameters
   * @param {pg.client} [client] Postgres client
   * @returns {Promise}
   */
  executeQuery: {
    value: function (query, client) {
      var promise;
      var self = this;
      if (!query) {
        return Q.when(function () {
          new Error('executeQuery must be supplied with a query');
        });
      }

      if (!client) {
        promise = self.retrieveClient(this.config)
          .then(function (client) {
            return self.executeQuery(query, client);
          });
      }
      else {
        query = prepareQuery(query);
        return Q.ninvoke(client, 'query', query.text, query.values);
      }
      return promise;
    }
  },

  batchQuery: {
    value: function (queries, client) {
      var promise;
      var self = this;
      if (!queries || queries.length < 1) {
        return Q.when(function () {
          new Error('batchQuery must be supplied with queries');
        });
      }

      if (!client) {
        promise = self.retrieveClient(this.config)
          .then(function (client) {
            return self.executeQuery(query, client);
          });
      }
      else {
        var text = '';
        queries.forEach(function (query, idx) {
          query = prepareQuery(query);
          if (idx < queries.length - 1) {
            client.query(query.text, query.values);
          }
          else {
            promise = Q.ninvoke(client, 'query', query.text, query.values);
          }
        });
      }
      return promise;
    }
  },


  /**
   * Create a new transaction and pass it a client.
   * A transaction is just a promise, that opens and closes
   * a client from the pool as approrpriate.
   */
  startTransaction: {
    value: function () {
      return new Transaction(this);
    }
  },

  retrieveClient: {
    value: function (config) {
      return Q.ninvoke(pg, 'connect', config);
    }
  }
});


//PRIVATE
function prepareQuery (query) {
  if (!query) {
    query = {};
  }
  else if (query.toQuery) {
    query = query.toQuery();
  }
  else if (typeof query === 'string') {
    query = {text: query, values: []};
  }
  query.values = parseValues(query.values);
  return query;
}

function parseValues (values) {
  if (!values) {
    return [];
  }
  return values.map(function (val) {
    if (Array.isArray(val)) {
      val = val.map(function (item) {
        if (Array.isArray(item)) {
          return parseValues(item);
        }
        else {
          if (item.replace) {
            item = item.replace(/,/g,'\\,');
            item = item.replace(/\"/g,'\\"');
          }
          return item;
        }
      });
      val = '{' + val.join(',') + '}';
    }
    return val;
  });
}
