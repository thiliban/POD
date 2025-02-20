// Initialize Firebase (Replace with your Firebase config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

let latitude = null;
let longitude = null;

// Signature Canvas Setup
const canvas = document.getElementById("signatureCanvas");
const ctx = canvas.getContext("2d");
let drawing = false;

canvas.addEventListener("mousedown", () => { drawing = true; });
canvas.addEventListener("mouseup", () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener("mousemove", drawSignature);

function drawSignature(event) {
    if (!drawing) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.lineTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);
    ctx.stroke();
}

function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function previewPhoto() {
    const file = document.getElementById("photoUpload").files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById("photo-preview").src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function getLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
                document.getElementById("gpsStatus").innerText = `Location Captured: (${latitude}, ${longitude})`;
            },
            (error) => {
                document.getElementById("gpsStatus").innerText = "Error: Unable to retrieve location.";
            }
        );
    } else {
        document.getElementById("gpsStatus").innerText = "Geolocation not supported.";
    }
}

async function submitDelivery() {
    const recipient = document.getElementById("recipientName").value.trim();
    const address = document.getElementById("deliveryAddress").value.trim();
    const packageDetails = document.getElementById("packageDetails").value.trim();
    const driverNotes = document.getElementById("driverNotes").value.trim();
    const photoFile = document.getElementById("photoUpload").files[0];

    const signatureData = canvas.toDataURL();
    const isSignatureEmpty = signatureData === canvas.toDataURL("image/png", 0);

    if (!recipient || !address || !packageDetails) {
        alert("Please fill out all delivery details.");
        return;
    }

    if (isSignatureEmpty && !photoFile) {
        alert("Please provide either a signature or a photo as proof of delivery.");
        return;
    }

    if (latitude === null || longitude === null) {
        alert("Please capture your GPS location before submitting.");
        return;
    }

    let photoURL = "";
    let signatureURL = "";

    if (photoFile) {
        const photoRef = storage.ref(`photos/${Date.now()}_${photoFile.name}`);
        await photoRef.put(photoFile);
        photoURL = await photoRef.getDownloadURL();
    }

    const signatureRef = storage.ref(`signatures/${Date.now()}_signature.png`);
    await signatureRef.putString(signatureData, "data_url");
    signatureURL = await signatureRef.getDownloadURL();

    await db.collection("deliveries").add({
        recipient,
        address,
        packageDetails,
        driverNotes,
        latitude,
        longitude,
        photoURL,
        signatureURL,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Delivery submitted successfully!");
    location.reload();
}
