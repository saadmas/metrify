#  Metrify

## Overview

**Spotify** is awesome. You can listen to music on the go, offline, in high quality audio. You get personalized playlists, access to an unparalleled catalog of songs, and a sleek, seamless UI.

But, ever wondered what your top tracks are? How about your top artists? Spotify may gave you those stats in their annual "Wrapped" feature, but what if you wanted to know right this second? 

Enter **Metrify** . Connect your Spotify account to Metrify to get access to your top 50 top tracks and artists. Wanna put those tracks into their own Spotify playlists so you can bump them later? Got you covered. 


## Data Model

The application will store Users, Tracks, and Artists

**Users**
* Can have multiple tracklists based on time (all time, last 6 months, last month) 
* Can have multiple artist lists based on time (all time, last 6 months, last month) 
* Tracklists are stored by embedding tracks within an array 
* Artist lists are stored by embedding artists within an array 

**Tracks**
* Contain spotify ID, title, and an array of embedded artists

**Artists**
* Contain spotify ID and name

An example User:

```javascript
{
  spotifyID: "technojunkie",
  token: "XyAq123941XjpqR713",
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
  name: "Stephan Bodzin",
  spotifyID: "1112495" 
}
```

An example Track:

```javascript
{
  title: "Spider On the Moon", 
  artist: [Rezz], 
  spotifyID: "1112495"
}
```

## [Link to Commented Third Draft Schema](db.js) 

## Wireframes

/ - home page for user to connect to their Spotify account

![/](documentation/wireframes/login-wireframe.png)

/top-artists - page for user's top artists

![/top-artists](documentation/wireframes/top-artists-wireframe.png)

/top-tracks - page for user's top tracks

![/top-tracks](documentation/wireframes/top-tracks-wireframe.png)

/about - page for info about website 

![/about](documentation/wireframes/about-wireframe.png)

## Site map

![site map](documentation/site-map.png)

## User Stories or Use Cases

1. as non-connected user, I can connect my Spotify account to enter the site
2. as a user, I can view my top artists
3. as a user, I can view my top tracks
4. as a user, I can filter my top artists by time
5. as a user, I can filter my top tracks by time
6. as a user, I can make a new Spotify playlist out of my top tracks

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

## [Link to Main Project File](app.js) 

## Annotations / References Used

1. Spotify Web API: https://developer.spotify.com/documentation/web-api/
2. Node.js wrapper library for Spotify's Web API: https://github.com/thelinmichael/spotify-web-api-node
3. Bootstrap docs: https://getbootstrap.com/ 