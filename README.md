[![Build Status](https://travis-ci.org/jmreidy/voltron-pg-adapter.png)](https://travis-ci.org/jmreidy/voltron-pg-adapter)

# voltron-postgres-adapter

voltron-postgres-adapter is a Promise-focused adapter for connecting to PostgreSQL databases. It makes use
of [node-sql](https://github.com/brianc/node-sql),
[node-postgres](https://github.com/brianc/node-postgres), and
[Q](https://github.com/kriskowal/q). It's a componeont of
[voltron.io](https://github.com/jmreidy/voltron.io), but can be used
independently of any other voltron components.

While it's fairly easy to use the node-postgres driver directly, this adapter provides an interface to simplify common actions.

## Getting Started

Install with NPM:

```shell
npm install --save voltron-postgres-adapter
```

## Usage

Adapters should be instantiated on a one-to-one basis with tables in your applicaton's DB. A simple example
would be the following:

```javascript
var PostgresAdapter = require('voltron-postgres-adapter');

var adapter = new PostgresAdapter('users');

adapter.executeQuery('SELECT * from users')
  .then(function (result) {
    //do something with result.rows
  });
```

Or a query with values:

```javascript
adapter.executeQuery('SELECT * from users WHERE users.name = $1', ['joe']);
```

Values supplied to executeQuery are parsed in order to avoid common mistakes -
arrays are cast as stirngs with '{' delimiters, and commas and single quotes
are escaped.

### Integration with node-sql

voltron-postgres-adapter's power is greatly improved by its integration with node-sql, which allows for significantly more concise queries.

The following example demonstrates a complex query with node-sql:

```javascript
var PostgresAdapter = require('voltron-postgres-adapter');

var userAdapter = new PostgresAdapter('users', ['user_id', 'name']);
var postAdapter = new PostgresAdapter('posts', ['post_id', 'author_id']);

var Users = userAdapter.relation;
var Posts = postAdapter.relation;

adapter.executeQuery(Users.where(Posts.author_id.equals(Users.user_id)));
  .then(function (result) {
    //do something with result.rows
  });
```

That node-sql query above is automatically issued as the SQL:

```sql
SELECT "users".* FROM "users" WHERE ("posts"."author_id" = "users"."user_id")
```

See [the node-sql project page](https://github.com/brianc/node-sql) for more information.

### Transactions

voltron-postgres-adapter aims to make transactions significantly easier. The basic logic is:

1. Retrieve a node-postgres client from the connection pool, and retain it.
1. Issue queries in the transaction as normal.
1. End the transaction with a ROLLBACK or COMMIT depending on query results
1. Release the node-postgres client back to the connection pool.

In practice...

```javascript
var client;
var transaction = userAdapter.startTransaction()
var promise = transaction
  .begin()
  .then(function (c) {
    client = c;
    return OtherModel.doSomething(params, client);
  })
  .then(function (resultOfLastAction) {
    return doSomethingElse(params, client);
  })

transaction.end(promise);
```

The retained client instance is also stored as a property on the transaction,
so the transaction itself can be passed as an argument, from which a chain of
actions can be executed.

## Interface

### PostgresAdapter

#### Constructor
Arguments: `tableName[String], fields[Array<String>]`

Instantiate a new PostgresAdapter, setting the `tableName` on the new instance.
If fields are passed, a `node-sql` relation is created for the provided `tableName` and `fields`.


#### PostgresAdapter::configure
Arguments: `config[node-postgres driver configuration object]`

Global configuration function that changes the config for ALL instances of adapters.
See [the node-postgres docs](https://github.com/brianc/node-postgres/wiki/Client#new-client_object_-config--client) for further information.

#### config (get/set)
Arguments: `config[node-postgres driver configuration object]`

Configure a Postgres connection for a single adapter instance.

#### executeQuery
Arguments: `query[String OR Object], client[node-postgres client]`

Execute a query. If a client is provided, use that client to issue the query,
otherwise one will be retrieved from the pool. A query argument is required,
and can be in the form of:

* a String
* a node-sql query object (has `toQuery` interface)
* a generic Object (with `text: String` and optional `values: Array`)

Values will be parsed for common syntax errors: arrays and nested arrays will be
cast to Strings with '{' delimeters, and commas and quotes will be parameterized.

#### batchQuery
Arguments: `queries[Array<String> or Array<Object>], client[node-postgres client]`

Execute a series of queries with a single call to the DB. Works the same as
`executeQuery`, except queries are batched.

#### startTransaction
Arguments: n/a

Instantiate a new `Transaction`, passing the adapter instance. Returns the transaction.

### Transaction

#### begin
Arguments: n/a

Begin a transaction by retrieving a client from the pool, pausing drain on it, and issuing a `BEGIN` query.
Returns a promise that resolves with the client.

#### commit
Arguments: n/a

Issue a `COMMIT` query with the transaction's client.

#### rollback
Arguments: n/a

Issue a `ROLLBACK` query with the transaction's client.

#### end
Arguments: `promise[promise from executed queries]`

At the resolution or rejection of a query's promise, end the transaction with a
`COMMIT` (for a resolved promise) or `ROLLBACK` (for rejected promise).
Returns a promise that either resolves with the value of the last query's
promise, or is rejected with the value of the last query promise's error.

## Release History

### v0.2
  - First stable release, test coverage, and documentation

## License
Copyright (c) 2013 Justin Reidy Licensed under the MIT license.
