const mongoose = require('mongoose');

require('../db'); ///
const User = mongoose.model('User');
const Track = mongoose.model("Track");
const Artist = mongoose.model("Artist");

async function db_storeUser(id, name, token, next) {
  // check if user already exists
  await User.findOneAndUpdate(
      {spotifyID: id},
      {$set: {token: token}},
      {new: true, runValidators: true}, 
      (err, user) => {
          if (err || !user) {
              // create user in db 
              console.log("User does not exist. Storing user in db now ...");

              let user;
              // store name if given
              if (name) {
                  user = new User({spotifyID: id, name: name, token: token});
              } else {
                  user = new User({spotifyID: id, name: "My", token: token});
              }

              user.save((err) => {
                  if (err) {
                      console.error("Error storing user in db: "+err);
                      const errorDetails = new Error(`Error storing user in database: ${err}`);
                      next(errorDetails);
                  } else {
                      console.log("User succesfully saved in db!");
                  }
              });
          } else if (user) {
              console.log("User already exists in db. Token updated.");
          }
      }
  ).exec();
}

async function db_getMetricData(id, time, target, next) {

  // get user from db
  const user = await User.findOne({spotifyID: id}, (err, user) => {
      if (err) {
          console.error("Error finding user to get metric data: "+err);
          const errorDetails = new Error(`Error finding user to get metric data: ${err}`);
          next(errorDetails);
      } 
  }).exec();

  // query user data if user exists in db
  if (user) {
      if (target==="tracks") {
          switch (time) {
              case "long_term":
                  return user.topTracks_long === undefined ? null : user.topTracks_long;
              case "medium_term":
                  return user.topTracks_med === undefined ? null : user.topTracks_med;
              case "short_term":
                  return user.topTracks_short === undefined ? null : user.topTracks_short;
          }
      } else if (target==="artists") {
          switch (time) {
              case "long_term":
                  return user.topArtists_long === undefined ? null : user.topArtists_long;
              case "medium_term":
                  return user.topArtists_med === undefined ? null : user.topArtists_med;
              case "short_term":
                  return user.topArtists_short === undefined ? null : user.topArtists_short;
          }
      }
  } else {
      return null;
  }
  
}

async function db_saveTopTracksData(id, time, items, next) {
  switch (time) {
      case "long_term":
          await User.findOneAndUpdate(
              {spotifyID: id},
              {$set: {topTracks_long: await parseAndStoreTracks(items, next)}},
              {new: true, runValidators: true}, 
              (err, user) => {
              if (err) {
                  console.error("Error saving long_term top-track data: "+err);
                  const errorDetails = new Error(`Error saving long_term top-track data:  ${err}`);
                  next(errorDetails);
              } else if (user) {
                  console.log("Found User. Stored long_term tracklist");
              }
          });
          break;

      case "medium_term":
          await User.findOneAndUpdate(
              {spotifyID: id},
              {$set: {topTracks_med: await parseAndStoreTracks(items, next)}}, 
              (err, user) => {
              if (err) {
                  console.error("Error saving med_term top-track data: "+err);
                  const errorDetails = new Error(`Error saving med_term top-track data:  ${err}`);
                  next(errorDetails);
              } else if (user) {
                  console.log("Found User. Stored med_term tracklist");
              }
          });
          break;

      case "short_term":
          await User.findOneAndUpdate(
              {spotifyID: id},
              {$set: {topTracks_short: await parseAndStoreTracks(items, next)}}, 
              (err, user) => {
              if (err) {
                  console.error("Error saving short_term top-track data: "+err);
                  const errorDetails = new Error(`Error saving short_term top-track data:  ${err}`);
                  next(errorDetails);
              } else if (user) {
                  console.log("Found User. Stored short_term tracklist");
              }
          });
          break;
  }
}

async function parseAndStoreTracks(items, next) {
  const arr = [];
  for (let i=0; i<items.length; i++) {
      const currTrack = items[i];

      await Track.findOneAndUpdate(
          {spotifyID: currTrack.id}, 
          db_createTrack(currTrack),
          {upsert: true, new: true, runValidators: true}, // store track if it doesn't exist
          (err, doc) => {
          if (err) {
              console.error("error saving new track: "+err);
              const errorDetails = new Error(`Error saving new track:  ${err}`);
              next(errorDetails);
          // return from db if track already exists
          } else {
              console.log("saved new track to db: "+ doc.title);
              arr.push(doc);
          }
      });
  }

  return arr;
}

function db_createTrack(currTrack) {
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

async function db_saveTopArtistsData(id, time, items, next) {
  switch (time) {
      case "long_term":
          await User.findOneAndUpdate(
              {spotifyID: id},
              {$set: {topArtists_long: await parseAndStoreArtists(items)}}, 
              {new: true, runValidators: true}, 
              (err, user) => {
              if (err) {
                  console.error("Error saving long_term top-artist data: "+err);
                  const errorDetails = new Error(`Error saving long_term top-artist data:  ${err}`);
                  next(errorDetails);
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
                  console.error("Error saving med_term top-artists data: "+err);
                  const errorDetails = new Error(`Error saving med_term top-artist data:  ${err}`);
                  next(errorDetails);
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
          db_createArtist(currArtist), 
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

function db_createArtist(rawArtist) {
  return {
      name: rawArtist.name,
      spotifyID: rawArtist.id
  }
}


async function getToken(id, next) {
  const user = await User.findOne({spotifyID: id}, (err, findResult) => {
      if (err) {
          console.error("Error. Cannot retrive access token: "+err);
          const errorDetails = new Error(`Error. Cannot retrive access token:  ${err}`);
          next(errorDetails);
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
      console.error("Can't find user to retrieve display name.");
      const errorDetails = new Error(`Can't find user to retrieve display name.`);
      next(errorDetails);
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
  db_storeUser,
  getToken,
  getDisplayName,
  db_getMetricData,
  db_saveTopTracksData,
  db_saveTopArtistsData,

};