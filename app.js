const request = require("request");
const path = require("path");

// enviroment vars //
require('dotenv').config();
 
// db setup //
require('./db.js');
const mongoose = require('mongoose');
const sanitize = require('mongo-sanitize'); //?
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const User = mongoose.model('User');
const Track = mongoose.model("Track");
const Artist = mongoose.model("Artist");

// express setup //
const express = require('express');
const session = require("express-session"); 
const FileStore = require('session-file-store')(session); 
const bodyParser = require("body-parser");

const app = express();
app.set('view engine', 'hbs');


// spotify web API node wrapper setup //
const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi({
  clientId: '0c924357971d47e5aac6b63298953b7b',
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/login'  //https://metrify-me.herokuapp.com/login
});



// Middleware //

// static files
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// session
app.use(session({ 
    name: "spotifyUser",
    secret: generateKey(), 
    resave: false, 
    saveUninitialized: true,
    //?store: new FileStore(),
    cookie: {httpOnly: true, maxAge: 216000} //? secure: false
}));

//? bootstrap via CDN (assets too LATER) app.use('/css', express.static(__dirname + '../node_modules/bootstrap/dist/css'));

// body parser
app.use(bodyParser.urlencoded({ extended: false }));


// Globals //
const scopes = ['user-read-private', 'user-read-email', 'user-top-read', 'playlist-modify-private'];
//? state 
const authURL = spotifyApi.createAuthorizeURL(scopes);




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

            // Store the authenticated user in db + session
            spotifyApi.getMe().then(
                (data) => {
                    console.log('Some information about the authenticated user', data.body);

                    db_storeUser(data.body.id);

                    req.session.spotifyId = data.body.id;
                    req.session.token = spotifyApi.getAccessToken();
                    // req.session.save();
                    
                    res.redirect("/home");
                }, 
                (err) => {
                console.log('Cannot get authenticated user info: ', err);
                }
            );
        },
        (err) => {
        console.log('Something went wrong with authorizing code grant!', err);
        }
    );
}); 


app.get("/home", (req, res) => {
    res.render("home");
});


app.get('/get-metric', async (req, res) => {


    const target = req.query.target;
    const timeRange = req.query.timeRange;
    let db_metricData = await db_getMetricData(req.session.spotifyId, timeRange, target);
    console.log("here: "+db_metricData); ///

    // if requested data is already in db - use it instead of making spotify API call
    if (db_metricData !== undefined && db_metricData !== null && db_metricData.length > 0) {
        console.log("spit from db");///
        res.render(`top-${target}`, {metricData: db_metricData});

    } else {

        // options and callback for making request to Spotify API DIRECTLY
        // (NOT through Node.js wrapper library)
        const options = {
            url: `https://api.spotify.com/v1/me/top/${target}?time_range=${timeRange}&limit=50`,
            headers: {"Authorization": "Bearer " + req.session.token} 
        };

        const topMetricsCB = async (error, response, body) => {
            let pagingObj;

            // parse response
            if (!error && response.statusCode == 200) {
                pagingObj = JSON.parse(body);
            } else {
                console.log(`Error getting top ${target}: ${error}`)
            }

            // save metric data in db
            if (target==="tracks") {
                await db_saveTopTracksData(req.session.spotifyId, timeRange, pagingObj.items);
            } else if (target==="artists") {
                db_saveTopArtistsData(req.session.spotifyId, timeRange, pagingObj.items);
            }

            db_metricData = await db_getMetricData(req.session.spotifyId, timeRange, target);
            res.render(`top-${target}`, {metricData: db_metricData});
        };

        // get metric data directly from Spotify API 
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

function generateKey() {
        let key = '';
        const possChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      
        for (let i = 0; i < 10; i++) {
            key += possChars.charAt(Math.floor(Math.random() * possChars.length));
        }

        return key;
}



// DB functions //
function db_storeUser(id) {
    // check if user already exists
    User.find({spotifyID: id}, (err, findResult) => {

        if (err || findResult.length===0) {
            // create user in db 
            console.log("User does not exist. Storing user in db now ...");

            const user = new User({spotifyID: id});
            user.save((err) => {
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

async function db_getMetricData(id, time, target) {

    // get user from db
    const user = await User.findOne({spotifyID: id}, (err, user) => {
        if (err) {
            console.log("Error finding user to get metric data: "+err);
        } 
    }).exec();

    console.log(user); ///
    if (target==="tracks") {
        switch (time) {
            case "long_term":
                return user.topTracks_long === undefined ? null : user.topTracks_long;
            case "medium_term":
                return user.topTracks_med === undefined ? null : user.topTracks_med;
            case "short_term":
                return user.topTracks_short === undefined ? null : user.topTracks_short;
        }
    } else if (target==="artists") {

    }
}

async function db_saveTopTracksData(id, time, items) {
    switch (time) {
        case "long_term":
            await User.findOneAndUpdate(
                {spotifyID: id},
                {$set: {topTracks_long: await parseAndStoreTracks(items)}},
                {new: true, runValidators: true}, 
                (err, user) => {
                if (err) {
                    console.log("Error saving top-track data: "+err);
                } else if (user) {
                    console.log("Found User. Stored long_term tracklist");
                }
            });
            break;

        case "medium_term":
            await User.findOneAndUpdate(
                {spotifyID: id},
                {$set: {topTracks_med: await parseAndStoreTracks(items)}}, 
                (err, user) => {
                if (err) {
                    console.log("Error saving top-track data: "+err);
                }
            });
            break;

        case "short_term":
            await User.findOneAndUpdate(
                {spotifyID: id},
                {$set: {topTracks_short: await parseAndStoreTracks(items)}}, 
                (err, user) => {
                if (err) {
                    console.log("Error saving top-track data: "+err);
                }
            });
            break;
    }
}

async function parseAndStoreTracks(items) {
    const arr = [];
    for (let i=0; i<items.length; i++) {
        const currTrack = items[i];

        await Track.findOneAndUpdate(
            {spotifyID: currTrack.id}, 
            db_createTrack(currTrack),
            {upsert: true, new: true, runValidators: true}, // store track if it doesn't exist
            (err, doc) => {
            if (err) {
                console.log("error saving new track: "+err);

            // return from db if track already exists
            } else {
                console.log("saved new track to db: "+ doc.title);
                arr.push(doc);
            }
        });
    }

    return arr;
    /*
    return new Promise((resolve) => {
        resolve(arr);
    });
    */
}

function db_createTrack(currTrack) {
    return {
        title: currTrack.name,
        spotifyID: currTrack.id, 
        artists: parseArtistsFromTrackObj(currTrack), 
        album: currTrack.album.name,  
        releaseDate: currTrack.album['release_date'], 
    }
}

function parseArtistsFromTrackObj(track) {
    const result = [];
    const artistsArr = track.artists;
    for (let i=0; i<artistsArr.length; i++) {
        result.push(artistsArr[i].name);
    }
    return result;
}

function db_saveTopArtistsData(id, time, items) {

}

app.listen(process.env.PORT || 3000);