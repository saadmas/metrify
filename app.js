const path = require("path");
const sanitize = require('mongo-sanitize'); 
const express = require('express');
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const keyGrip = require('keygrip');
const appHelpers = require('./helpers/appHelpers');
const dbHelpers = require('./helpers/dbHelpers');

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
            const token = await dbHelpers.getToken(req.session.spotifyID, next);
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
    const spotifyApi = appHelpers.createSpotifyAPI();
    const authURL = spotifyApi.createAuthorizeURL(['user-read-private', 'user-read-email', 'user-top-read', 'playlist-modify-private']);
    res.redirect(authURL);
}); 

app.get("/login", async (req, res, next) => {
    const authCode = req.query.code;
    const spotifyApi = appHelpers.createSpotifyAPI();
    try {
        const data = await spotifyApi.authorizationCodeGrant(authCode);
        const token = data.body['access_token'];
        spotifyApi.setAccessToken(token);
        appHelpers.loginUser(spotifyApi, req, res, token, next);
    }
    catch (e) {
        const errorMessage = `Something went wrong with authorizing code grant: ${e}`;
        appHelpers.handleError(errorMessage, next);
    }   
}); 

app.get('/get-metric', async (req, res, next) => {
    const { 
        query: { target, timeRange }, 
        session: { spotifyID } 
    } = req;

    const metricData = await dbHelpers.getMetricData(spotifyID, timeRange, target, next);
    if (metricData && metricData.length) {
        console.log(`retrieved metric data for ${target} - ${timeRange} from db`);
        res.json(metricData);
        return;
    }

    appHelpers.makeDirectSpotifyApiRequest(res, next, spotifyID, target, timeRange);
});
 
app.get("/top-tracks", (req, res, next) => {
    appHelpers.handleMetricPage('tracks', req, res, next);
});

app.get("/top-artists", (req, res, next) => {
    appHelpers.handleMetricPage('artists', req, res, next);
});

app.post("/create-top-tracks-playlist", async (req, res, next) => {
    const { 
        session: { spotifyID },
        body
    } = req;
    const data = sanitize(body);
    const { timeRange, spotifyTrackIDs } = data;
    const token = await dbHelpers.getToken(spotifyID, next);
    const spotifyApi = appHelpers.createSpotifyAPI(token);
    try {
        const playlistData = await spotifyApi.createPlaylist(spotifyID, `My Top Tracks ${timeRange}`, { 'public': false });
        console.log(`Created Top Tracks ${timeRafnge} playlist!`);
        const normalizedTrackIDs = appHelpers.normalizeTrackIDsForPlaylist(spotifyTrackIDs);
        appHelpers.addTracksToPlaylist(spotifyApi, playlistData.body.id, normalizedTrackIDs, timeRange, res);
    } catch (e) {
        console.error(`Error creating playlist: ${e}`);
        res.json("Error occured. Could not create playlist!");
    }
});

app.get("/error-page", (req,res) => {
    res.render("error-page", { noNav: true });
});

app.get("/about", (req,res) => {
    res.render("about");
});

app.get("*", (req, res) => {
    res.redirect("/");
});

/// 


app.listen(process.env.PORT || 3000);
