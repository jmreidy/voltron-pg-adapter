var PostgresAdapter = require('../');

describe('voltron-postgres-adapter', function () {
  var adapter;
  var dbResult;
  var stubClient;

  beforeEach(function () {
    adapter = new PostgresAdapter();
    dbResult = {rows: []};
    stubClient = {
      query: function (query, values, cb) {
        cb(null, dbResult);
      }
    };
    Sinon.spy(stubClient, 'query');
  });

  describe('creating a new adapter instance', function () {

    it('defines the table name on the adapter', function () {
      adapter = new PostgresAdapter('fakeTable');
      expect(adapter.tableName).to.equal('fakeTable');
    });

    context('if field names are passed', function () {
      it('defines a node-sql table', function () {
        adapter = new PostgresAdapter('users', ['name', 'address']);
        expect(adapter.relation.name).to.exist;
        expect(adapter.relation.address).to.exist;
        expect(adapter.relation.select).to.exist;
      });
    });

  });

  describe('#configure', function () {
    it('configures a single adapter instance', function () {
      var config = {foo: 'bar'};
      var config2 = {bar: 'foo'};
      var adapterA = new PostgresAdapter();
      var adapterB = new PostgresAdapter();
      adapterA.config = config;
      adapterB.config = config2;
      expect(adapterA.config).to.deep.equal(config);
      expect(adapterB.config).to.deep.equal(config2);
    });
  });

  describe('#executeQuery', function () {
    it('throws an error if a query is not provided', function (done) {
      Sinon.spy(adapter, 'retrieveClient');
      adapter.executeQuery()
        .then(
          function () { throw new Error('should not resolve');},
          function (err) {
            expect(err.message).to.equal('executeQuery must be supplied with a query');
            expect(adapter.retrieveClient).to.not.have.been.called;
            expect(stubClient.query).to.not.have.been.called;
          })
        .nodeify(done);
    });

    context('for node-sql queries', function () {
      itQueriesTheDatabase({
        toQuery: function () {
          return {text: 'SELECT', values: []};
        }
      });

      it('converts node-sql queries to a query object', function (done) {
        var query = { toQuery: function () {} };
        Sinon.stub(query, 'toQuery').returns({text: 'SELECT'});
        adapter.executeQuery(query, stubClient).then(function () {
          expect(query.toQuery).to.have.been.calledOnce;
        })
        .nodeify(done);
      });
    });

    context('for generic object queries', function () {

      itQueriesTheDatabase({text: 'SELECT $1 from test', values: ['foo']});

      it('throws an error if a query object is provided without text', function (done) {
        var error = 'query.text must be specified';
        Q.all([
          expect(adapter.executeQuery({})).to.be.rejected.with(error),
          expect(adapter.executeQuery({text: null})).to.be.rejected.with(error),
          expect(adapter.executeQuery({text: ''})).to.be.rejected.with(error)
        ]).nodeify(done);
      });
    });

    context('for string queries', function () {
      itQueriesTheDatabase('SELECT *');
    });


    it('uses the supplied client', function (done) {
      expect(adapter.executeQuery('SELECT', stubClient)).to.be.fulfilled
        .then(function () {
          expect(stubClient.query).to.have.been.calledOnce;
          expect(stubClient.query).to.have.been.calledWith('SELECT');
        })
        .nodeify(done);
    });


    it('gets a client if none is provided', function (done) {
      Sinon.stub(adapter, 'retrieveClient').returns(Q.when(stubClient));
      adapter.executeQuery('SELECT').then(function () {
        expect(adapter.retrieveClient).to.have.been.calledOnce;
        expect(stubClient.query).to.have.been.calledWith('SELECT');
        adapter.retrieveClient.restore();
      })
      .nodeify(done);
    });

    it('returns a promise that is resolved with the query result', function (done) {
      adapter.executeQuery('SELECT', stubClient).then(function (result) {
        expect(result).to.deep.equal(dbResult);
      })
      .nodeify(done);
    });

    function itQueriesTheDatabase (query) {
      var text;
      var values;
      if (query.toQuery) {
        var q = query.toQuery();
        text = q.text;
        values = q.values;
      }
      else if (typeof query === 'string') {
        text = query;
        values = [];
      }
      else {
        text = query.text;
        values = query.values;
      }


      it('queries the database', function (done) {
        adapter.executeQuery(query, stubClient).then(function () {
          expect(stubClient.query).to.have.been.calledWith(text, values);
        })
        .nodeify(done);
      });
    }



  });

  describe('#batchQuery', function () {
    context('if queries are not provided', function () {
      it('throws an error', function (done) {
        var error = 'batchQuery must be supplied with an array of queries';
        Q.all([
          expect(adapter.batchQuery()).to.be.rejected.with(error),
          expect(adapter.batchQuery([])).to.be.rejected.with(error),
          expect(adapter.batchQuery({})).to.be.rejected.with(error)
        ]).nodeify(done);
      });

      it('doesn\'t execute any queries', function (done) {
        Sinon.spy(adapter, 'retrieveClient');
        adapter.batchQuery()
          .then(
            function () { throw new Error('should not resolve');},
            function (err) {
              expect(adapter.retrieveClient).to.not.have.been.called;
              expect(stubClient.query).to.not.have.been.called;
            })
          .nodeify(done);
      });


    });

    it('uses the supplied client');

    it('gets a client if none is provided');

    it('queues all queries in the batch');
  });

  describe('#startTransaction', function () {
    it('creates a new Transaction');
  });



  describe('::configure', function () {
    it('configures the global Adapter prototype', function () {
      var config = {foo: 'bar'};
      PostgresAdapter.configure(config);
      var adapter = new PostgresAdapter('test');
      expect(adapter.config).to.deep.equal(config);
      expect(PostgresAdapter.prototype.config).to.deep.equal(config);
    });

  });

  function itParsesQueryArrays (query) {
    it('parses array values in the query');
    it('parses nested array values in the query');
  }

  function itEscapesQueryValues (query) {
    it('escapes commas in the query');
    it('escapes double quotes in the query');
  }


});
