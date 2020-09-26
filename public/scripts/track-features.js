document.addEventListener("DOMContentLoaded", main);

async function main() {
  const trackFeatures = await getTrackFeatures();
  renderChart(trackFeatures);
  removeLoader();
}

async function getTrackFeatures() {
  const trackId = document.location.pathname.split('/track/')[1];
  const rawRes = await fetch(`http://localhost:3000/track-features/${trackId}`);
  const trackFeatures = await rawRes.json();
  return trackFeatures.features;
}

function removeLoader() {
  const loader = document.querySelector('.loading-chart');
  const parent = loader.parentNode;
  parent.removeChild(loader);
}

function renderChart(trackFeatures) {
  const ctx = document.querySelector('#track-chart').getContext('2d');
  const labels = Object.keys(trackFeatures).map(toTitleCase);
  console.log(labels)
  const featuresData = Object.values(trackFeatures);
  const trackChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: null,
        backgroundColor: 'rgb(255, 99, 132)',
        borderColor: 'rgb(255, 99, 132)',
        data: featuresData
      }]
    }
  });

}

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}