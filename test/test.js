var vows = require('vows');
var nock = require('nock');
var vcap = require('../index.js');
var assert = require('assert');

vows.describe('auth').addBatch({
  'When I try to login with invalid credentials': {
    topic: function() {
      nock('http://endpoint.example.com').post('/users/me/tokens', {
        password: 'some random 1nvalid password'
      }).reply(403, '');

      var callback = this.callback;
      var client = new vcap.Client('http://endpoint.example.com');
      client.login('me','some random 1nvalid password', function(err, token) {
        callback(null, {
          err: err,
          token: token,
          client: client
        });
      });
    },
    'An error should be raised': function(topic) {
      assert.isNotNull(topic.err);
    },
    'No token should be provided by the server': function(topic) {
      assert.isFalse(!!topic.token);
      assert.isFalse(!!topic.client.auth_token);
    },
    'The status code should be 403': function(topic) {
      assert.equal(topic.err.statusCode, 403);
    },
    'The code should be Unauthorized': function(topic) {
      assert.equal(topic.err.code, "Unauthorized");
    },
    'The error message should be Invalid user or password': function(topic) {
      assert.equal(topic.err.message, 'Invalid user or password');
    }
  },
  'When I try to login with valid credentials': {
    topic: function() {
      nock('http://endpoint.example.com').post('/users/cooluser/tokens', {
        password: 'valid password'
      }).reply(200, {
        token: 's0m3 val1d t0k3n'
      });

      var callback = this.callback;
      var client = new vcap.Client('http://endpoint.example.com');
      client.login('cooluser', 'valid password', function(err, token) {
        callback(null, {
          err: err || null,
          token: token,
          client: client
        });
      });
    },
    'No error should be raised': function(topic) {
      assert.isNull(topic.err);
    },
    'The auth token should be given in the callback and held in the client': function(topic) {
      assert.equal(topic.token, 's0m3 val1d t0k3n');
      assert.equal(topic.client.auth_token, 's0m3 val1d t0k3n');
    }
  }
}).export(module);

vows.describe('apps').addBatch({
  'When I invoke listApplications': {
    'And I still have not created any apps': {
      topic: function() {
        nock('http://endpoint.example.com').matchHeader('authorization', 'SuperAuthToken').get('/apps').reply(200, []);
        var callback = this.callback;
        var client = new vcap.Client('http://endpoint.example.com', 'SuperAuthToken');
        client.listApplications(function(err, list) {
          callback(null, {
            err: err || null,
            list: list
          });
        });
      },
      'Then there should not be errors': function(topic) {
        assert.isNull(topic.err);
      },
      'And the list should be an empty array': function(topic) {
        assert.isEmpty(topic.list);
      }
    },
    'And I have apps under my user': {
      topic: function() {
        nock('http://endpoint.example.com').matchHeader('authorization', 'SuperAppsToken').get('/apps').reply(200, [
          {
            name: "App1",
            state: "RUNNING",
            instances: 1,
            services: ['my service 1']
          },
          {
            name: "App2",
            state: "STOPPED",
            instances: 2,
            services: []
          }
        ]);
        var callback = this.callback;
        var client = new vcap.Client('http://endpoint.example.com', 'SuperAppsToken');
        client.listApplications(function(err, list) {
          callback(null, {
            err: err || null,
            list: list
          });
        });
      },
      'Then there should not be errors': function(topic) {
        assert.isNull(topic.err);
      },
      'And the length of the list should match the number of apps in my profile': function(topic) {
        assert.lengthOf(topic.list, 2);
      },
      'And the attributes of the applications should match': function(topic) {
        assert.deepEqual(topic.list, [
          {
            name: "App1",
            state: "RUNNING",
            instances: 1,
            services: ['my service 1']
          },
          {
            name: "App2",
            state: "STOPPED",
            instances: 2,
            services: []
          }
        ]);
      }
    }
  }
}).export(module);
