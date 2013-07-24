var Transaction = require('../lib/transaction');

describe('Transactions', function () {
  var client;
  var adapter;
  var transaction;

  beforeEach(function () {
    this.client = client = Sinon.stub({
      pauseDrain: function () {},
      resumeDrain: function () {}
    });

    adapter = Sinon.stub({
      retrieveClient: function () {},
      executeQuery: function () {}
    });

    adapter.retrieveClient.returns(Q.when(client));
    adapter.executeQuery.returns(Q.when());


    transaction = new Transaction(adapter);
  });

  describe('#excute', function () {
    var promise;

    beforeEach(function () {
      promise = transaction.execute()
    });

    it('retrieves a client from the pool', function (done) {
      promise.then(function () {
        expect(adapter.retrieveClient).to.have.been.calledOnce;
      })
      .nodeify(done);
    });

    it('pauses pool-draining on the client', function (done) {
      promise.then(function () {
        expect(client.pauseDrain).to.have.been.calledOnce;
      })
      .nodeify(done);
    });

    it('issues a BEGIN query', function (done) {
      promise.then(function () {
        expect(adapter.executeQuery).to.have.been.calledWith('BEGIN');
      })
      .nodeify(done);
    });

    it('resolves with the paused client', function (done) {
      promise.then(function (response) {
        expect(response).to.equal(client);
      })
      .nodeify(done);
    });
  });

  describe('#commit', function () {
    var promise;

    beforeEach(function () {
      transaction.client = client;
      this.promise = promise = transaction.commit();
    });

    it('sends a COMMIT query', function (done) {
      promise.then(function () {
        expect(adapter.executeQuery).to.have.been.calledWith('COMMIT');
      })
      .nodeify(done);
    });

    itResumesPoolDraining();
  });

  describe('rollback', function () {
    var promise;

    beforeEach(function () {
      transaction.client = client;
      this.promise = promise = transaction.rollback();
    });

    it('sends a ROLLBACK query', function (done) {
      promise.then(function () {
        expect(adapter.executeQuery).to.have.been.calledWith('ROLLBACK');
      })
      .nodeify(done);
    });

    itResumesPoolDraining();
  });

  describe('#end', function () {

    context('for a successful transaction', function () {
      var promise;
      var dbResult = {rows: ['a']};
      var result = Q.when(dbResult);

      beforeEach(function () {
        transaction.client = client;
        promise = transaction.end(result);
      });

      it('sends a COMMIT query', function (done) {
        promise.then(function () {
          expect(adapter.executeQuery).to.have.been.calledWith('COMMIT');
        })
        .nodeify(done);
      });

      it('resolves with the last result', function (done) {
        promise.then(function (val) {
          expect(val).to.deep.equal(dbResult);
        })
        .nodeify(done);
      });
    });

    context('for a failed transaction', function () {
      var promise;
      var msg = 'validation error';
      var deferred = Q.defer();
      deferred.reject(new Error(msg));
      var result = deferred.promise;

      beforeEach(function () {
        transaction.client = client;
        promise = transaction.end(result);
      });

      it('sends a ROLLBACK query', function (done) {
        promise.then(function () {
          throw new Error('should not resolve');
        }, function () {
          expect(adapter.executeQuery).to.have.been.calledWith('ROLLBACK');
        })
        .nodeify(done);
      });

      it('rejects with the failure message', function (done) {
        expect(promise).to.be.rejected.with(msg).and.notify(done);
      })
    });
  });

});

function itResumesPoolDraining () {
  it('resumes pool-draining on the client', function (done) {
    var client = this.client;
    this.promise.then(function () {
      expect(client.resumeDrain).to.have.been.calledOnce;
    })
    .nodeify(done);
  });
}
