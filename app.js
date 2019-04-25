const request = require("request");
const path = require("path");

// enviroment vars //
require('dotenv').config();
 
// db setup // //? maybe move some stuff to db.js ?
require('./db.js');
const mongoose = require('mongoose');
const sanitize = require('mongo-sanitize');
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


// spotify web API node wrapper 
const SpotifyWebApi = require('spotify-web-api-node');

// Middleware //

// session
app.use(session({ 
    name: "spotifyUser",
    secret: generateKey(), 
    resave: false, 
    saveUninitialized: false,
    //?store: new FileStore(),
    cookie: {httpOnly: true, maxAge: 216000}//? secure: false
}));


// ensure Spotify auth
app.use( async (req, res, next) => {
    if (req.url==="/top-tracks" || req.url==="/top-artists") {
        // spotify ID must be present in session 
        if (req.session.spotifyID) {
            // token for authenticated MUST be present in db
            const token = await getToken(req.session.spotifyID, next);
            if (token === "token-err") {
                res.redirect("/");
            } else {
                next();
            }
        } else {
            res.redirect("/");
        }
    } else {
        next();
    }   
});

// static files
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// body parser
app.use(bodyParser.urlencoded({ extended: false }));
// json
app.use(express.json());

// error handling
app.use( (err, req, res, next) => {
    // log error
    console.error("error msg: "+err.message); 
    console.error("error stack: "+err.stack); 
    // set status code
    if (!err.statusCode) { 
        err.statusCode = 500;
    }
    // render error page
    res.status(err.statusCode).render("error-page", {errMsg: err.message, errStack: err.stack}); 
});

// Routes //
app.get("/", (req, res) => {
    res.render("index");
}); 

app.get("/spotify-auth", (req, res) => {
    const spotifyApi = initSpotifyAPI();
    const authURL = spotifyApi.createAuthorizeURL(['user-read-private', 'user-read-email', 'user-top-read', 'playlist-modify-private']);
    res.redirect(authURL);
}); 

app.get("/login", (req, res, next) => {
    authCode = req.query.code;

    const spotifyApi = initSpotifyAPI();
    spotifyApi.authorizationCodeGrant(authCode).then(
        async (data) => {
            // Set the access token on the API object to use it in later calls
            const token = data.body['access_token'];
            spotifyApi.setAccessToken(token);
            
            // Store the authenticated user in db + session
            spotifyApi.getMe().then(
                async (data) => {
                    console.log('Info abt the authenticated user: ', data.body);

                    await db_storeUser(data.body.id, data.body['display_name'], token, next);
                    req.session.spotifyID = data.body.id;
                    req.session.save();

                    // go to top tracks page
                    res.redirect("/top-tracks");
                }, 
                (err) => {
                console.error('Cannot get authenticated user info: ', err);
                const errorDetails = new Error(`Cannot get authenticated user info: ${err}`);
                next(errorDetails);
                }
            );
        },
        (err) => {
        console.error('Something went wrong with authorizing code grant!', err);
        const errorDetails = new Error(`Something went wrong with authorizing code grant: ${err}`);
        next(errorDetails);
        }
    );      
}); 

app.get('/get-metric', async (req, res, next) => {
    const target = req.query.target;
    const timeRange = req.query.timeRange;

    const spotifyID = req.session.spotifyID;
    let db_metricData = await db_getMetricData(spotifyID, timeRange, target, next);

    // if requested data is already in db - use it instead of making spotify API call
    if (db_metricData !== undefined && db_metricData !== null && db_metricData.length > 0) {
        console.log(`retrieved metric data for ${target} - ${timeRange} from db`);
        res.json(db_metricData);
    } else {
        // options and callback for making request to Spotify API DIRECTLY
        // (NOT through Node.js wrapper library)
        const token = await getToken(spotifyID, next);
        const options = {
            url: `https://api.spotify.com/v1/me/top/${target}?time_range=${timeRange}&limit=50`,
            headers: {"Authorization": "Bearer " + token} 
        };

        const topMetricsCB = async (error, response, body) => {
            let pagingObj;

            // parse response
            if (!error && response.statusCode == 200) {
                pagingObj = JSON.parse(body);
            } else {
                console.error(`Error getting top ${target}: ${error}`)
                const errorDetails = new Error(`Error getting top ${target}: ${error}`);
                next(errorDetails);
            }

            // save metric data in db
            if (target==="tracks") {
                await db_saveTopTracksData(spotifyID, timeRange, pagingObj.items, next);
            } else if (target==="artists") {
                await db_saveTopArtistsData(spotifyID, timeRange, pagingObj.items, next);
            }

            db_metricData = await db_getMetricData(spotifyID, timeRange, target, next);
            res.json(db_metricData);
        };

        // get metric data directly from Spotify API 
        request(options, topMetricsCB); 
    }
});
 

