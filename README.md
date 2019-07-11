# Karte für Volksentscheid Transparenz

[Mitmachen-Karte für den Volksentscheid Transparenz](https://karte.volksentscheid-transparenz.de/)

## Install

Clone and `npm install`

## Develop

```
npm run start
```

## Deploy

Push to master, will be deployed via netlify. Preview production build via `npm run preview`


## How it works

Uses [mapboxgl.js](https://github.com/mapbox/mapbox-gl-js) to render a map with collection groups, locations and events from the [collection coordination system](https://orga.volksentscheid-transparenz.de) ([Source](https://github.com/okfde/signmob)).
