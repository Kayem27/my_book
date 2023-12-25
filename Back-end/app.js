const express = require('express'); 
const cors = require('cors');
const mongoose = require('mongoose'); 
const path = require('path');

const userRoutes = require('./routes/user'); 
const booksRoutes = require('./routes/book'); 
require('dotenv').config(); 

mongoose.connect(process.env.MONGODB_URI,
{ useNewUrlParser: true,
    useUnifiedTopology: true })
    .then(() => console.log('Successful connection to MongoDB!'))
    .catch(() => console.log('MongoDB connection failed!'));

const app = express();


app.use(cors());

app.use(express.json());

app.use('/api/books', booksRoutes);

app.use('/api/auth', userRoutes);

app.use('/images', express.static(path.join(__dirname, 'images')));

module.exports = app;
