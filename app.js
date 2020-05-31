const request = require("request");
const path = require("path");
const sanitize = require('mongo-sanitize'); 
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const keyGrip = require('keygrip');
const SpotifyWebApi = require('spotify-web-api-node');

// DB setup
require('./db.js');
const User = mongoose.model('User');
const Track = mongoose.model("Track");
const Artist = mongoose.model("Artist");

// Express setup
const app = express();
app.set('view engine', 'hbs');

// Middleware

// Session
app.use(cookieSession({
    name: 'spotifyUser',
    keys: new keyGrip(['key1', 'key2'], 'SHA384', 'base64'),
    maxAge: 3600000,
    httpOnly: true
}));

// Spotify auth ///
app.use(async (req, res, next) => {
    if (req.url === "/top-tracks" || req.url === "/top-artists") {
        if (req.session.spotifyID) {
            const token = await getToken(req.session.spotifyID, next);
            if (token === "token-err") {
                res.redirect("/");
                return;
            } 
            next();
            return;
        } 
        res.redirect("/");
        return;
    } 
    next();  
});

// Static files
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Body parser
app.use(bodyParser.urlencoded({ extended: false }));

// JSON
app.use(express.json());

// Error handling
app.use((err, req, res, next) => {
    console.error("error msg: " + err.message); 
    console.error("error stack: " + err.stack); 
    
    if (!err.statusCode) { 
        err.statusCode = 500;
    }
    
    res.status(err.statusCode).render("error-page", {errMsg: err.message, errStack: err.stack}); 
});

// Routes
app.get("/", (req, res) => {
    res.render("index", { noNav: true });
}); 

app.get("/spotify-auth", (req, res) => {
    const spotifyApi = createSpotifyAPI();
    const authURL = spotifyApi.createAuthorizeURL(['user-read-private', 'user-read-email', 'user-top-read', 'playlist-modify-private']);
    res.redirect(authURL);
}); 

app.get("/login", async (req, res, next) => {
    const authCode = req.query.code;
    const spotifyApi = createSpotifyAPI();
    try {
        const data = await spotifyApi.authorizationCodeGrant(authCode);
        const token = data.body['access_token'];
        spotifyApi.setAccessToken(token);
        loginUser(spotifyApi, req, res, token, next);
    }
    catch (e) {
        const errorMessage = `Something went wrong with authorizing code grant: ${e}`;
        handleError(errorMessage);
    }   
}); 

app.get('/get-metric', async (req, res, next) => {
    const { 
        query: { target, timeRange }, 
        session: { spotifyID } 
    } = req;

    const db_metricData = await db_getMetricData(spotifyID, timeRange, target, next);
    if (db_metricData && db_metricData.length) {
        // console.log(`retrieved metric data for ${target} - ${timeRange} from db`);
        res.json(db_metricData);
        return;
    }

    // Make request to Spotify API directly (not through Node.js wrapper library)
    const token = await getToken(spotifyID, next);
    const options = {
        url: `https://api.spotify.com/v1/me/top/${target}?time_range=${timeRange}&limit=50`,
        headers: { "Authorization": `Bearer ${token}` } 
    };
    const topMetricsHandler = createTopMetricsHandler(spotifyID, "", target, next, res, timeRange, "AJAX");
    request(options, topMetricsHandler); 
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

        // get metric data directly from Spotify API 
        const topMetricsCB = createTopMetricsHandler(spotifyID, userName, "tracks", next, res, "long_term");
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

        // get metric data directly from Spotify API 
        const topMetricsCB = createTopMetricsHandler(spotifyID, userName, "artists", next, res, "long_term");
        request(options, topMetricsCB); 
    }
});

app.post("/create-top-tracks-playlist", async (req, res, next) => {
    
    // Create a private playlist
    const data = sanitize(req.body);
    const spotifyID = req.session.spotifyID;
    const token = await getToken(spotifyID, next);
    const spotifyApi = createSpotifyAPI(token);

    spotifyApi.createPlaylist(spotifyID, `My Top Tracks ${data.timeRange}`, {'public' : false })
    .then( 
        (playlistData) => {
            console.log(`Created Top Tracks ${data.timeRange} playlist!`);
            // Add tracks to playlist
            spotifyApi.addTracksToPlaylist(playlistData.body.id, normalizeTrackIDsForPlaylist(data.spotifyTrackIDs))
            .then(
                (addTrackData) => {
                    console.log('Added tracks to playlist!');
                    res.json(`Succesfully created private playlist "My Top Tracks ${data.timeRange}" \n\n View and listen to the playlist on your Spotify connected device!`);
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
    res.render("error-page", {noNav: true});
});

app.get("/about", (req,res) => {
    res.render("about");
});

// invalid route handler
app.get("*", (req, res) => {
    res.redirect("/");
});

// Helper functions //
async function loginUser(spotifyApi, req, res, token, next) {
    try {
        const user = await spotifyApi.getMe();
        const userId = user.body.id;
        // console.log('Info abt the authenticated user: ', user.body);
        await db_storeUser(userId, user.body['display_name'], token, next);
        req.session.spotifyID = userId;
        req.session.save();
        res.redirect("/top-tracks");
     } catch (e) {
        const errorMessage = `Cannot get authenticated user info: ${e}`;
        handleError(errorMessage);
     }
}

function handleError(errorMessage, next) {
    console.error(errorMessage);
    const error = new Error(errorMessage);
    next(error);
}

function createTopMetricsHandler (spotifyID, userName, target, next, res, timeRange, isAJAXReq) {
    const cb = async (error, response, body) => {
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

        // retrive data from db and render 
        db_metricData = await db_getMetricData(spotifyID, "long_term", target, next);
        
        if (isAJAXReq) {
            res.json(db_metricData);
        } else {
            res.render(`top-${target}`, {metricData: db_metricData, name: userName});
        }
    };

    return cb;
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
        artists: parseArtistsFromTrackObj(currTrack)
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
        spotifyID: rawArtist.id
    }
}

function normalizeTrackIDsForPlaylist(arr) {
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

function createSpotifyAPI(token) {
    const spotifyApi = new SpotifyWebApi({
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: process.env.REDIRECTURI
    });

    if (token!== undefined) {
        spotifyApi.setAccessToken(token);
    }
    
    return spotifyApi;
}

app.listen(process.env.PORT || 3000);