// HoloCall Prototype
// Import Three.js as ES module
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.module.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.150.0/examples/jsm/webxr/ARButton.js";

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");

let pc;              // WebRTC peer connection
let remotePlane;     // 3D mesh for remote person
let remoteTexture;   // video texture

// 🟢 Setup Three.js + AR
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  20
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Add AR button
document.body.appendChild(ARButton.createButton(renderer));

// Function to place remote video in AR
function addRemoteStream(stream) {
  remoteVideo.srcObject = stream;
  remoteTexture = new THREE.VideoTexture(remoteVideo);
  const geometry = new THREE.PlaneGeometry(1, 1.5); // ~human aspect
  const material = new THREE.MeshBasicMaterial({
    map: remoteTexture,
    transparent: true
  });
  remotePlane = new THREE.Mesh(geometry, material);
  remotePlane.position.set(0, 0, -2); // 2m in front
  scene.add(remotePlane);
}

// Animate AR scene
function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
animate();

// 🟠 WebRTC setup
async function startCall() {
  pc = new RTCPeerConnection();

  // Local video
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  localVideo.srcObject = stream;
  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  // Remote video
  pc.ontrack = (event) => {
    addRemoteStream(event.streams[0]);
  };

  // Offer/Answer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  console.log("👉 Copy this offer to remote:", JSON.stringify(offer));

  const answerStr = prompt("Paste answer SDP here:");
  if (answerStr) {
    const answer = JSON.parse(answerStr);
    await pc.setRemoteDescription(answer);
  }
}

// 🟣 Background removal prep (not applied to stream yet)
async function loadBodyPix() {
  const bodyPixNet = await bodyPix.load();
  setInterval(async () => {
    if (localVideo.readyState === 4) {
      const segmentation = await bodyPixNet.segmentPerson(localVideo);
      const mask = bodyPix.toMask(segmentation);
      // TODO: Apply mask → send only person pixels in stream
    }
  }, 200);
}

// 🎯 Button trigger
startBtn.onclick = async () => {
  await loadBodyPix();
  startCall();
};
