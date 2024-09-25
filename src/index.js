import maplibregl from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';
import 'normalize.css/normalize.css';
import groupIcon from './assets/embassy.png';
import collectionIcon from './assets/marker.png';
import dropoffIcon from './assets/racetrack.png';
import eventIcon from './assets/star.png';
import materialIcon from './assets/warehouse.png';
import './styles/index.scss';


const COLLECTION_URL = 'https://orga.baumentscheid.de/api/collection/'
// const COLLECTION_URL = 'https://corsproxy.io/?https%3A%2F%2Forga.baumentscheid.de%2Fapi%2Fcollection%2F%3Fformat%3Djson&timestamp=123'
// const COLLECTION_URL = 'http://localhost:8000/api/collection/'

function getData (url = '') {
  return window.fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  }).then(response => response.json())
}

const makeEvent = (popup, props, details) => {
  popup.setHTML(`
    <h3>${props.name}</h3>
    <p>${details.start_format} - ${details.end_format}&nbsp;Uhr</p>
    <p><a class="btn" target="_blank" href="${props.url}">Mehr Infos &rarr;</a></p>
  `)
}

const markerPopupTransformer = {
  group: (popup, props) => popup.setHTML(`
    <h3>Kiez-Team ${props.name}</h3>
    <p><a target="_blank" href="${props.url}">Details &rarr;</a></p>
    <p><a class="btn" target="_blank" href="${props.url}">Dem Team beitreten</a></p>
  `),
  collection: (popup, props, details) => popup.setHTML(`
    <div class="collection">
    <h3>${props.name}</h3>
    <p><strong>Hier kannst du vor Ort unterschreiben!</strong></p>
    <p>${details.address}</p>
    <div class="">${props.description}</div>
    <p>
    Liste voll oder fehlt? <a target="_blank" href="${props.url}">Feedback zu diesem Ort geben</a>
    </p>
    </div>
  `),
  event: makeEvent,
  dropoff: (popup, props, details) => popup.setHTML(`
    <h3>${props.name}</h3>
    <p>${details.address}</p>
    <p><a class="btn" target="_blank" href="${props.url}">Details &rarr;</a></p>
  `),
  material: (popup, props, details) => popup.setHTML(`
    <h3>Materiallager ${props.name}</h3>
    <p>${details.address}</p>
    <div class="">${props.description}</div>
  `)
}

function setFeatureOnPopup(feature, popup, event) {
  const props = feature.properties
  const details = JSON.parse(props.details)
  markerPopupTransformer[props.kind](popup, props, details)
  if (feature.geometry.type === 'Point') {
    popup.setLngLat(feature.geometry.coordinates)
  } else {
    popup.setLngLat(event.lngLat)
  }
  return popup
}

function createMarker(feature) {
  const popup = createPopup(feature)
  const props = feature.properties
  // create DOM element for the marker
  const el = document.createElement('div')
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
  setFeatureOnPopup(feature, popup, e)
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

const icons = [
  ['group', groupIcon],
  ['collection', collectionIcon],
  ['event', eventIcon],
  ['dropoff', dropoffIcon],
  ['material', materialIcon],
]

const bounds = [
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

    const layers = map.getStyle().layers;
    // Find the index of the first symbol layer in the map style
    let firstSymbolId;
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol') {
            firstSymbolId = layers[i].id;
            break;
        }
    }

    // sort closer dates higher
    data.features.sort(dateSort)

    map.addSource("collection", {
      "type": "geojson",
      "data": data
    })

    map.addLayer({
      "id": "collections",
      "type": "symbol",
      "source": "collection",
      // "paint": {
      //   "circle-radius": 4,
      //   "circle-color": "#0033ee"
      // },
      "filter": ["==", "kind", "collection"],
      "layout": {
        "icon-image": "collection",
        "icon-allow-overlap": true,
        "icon-size": [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.4,
          14, 0.6,
          16, 1,
        ]
      }
    });

    map.on('click', 'collections', featureClick);
    map.on('mouseenter', 'collections', featureHover)
    map.on('mouseleave', 'collections', featureUnhover);

    // map.addLayer({
    //   "id": "groups_marker",
    //   "type": "symbol",
    //   "source": "collection",
      
    //   "filter": ["==", "kind", "group"],
      
    //   "layout": {
    //     "icon-allow-overlap": true,
    //     "icon-image": "group",
    //     "icon-size": [
    //       'interpolate',
    //       ['linear'],
    //       ['zoom'],
    //       10, 0.4,
    //       12, 0.6,
    //       14, 1,
    //     ]
    //   }
    // });

    // map.on('click', 'groups_marker', featureClick);
    // map.on('mouseenter', 'groups_marker', featureHover)
    // map.on('mouseleave', 'groups_marker', featureUnhover);


    map.addLayer({
      "id": "dropoff_marker",
      "type": "symbol",
      "source": "collection",

      "filter": ["==", "kind", "dropoff"],

      "layout": {
        "icon-image": "dropoff",
        "icon-allow-overlap": true,
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
    map.on('click', 'dropoff_marker', featureClick);
    map.on('mouseenter', 'dropoff_marker', featureHover)
    map.on('mouseleave', 'dropoff_marker', featureUnhover);


    map.addLayer({
      "id": "material_marker",
      "type": "symbol",
      "source": "collection",

      "filter": ["==", "kind", "material"],
      
      "layout": {
        "icon-image": "material",
        "icon-allow-overlap": true,
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

    map.on('click', 'material_marker', featureClick);
    map.on('mouseenter', 'material_marker', featureHover)
    map.on('mouseleave', 'material_marker', featureUnhover);

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
        "icon-allow-overlap": true,
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

    map.on('click', 'groups', featureClick);
    map.on('mouseenter', 'groups', featureHover)
    map.on('mouseleave', 'groups', featureUnhover);

    map.addLayer({
      "id": "groups-line",
      "type": "line",
      "source": "collection",
      "paint": {
        // "circle-radius": {
        //   "stops": [
        //     [0, 0],
        //     [20, metersToPixelsAtMaxZoom(450, 52)]
        //   ],
        //   "base": 2
        // },
        // "circle-color": "rgba(128,128,128,0.5)"
        "line-color": "#0a3b49",
        "line-width": 5,
        // "line-blur": 3,
      },
      "filter": ["==", "kind", "group"],
    }, firstSymbolId);

    map.addLayer({
      "id": "groups-fill",
      "type": "fill",
      "source": "collection",
      "paint": {
        // "circle-radius": {
        //   "stops": [
        //     [0, 0],
        //     [20, metersToPixelsAtMaxZoom(450, 52)]
        //   ],
        //   "base": 2
        // },
        // "circle-color": "rgba(128,128,128,0.5)"
        "fill-opacity": [
          'interpolate',
          ['exponential', 0.5],
          ['zoom'],
          10,
          1,
          16,
          0
        ],
        "fill-color":"#fbbb10",
      },
      "filter": ["==", "kind", "group"],
    }, 'groups-line');

    map.on('click', 'groups-fill', featureClick);
    // map.on('mouseenter', 'groups-fill', featureHover)
    // map.on('mouseleave', 'groups-fill', featureUnhover);

    

  })
  
});
