module.exports = {
  queryPostgres : function (queryStr, queryParams, callback ){
    require('es6-promise').polyfill();
    var pg = require('pg');

    var config = {
      user: 'postgres',
      database: 'ChatBotEventNotify',
      password: '',
      host: 'localhost',
      port: 5432,
      max: 10,
      idleTimeoutMillis: 10000,
    };

    var pool = new pg.Pool(config);

    pool.connect(function(err, client, done) {
      if(err) {
        console.error("[ POSTGRES CONNECT ERR: " + err + " ]");
        callback(err);
      }

      client.query(queryStr, queryParams,function(err, result){
        if (!err){
          callback(err, result.rows);
        }
        else{
          console.error("[ POSTGRES QUERY ERR: " + err + " ]");
          return callback(err);
        }
        done();
      });
    });
  }

};

// invocation: var pgquery = require('./pgquery.js')
// query postgres: pgquery.queryPostgres ('SELECT * FROM 1;', [], function (err, resp){ // add code to handle response here })

