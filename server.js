var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

var app = express();



app.listen(3000, () => console.log('Crafty API listening on port 3000!'))

AWS.config.update({
  region: "eu-west-2",
  endpoint: "http://localhost:8000"
});

var docClient = new AWS.DynamoDB.DocumentClient();


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', function (req, res) {
  res.send({ title: "Crafty API Entry Point" })
})

app.get('/beers', function (req, res) {
  var params = {
      TableName : "Beers",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames:{
          "#type": "type"
      },
      ExpressionAttributeValues: {
          ":type": "IPA"
      }
  };


docClient.query(params, function(err, data) {
    if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
        console.log("Query succeeded.");
        res.send(data.Items)
        data.Items.forEach(function(beer) {
            console.log(" -", beer.type + ": " + beer.name + ' ' + beer.info['abv'] + '%');
        });
    }
});


})
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
