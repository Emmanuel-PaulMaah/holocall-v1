import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.module.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.150.0/examples/jsm/webxr/ARButton.js";

// Arrays for peer ID generation
const duneNames = ["atreides", "harkonnen", "arrakis", "fremen", "sardaukar", "bene-gesserit", "guild", "duncan", "paul", "chani"];
const nigeriaPlaces = ["lagos", "abuja", "kano", "ibadan", "kaduna", "jos", "benin", "enugu", "maiduguri", "portharcourt"];

// Generate random peer ID
function generatePeerId() {
  const dune = duneNames[Math.floor(Math.random() * duneNames.length)];
  const place = nigeriaPlaces[Math.floor(Math.random() * nigeriaPlaces.length)];
  return `${dune}-${place}`;
}

const myId = generatePeerId();
document.getElementById("myId").innerText = myId;

// PeerJS setup
const peer = new Peer(myId);
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream;
let remotePlane;

// Setup media
async function initMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  localVideo.srcObject = localStream;
}
initMedia();

// Handle incoming calls
peer.on("call", call => {
  call.answer(localStream);
  call.on("stream", stream => {
    setupRemoteStream(stream);
  });
});

// Three.js AR setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

document.body.appendChild(ARButton.createButton(renderer));

function setupRemoteStream(stream) {
  remoteVideo.srcObject = stream;
  const texture = new THREE.VideoTexture(remoteVideo);
  const geometry = new THREE.PlaneGeometry(1, 1.5); // aspect ~ portrait human
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  remotePlane = new THREE.Mesh(geometry, material);
  remotePlane.position.set(0, 0, -2);
  scene.add(remotePlane);
}

// Animate AR scene
function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
animate();

// Call button
document.getElementById("callBtn").onclick = () => {
  const remoteId = document.getElementById("remoteId").value.trim();
  if (!remoteId) {
    alert("Enter a remote peer ID!");
    return;
  }
  const call = peer.call(remoteId, localStream);
  call.on("stream", stream => {
    setupRemoteStream(stream);
  });
};
