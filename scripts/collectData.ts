// @ts-nocheck
import fs from 'fs';
import path from "path";
import { createSnapshots } from "../src";

let csvStr = 'name,vertexCount,snapshotCount,probability,faultProb,mean,faultyMean,convergeRounds,faultyConvergeRounds\n';
function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}


function generateVertexSnapshots({ distributionsData, snapshotsData, faultProb }) {
  let infoMap = {};
  let convergeRounds = -1;
  let faultyConvergeRounds = -1;

  let mean = -1;
  let faultyMean = -1;

  const storedSnapshots = snapshotsData.snapshots;

  const infoSnapshots = storedSnapshots.map(snapshot => (
    snapshot.vertices.map((vertex, index) => {
      return ({
        id: vertex,
        value: vertex,
        faultyValue: vertex,
      })
    })
  ));

  storedSnapshots.forEach((snapshot, index) => {
    const vertices = infoSnapshots[index];

    if (infoSnapshots[index - 1]) {
      vertices.forEach((vertex, vertexIndex) => {
        vertex.value = infoSnapshots[index - 1][vertexIndex].value;
        vertex.faultyValue = infoSnapshots[index - 1][vertexIndex].faultyValue;
      })
    }
    else{
      // distributionsData.info.push(JSON.parse(JSON.stringify(vertices)));
      return
    }

    // distributionsData.info.push(JSON.parse(JSON.stringify(vertices)));

    shuffle(snapshot.edges).forEach(edge => {
      if (!Object.values(infoMap).includes(edge.s) && !infoMap[edge.t]) {
        infoMap[edge.t] = edge.s;
      }
    });

    Object.entries(infoMap).forEach(([vertex, infoGiveVertex]) => {
      let val = (vertices[vertex].value + vertices[infoGiveVertex].value) / 2;
      let faultyVal = (vertices[vertex].faultyValue + vertices[infoGiveVertex].faultyValue) / 2;

      if(Math.random() < faultProb) {
        faultyVal = 0;
      }

      vertices[infoGiveVertex].value = val;
      vertices[vertex].value = val;
      vertices[infoGiveVertex].faultyValue = faultyVal;
      vertices[vertex].faultyValue = faultyVal;
    });


    if(convergeRounds === -1) {
      if(vertices.every( v => (Math.abs(v.value - vertices[0].value) < 0.001) )) {
        convergeRounds = index;
        mean = vertices[0].value.toFixed(2);
      }
    }

    if(faultyConvergeRounds === -1) {
      if(vertices.every(v => (Math.abs(v.faultyValue - vertices[0].faultyValue) < 0.001))) {
        faultyConvergeRounds = index
        faultyMean = vertices[0].faultyValue.toFixed(2);
      }
    }

    infoMap = {};
  })

  // name, vertexCount, snapshots, edgeProb, faultProb , mean, faultyMean, converge, faultyConverge
  const {name, vertexCount, probability, snapshotCount} = snapshotsData.details;
  distributionsData.shortInfo.push([name, vertexCount, snapshotCount, probability, faultProb, mean, faultyMean, convergeRounds, faultyConvergeRounds])
}

const distributionsData = {
  info: [],
  shortInfo: [],
};

const fileName = new Date().toLocaleString().replace(/\//g, ".");
fs.writeFile(path.join('.', 'data', `data_${fileName}_summary.csv`), csvStr, console.log);

const SNAPSHOT_COUNT = 700;
const PROB = 1;

for(let p = 0.0001; p <= 0.15; p *= 2) {
  for(let v = 4; v < 257; v *= 2) {
      const snapshotsData = createSnapshots({
        vertexCount: v,
        snapshotCount: SNAPSHOT_COUNT,
        probability: PROB/v,
      });
      fs.writeFile(path.join('.', 'data', 'graphs', `${snapshotsData.details.name}.json`),  JSON.stringify(snapshotsData), console.log)

      for(let i = 0; i < 100; i++) {
        generateVertexSnapshots({
          distributionsData,
          snapshotsData,
          faultProb: p,
        });

        fs.appendFileSync(path.join('.', 'data', `data_${fileName}_summary.csv`), distributionsData.shortInfo.map(row => row.toString()).join('\n') + '\n')
        distributionsData.shortInfo = [];
      }
    }
}
