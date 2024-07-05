import maplibregl from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';
import 'normalize.css/normalize.css';
import groupIcon from './assets/embassy-15.svg.png';
import locationIcon from './assets/marker-11.svg.png';
import eventIcon from './assets/star-15.svg.png';
import './styles/index.scss';

const COLLECTION_URL = 'https://orga.volksentscheid-transparenz.de/api/collection/'

function getData (url = '') {
  return window.fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  }).then(response => response.json())
}

const makeEvent = (popup, props) => {
  let details = JSON.parse(props.details)
  popup.setHTML(`
    <h3>${props.name}</h3>
    <p>${details.start_format} - ${details.end_format}&nbsp;Uhr</p>
    <p><a class="btn" target="_blank" href="${props.url}">Mehr Infos &rarr;</a></p>
  `)
}

const markerPopupTransformer = {
  group: (popup, props) => popup.setHTML(`
    <h3>Sammelgruppe ${props.name}</h3>
    <p><a target="_blank" href="${props.url}">Details &rarr;</a></p>
    <p><a class="btn" target="_blank" href="${props.url}">Der Gruppe beitreten</a></p>
  `),
  location: (popup, props) => popup.setHTML(`
    <div class="location">
    <h3>${props.name}</h3>
    <p><strong>Hier kannst du vor Ort unterschreiben!</strong></p>
    <p>${props.details.address ? props.details.address : ''}</p>
    <p>${props.description}</p>
    <p><small><a target="_blank" href="${props.url}">Problem melden</a></small></p>
    </div>
  `),
  event: makeEvent
}

function setFeatureOnPopup(feature, popup) {
  const props = feature.properties 
  markerPopupTransformer[props.kind](popup, props)
  popup.setLngLat(feature.geometry.coordinates)
  return popup
}

function createMarker(feature) {
  const popup = createPopup(feature)
  const props = feature.properties
  // create DOM element for the marker
  var el = document.createElement('div')
  el.id = `marker-${item.id}`
  el.className = `marker marker-${props.kind}`

  return new maplibregl.Marker(el)
    .setLngLat(feature.geometry.coordinates)
    .setPopup(popup) // sets a popup on this marker
}

let justOpened = false

const openedPopup = () => {
  justOpened = true
  window.setTimeout(() => {
    justOpened = false
  }, 500);
}

function featureClick (e) {
  if (justOpened) {
    return;
  }
  const feature = e.features[0]
  const popup = new maplibregl.Popup({ offset: 10 })
  setFeatureOnPopup(feature, popup)
  popup.addTo(map)
  openedPopup()
  // map.flyTo({
  //   center: feature.geometry.coordinates
  // });
}

function featureHover (e) {
  map.getCanvas().style.cursor = 'pointer';
}

function featureUnhover (e) {
  map.getCanvas().style.cursor = '';
}

const metersToPixelsAtMaxZoom = (meters, latitude) =>
  meters / 0.075 / Math.cos(latitude * Math.PI / 180)

var icons = [
  ['group', groupIcon],
  ['location', locationIcon],
  ['event', eventIcon],
]

var bounds = [
  [12.9, 52.3], // Southwest coordinates
  [13.8, 52.7]  // Northeast coordinates
];


const map = new maplibregl.Map({
  center: [13.4, 52.5],
  zoom: 10,
  container: 'map',
  style: 'https://tiles.versatiles.org/assets/styles/graybeard.json',
  maxBounds: bounds
});

document.addEventListener("DOMContentLoaded", () => {
  const mapLoaded = new Promise((resolve) => {
    map.on('load', () => {
      map.resize()
      resolve()
    })
  })

  const loadIcons = icons.map((icon) => {
    return new Promise((resolve, reject) => {
      map.loadImage(icon[1]).then((image) => {
        map.addImage(icon[0], image.data);
        resolve()
      }).catch((error) => {
        console.error('Error loading icon', error)
        reject(error)
      })
    })
  })

  const dateSort = function(a, b){
    if (!a.properties.details.start || !b.properties.details.start) {
      if (a.properties.details.start) {
        return 1
      }
      if (b.properties.details.start) {
        return -1
      }
      return 0
    }
    var keyA = new Date(a.properties.details.start),
        keyB = new Date(b.properties.details.start);
    // Compare the 2 dates
    if(keyA < keyB) return -1;
    if(keyA > keyB) return 1;
    return 0;
  }

  const dataReady = getData(COLLECTION_URL).catch((error) => {
    console.error('Error fetching collection data', error)
  })
  Promise.all([dataReady, mapLoaded, ...loadIcons]).then((promiseResults) => {
    const data = promiseResults[0]

    // sort closer dates higher
    data.features.sort(dateSort)

    map.addSource("collection", {
      "type": "geojson",
      "data": data
    })

    map.addLayer({
      "id": "groups",
      "type": "circle",
      "source": "collection",
      "paint": {
        "circle-radius": {
          "stops": [
            [0, 0],
            [20, metersToPixelsAtMaxZoom(450, 52)]
          ],
          "base": 2
        },
        "circle-color": "rgba(128,128,128,0.5)"
      },
      "filter": ["==", "kind", "group"],
    });

    map.addLayer({
      "id": "locations",
      "type": "symbol",
      "source": "collection",
      // "paint": {
      //   "circle-radius": 4,
      //   "circle-color": "#0033ee"
      // },
      "filter": ["==", "kind", "location"],
      "layout": {
        "icon-image": "location",
        "icon-size": [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.4,
          12, 0.6,
          14, 1,
        ]
      }
    });

    map.on('click', 'locations', featureClick);
    map.on('mouseenter', 'locations', featureHover)
    map.on('mouseleave', 'locations', featureUnhover);

    map.addLayer({
      "id": "groups_marker",
      "type": "symbol",
      "source": "collection",

      "filter": ["==", "kind", "group"],

      "layout": {
        "icon-image": "group",
        "icon-size": [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.4,
          12, 0.6,
          14, 1,
        ]
      }
    });

    map.on('click', 'groups_marker', featureClick);
    map.on('mouseenter', 'groups_marker', featureHover)
    map.on('mouseleave', 'groups_marker', featureUnhover);

    map.addLayer({
      "id": "events",
      "type": "symbol",
      "source": "collection",
      // "paint": {
      //   "circle-radius": 4,
      //   "circle-color": "#ff33ee"
      // },
      "filter": ["==", "kind", "event"],

      "layout": {
        "icon-image": "event",
        "symbol-z-order": "source",
        "icon-size": [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.4,
          12, 0.6,
          14, 1,
        ]
      }
    });

    map.on('click', 'events', featureClick);
    map.on('mouseenter', 'events', featureHover)
    map.on('mouseleave', 'events', featureUnhover);

    map.on('click', 'groups', featureClick);
    map.on('mouseenter', 'groups', featureHover)
    map.on('mouseleave', 'groups', featureUnhover);


  })
  
});