app.get("/top-tracks", async (req, res, next) => {

    const spotifyID = req.session.spotifyID;
    const userName = await getDisplayName(spotifyID, next);
    let db_metricData = await db_getMetricData(spotifyID, "long_term", "tracks", next);

    // if requested data is already in db - use it instead of making spotify API call
    if (db_metricData !== undefined && db_metricData !== null && db_metricData.length > 0) {
        console.log("retrieved top tracks (all time) data from db"); 
        res.render(`top-tracks`, {metricData: db_metricData, name: userName});
    } else {
        // options and callback for making request to Spotify API DIRECTLY (NOT through Node.js wrapper library)
        const token = await getToken(spotifyID, next);
        const options = {
            url: `https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50`,
            headers: {"Authorization": "Bearer " + token} 
        };

        const topMetricsCB = async (error, response, body) => {
            let pagingObj;

            // parse response
            if (!error && response.statusCode == 200) {
                pagingObj = JSON.parse(body);
            } else {
                console.error(`Error getting top tracks: ${error}`)
                const errorDetails = new Error(`Error getting top tracks: ${error}`);
                next(errorDetails);
            }

            // save metric data in db
            await db_saveTopTracksData(spotifyID, "long_term", pagingObj.items, next);

            // retrive data from db and render 
            db_metricData = await db_getMetricData(spotifyID, "long_term", "tracks", next);
            
            res.render(`top-tracks`, {metricData: db_metricData, name: userName});  
        };

        // get metric data directly from Spotify API 
        request(options, topMetricsCB); 
    }
});

app.get("/top-artists", async (req, res, next) => {

    const spotifyID = req.session.spotifyID;
    const userName = await getDisplayName(spotifyID, next);
    let db_metricData = await db_getMetricData(spotifyID, "long_term", "artists", next);

    // if requested data is already in db - use it instead of making spotify API call
    if (db_metricData !== undefined && db_metricData !== null && db_metricData.length > 0) {
        console.log("retrieved top ARTISTS (all time) data from db"); 
        res.render(`top-artists`, {metricData: db_metricData, name: userName}); 
    } else {

        // options and callback for making request to Spotify API DIRECTLY (NOT through Node.js wrapper library)
        const token = await getToken(spotifyID, next);
        const options = {
            url: `https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=50`,
            headers: {"Authorization": "Bearer " + token} 
        };

        const topMetricsCB = async (error, response, body) => {
            let pagingObj;

            // parse response
            if (!error && response.statusCode == 200) {
                pagingObj = JSON.parse(body);
            } else {
                console.error(`Error getting top artists: ${error}`)
                const errorDetails = new Error(`Error getting top artists: ${error}`);
                next(errorDetails);
            }

            // save metric data in db
            await db_saveTopArtistsData(spotifyID, "long_term", pagingObj.items, next);

            // retrive data from db and render 
            db_metricData = await db_getMetricData(spotifyID, "long_term", "artists", next);

            res.render(`top-artists`, {metricData: db_metricData, name: userName}); 
        };

        // get metric data directly from Spotify API 
        request(options, topMetricsCB); 
    }
});

app.post("/create-top-tracks-playlist", async (req, res, next) => {
    
    // Create a private playlist
    const data = sanitize(req.body);
    const spotifyID = req.session.spotifyID;
    const token = await getToken(spotifyID, next);
    const spotifyApi = initSpotifyAPI(token);

    spotifyApi.createPlaylist(spotifyID, `My Top Tracks ${data.timeRange}`, {'public' : false })
    .then( 
        (playlistData) => {
            console.log(`Created Top Tracks ${data.timeRange} playlist!`);
            // Add tracks to playlist
            spotifyApi.addTracksToPlaylist(playlistData.body.id, normalizeTrackIDsForPlaylist(data.spotifyTrackIDs))
            .then(
                (addTrackData) => {
                    console.log('Added tracks to playlist!');
                    res.json(`Succesfully created playlist "My Top Tracks ${data.timeRange}" \n\n View and listen to the playlist on your Spotify connected device!`);
                }, 
                (err) => {
                console.error('Error adding tracks to playlist: ', err);
                res.json("Error occured. Could not create playlist! Please try again.");
                }
            );
        }, 
        (err) => {
            console.error('Error creating playlist: ', err);
            res.json("Error occured. Could not create playlist!");
        }
    );
});

