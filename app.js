// Include the cluster module
var cluster = require('cluster');


// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for terminating workers
    cluster.on('exit', function (worker) {

        // Replace the terminated workers
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();

    });

// Code to run if we're in a worker process
} else {
    var AWS = require('aws-sdk');
    var express = require('express');
    var bodyParser = require('body-parser');

    AWS.config.region = process.env.REGION

    var sns = new AWS.SNS();
    var ddb = new AWS.DynamoDB();

    var ddbTable =  process.env.STARTUP_SIGNUP_TABLE;
    var ddbbeerTable =  process.env.CRAFTY_BEER_TABLE;

    var snsTopic =  process.env.NEW_SIGNUP_TOPIC;

    var app = express();

    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(bodyParser.urlencoded({extended:false}));

    app.get('/', function(req, res) {
        res.render('index', {
            static_path: 'static',
            theme: process.env.THEME || 'flatly',
            flask_debug: process.env.FLASK_DEBUG || 'false'
        });
    });

    app.get('/beers', function(req, res) {
        res.render('beers', {
            static_path: 'static',
            theme: process.env.THEME || 'flatly',
            flask_debug: process.env.FLASK_DEBUG || 'false'
        });
    });

    app.get('/api/beers/ipa', function(req, res) {

      var beerType = req.url.slice(7)


      console.log(beerType)

      var params = {
      Key: {
       "type": {
         S: "IPA"
        }
      },
      TableName: "CraftyBeersTable"
     };
     ddb.getItem(params, function(err, data) {
       if (err) console.log(err, err.stack); // an error occurred
       else   {
         console.log(data);
         res.send(data)
       }            // successful response
       /*
       data = {
        Item: {
         "AlbumTitle": {
           S: "Songs About Life"
          },
         "Artist": {
           S: "Acme Band"
          },
         "SongTitle": {
           S: "Happy Day"
          }
        }
       }
       */
     });

  })



    app.post('/signup', function(req, res) {
        var item = {
            'email': {'S': req.body.email},
            'name': {'S': req.body.name},
            'preview': {'S': req.body.previewAccess},
            'theme': {'S': req.body.theme}
        };

        ddb.putItem({
            'TableName': ddbTable,
            'Item': item,
            'Expected': { email: { Exists: false } }
        }, function(err, data) {
            if (err) {
                var returnStatus = 500;

                if (err.code === 'ConditionalCheckFailedException') {
                    returnStatus = 409;
                }

                res.status(returnStatus).end();
                console.log('DDB Error: ' + err);
            } else {
                sns.publish({
                    'Message': 'Name: ' + req.body.name + "\r\nEmail: " + req.body.email
                                        + "\r\nPreviewAccess: " + req.body.previewAccess,
                    'Subject': 'New Crafty API User SignUp!',
                    'TopicArn': snsTopic
                }, function(err, data) {
                    if (err) {
                        res.status(500).end();
                        console.log('SNS Error: ' + err);
                    } else {
                        res.status(201).end();
                    }
                });
            }
        });
    });

    app.post('/beers', function(req, res) {
        var item = {
            'type': {'S': req.body.type},
            'name': {'S': req.body.name},
            'abv': {'N': req.body.abv},
            'description': {'S': req.body.description}
        };

        ddb.putItem({
            'TableName': ddbbeerTable,
            'Item': item,
            'Expected': { type: { Exists: false } }
        }, function(err, data) {
            if (err) {
                var returnStatus = 500;

                if (err.code === 'ConditionalCheckFailedException') {
                    returnStatus = 409;
                }

                res.status(returnStatus).end();
                console.log('DDB Error: ' + err);
            } else {
                console.log('Success')
            }
        })
    });

    var port = process.env.PORT || 3000;

    var server = app.listen(port, function () {
        console.log('Server running at http://127.0.0.1:' + port + '/');
    });
}
