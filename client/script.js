let drawInterval;
let storedSnapshots;
let storedDetails;
let lastSnapshotIndex = 0;
let previousSelectedTimelineItem;
let vertexSnapshots = [];
const playText = 'Play';
const pauseText = 'Pause';
const BASE_URL = 'http://localhost:3000';
const distributionsData = {
  info: [],
};

function calculateIsolationPercentage(graph) {
  const arr = new Array(graph.vertices.length).fill(0);
  for (let i = 0; i < graph.edges.length; i++) {
    arr[graph.edges[i].s] = 1;
    arr[graph.edges[i].t] = 1;
  }

  return 100 - arr.reduce((acc, item) => acc + item, 0) / arr.length * 100;
}

function setupTimeline(snapshots) {
  const timelineDiv = document.getElementById('timeline');

  if (timelineDiv.children.length === snapshots.length + 1) {
    return;
  }

  timelineDiv.innerHTML = '<hr />';

  const timelineItemClick = (e) => {
    lastSnapshotIndex = +e.target.getAttribute('data-index');

    if (previousSelectedTimelineItem) {
      previousSelectedTimelineItem.classList.remove('active');
    }
    previousSelectedTimelineItem = e.target;
    previousSelectedTimelineItem.classList.add('active');
    play();
    pause()
  }

  snapshots.forEach((_, index) => {
    const div = document.createElement('div');
    div.classList.add('timeline-item');
    div.innerHTML = index;
    div.setAttribute('data-index', index);
    div.onclick = timelineItemClick;
    timelineDiv.appendChild(div);
  })
}

function drawGraph(newSnapshots, initialSnapshotIndex = 0) {
  let chart;
  let vertices;
  let snapshots = newSnapshots || storedSnapshots;
  let snapshotIndex = initialSnapshotIndex;

  if (snapshots) {
    storedSnapshots = snapshots;
  }

  generateVertexSnapshots();

  document.getElementById('snapshotCountNumber').innerText = snapshots.length;
  document.getElementById('vertexCountNumber').innerText = snapshots[0].vertices.length;

  chart = ForceGraph({
    nodes: snapshots[snapshotIndex].vertices,
    links: snapshots[snapshotIndex].edges.map(({s, t}) => ({source: s, target: t})),
    containerId: 'scene'
  }, {
    nodeId: d => d,
    // nodeTitle: d => vertexSnapshots[0][d.index].value.toFixed(2),
    width: window.innerWidth / 3 * 2,
    height: window.innerHeight / 3 * 2,
    nodeStrokeWidth: 3,
    linkStrokeWidth: 1,
    nodeStrength: -200,
    withDrag: true
  });

  document.getElementById("scene").appendChild(chart);

  setupTimeline(snapshots);
  function a() {
    if (!snapshots[snapshotIndex] || !vertexSnapshots[snapshotIndex]) {
      pause();
      lastSnapshotIndex = 0;
      return;
    }

    vertices = vertexSnapshots[snapshotIndex];
    chart.update({
      nodeTitle: d => {
        return vertexSnapshots[snapshotIndex][d.index].value.toFixed(2)
      } ,
      links: snapshots[snapshotIndex].edges.map(({s, t}) => ({source: s, target: t})),
    });

    document.getElementById("snapshotId").innerHTML = `${snapshotIndex}`;
    document.getElementById("isolationPercentage").innerText = `${calculateIsolationPercentage(snapshots[snapshotIndex]).toFixed(2)}%`;

    drawStats();
    snapshotIndex++;
    lastSnapshotIndex = snapshotIndex;

  }
  a()
  drawInterval = setInterval(() => a(), 500)
}

function clearGraph() {
  clearInterval(drawInterval);
  document.getElementById('scene').innerHTML = '';
}

function setLoading(isShowing) {
  const loading = document.getElementById('loading');
  if (isShowing) {
    loading.classList.add('visible');
    loading.classList.remove('hidden');
  } else {
    loading.classList.add('hidden');
    loading.classList.remove('visible');
  }
}

function uploadFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', handleFiles, false);

  function handleFiles() {
    setLoading(true);
    const fileList = this.files;

    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      const dataURI = event.target.result;

      const json = atob(dataURI.substring(29)); // 29 = length of "data:application/json;base64,"
      const result = JSON.parse(json);

      fetch(`${BASE_URL}/from-snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: result })
      })
        .then(data => data.json())
        .then(snapshots => startNewGraph(snapshots))
        .finally(() => setLoading(false));
    });
    reader.readAsDataURL(fileList[0]);
  }

  input.click()
}

function play() {
  const playButton = document.getElementById('playToggle');
  clearGraph();
  drawGraph(undefined, lastSnapshotIndex);
  playButton.innerText = pauseText;
  playButton.classList.add('playing');
}

function pause() {
  const playButton = document.getElementById('playToggle');
  playButton.innerText = playText;
  clearInterval(drawInterval);
  drawStats()
  playButton.classList.remove('playing');
}

function drawStats() {

  const data = distributionsData.info[lastSnapshotIndex];
  if(!data) return
  document.getElementById('distribution').innerHTML=''
  drawLineChart({
    data: data,
    containerId: 'distribution',
    xAxis: 'id',
    yAxis: 'value'
  })
}

function drawAllVertexOriginatorStats(allVerticesData) {
  document.getElementById('linechart-all-vertices-broadcast').innerHTML = '';
  document.getElementById('linechart-all-vertices-unicast').innerHTML = '';
  document.getElementById('linechart-all-vertices-broadcast-first').innerHTML = '';
  document.getElementById('linechart-all-vertices-unicast-first').innerHTML = '';

  BarPlot({
    data: allVerticesData,
    containerId: 'linechart-all-vertices-broadcast',
    xAxis: 'originator',
    yAxis: 'broadcastInfo',
    title: 'All vertices broadcast'
  })

  BarPlot({
    data: allVerticesData,
    containerId: 'linechart-all-vertices-unicast',
    xAxis: 'originator',
    yAxis: 'unicastInfo',
    title: 'All vertices unicast'
  })

  BarPlot({
    data: allVerticesData,
    containerId: 'linechart-all-vertices-broadcast-first',
    xAxis: 'originator',
    yAxis: 'firstBroadcastInfoWithTimer',
    title: 'All vertices broadcast with timer'
  })

  BarPlot({
    data: allVerticesData,
    containerId: 'linechart-all-vertices-unicast-first',
    xAxis: 'originator',
    yAxis: 'firstUnicastInfoWithTimer',
    title: 'All vertices unicast with timer'
  })

}

function playToggled() {
  const playButton = document.getElementById('playToggle');

  if (playButton.innerText === pauseText) pause();
  else play();
}

async function startNewGraph(snapshotsInfo) {
  clearGraph();
  lastSnapshotIndex = 0;
  document.getElementById('graphName').innerText = snapshotsInfo.details.name;
  storedDetails = snapshotsInfo.details;
  await drawGraph(snapshotsInfo.snapshots);
  play();
}

function generateNewGraph() {
  setLoading(true);

  const vertexCount = document.getElementById('vertexCount').value;
  const probability = document.getElementById('probability').value;
  const snapshotCount = document.getElementById('snapshotCount').value;

  localStorage.setItem('vertexCount', vertexCount);
  localStorage.setItem('probability', probability);
  localStorage.setItem('snapshotCount', snapshotCount);

  return fetch(`${BASE_URL}/snapshots`, {
    method: 'POST',
    body: JSON.stringify({
      vertexCount: +vertexCount,
      probability: probability.includes('n') ? probability : +probability,
      snapshotCount: +snapshotCount,
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(data => data.json())
    .then(snapshotsInfo => startNewGraph(snapshotsInfo))
    .finally(() => setLoading(false));
}

function generateVertexSnapshots(startIndex = 0) {
  let infoMap = {};
  let infoQueue = [];
  let maxInfoGivingTime = +localStorage.getItem('maxInfoGivingTime');
  distributionsData.info = [];


  if(document.getElementById('maxInfoGivingTime').value) {
    maxInfoGivingTime = +document.getElementById('maxInfoGivingTime').value;
    localStorage.setItem('maxInfoGivingTime', `${maxInfoGivingTime}`);
  }else {
    document.getElementById('maxInfoGivingTime').value = maxInfoGivingTime;
  }

  const infoSnapshots = storedSnapshots.map(snapshot => (
    snapshot.vertices.map((vertex, index) => {
      return ({
        id: vertex,
        value: vertex,
      })
    })
  ));


  storedSnapshots.forEach((snapshot, index) => {
    const vertices = infoSnapshots[index];

    if (infoSnapshots[index - 1]) {
      vertices.forEach((vertex, vertexIndex) => {
        vertex.value = infoSnapshots[index - 1][vertexIndex].value;
      })
    }
    else{
      distributionsData.info.push(JSON.parse(JSON.stringify(vertices)));
      return
    }

    distributionsData.info.push(JSON.parse(JSON.stringify(vertices)));

    snapshot.edges.forEach(edge => {
      if (!Object.values(infoMap).includes(edge.s) && !infoMap[edge.t]) {
          infoMap[edge.t] = edge.s;
      }
    });

    Object.entries(infoMap).forEach(([vertex, infoGiveVertex]) => {
      let val = (vertices[vertex].value + vertices[infoGiveVertex].value) / 2;
      //
      // if(Math.random() < 0.0001) {
      //   val = 0;
      // }

      vertices[infoGiveVertex].value = val;
      vertices[vertex].value = val;
    });

    snapshot.vertices.forEach(vertex => {
      if (vertices[vertex].hasUnicastInfo) {
        vertices[vertex].unicastTimer++;
      }
    });


    infoMap = {};
    infoQueue = [];
  })

  vertexSnapshots = infoSnapshots;
}

function setup() {
  setLoading(true);
  fetch(`${BASE_URL}/snapshots`)
    .then(data => data.json())
    .then(snapshots => startNewGraph(snapshots))
    .finally(() => setLoading(false));

  drawStats();

  document.getElementById('vertexCount').value = localStorage.getItem('vertexCount');
  document.getElementById('probability').value = localStorage.getItem('probability');
  document.getElementById('snapshotCount').value = localStorage.getItem('snapshotCount');
}

setup();

function generateStatsCSV() {
  return 'data:text/json;charset=utf-8,index,broadcastSingle,broadcast,unicastSingle,unicast,isolated,edges\n' + encodeURIComponent(distributionsData.info.map(row => row.toString()).join('\n'));
}

function downloadCurrentGraph() {
  return fetch(`${BASE_URL}/snapshots-matrix`)
    .then(data => data.json())
    .then(snapshots => {
      const fileName = `Graph-${document.getElementById('graphName').innerText}.json`;
      const fileContent = JSON.stringify({ snapshots, details: storedDetails });

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(fileContent));
      element.setAttribute('download', fileName);

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    })
}
