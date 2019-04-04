const mongoose = require('mongoose');
//const URLSlugs = require('mongoose-url-slugs');


// Schemas //

const UserSchema = new mongoose.Schema({
    username: {type: String, required: true},
    hash: {type: String, required: true},
    tracklists: [TracklistSchema]
});
mongoose.model('User', UserSchema);


const TracklistSchema = new mongoose.Schema({
    title: {type: String, required: true},
    user: {type: UserSchema, required: true},
    tracks: [TrackSchema]
});
mongoose.model('Tracklist', TracklistSchema);


const TrackSchema = new mongoose.Schema({
    title: {type: String, required: true},
    artist: {type: String, required: true},
    album: {type: String}
});
mongoose.model('Track', TrackSchema);



mongoose.connect('mongodb://localhost/mytopspotify');