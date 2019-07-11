import 'normalize.css/normalize.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import './styles/index.scss'

import mapboxgl from 'mapbox-gl';

const COLLECTION_URL = 'https://orga.volksentscheid-transparenz.de/api/collection/'

function getData (url = '') {
  return window.fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  }).then(response => response.json())
}

const markerPopupTransformer = {
  group: (popup, props) => popup.setHTML(`
    <h3>${props.name}</h3>
    <p>${props.description}</p>
    <a href="${props.url}">Mitmachen</a>
  `),
  location: (popup, props) => popup.setHTML(`
    <h3>${props.name}</h3>
    <p>${props.description}</p>
  `),
  event: (popup, props) => popup.setHTML(`
    <h3>${props.name}</h3>
    <p>${props.description}</p>
  `)
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

  return new mapboxgl.Marker(el)
    .setLngLat(feature.geometry.coordinates)
    .setPopup(popup) // sets a popup on this marker
}

function featureClick (e) {
  const feature = e.features[0]
  const popup = new mapboxgl.Popup({ offset: 10 })
  setFeatureOnPopup(feature, popup)
  popup.addTo(map)
  map.flyTo({
    center: feature.geometry.coordinates
  });
}

function featureHover (e) {
  map.getCanvas().style.cursor = 'pointer';
}

function featureUnhover (e) {
  map.getCanvas().style.cursor = '';
}


var bounds = [
  [12.9, 52.3], // Southwest coordinates
  [13.8, 52.7]  // Northeast coordinates
];

mapboxgl.accessToken = 'pk.eyJ1Ijoib2tmZGUiLCJhIjoiY2p4dzFwcDZiMGE2YjNjcGZvcHR0a2RhNSJ9.lKwaDaYgB-SX7eYJ6tmxLA';
const map = new mapboxgl.Map({
  center: [13.4, 52.5],
  zoom: 10,
  container: 'map',
  // style: 'mapbox://styles/okfde/cjxxj9npi0eo41cp7pe2hufp1',
  style: 'mapbox://styles/mapbox/light-v10',
  maxBounds: bounds
});

document.addEventListener("DOMContentLoaded", () => {
  const mapLoaded = new Promise((resolve) => {
    map.on('load', () => {
      map.resize()
      resolve()
    })
  })

  const dataReady = getData(COLLECTION_URL)
  Promise.all([dataReady, mapLoaded]).then((promiseResults) => {
    const data = promiseResults[0]
    console.log(data)
    map.setLayoutProperty('country-label', 'text-field', ['get', 'name_de']);

    map.addSource("collection", {
      "type": "geojson",
      "data": data
    })

    map.addLayer({
      "id": "groups",
      "type": "circle",
      "source": "collection",
      "paint": {
        "circle-radius": 6,
        "circle-color": "#B42222"
      },
      "filter": ["==", "kind", "group"],
    });

    map.on('click', 'groups', featureClick);
    map.on('mouseenter', 'groups', featureHover)
    map.on('mouseleave', 'groups', featureUnhover);

    map.addLayer({
      "id": "locations",
      "type": "circle",
      "source": "collection",
      "paint": {
        "circle-radius": 6,
        "circle-color": "#0033ee"
      },
      "filter": ["==", "kind", "location"],
    });

    map.on('click', 'locations', featureClick);
    map.on('mouseenter', 'locations', featureHover)
    map.on('mouseleave', 'locations', featureUnhover);


  })
  
});
