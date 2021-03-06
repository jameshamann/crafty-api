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
    var cors = require('cors')

    var uuid = require('node-uuid');


    AWS.config.region = process.env.REGION

    var sns = new AWS.SNS();
    var ddb = new AWS.DynamoDB();

    var ddbTable =  process.env.STARTUP_SIGNUP_TABLE;
    var ddbbeerTable =  process.env.CRAFTY_BEER_TABLE;

    var snsTopic =  process.env.NEW_SIGNUP_TOPIC;

    var docClient = new AWS.DynamoDB.DocumentClient();


    var app = express();


    app.use(cors())

    app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(bodyParser.urlencoded({extended:false}));

    app.get('/', function(req, res) {
      var uuid_current = uuid.v1();

        res.render('index', {
            static_path: 'static',
            theme: process.env.THEME || 'flatly',
            uuid: uuid_current,
            flask_debug: process.env.FLASK_DEBUG || 'false'
        });
    });

    app.get('/beers', function(req, res) {
      var uuid_current = uuid.v1();

        res.render('beers', {
            static_path: 'static',
            theme: process.env.THEME || 'flatly',
            uuid: uuid_current,
            flask_debug: process.env.FLASK_DEBUG || 'false'
        });
    });

    app.get('/api/beers', function(req, res) {

      function toTitleCase(str)
      {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
      }


      var rawRequest = req.url.slice(16);
      console.log(rawRequest  )
      var captalizedRequest = toTitleCase(rawRequest)
      var beerName = decodeURI(captalizedRequest)
      console.log(beerName)
      var params = {
        TableName:  "awseb-e-mcqqphcgry-stack-CraftyBeersTable-1IEZA65VF1WX2",
        ProjectionExpression: "#id, #name, #type, #abv, #brewery, #description",
        ExpressionAttributeNames: {
          "#id": "id",
          "#name": "name",
          "#type": "type",
          "#abv": "abv",
          "#brewery": "brewery",
          "#description": "description"
        },
        FilterExpression: "#name = :name OR #type = :type",
        ExpressionAttributeValues: {
          ":name": toTitleCase(beerName),
          ":type": toTitleCase(beerName)
        }
      };
      docClient.scan(params, function(err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data.Items);
          res.send(data.Items)
          data.Items.forEach(function(element, index, array) {
            console.log(element.type + " (" + element.name + " " + element.abv + "%" + ")");
          });
        }
      });

    });

    app.get('/api/beers/all', function(req, res) {


      var params = {
        TableName:  "awseb-e-mcqqphcgry-stack-CraftyBeersTable-1IEZA65VF1WX2",
      };
      docClient.scan(params, function(err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data.Items);
          res.send(data.Items)
          data.Items.forEach(function(element, index, array) {
            console.log(element.type + " (" + element.name + " " + element.abv + "%" + ")");
          });
        }
      });

    });


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
            'ID': {'S': req.body.uuid},
            'type': {'S': req.body.type},
            'name': {'S': req.body.name},
            'abv': {'N': req.body.abv},
            'brewery': {'S': req.body.brewery},
            'description': {'S': req.body.description}
          };


        ddb.putItem({
            'TableName': ddbbeerTable,
            'Item': item,
            'Expected': { ID: { Exists: false } }
        }, function(err, data) {
            if (err) {
                var returnStatus = 500;

                if (err.code === 'ConditionalCheckFailedException') {
                    returnStatus = 409;
                }

                res.status(returnStatus).end();
                console.log('DDB Error: ' + err);
            }
        })
    })
    var port = process.env.PORT || 3000;

    var server = app.listen(port, function () {
        console.log('Server running at http://127.0.0.1:' + port + '/');
    });
}
