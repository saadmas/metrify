const mongoose = require('mongoose');

mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const dotenv = require('dotenv');
dotenv.config();


// Schemas //

const TrackSchema = new mongoose.Schema({
    title: {type: String, required: true}, 
    spotifyID: {type: String, required: true},
    artists: {type: [String], required: true},
});
mongoose.model('Track', TrackSchema);

const ArtistSchema = new mongoose.Schema({
    name: {type: String, required: true},
    spotifyID: {type: String, required: true}
});
mongoose.model('Artist', ArtistSchema);

const UserSchema = new mongoose.Schema({
    spotifyID: {type: String, required: true},
    name: String,
    token: {type: String, required: true},
    
    topTracks_long: [TrackSchema],
    topTracks_med: [TrackSchema],
    topTracks_short: [TrackSchema],

    topArtists_long: [ArtistSchema],
    topArtists_med: [ArtistSchema],
    topArtists_short: [ArtistSchema],
});
mongoose.model('User', UserSchema);


mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/metrify', { useNewUrlParser: true });