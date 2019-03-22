// Libraries
const express = require('express');

// MongoDB
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const imdb = require('./src/imdb');
const mongodbConfig =require('./config').mongodbConfig;
const actorsID=require('./config').actorsID;
const DENZEL_ID= actorsID.DENZEL_IMDB_ID;
const CONNECTION_URL = mongodbConfig.URL;
const DATABASE_NAME = "MovieDB";
const PORT=9292;

// GraphQL
const graphqlHTTP = require('express-graphql');
const {GraphQLObjectType, GraphQLString, GraphQLInt} = require('graphql');
const {queryType} = require('./query.js');

// Port number, Express app and Schema
const app = express();
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));
const schema = new GraphQLSchema({ query: queryType});
var database, collection;

// REST endpoints to implement
app.listen(PORT, () => {
  MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
      if(error) {
          throw error;
      }
      database = client.db(DATABASE_NAME);
      collection = database.collection("Movie");
      console.log(`Connected to ` + DATABASE_NAME + ` on the port ${PORT}!`);
  });
});

app.get('/movies/populate', async (req, res) => {
    try {
      const movies= await imdb(DENZEL_ID);
      collection.insertMany(movies, (err, result) => {
        if(err) {
            return res.status(500).send(err);
        }
      res.send(result.result);
      });
      } catch (e) {
        console.error(e);
        process.exit(1);
      } 
});

app.get('/movies', (req,res) =>{
  try {
    collection.aggregate([
      {$match: {metascore: {$gte: 70}}},
      {$sample: {size: 1}}
    ]).toArray((err, result)=>{
      if(err) {
              return res.status(500).send(err);
          }
          res.send(result[0]);
      });
    } catch (e) {
      console.error(e);
      process.exit(1);
    }      
});

app.get('/movies/:id', (req,res) =>{
  try {
    collection.findOne({ "id": req.params.id }, (err, result) => {
      if(err) {
          return res.status(500).send(err);
      }
      res.send(result);
    });
    } catch (e) {
      console.error(e);
      process.exit(1);
    } 
});

app.get('/movies/search', (req,res) =>{
  try {
    var limit = req.query.limit;
	  var metascore = req.query.metascore;
  	if(limit==null) {
  		limit = 5;
  	}
	  if(metascore==null) {
	  	metascore = 0;
	  }
      collection.aggregate([
  	  	{$match: {metascore: {$gte: metascore}}},
    		{$limit: limit},
    		{$sort: {metascore: -1}}
     	]).toArray((err, result) => {
        if(err) {
          return res.status(500).send(err);
        }
        res.send(result);
    });
    } catch (e) {
      console.error(e);
      process.exit(1);
    } 
});

app.post('/movies/:id', (req,res) =>{
  try {
    const date=req.body.date;
	  const review=req.body.review;
    collection.updateOne(
		  { "id": req.params.id },
		  {$addToSet:{
		  	reviews: {
			  	"date": date,
			  	"review": review
		  	}
		  }},(err,result) => {
		  	if(err) {
		  		return response.status(500).send(err);
	  		}
	  		var modify=result.result.nModified;
	  		res.send({id:req.params.id, add:modify})
	  });
    } catch (e) {
      console.error(e);
      process.exit(1);
    } 
});

// Setup the nodejs GraphQL server
app.get('/graphql', graphqlHTTP({
    schema: schema,
    graphiql: true
    })
);

app.listen(port);
console.log(`GraphQL Server Running at localhost: ${port}`);
