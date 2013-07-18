var PostgresAdapter = require('../');

describe('voltron-postgres-adapter', function () {

  describe('creating a new adapter instance', function () {

    it('defines the table name on the adapter', function () {
      var adapter = new PostgresAdapter('fakeTable');
      expect(adapter.tableName).to.equal('fakeTable');
    });

    context('if field names are passed', function () {
      it('defines a node-sql table', function () {
        var adapter = new PostgresAdapter('users', ['name', 'address']);
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

  describe('executeQuery', function () {
    var adapter;
    var stubClient;

    beforeEach(function () {
      adapter = new PostgresAdapter();
      stubClient = {
        query: function (query, values, cb) {
          cb();
        }
      };
    });


    it('throws an error if a query is not provided', function (done) {
      expect(adapter.executeQuery()).to.be.rejected.with('executeQuery must be supplied with a query').and.notify(done);
    });

    context('for node-sql queries', function () {

      it('throws an error if a values array is not provided');

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
      it('throw an error if a query object is provided without text', function (done) {
        Q.all([
          expect(adapter.executeQuery({})).to.be.rejected.with('query.text must be specified'),
          expect(adapter.executeQuery({text: null})).to.be.rejected.with('query.text must be specified'),
          expect(adapter.executeQuery({text: ''})).to.be.rejected.with('query.text must be specified')
        ]).nodeify(done);
      });
    });


    it('uses the supplied client', function (done) {
      Sinon.spy(stubClient, 'query');
      expect(adapter.executeQuery('SELECT', stubClient)).to.be.fulfilled
        .then(function () {
          expect(stubClient.query).to.have.been.calledOnce;
          expect(stubClient.query).to.have.been.calledWith('SELECT');
        })
        .nodeify(done);
    });



    it('queries the database');


    it('gets a client if none is provided');

    it('returns a promise that is resolved with the query result');

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


});
