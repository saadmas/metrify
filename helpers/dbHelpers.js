const mongoose = require('mongoose');
const appHelpers = require('./appHelpers');

require('../db'); ///
const User = mongoose.model('User');
const Track = mongoose.model("Track");
const Artist = mongoose.model("Artist");

async function storeUser(id, name, token, next) {
  await User.findOneAndUpdate(
    { spotifyID: id },
    { $set: { token }},
    { new: true, runValidators: true }, 
    (err, user) => onFindUserForSave(err, user, name, next))
  .exec();
}

function onFindUserForSave(err, user, name, next) {
  if (err || !user) {
    console.log("User does not exist. Storing user in db now ...");

    const user = name ? 
    new User({ spotifyID: id, name, token }) :
    new User({ spotifyID: id, name: "My", token });

    user.save((err) => {
      if (err) {
        const errorMessage = `Error storing user in db: ${err}`;
        appHelpers.handleError(errorMessage, next);
        return;
      } 
      console.log("User succesfully saved in db!");
    });
  } else if (user) {
    console.log("User already exists in db. Token updated.");
  } 
}

async function getMetricData(id, time, target, next) {
  const user = await User.findOne(
    { spotifyID: id }, 
    (err, user) => {
      if (err) {
        const errorMessage = `Error finding user to get metric data: ${err}`;
        appHelpers.handleError(errorMessage, next);
      }
    })
  .exec();
  
  if (!user) {
    return null;
  }
  
  if (target === "tracks") {
    return getTopTrackData(user, time);
  } else if (target === "artists") {
    return getTopArtistData(user, time);
  }
}

function getTopTrackData(user, time) {
  switch (time) {
    case "long_term":
      return user.topTracks_long;
    case "medium_term":
      return user.topTracks_med;
    case "short_term":
      return user.topTracks_short;
  }
}

function getTopArtistData(user, time) {
  switch (time) {
    case "long_term":
      return user.topArtists_long;
    case "medium_term":
      return user.topArtists_med;
    case "short_term":
      return user.topArtists_short;
  }
}

function saveTopTracksData(id, time, items, next) {
  switch (time) {
    case "long_term":
      updateTopTracks(id, 'long', items, next);
      break;
    case "medium_term":
      updateTopTracks(id, 'med', items, next);
      break;
    case "short_term":
      updateTopTracks(id, 'short', items, next);
      break;
  }
}

async function updateTopTracks(id, time, items, next) {
  await User.findOneAndUpdate(
    { spotifyID: id },
    { $set: { [`topTracks_${time}`]: await parseAndStoreTracks(items, next) }},
    { new: true, runValidators: true }, 
    (err, user) => {
      if (err) {
        const errorMessage = `Error saving ${time}_term top-track data: ${err}`;
        appHelpers.handleError(errorMessage, next);
      } else if (user) {
          console.log(`Found User. Stored ${time}_term tracklist`);
      }
  });
}

async function parseAndStoreTracks(trackItems, next) {
  const trackDocs = [];

  for (const trackItem of trackItems) {
    await Track.findOneAndUpdate(
      { spotifyID: trackItem.id }, 
      createTrack(trackItem),
      { upsert: true, new: true, runValidators: true },
      (err, trackDoc) => {
        if (err) {
          const errorMessage = `Error saving new track: ${err}`;
          appHelpers.handleError(errorMessage, next);
          return;
        }
        console.log("saved new track to db: "+ trackDoc.title);
        trackDocs.push(trackDoc);
    });
  }

  return trackDocs;
}

function createTrack(trackItem) {
  return {
      title: trackItem.name,
      spotifyID: trackItem.id, 
      artists: trackItem.artists.map(artist => artist.name)
  }
}

function saveTopArtistsData(id, time, items, next) {
  switch (time) {
    case "long_term":
      updateTopArtists(id, 'long', items, next);
      break;
    case "medium_term":
      updateTopArtists(id, 'med', items, next);
      break;
    case "short_term":
      updateTopArtists(id, 'short', items, next);
      break;
  }
}

async function updateTopArtists(id, time, items, next) {
  await User.findOneAndUpdate(
    { spotifyID: id },
    { $set: { [`topArtists_${time}`]: await parseAndStoreArtists(items, next) }},
    { new: true, runValidators: true }, 
    (err, user) => {
      if (err) {
        const errorMessage = `Error saving ${time}_term top-artist data: ${err}`;
        appHelpers.handleError(errorMessage, next);
      } else if (user) {
          console.log(`Found User. Stored ${time}_term artists`);
      }
  });
}

async function parseAndStoreArtists(artistItems, next) {
  const artists = [];

  for (const artistItem of artistItems) {
    await Artist.findOneAndUpdate(
      { spotifyID: artistItem.id }, 
      createArtist(artistItem), 
      { upsert: true, new: true, runValidators: true },
      (err, doc) => {
        if (err) {
          const errorMessage = `Error saving new artist: ${err}`;
          appHelpers.handleError(errorMessage, next);
        } else if (doc) {
          console.log("saved new artist to db: "+ doc.name);
          artists.push(doc);
        }
    });
  }

  return artists;
}

function createArtist(rawArtist) {
  return {
    name: rawArtist.name,
    spotifyID: rawArtist.id
  }
}

async function getToken(id, next) {
  const user = await User.findOne({ spotifyID: id }, (err, findResult) => {
    if (err) {
      const errorMessage = `Error. Cannot retrive access token: ${err}`;
      appHelpers.handleError(errorMessage, next);
    } else if (findResult) {    
      console.log("Retrieved access token!");
    }
  }).exec();

  if (user) {
    return user.token;
  } 

  return "token-err";
}

async function getDisplayName(id, next) {
  const user = await User.findOne({ spotifyID: id }, (err, findResult) => {
    if (err) {
      console.error(`Error. Cannot retrive access token: ${err}`);
    } else if (findResult) {    
      console.log("Retrieved display name!");
    }
  }).exec();

  if (user) {
    return normalizeName(user.name);
  }

  const errorMessage = `Can't find user to retrieve display name. ${err}`;
  appHelpers.handleError(errorMessage, next);
}

function normalizeName(dbName) {
  let normalizedName = dbName;

  if (dbName[dbName.length-1] === "s") {
    normalizedName += "'";
  } else {
    normalizedName += "'s";
  }

  return normalizedName;
}

module.exports = {
  storeUser,
  getToken,
  getDisplayName,
  getMetricData,
  saveTopTracksData,
  saveTopArtistsData
};
