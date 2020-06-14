const request = require("request");
const SpotifyWebApi = require('spotify-web-api-node');
const dbHelpers = require('./dbHelpers');

async function loginUser(spotifyApi, req, res, token, next) {
    try {
        const user = await spotifyApi.getMe();
        const userId = user.body.id;
        // console.log('Info abt the authenticated user: ', user.body);
        await dbHelpers.storeUser(userId, user.body['display_name'], token, next);
        req.session.spotifyID = userId;
        req.session.save();
        res.redirect("/top-tracks");
     } catch (e) {
        const errorMessage = `Cannot get authenticated user info: ${e}`;
        handleError(errorMessage, next);
     }
}

async function makeDirectSpotifyApiRequest(res, next, spotifyID, metric, timeRange, userName, isAjax) {
    const token = await dbHelpers.getToken(spotifyID, next);
    const options = {
        url: `https://api.spotify.com/v1/me/top/${metric}?time_range=${timeRange}&limit=50`,
        headers: { "Authorization": `Bearer ${token}` } 
    };
    const topMetricsHandler = createTopMetricsHandler(spotifyID, metric, next, res, timeRange, userName, isAjax);
    request(options, topMetricsHandler); 
}

async function handleMetricPage(metric, req, res, next) {
    const { spotifyID } = req.session;
    const timeRange = 'long_term';
    const userName = await dbHelpers.getDisplayName(spotifyID, next);

    const metricData = await dbHelpers.getMetricData(spotifyID, timeRange, metric, next);
    if (metricData && metricData.length) {
        console.log("retrieved top tracks (all time) data from db"); 
        res.render(`top-${metric}`, { metricData, name: userName });
        return;
    }

    makeDirectSpotifyApiRequest(res, next, spotifyID, metric, timeRange, userName);
}

async function addTracksToPlaylist(spotifyApi, playlistID, trackIDs, timeRange, res) {
    try {
        await spotifyApi.addTracksToPlaylist(playlistID, trackIDs);
        console.log('Added tracks to playlist!');
        res.json(`Succesfully created private playlist "My Top Tracks ${timeRange}" \n\n View and listen to the playlist on your Spotify connected device!`);
    } catch (e) {
        console.error(`Error adding tracks to playlist: ${e}`);
        res.json("Error occured. Could not create playlist! Please try again.");
    }
}

function handleError(errorMessage, next) {
    console.error(errorMessage);
    const error = new Error(errorMessage);
    next(error);
}

function createTopMetricsHandler(spotifyID, metric, next, res, timeRange, userName, isAjax) {
    const topMetricsHandler = async (error, apiResponse, body) => {
        if (error || apiResponse.statusCode !== 200) {
            console.error(`Error fetching top ${metric}: ${error}`)
            const errorDetails = new Error(`Error getting top ${metric}: ${error}`);
            next(errorDetails);
            return;
        }

        const { items } = JSON.parse(body);
        
        if (metric === "tracks") {
            await dbHelpers.saveTopTracksData(spotifyID, timeRange, items, next);
        } else if (metric === "artists") {
            await dbHelpers.saveTopArtistsData(spotifyID, timeRange, items, next);
        }

        const metricData = await dbHelpers.getMetricData(spotifyID, timeRange, metric, next);
        
        if (isAjax) {
            res.json(metricData);
        } else {
            res.render(`top-${metric}`, { metricData, name: userName });
        }
    };
    return topMetricsHandler;
}

function normalizeTrackIDsForPlaylist(trackIds) {
    return trackIds.map((trackId) => "spotify:track:" + trackId);
}

function createSpotifyAPI(token) {
    const spotifyApi = new SpotifyWebApi({
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: process.env.REDIRECTURI
    });

    if (token) {
        spotifyApi.setAccessToken(token);
    }
    
    return spotifyApi;
}

module.exports = {
  handleError,
  addTracksToPlaylist,
  handleMetricPage,
  makeDirectSpotifyApiRequest,
  loginUser,
  normalizeTrackIDsForPlaylist,
  createSpotifyAPI
};