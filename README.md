#  Metrify

## Overview

**Spotify** is awesome. You can listen to music on the go, offline, with high quality audio. You get personalized playlists, access to an unparalleled catalog of songs, and a sleek, seamless UI.

But, ever wondered what your most played tracks are? How about your most played artists? Spotify may gave you those stats in their annual "Year Wrapped" feature, but what if you wanted to know right this second? 

Enter **Metrify** . Connect your Spotify account to Metrify to get access to your top 50 most played tracks and artists. Wanna put those top played tracks into their own Spotify playlists so you can bump them later? Got you covered. 


## Data Model

The application will store Users, Tracks, and Artists

**Users**
* Can have multiple tracklists based on time and type 
* Tracklists are stored by embedding tracks within an array 

**Tracks**
* Can contain varying amounts of metadata 

**Artistss**
* Can contain varying amounts of metadata 

An example User:

```javascript
{
  spotifyID: "technojunkie",
  topTracks_long: [TrackSchema],
  topTracks_med: [TrackSchema],
  topTracks_short: [TrackSchema],

  topArtists_long: [ArtistSchema],
  topArtists_med: [ArtistSchema],
  topArtists_short: [ArtistSchema],
}
```

An example Artist:

```javascript
{
  name: "Stephan Bodzin" 
}
```

An example Track:

```javascript
{
  title: "Spider On the Moon", 
  artist: "Rezz", 
  album: "Certain Kind of Magic"
}
```

## [Link to Commented Third Draft Schema](db.js) 

## Wireframes

/ - home page for user to connect to their Spotify account

![/](documentation/wireframes/login.png)

/top-artists - page for user's top played artists

![/top-artists](documentation/wireframes/top-artists.png)

/top-tracks - page for user's top played tracks

![/top-tracks](documentation/wireframes/top-tracks.png)

## Site map

![site map](documentation/sitemap.PNG)

## User Stories or Use Cases

1. as non-connected user, I can connect my Spotify account to enter the site
2. as a user, I can view my top played artists
3. as a user, I can view my top played tracks
4. as a user, I can filter my top played artists by time
5. as a user, I can filter my top played tracks by time
6. as a user, I can make a new Spotify playlist out of my top played tracks
7. as a user, I can view specific metadata about one of my top played tracks
8. as a user, I can view specific metadata about one of my top played artists

## Research Topics

* **(4 points) Node.js wrapper library for Spotify's Web API**
  * **WHAT**: Handy Node.js library that simplifies a lot of the low level request-response handling with Spotify's Web API. Puts a layer of abstraction over retreiving JSON metadata about music, artists, albums, and tracks, directly from the Spotify Data Catalogue. Includes helper functions to retreive music metadata, perform searches, gather user info, and more. 
  * **WHY**: Abstraction the library provides allows time for focusing on other aspects of the project rather than just dealing with Spotify's Web API. Additionally, the library functions are built with a strong focus on callbacks. We have been using callbacks heavily in this course, so it's nice to be able to put them to use here too.  
* **(2 points) Spotify Web API**
  * **WHAT**: Based on simple REST principles, the Spotify Web API endpoints return JSON metadata about music, artists, albums, and tracks, directly from the Spotify Data Catalogue. Web API also provides access to user related data, like playlists and music that the user saves in the "Your Music" library. Such access is enabled through selective authorization, by the user.
  * **WHY**: As fate would have it, one of the only functions the Node.js wrapper library mentioned above doesn't have is one to retrieve top played tracks/artists. Therefore, will have to use the Spotify Web API directly to do that. Not complaining! Will be nice to see the similarities/differences between implementation of the wrapper vs direct API. 
* **(2 points) Bootstrap**
  * **WHAT**: Arguably the best CSS framework around for responsive design. It has great templates for typography, forms, buttons, tables, navigation, modals, image carousels, and other elements. Built by Twitter engineers!
  * **WHY**: CSS isn't my strong suit. So, of course, Bootstrap is my saviour! It's easy to use, responsive to different devices, and has great documentation.

*9 points total out of 8 required points*


## [Link to Main Project File](app.js) 

## Annotations / References Used

1. Spotify Web API: https://developer.spotify.com/documentation/web-api/
2. Node.js wrapper library for Spotify's Web API: https://github.com/thelinmichael/spotify-web-api-node
3. Bootstrap docs: https://getbootstrap.com/ 