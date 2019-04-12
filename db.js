const mongoose = require('mongoose');
//const URLSlugs = require('mongoose-url-slugs');

const dotenv = require('dotenv');
dotenv.config();


// Schemas //

const TrackSchema = new mongoose.Schema({
    title: {type: String, required: true}, // top
    spotifyID: {type: String, required: true}, // top (id)
    artists: {type: String, required: true}, // artist obj
    album: {type: String},  // album obj
    releaseDate: {type: String, required: true}, // album obj
    APIEndpoint: {type: String, required: true}, // top (href)
    popularity: {type: String, required: true}, // top 
});
mongoose.model('Track', TrackSchema);


const TracklistSchema = new mongoose.Schema({
    timeRange: {type: String, required: true},
    tracks: [TrackSchema]
});
mongoose.model('Tracklist', TracklistSchema);


const UserSchema = new mongoose.Schema({
    spotifyID: {type: String, required: true},
    token: {type: String, required: true},
    name: String,
    tracklists: [TracklistSchema]
});
mongoose.model('User', UserSchema);














mongoose.connect(process.env.CONNSTRING || 'mongodb://localhost/metrify');