const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const TrackSchema = new mongoose.Schema({
    title: { type: String, required: true },
    spotifyID: { type: String, required: true },
    artists: { type: [String], required: true },
});
mongoose.model('Track', TrackSchema);

const ArtistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    spotifyID: { type: String, required: true }
});
mongoose.model('Artist', ArtistSchema);

const UserSchema = new mongoose.Schema({
    spotifyID: { type: String, required: true },
    name: String,
    token: { type: String, required: true },
    topTracksLong: {
        tracks: [TrackSchema],
        lastUpdated: Date
    },
    topTracksMedium: {
        tracks: [TrackSchema],
        lastUpdated: Date
    },
    topTracksShort: {
        tracks: [TrackSchema],
        lastUpdated: Date
    },
    topArtistsLong: {
        artists: [ArtistSchema],
        lastUpdated: Date
    },
    topArtistsMedium: {
        artists: [ArtistSchema],
        lastUpdated: Date
    },
    topArtistsShort: {
        artists: [ArtistSchema],
        lastUpdated: Date
    },
});
mongoose.model('User', UserSchema);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/metrify',
    { useNewUrlParser: true, useUnifiedTopology: true }
);
