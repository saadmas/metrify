document.addEventListener("DOMContentLoaded", main);

function main() {
  console.log('fiasnfias')
  // getTrackFeatures();
}

async function getTrackFeatures() {
  const trackId = document.location.pathname.split('/track/')[1];
  const rawRes = await fetch(`http://localhost:3000/track-features/${trackId}`);
  const audioFeatures = await rawRes.json();
  console.log(audioFeatures);
}