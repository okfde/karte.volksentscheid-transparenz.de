import 'normalize.css/normalize.css'
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

const markerPopups = {
  group: (popup, item) => popup.setHTML(`
    <h3>${item.name}</h3>
    <p>${item.description}</p>
    <a href="${item.url}">Mitmachen</a>
  `),
  location: (popup, item) => popup.setHTML(`
    <h3>${item.name}</h3>
    <p>${item.description}</p>
    <a href="${item.url}">Mitmachen</a>
  `),
  event: (popup, item) => popup.setHTML(`
    <h3>${item.name}</h3>
    <p>${item.description}</p>
    <a href="${item.url}">Mitmachen</a>
  `)
}

function createMarker(item) {
  var popup = new mapboxgl.Popup({ offset: 25 })

  
   
  // create DOM element for the marker
  var el = document.createElement('div')
  el.id = `marker-${item.id}`
  el.className = `marker marker-${item.kind}`
  
  // create the marker
  return new mapboxgl.Marker(el)
    .setLngLat(item.geo.coordinates)
    .setPopup(popup) // sets a popup on this marker

}

document.addEventListener("DOMContentLoaded", () => {

  var bounds = [
    [12.9, 52.3], // Southwest coordinates
    [13.8, 52.7]  // Northeast coordinates
  ];

  mapboxgl.accessToken = 'pk.eyJ1Ijoib2tmZGUiLCJhIjoiY2p4dzFwcDZiMGE2YjNjcGZvcHR0a2RhNSJ9.lKwaDaYgB-SX7eYJ6tmxLA';
  const map = new mapboxgl.Map({
    center: [13.4, 52.5],
    zoom: 12,
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v9',
    maxBounds: bounds
  });

  const mapLoaded = new Promise((resolve) => {
    map.on('load', () => {
      map.resize()
      resolve()
    })
  })

  const dataReady = getData(COLLECTION_URL)
  Promise.all([dataReady, mapLoaded]).then((promiseResults) => {

    promiseResults[0].forEach((item) => {
      console.log(item)
      const marker = createMarker(item)
      marker.addTo(map)
      console.log(marker)
    })
  })
  
});
