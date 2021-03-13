import express from 'express'
import bodyParser from 'body-parser'
import { MongoClient } from 'mongodb';
import path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '/build'))) // need this for deployment
app.use(bodyParser.json()); // parses the json object in the body of the request

// schema
// const articlesInfo = {
//   'learn-react':{
//     upvotes: 0,
//     comments: []
//   },
//   'learn-node':{
//     upvotes: 0,
//     comments: []
//   },
//   'my-thoughts-on-resumes':{
//     upvotes: 0,
//     comments: []
//   }
// }

/* GLOBAL VARIABLES FOR DB CONNECT */
const uri = "mongodb+srv://rajanbir-user:Rajanbir1@cluster0.9qmcg.mongodb.net/Cluster0?retryWrites=true&w=majority";
let client;
const getSession = async function() {
  client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});
  await client.connect();
  const db = await client.db('my-blog');
  return db;
}

const withDB = async (operations, res) =>{   // operatins is the name of the function 
  try{
    const client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});
    await client.connect();
    const db = await client.db('my-blog')

    await operations(db);
    
    await client.close();
  } catch(err){
    res.status(500).json({message: 'Error connecting to DB'})
  }
}

// --------- ROUTES --------

app.post("/hello", (req, res) => {
  res.send(`Hello ${req.body.name}!`)
})

app.get("/api/articles/:name/", async(req, res) => {
  console.log('--- ran getArticle()');
  const articleName = req.params.name;
  
  // connnect to mongodb
  try{
    /* abstracted way of getting client connection -- see global variables */
    getSession().then(async db =>{
      const articleInfo = await db.collection("articles").findOne({name: articleName})
      console.log("---articleName is: " + articleInfo.name);
      await client.close();
      
      res.status(200).send(articleInfo);
    })
  } catch(err){
    res.status(500).json({message: 'Error connecting to DB'})
  }
})


// upvotes
app.post("/api/articles/:name/upvote", async (req, res) =>{
  console.log('--- ran upvote()');
  const articleName = req.params.name;
  
  /* BETTER way of getting DB connection -- global method*/
  withDB(async (db) => {
    let articleInfo = await db.collection('articles').findOne({name: articleName});
    await db.collection('articles').updateOne({name: articleName}, {
      '$set': {
        upvotes: articleInfo.upvotes + 1
      }
    });
    articleInfo = await db.collection('articles').findOne({name: articleName});

    res.status(200).json(articleInfo);
  }, res) // res is passed as the second argument to withDB

})

// downvotes
app.post("/api/articles/:name/downvote", async (req, res) =>{
  console.log('--- ran downvote()');
  const articleName = req.params.name;
  
  withDB(async (db) => {
    await db.collection('articles').updateOne(
      {name: articleName}, {
        '$inc': {
          downvotes: 1, 
        }
      }
    );
    const articleInfo = await db.collection('articles').findOne({name: articleName});

    res.status(200).json(articleInfo);
  }, res) // res is passed as the second argument to withDB

})

// add-comment
app.post("/api/articles/:name/add-comment", (req, res) =>{
  console.log('--- ran add-comment()');
  const {username, text} = req.body;
  const articleName = req.params.name;

  withDB(async (db) => {
    const article = await db.collection('articles').findOne({name: articleName});
    await db.collection('articles').updateOne({name: articleName}, {
      '$set': {
        comments: article.comments.concat({username, text})
      }
    });
    const updatedArticle = await db.collection('articles').findOne({name: articleName});
    res.status(200).json(updatedArticle);
  }, res)
})




app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/build/index.html'))
})

app.listen(8000, () => {
  console.log('Listening on port 8000');
})