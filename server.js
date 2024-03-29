require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const expressLayout = require('express-ejs-layouts');
const path = require('path');
const PORT = process.env.PORT || 3000;
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('express-flash');
const MongoDbStore = require('connect-mongo')(session);
const passport = require('passport')
const Emitter = require('events')



const app = express();

//Database connection
// const url = 'mongodb://127.0.0.1:27017/pizza';
// mongoose.connect(url, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useUnifiedTopology: true,
//     useFindAndModify: true
// });
// const connection = mongoose.connection;
// connection.once('open', () => {
//     console.log('Database Connected...');
// }).catch('err', () => {
//     console.log('Connection Failed...');
// })


const conn = mongoose.connection;
mongoose.connect(process.env.MONGO_CONNECTION_URL)
 .then(() => {
   console.log("connected successfully");
 })
 .catch(() => {
   console.log("hello");
 });



//Session store
let mongoStore = new MongoDbStore({
    mongooseConnection: conn,
    collection: 'sessions',
})


// Event emitter
const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)


//session config
app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    store: mongoStore,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24} // 24 hours
}))


// Passport config
const passportInit = require('./app/config/passport');
passportInit(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash())

//Assets
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}))
app.use(express.json());

//Global middleware
app.use((req, res, next) => {
    res.locals.session = req.session
    res.locals.user = req.user
    next()
})


//set Template engine
app.use(expressLayout);

app.set('views', path.join(__dirname, '/resources/views'))

app.set('view engine', 'ejs');


require('./routes/web')(app)
app.use((req, res) => {
  res.status(404).render('errors/404')
})





const server = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
})



// Socket

const io = require('socket.io')(server)
io.on('connection', (socket) => {
  // Join
  socket.on('join', (orderId) => {
    socket.join(orderId)
  })
})


eventEmitter.on('orderUpdated', (data) => {
  io.to(`order_${data.id}`).emit('orderUpdated', data)
})

eventEmitter.on('orderPlaced', (data) => {
  io.to('adminRoom').emit('orderPlaced', data)
})