// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Set the region
AWS.config.update({
    region: "eu-west-2",
    endpoint: "http://localhost:8000"
});

// Create DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

var params = {
  RequestItems: {
    "Beers": [
       {
         PutRequest: {
           Item: {
             "type": { "S": "IPA" },
             "name": { "S": "Punk IPA" },
               "brewery": { "S": "Brewdog" },
               "abv": { "N": "6.4" }
           }
         },
         PutRequest: {
           Item: {
             "type": { "S": "PA" },
             "name": { "S": "Camden Pale Ale" },
               "brewery": { "S": "Camden" },
               "abv": { "N": "4.5" }
           }
         },
         PutRequest: {
           Item: {
             "type": { "S": "IPA" },
             "name": { "S": "Punk IPA" },
               "brewery": { "S": "Brewdog" },
               "abv": { "N": "6.4" }
           }
         },
         PutRequest: {
           Item: {
             "type": { "S": "PA" },
             "name": { "S": "Camden Pale Ale" },
               "brewery": { "S": "Camden" },
               "abv": { "N": "4.5" }
           }
         }
       }
    ]
  }
};

ddb.batchWriteItem(params, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data);
  }
});
