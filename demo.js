import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.module.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.150.0/examples/jsm/webxr/ARButton.js";
import * as bodyPix from "https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0/dist/body-pix.esm.js";
import * as tf from "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.2.0/dist/tf.esm.js";

// -----------------------
// PeerJS Setup
// -----------------------
const duneNames = ["atreides", "harkonnen", "arrakis", "fremen", "sardaukar", "bene-gesserit", "guild", "duncan", "paul", "chani"];
const nigeriaPlaces = ["lagos", "abuja", "kano", "ibadan", "kaduna", "jos", "benin", "enugu", "maiduguri", "portharcourt"];

function generatePeerId() {
  const dune = duneNames[Math.floor(Math.random() * duneNames.length)];
  const place = nigeriaPlaces[Math.floor(Math.random() * nigeriaPlaces.length)];
  return `${dune}-${place}`;
}

const myId = generatePeerId();
document.getElementById("myId").innerText = myId;

const peer = new Peer(myId);
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
let localStream, remotePlane;

// -----------------------
// Load BodyPix
// -----------------------
let bodyPixNet;
async function loadBodyPix() {
  bodyPixNet = await bodyPix.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2
  });
  console.log("BodyPix loaded");
}
loadBodyPix();

// Canvas for processed video
const processedCanvas = document.createElement('canvas');
const processedCtx = processedCanvas.getContext('2d');

// -----------------------
// Local video setup
// -----------------------
async function initMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  localVideo.srcObject = localStream;
  localVideo.play();
}
initMedia();

// -----------------------
// Incoming call handling
// -----------------------
peer.on("call", call => {
  call.answer(localStream);
  call.on("stream", stream => setupRemoteStream(stream));
});

// -----------------------
// Three.js AR setup
// -----------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(ARButton.createButton(renderer));

let localPlane;

// -----------------------
// Setup remote video as AR plane
// -----------------------
function setupRemoteStream(stream) {
  remoteVideo.srcObject = stream;
  const texture = new THREE.VideoTexture(remoteVideo);
  const geometry = new THREE.PlaneGeometry(1, 1.5);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  remotePlane = new THREE.Mesh(geometry, material);
  remotePlane.position.set(0, 0, -2);
  scene.add(remotePlane);
}

// -----------------------
// BodyPix processing
// -----------------------
async function processFrame() {
  if (!bodyPixNet || !localVideo.videoWidth) return requestAnimationFrame(processFrame);

  processedCanvas.width = localVideo.videoWidth;
  processedCanvas.height = localVideo.videoHeight;

  const segmentation = await bodyPixNet.segmentPerson(localVideo, {
    internalResolution: 'low',
    segmentationThreshold: 0.7
  });

  const mask = bodyPix.toMask(segmentation, { r:0,g:0,b:0,a:0 }, { r:0,g:0,b:0,a:255 });
  processedCtx.putImageData(mask, 0, 0);
  processedCtx.drawImage(localVideo, 0, 0);

  if (localPlane) localPlane.material.map.needsUpdate = true;

  requestAnimationFrame(processFrame);
}

// -----------------------
// AR local plane setup
// -----------------------
function setupLocalPlane() {
  const texture = new THREE.VideoTexture(processedCanvas);
  const geometry = new THREE.PlaneGeometry(1, 1.5);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  localPlane = new THREE.Mesh(geometry, material);
  localPlane.position.set(0, 0, -1.5);
  scene.add(localPlane);
}
setupLocalPlane();
processFrame();

// -----------------------
// Animate AR scene
// -----------------------
function animate() {
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}
animate();

// -----------------------
// Buttons
// -----------------------
document.getElementById("callBtn").onclick = () => {
  const remoteId = document.getElementById("remoteId").value.trim();
  if (!remoteId) { alert("Enter a remote peer ID!"); return; }
  const call = peer.call(remoteId, localStream);
  call.on("stream", stream => setupRemoteStream(stream));
};

document.getElementById("copyBtn").onclick = () => {
  navigator.clipboard.writeText(myId).then(() => alert("ID copied to clipboard!"));
};

// -----------------------
// Window resize
// -----------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