app.get("/error-page", (req,res) => {
    res.render("error-page");
});

app.get("/about", (req,res) => {
    res.render("about");
});

// invalid route handler
app.get("*", (req, res) => {
    res.redirect("/");
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
async function db_storeUser(id, name, token, next) {
    // check if user already exists
    await User.findOneAndUpdate(
        {spotifyID: id},
        {$set: {token: token}},
        {new: true, runValidators: true}, 
        (err, user) => {
            if (err || !user) {
                // create user in db 
                console.log("User does not exist. Storing user in db now ...");

                let user;
                // store name if given
                if (name) {
                    user = new User({spotifyID: id, name: name, token: token});
                } else {
                    user = new User({spotifyID: id, name: "My", token: token});
                }

                user.save((err) => {
                    if (err) {
                        console.error("Error storing user in db: "+err);
                        const errorDetails = new Error(`Error storing user in database: ${err}`);
                        next(errorDetails);
                    } else {
                        console.log("User succesfully saved in db!");
                    }
                });
            } else if (user) {
                console.log("User already exists in db. Token updated.");
            }
        }
    ).exec();
}

async function db_getMetricData(id, time, target, next) {

    // get user from db
    const user = await User.findOne({spotifyID: id}, (err, user) => {
        if (err) {
            console.error("Error finding user to get metric data: "+err);
            const errorDetails = new Error(`Error finding user to get metric data: ${err}`);
            next(errorDetails);
        } 
    }).exec();

    // query user data if user exists in db
    if (user) {
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
            switch (time) {
                case "long_term":
                    return user.topArtists_long === undefined ? null : user.topArtists_long;
                case "medium_term":
                    return user.topArtists_med === undefined ? null : user.topArtists_med;
                case "short_term":
                    return user.topArtists_short === undefined ? null : user.topArtists_short;
            }
        }
    } else {
        return null;
    }
    
}

async function db_saveTopTracksData(id, time, items, next) {
    switch (time) {
        case "long_term":
            await User.findOneAndUpdate(
                {spotifyID: id},
                {$set: {topTracks_long: await parseAndStoreTracks(items, next)}},
                {new: true, runValidators: true}, 
                (err, user) => {
                if (err) {
                    console.error("Error saving long_term top-track data: "+err);
                    const errorDetails = new Error(`Error saving long_term top-track data:  ${err}`);
                    next(errorDetails);
                } else if (user) {
                    console.log("Found User. Stored long_term tracklist");
                }
            });
            break;

        case "medium_term":
            await User.findOneAndUpdate(
                {spotifyID: id},
                {$set: {topTracks_med: await parseAndStoreTracks(items, next)}}, 
                (err, user) => {
                if (err) {
                    console.error("Error saving med_term top-track data: "+err);
                    const errorDetails = new Error(`Error saving med_term top-track data:  ${err}`);
                    next(errorDetails);
                } else if (user) {
                    console.log("Found User. Stored med_term tracklist");
                }
            });
            break;

        case "short_term":
            await User.findOneAndUpdate(
                {spotifyID: id},
                {$set: {topTracks_short: await parseAndStoreTracks(items, next)}}, 
                (err, user) => {
                if (err) {
                    console.error("Error saving short_term top-track data: "+err);
                    const errorDetails = new Error(`Error saving short_term top-track data:  ${err}`);
                    next(errorDetails);
                } else if (user) {
                    console.log("Found User. Stored short_term tracklist");
                }
            });
            break;
    }
}

async function parseAndStoreTracks(items, next) {
    const arr = [];
    for (let i=0; i<items.length; i++) {
        const currTrack = items[i];

        await Track.findOneAndUpdate(
            {spotifyID: currTrack.id}, 
            db_createTrack(currTrack),
            {upsert: true, new: true, runValidators: true}, // store track if it doesn't exist
            (err, doc) => {
            if (err) {
                console.error("error saving new track: "+err);
                const errorDetails = new Error(`Error saving new track:  ${err}`);
                next(errorDetails);
            // return from db if track already exists
            } else {
                console.log("saved new track to db: "+ doc.title);
                arr.push(doc);
            }
        });
    }

    return arr;
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

async function db_saveTopArtistsData(id, time, items, next) {
    switch (time) {
        case "long_term":
            await User.findOneAndUpdate(
                {spotifyID: id},
                {$set: {topArtists_long: await parseAndStoreArtists(items)}}, 
                {new: true, runValidators: true}, 
                (err, user) => {
                if (err) {
                    console.error("Error saving long_term top-artist data: "+err);
                    const errorDetails = new Error(`Error saving long_term top-artist data:  ${err}`);
                    next(errorDetails);
                } else if (user) {
                    console.log("Found User. Stored long_term artists");
                }
            });
            break;

        case "medium_term":
            await User.findOneAndUpdate(
                {spotifyID: id},
                {$set: {topArtists_med: await parseAndStoreArtists(items)}}, 
                (err, user) => {
                if (err) {
                    console.error("Error saving med_term top-artists data: "+err);
                    const errorDetails = new Error(`Error saving med_term top-artist data:  ${err}`);
                    next(errorDetails);
                } else if (user) {
                    console.log("Found User. Stored med_term artists");
                }
            });
            break;

        case "short_term":
            await User.findOneAndUpdate(
                {spotifyID: id},
                {$set: {topArtists_short: await parseAndStoreArtists(items)}}, 
                (err, user) => {
                if (err) {
                    console.error("Error saving short_term top-artists data: "+err);
                } else if (user) {
                    console.log("Found User. Stored short_term artists");
                }
            });
            break;
    }
}

async function parseAndStoreArtists(items) {
    const arr = [];
    for (let i=0; i<items.length; i++) {
        const currArtist = items[i];

        await Artist.findOneAndUpdate(
            {spotifyID: currArtist.id}, 
            db_createArtist(currArtist), 
            {upsert: true, new: true, runValidators: true}, // store artist if they don't exist in db
            (err, doc) => {
            if (err) {
                console.error("error saving new artist: "+err);

            // return from db if track already exists
            } else if (doc) {
                console.log("saved new artist to db: "+ doc.name);
                arr.push(doc);
            }
        });
    }

    return arr;
}

function db_createArtist(rawArtist) {
    return {
        name: rawArtist.name,
        spotifyID: rawArtist.id, 
        popularity: rawArtist.popularity
    }
}

function normalizeTrackIDsForPlaylist(arr) {
    //*
    return arr.map((val) => "spotify:track:"+val);
}


async function getToken(id, next) {
    const user = await User.findOne({spotifyID: id}, (err, findResult) => {
        if (err) {
            console.error("Error. Cannot retrive access token: "+err);
            const errorDetails = new Error(`Error. Cannot retrive access token:  ${err}`);
            next(errorDetails);
        } else if (findResult) {    
            console.log("Retrieved access token!");
        }
    }).exec();

    if (user) {
        return user.token;
    } else {
        return "token-err";
    }
}

async function getDisplayName(id, next) {
    const user = await User.findOne({spotifyID: id}, (err, findResult) => {
        if (err) {
            // create user in db 
            console.error("Error. Cannot retrive access token: "+err);
        } else if (findResult) {    
            console.log("Retrieved display name!");
        }
    }).exec();

    if (user) {
        return normalizeName(user.name);
    } else {
        console.error("Can't find user to retrieve display name.");
        const errorDetails = new Error(`Can't find user to retrieve display name.`);
        next(errorDetails);
    }
}

function normalizeName (dbName) {
    // no Spotify display name
    if (dbName==="My") {
        return dbName;
    // name ends with "s"
    } else if (dbName[dbName.length-1]==="s") {
        return dbName+"'"
    // name doesn't end with "s"
    } else {
        return dbName+"'s";
    }
}

//*
function initSpotifyAPI(token) {
    const spotifyApi = new SpotifyWebApi({
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: process.env.REDIRECTURI || "http://localhost:3000/login"
    });

    if (token!== undefined) {
        spotifyApi.setAccessToken(token);
    }

    return spotifyApi;
}

app.listen(process.env.PORT || 3000);