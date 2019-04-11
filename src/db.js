const mongoose = require('mongoose');
//const URLSlugs = require('mongoose-url-slugs');

const dotenv = require('dotenv');
dotenv.config();


// Schemas //

const TrackSchema = new mongoose.Schema({
    title: {type: String, required: true},
    artist: {type: String, required: true},
    album: {type: String}
});
mongoose.model('Track', TrackSchema);


const TracklistSchema = new mongoose.Schema({
    title: {type: String, required: true},
    tracks: [TrackSchema]
});
mongoose.model('Tracklist', TracklistSchema);


const UserSchema = new mongoose.Schema({
    username: {type: String, required: true},
    hash: {type: String, required: true},
    tracklists: [TracklistSchema]
});
mongoose.model('User', UserSchema);














mongoose.connect(process.env.CONNSTRING || 'mongodb://localhost/metrify');