// Setup //
const request = require("request");

const path = require("path");

// enviroment vars
require('dotenv').config();

// db
require('./db.js');
const mongoose = require('mongoose');
const sanitize = require('mongo-sanitize'); //? sanitize 
mongoose.set('useFindAndModify', false);
mongoose.set('useNewUrlParser', true);
mongoose.set('useCreateIndex', true);

const User = mongoose.model('User');
const Track = mongoose.model("Track");
const Tracklist = mongoose.model("Tracklist");

// express
const express = require('express');
const app = express();
app.set('view engine', 'hbs');

// spotify web API node wrapper
const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi({
  clientId: '0c924357971d47e5aac6b63298953b7b',
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: 'https://metrify-me.herokuapp.com/login'  //http://localhost:3000/login
});



// Middleware //

// body parser
app.use(express.urlencoded({ extended: false }));

// static files
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

//? bootstrap via CDN 
app.use('/css', express.static(__dirname + '../node_modules/bootstrap/dist/css'));


// Globals //
let authCode;
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
    authCode = req.query.code;

    spotifyApi.authorizationCodeGrant(authCode).then(
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
                    //const dataObj = JSON.parse(data.body);
                    //spotifyID = dataObj.id;
                    console.log('Some information about the authenticated user', data.body);
                    //db_storeUser(spotifyID);
                }, 
                (err) => {
                console.log('Cannot get authenticated user info: ', err);
                }
            ).then( () => {
                tokenExpiryTime = data.body['expires_in'];
                refreshAccessTokenPeriodically();
                }
            );

            res.redirect("/home");
        },
        (err) => {
        console.log('Something went wrong with authorizing code grant!', err);
        }
    );
}); 


app.get("/home", (req, res) => {
    res.render("home");
});


app.get('/get-metric', (req, res) => {
    const target = req.query.target;
    const timeRange = req.query.timeRange;
    const db_metricData = db_getMetricData(target, timeRange);

    // if requested data is already in db - use it instead of making spotify API call
    if (db_metricData) {
        res.render(`top-${target}`, db_metricData);
    } else {
        // options and callback for making request to Spotify API directly (NOT through Node.js wrapper library)
        const options = {
            url: `https://api.spotify.com/v1/me/top/${target}?time_range=${timeRange}&limit=50`,
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

        
            /// save in db
            //db_saveMetricData(pagingObj);
            res.render(`top-${target}`, pagingObj);
        };

        request(options, topMetricsCB); 
    }
});
 
app.get("/top-artists", (req, res) => {
    let topArtistsObj = {};
    res.render("top-artists", topArtistsObj);
});

app.post("/top-artists", (req, res) => {
    let topTracksObj = {};
    res.render("top-tracks". topTracksObj);
});

app.post("/top-tracks", (req, res) => {
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


function refreshAccessTokenPeriodically(spotifyID) {
    setInterval(refreshAccessToken, tokenExpiryTime);
}

function refreshAccessToken() {
    spotifyApi.refreshAccessToken().then(
        (data) => {
            console.log('The access token has been refreshed!');
            
            // Save access token in db 
            //db_updateAccessToken(spotifyAPI.getAccessToken(), spotifyID);
            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
            tokenExpiryTime = data.body['expires_in'];
        },
        (err) =>{
          console.log('Could not refresh access token', err);
        }
    );
}

// DB functions //
function db_storeUser(id) {
    // check if user already exists
    User.find({spotifyID: spotifyID}, (err, findResult) => {
        if (err || findResult.length===0) {
            // store user info in db
            console.log("User does not exist. Storing user in db now ...");

            const user = new User({
                spotifyID: spotifyID,
                accessToken: spotifyAPI.getAccessToken()
            });

            user.save( (err) => {
                if (err) {
                    console.log("Error storing user in db: "+err);
                } else {
                    console.log("User succesfully saved in db!");
                }
            });

        } else {    
            console.log("User already exists! "+ err);
        }
    });
}

function db_updateAccessToken(accessToken, spotifyID) {
    User.findOneAndUpdate(
        {spotifyID: spotifyID}, 
        {$set: {accessToken: accessToken}},
        (err, updateResult) => {
        if (err || findResult.length===0) {
            console.log("Error updating auth token: "+ err);
        } else {
            // store user info in db
            console.log("Updated access token!");
        }
    });
}

function db_getMetricData(target, timeRange) {
    ///
    return false;
}

function db_saveMetricData(pagingObj) {
    
}


app.listen(process.env.PORT || 3000);

//? db functions ok here ?