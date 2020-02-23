const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid');
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI)

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  User.findOne({username: req.body.username}, (err, result) => {
    if(err) { console.log(err)};
    if(result === null) {
      var newID = shortid.generate();
      var newUser = new User({
        _id: newID,
        username: req.body.username
      });
      newUser.save(function(err) {
        if(err) throw err;
        console.log("New user created");
        res.json({_id: newID, username: req.body.username});
      });
    } else {
      console.log("User already exists!");
      res.json({error: "User already exists!"});
    }
  });  
});

app.get('/api/exercise/users', function(req, res) {
  User.find().then(function(result){
    res.send(result);
  })
});

app.post('/api/exercise/add', function(req, res) {
  // Validate user_id
  User.findById(req.body.userId, function(err, id) {
    var date = req.body.date;
    if(id === null) {
      res.json({error:"User doesn't exist!"});
    } else {
      // Validate description
      if(req.body.description.length == 0) {
        res.json({error: "Description is required."});
      } else if (req.body.duration.length == 0) {
        res.json({error: "Duration is required."})
      } else if (req.body.duration.match(/\D+/g)) {
        res.json({error: "Duration must be a number"});
      }
      
      if(date.length == 0) {
        date = Date.now();
      }
      var newExercise = new Exercise({
        userID: req.body.userId,
        description: req.body.description,
        duration: req.body.duration,
        date: date,
      });

      newExercise.save(function (err, data) {
        if(err) console.log(err);
        res.json({
          userID: data
        })
      });
      }
  });
});

app.get('/api/exercise/log', function(req, res){
  var query = [];
  for(let key in req.query) {
    query.push(key);
  }
  if(query.length == 1) { // return all exercises
    Exercise.find({userID: query[0]}).then(function (result) {
      res.json({log: result, count: result.length});
    })
  } else {
    if(query.length == 0) {
      res.send("No user id!");
    }
    var exercise = {};
    if(query.length == 2) {
      exercise.start = query[1];
      exercise.username = query[0]
      var start = exercise.start.split("-");
      var startSearch = new Date(start[0], start[1], start[2]);
      if(start.length != 3) {
        res.send("Invalid Start Date!");
      }
    }
    if(query.length == 3) {
      exercise.start = query[1];
      exercise.end = query[2]
      exercise.username = query[0]
      var end = exercise.end.split("-");
      var endSearch = new Date(end[0], end[1], end[2]);
      if(end.length != 3) {
        res.send("Invalid End Date!");
      }
    }
    
    if(query.length == 4) {
      exercise.start = query[2];
      exercise.end = query[3];
      exercise.limit = query[0];
      exercise.username = query[1];
      
      var start = exercise.start.split("-");
      var startSearch = new Date(start[0], start[1], start[2]);
      var end = exercise.end.split("-");
      var endSearch = new Date(end[0], end[1], end[2]);
      if(isNaN(exercise.limit)) {
        res.send("Limit isn't a number!");
      }
    }
    
    
    if(query.length >= 3) { // check dates
      if(end[0] < start[0] || (end[0] == start[0] && end[1] < start[1]) || (end[0] == start[0] && end[1] == start[1] && end[2] < start[2])) {
        res.send("End can't be before Start!");
      }
    }
  
    
    
    // variables set and now it's time to search database
    // Query == 2 -> username & start
    if(query.length == 2) {
      Exercise.find({userID: exercise.username, date: {$gte: startSearch}}).then(function(result) {
        res.json(result);
      })
    }
    
    // Query == 3 -> username & start & end
    if(query.length == 3) {
      Exercise.find({userID: exercise.username, date: {$gte: startSearch, $lt: endSearch}}).then(function(result) {
        res.json(result);
      })
      
    }
    
    // Query == 4 0> username & start & end & limit
    if(query.length == 4) {
      Exercise.find({userID: exercise.username, date: {$gte: startSearch, $lt: endSearch}}).limit(+exercise.limit).then(function(result) {
        res.json(result);
      })
    }
    
    // res.send(exercise);
  }
});
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

// Schema User
var userSchema = mongoose.Schema({
  _id: String,
  username: String,
});

// Model User
var User = mongoose.model('User', userSchema);


// Schema Exercise
var exerciseSchema = mongoose.Schema({
  userID: String,
  description: String,
  duration: Number,
  date: Date,
});

// Model Exercise
var Exercise = mongoose.model('Exercise', exerciseSchema);