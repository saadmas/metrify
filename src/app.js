// Setup //
const request = require("request");

const path = require("path");

// enviroment vars
require('dotenv').config();

// db
require('./db.js');
const mongoose = require('mongoose');
const sanitize = require("mongo-sanitize"); //? sanitize 

// express
const express = require('express');
const app = express();
app.set('view engine', 'hbs');

// spotify web API node wrapper
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: '0c924357971d47e5aac6b63298953b7b',
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/login'
});



// Middleware //
app.use(express.urlencoded({ extended: false }));


const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

//? bootstrap via CDN 
app.use('/css', express.static(__dirname + '../node_modules/bootstrap/dist/css'));


// Globals //
let code;
let authURL = getSpotifyAuthURL();
let tokenExpiryTime;


// Routes //
app.get("/", (req, res) => {
    res.render("index");
}); 


app.get("/spotify-auth", (req, res) => {
    res.redirect(authURL);
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

            // Store the authenticated user in db
            spotifyApi.getMe().then(
                (data) => {
                    console.log('Some information about the authenticated user', data.body);
                    db_storeUser(JSON.parse(data.body).id);
                }, 
                (err) => {
                console.log('Cannot get authenticated user info: ', err);
                }
            );

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
    /// check if requested data is already in db before making spotify API call

    // options and callback for making request to Spotify API directly (NOT through Node.js wrapper librar)
    const options = {
        url: `https://api.spotify.com/v1/me/top/${req.query.target}?time_range=${req.query.timeRange}&limit=50`,
        headers: {
            "Authorization": "Bearer " + spotifyApi.getAccessToken()
        } 
    };

    const topMetricsCB = (error, response, body) => {
        let pagingObj;

        if (!error && response.statusCode == 200) {
            pagingObj = JSON.parse(body);
        } else {
            console.log(`Error getting top ${req.query.target}: ${error}`)
        }

    
        // save in db
        res.render(`top-${req.query.target}`, pagingObj);
    };

    request(options, topMetricsCB); 
});
 
app.get("/top-artists", (req, res) => {
    
    res.render("home");
});

app.post("/top-artists", (req, res) => {

    let topTracksObj = {};
    res.render("top-tracks". topTracksObj);
});

app.get("/top-tracks", (req, res) => {
    // Create a private playlist
    spotifyApi.createPlaylist(`My Top 50 Tracks (${req.body.timeRange})`, {'public' : false }).then( 
        (playlistData) => {
            console.log(`Created Top 50 Tracks (${req.body.timeRange}) playlist!`);
            // Add tracks to playlist
            spotifyApi.addTracksToPlaylist(playlistData.id, ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh", "spotify:track:1301WleyT98MSxVHPZCA6M"]).then(
                (addTrackData) => {
                    console.log('Added tracks to playlist!');
                    res.render("top-tracks");
                }, 
                (err) => {
                console.log('Something went wrong adding tracks to playlist: ', err);
                }
            );
        }, 
        (err) => {
            console.log('Something went wrong!', err);
        }
    );
});

// Helper functions //

function getSpotifyAuthURL() {
    const scopes = ['user-read-private', 'user-read-email', 'user-top-read', 'playlist-modify-private'];
    //? state 
    return spotifyApi.createAuthorizeURL(scopes);
}


function refreshAccessTokenPeriodically() {
    setInterval(refreshAccessToken, tokenExpiryTime);
}

function refreshAccessToken() {
    spotifyApi.refreshAccessToken().then(
        (data) => {
          console.log('The access token has been refreshed!');
      
          // Save the access token so that it's used in future calls
          spotifyApi.setAccessToken(data.body['access_token']);
          tokenExpiryTime = data.body['expires_in'];

          // Save access token in db ?
        },
        (err) =>{
          console.log('Could not refresh access token', err);
        }
    );
}

// DB functions //
function db_storeUser(spotifyID) {
    // check if user already exists
    
}


app.listen(process.env.PORT || 3000);
