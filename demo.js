let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");
let startBtn = document.getElementById("startBtn");

let pc; // WebRTC peer connection
let bodyPixNet;

// Setup AR scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// AR button
document.body.appendChild(THREE.ARButton.createButton(renderer));

// Plane for remote person
let remoteTexture, remotePlane;
function addRemoteStream(stream) {
  remoteVideo.srcObject = stream;
  remoteTexture = new THREE.VideoTexture(remoteVideo);
  const geometry = new THREE.PlaneGeometry(1, 1.5); // roughly human proportions
  const material = new THREE.MeshBasicMaterial({ map: remoteTexture, transparent: true });
  remotePlane = new THREE.Mesh(geometry, material);
  remotePlane.position.set(0, 0, -2); // 2m in front
  scene.add(remotePlane);
}

// Animate
function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
animate();

// WebRTC setup
async function startCall() {
  pc = new RTCPeerConnection();

  // Send local stream
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  localVideo.srcObject = stream;
  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  // Show remote stream
  pc.ontrack = (event) => {
    addRemoteStream(event.streams[0]);
  };

  // SDP exchange (manual for prototype)
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  console.log("Copy this offer to remote:", JSON.stringify(offer));

  // For demo: ask user to paste answer
  const answerStr = prompt("Paste answer SDP here:");
  if (answerStr) {
    const answer = JSON.parse(answerStr);
    await pc.setRemoteDescription(answer);
  }
}

// Background removal (local preview only for now)
async function loadBodyPix() {
  bodyPixNet = await bodyPix.load();
  setInterval(async () => {
    const segmentation = await bodyPixNet.segmentPerson(localVideo);
    const mask = bodyPix.toMask(segmentation);
    // TODO: Apply mask to local feed → send transparent video
    // For MVP we keep it simple: raw video is sent
  }, 200);
}

startBtn.onclick = async () => {
  await loadBodyPix();
  startCall();
};
