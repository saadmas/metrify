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
    (err, user) => onFindUserForSave(id, token, err, user, name, next))
  .exec();
}

function onFindUserForSave(id, token, err, user, name, next) {
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

async function getMetricData(id, time, metric, next) {
  const user = await User.findOne(
    { spotifyID: id }, 
    (err, user) => {
      if (err) {
        const errorMessage = `Error finding user to get metric data: ${err}`;
        appHelpers.handleError(errorMessage, next);
      }
    })
  .exec();
  
  let timeKey = time.split('_')[0];
  timeKey = timeKey.charAt(0).toUpperCase() + timeKey.slice(1);
  const metricKey = metric.charAt(0).toUpperCase() + metric.slice(1);
  const metricField = `top${metricKey}${timeKey}`;
  const lastUpdated = user[metricField]['lastUpdated'];

  if (!user || getMinutesFromNow(lastUpdated) > 60) {
    return null;
  }
  
  if (metric === "tracks") {
    return getTopTrackData(user, time);
  } else if (metric === "artists") {
    return getTopArtistData(user, time);
  }
}
 
function getMinutesFromNow(date) {
  const now = new Date();
  const diff = Math.abs(now - date);
  const minutesFromNow = Math.floor((diff / 1000) / 60);
  return minutesFromNow;
}

function getTopTrackData(user, time) {
  switch (time) {
    case "long_term":
      return user.topTracksLong.topTracksLong;
    case "medium_term":
      return user.topTracksMedium.topTracksMedium;
    case "short_term":
      return user.topTracksShort.topTracksShort;
  }
}

function getTopArtistData(user, time) {
  switch (time) {
    case "long_term":
      return user.topArtistsLong.topArtistsLong;
    case "medium_term":
      return user.topArtistsMedium.topArtistsMedium;
    case "short_term":
      return user.topArtistsShort.topArtistsShort;
  }
}

async function saveTopTracksData(id, time, items, next) {
  switch (time) {
    case "long_term":
      await updateTopTracks(id, 'Long', items, next);
      break;
    case "medium_term":
      await updateTopTracks(id, 'Medium', items, next);
      break;
    case "short_term":
      await updateTopTracks(id, 'Short', items, next);
      break;
  }
}

async function updateTopTracks(id, time, items, next) {
  const fieldName = `topTracks${time}`;
  await User.findOneAndUpdate(
    { spotifyID: id },
    { $set: { 
      [fieldName]: {
        [fieldName]: await parseAndStoreTracks(items, next),
        lastUpdated: new Date()
      }
    }},
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
        // console.log("saved new track to db: "+ trackDoc.title);
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

async function saveTopArtistsData(id, time, items, next) {
  switch (time) {
    case "long_term":
      await updateTopArtists(id, 'Long', items, next);
      break;
    case "medium_term":
      await updateTopArtists(id, 'Medium', items, next);
      break;
    case "short_term":
      await updateTopArtists(id, 'Short', items, next);
      break;
  }
}

async function updateTopArtists(id, time, items, next) {
  const fieldName = `topArtists${time}`;
  await User.findOneAndUpdate(
    { spotifyID: id },
    { $set: { 
      [fieldName]: {
        [fieldName]: await parseAndStoreArtists(items, next),
        lastUpdated: new Date()
      }
    }},
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
          // console.log("saved new artist to db: "+ doc.name);
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
      // console.log("Retrieved access token!");
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
      // console.log("Retrieved display name!");
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
