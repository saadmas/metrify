// Setup //
const request = require("request");

const path = require("path");

// enviroment vars
require('dotenv').config();

// db
require('./db.js');
const mongoose = require('mongoose');
const sanitize = require("mongo-sanitize"); /// sanitize ?

// express
const express = require('express');
const app = express();
app.set('view engine', 'hbs');

// spotify web API node wrapper
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: '0c924357971d47e5aac6b63298953b7b',
  /// remove !
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/login'
});



// Middleware //
app.use(express.urlencoded({ extended: false }));


const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

/// bootstrap via CDN ?
app.use('/css', express.static(__dirname + '../node_modules/bootstrap/dist/css'));


// Globals //
let code;
let authURL = getSpotifyAuthURL();
let tokenExpiryTime;


// Routes //
app.get("/", (req, res) => {
    res.redirect(authURL);
    //res.render("index");
}); 

app.get("/login", (req, res) => {
    code = req.query.code;
    
    spotifyApi.authorizationCodeGrant(code).then(
        (data) => {
          console.log('The token expires in ' + data.body['expires_in']);
          console.log('The access token is ' + data.body['access_token']);
          console.log('The refresh token is ' + data.body['refresh_token']);
      
          // Set the access token on the API object to use it in later calls
          spotifyApi.setAccessToken(data.body['access_token']);
          spotifyApi.setRefreshToken(data.body['refresh_token']);

          tokenExpiryTime = data.body['expires_in'];
          refreshAccessTokenPeriodically();
        },
        (err) => {
          console.log('Something went wrong with authorizing code grant!', err);
        }
      );
    
    res.redirect("/home");
}); 


app.get("/home", (req, res) => {
    res.render("home");
});

app.get('/get-metric', (req, res) => {

    // options and callback for making request to Spotify API directly (NOT through Node.js wrapper librar)
    const options = {
        url: `https://api.spotify.com/v1/me/top/${req.query.target}?time_range=${req.query.timeRange}&limit=50`,
        headers: {
            "Authorization": "Bearer " + spotifyApi.getAccessToken()
        } 
    };

    const topMetricsCB = (error, response, body) => {
        if (!error && response.statusCode == 200) {
            const pagingObj = JSON.parse(body);
            console.log(pagingObj.items);
        } else {
            console.log(`Error getting top ${req.query.target}: ${error}`)
        }
        res.render(`top-${req.query.target}`);
    };

    request(options, topMetricsCB); 
});
 
app.get("/top-artists", (req, res) => {
    
    res.render("home");
});

app.get("/top-tracks", (req, res) => {
    
    res.render("home");
});

// Helper functions //

function getSpotifyAuthURL() {
    const scopes = ['user-read-private', 'user-read-email', 'user-top-read', 'playlist-modify-private'];
    /// state ?
    return spotifyApi.createAuthorizeURL(scopes);
}


function refreshAccessTokenPeriodically() {
    console.log("IN PERIODCALLY");
    setInterval(refreshAccessToken, tokenExpiryTime);
}

function refreshAccessToken() {
    spotifyApi.refreshAccessToken().then(
        (data) => {
          console.log('The access token has been refreshed!');
      
          // Save the access token so that it's used in future calls
          spotifyApi.setAccessToken(data.body['access_token']);
          tokenExpiryTime = data.body['expires_in'];
        },
        (err) =>{
          console.log('Could not refresh access token', err);
        }
    );
}

app.listen(process.env.PORT || 3000);
