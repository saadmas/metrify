#  My Top Spotify

## Overview

Spotify is awesome. You can listen to music on the go, offline, with high quality audio. You get personalized playlists, access to an unparalleled catalog of songs, and a sleek, seamless UI.

But, ever wondered what your most played tracks are? How about your most played artists? Spotify may gave you those stats in their annual "Year Wrapped" feature, but what if you wanted to know right this second? 

Enter My Top Spotify . Connect your Spotify account to MyTopSpotifyPlays to get access to your top 50 most played tracks and artists. Wanna put those into their own playlists so you can bump them later? Got you covered. 


## Data Model

The application will store Users, Tracks, and Tracklists

Users:
* Can have multiple tracklists based on time or type (via references)

Tracklists:
* Can contain multiple tracks (by embedding)
* Can be based on either top played artists or top played tracks
* Can vary based on desired time scope

Tracks:
* Can contain varying amounts of metadata 
* Can be played via user’s active device

An example User:

```javascript
{
  username: "technojunkie",
  hash: // a password hash,
  tracklists: // an array of references to Tracklist documents
}
```

An example Tracklist with embedded items:

```javascript
{
  user: // a reference to a User object
  name: "Top 50 Played Tracks",
  items: [
    { name: "Sad Machine", artist: "Porter Robinson", album: "Worlds"},
    { name: "Zulu", artist: "Stephan Bodzin", album: "Powers of Ten"},
    // ... continues with additional unique tracks till 50 track limit
  ]
}
```
///
## [Link to Commented First Draft Schema](db.js) 
(___TODO__: create a first draft of your Schemas in db.js and link to it_)

## Wireframes

(___TODO__: wireframes for all of the pages on your site; they can be as simple as photos of drawings or you can use a tool like Balsamiq, Omnigraffle, etc._)

/list/create - page for creating a new shopping list

![list create](documentation/list-create.png)

/list - page for showing all shopping lists

![list](documentation/list.png)

/list/slug - page for showing specific shopping list

![list](documentation/list-slug.png)

## Site map

(___TODO__: draw out a site map that shows how pages are related to each other_)

Here's a [complex example from wikipedia](https://upload.wikimedia.org/wikipedia/commons/2/20/Sitemap_google.jpg), but you can create one without the screenshots, drop shadows, etc. ... just names of pages and where they flow to.

## User Stories or Use Cases

(___TODO__: write out how your application will be used through [user stories](http://en.wikipedia.org/wiki/User_story#Format) and / or [use cases](https://www.mongodb.com/download-center?jmp=docs&_ga=1.47552679.1838903181.1489282706#previous)_)

1. as non-registered user, I can register a new account with the site
2. as a user, I can log in to the site
3. as a user, I can create a new grocery list
4. as a user, I can view all of the grocery lists I've created in a single list
5. as a user, I can add items to an existing grocery list
6. as a user, I can cross off items in an existing grocery list

## Research Topics

* (2 points) Node.js wrapper library for Spotify's Web API
  * WHAT: Handy Node.js library that simplifies a lot of the low level request-response handling with Spotify's Web API. Puts a layer of abstraction over retreiving JSON metadata about music, artists, albums, and tracks, directly from the Spotify Data Catalogue. Includes helper functions to retreive music metadata, perform searches, gather user info, and more. 
  * WHY: Abstraction the library provides allows time for focusing on other aspects of the project rather than just dealing with Spotify's Web API. Additionally, the library functions are built with a strong focus on callback. We have been using callbacks heavily in this course, so it's nice to be able to put them to use here too.  
* (1 points) Spotify Web API
  * WHAT: Based on simple REST principles, the Spotify Web API endpoints return JSON metadata about music, artists, albums, and tracks, directly from the Spotify Data Catalogue. Web API also provides access to user related data, like playlists and music that the user saves in the "Your Music" library. Such access is enabled through selective authorization, by the user.
  * WHY: As fate would have it, one of the only functions the Node.js wrapper library mentioned above doesn't have is being able to retrieve top played tracks/artists. Therefore, will have to use the Spotify Web API directly to do that. Not complaining! Will be nice to see the similarities/differences between implementation of the wrapper vs direct API. 
* (4 points) Vue
    * WHAT: JS framework with various optional tools for building UIs. Adds JS functionality within HTML documents. Small size, simple integration and detailed documentation.
    * WHY: Frontend frameworks are all the rage these days. I've fiddled with Vue a LITTLE before, but yet to build a full-fledged app out of it. Would love to change that with this project.
* (2 points) Bootstrap
  * WHAT: Arguably the best CSS framework around for responsive design. It has great templates for typography, forms, buttons, tables, navigation, modals, image carousels, and other elements. Built by Twitter engineers!
  * WHY: CSS isn't my strong suit. So, of course, Bootstrap is my saviour! It's easy to use, responsive to different devices, and has great documentation.

9 points total out of 8 required points

///
## [Link to Initial Main Project File](app.js) 

## Annotations / References Used

1. Spotify Web API: https://developer.spotify.com/documentation/web-api/
2. Node.js wrapper library for Spotify's Web API: https://github.com/thelinmichael/spotify-web-api-node
3. Bootstrap docs: https://getbootstrap.com/ 