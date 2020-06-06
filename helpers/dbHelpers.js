const mongoose = require('mongoose');
const appHelpers = require('./appHelpers');

require('../db'); ///
const User = mongoose.model('User');
const Track = mongoose.model("Track");
const Artist = mongoose.model("Artist");

async function storeUser(id, name, token, next) {
  // check if user already exists
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

async function parseAndStoreTracks(items, next) {
  const arr = [];
  for (let i=0; i<items.length; i++) {
      const currTrack = items[i];

      await Track.findOneAndUpdate(
          {spotifyID: currTrack.id}, 
          createTrack(currTrack),
          {upsert: true, new: true, runValidators: true}, // store track if it doesn't exist
          (err, doc) => {
          if (err) {
            const errorMessage = `Error saving new track: ${err}`;
            appHelpers.handleError(errorMessage, next);
          // return from db if track already exists
          } else {
              console.log("saved new track to db: "+ doc.title);
              arr.push(doc);
          }
      });
  }

  return arr;
}

function createTrack(currTrack) {
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

async function saveTopArtistsData(id, time, items, next) {
  switch (time) {
      case "long_term":
          await User.findOneAndUpdate(
              {spotifyID: id},
              {$set: {topArtists_long: await parseAndStoreArtists(items)}}, 
              {new: true, runValidators: true}, 
              (err, user) => {
              if (err) {
                const errorMessage = `Error saving long_term top-artist data: ${err}`;
                appHelpers.handleError(errorMessage, next);
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
                const errorMessage = `Error saving med_term top-artist data: ${err}`;
                appHelpers.handleError(errorMessage, next);
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
          createArtist(currArtist), 
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

function createArtist(rawArtist) {
  return {
      name: rawArtist.name,
      spotifyID: rawArtist.id
  }
}


async function getToken(id, next) {
  const user = await User.findOne({spotifyID: id}, (err, findResult) => {
      if (err) {
        const errorMessage = `Error. Cannot retrive access token: ${err}`;
        appHelpers.handleError(errorMessage, next);
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
    const errorMessage = `Can't find user to retrieve display name. ${err}`;
    appHelpers.handleError(errorMessage, next);
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

module.exports = {
  storeUser,
  getToken,
  getDisplayName,
  getMetricData,
  saveTopTracksData,
  saveTopArtistsData,

};