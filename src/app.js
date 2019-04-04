// Setup //
const path = require("path");
const sanitize = require("mongo-sanitize");

require('./db.js');
const mongoose = require('mongoose');

const express = require('express');
const app = express();
app.set('view engine', 'hbs');


// Middleware //
app.use(express.urlencoded({ extended: false }));


const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

app.use('/css', express.static(__dirname + '../node_modules/bootstrap/dist/css'));


// Routes //
app.get("/", (req, res) => {
    res.render("index");
}); 

app.post("/", (req, res) => {
}); 







app.listen(3000);
