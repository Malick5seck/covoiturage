import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyALeUCREBj_NOOll-_rCkRHEhji1LoN1oo",
  authDomain: "warr-gainde.firebaseapp.com",
  projectId: "warr-gains",
  storageBucket: "warr-gainde.firebasestorage.app",
  messagingSenderId: "559656961315",
  appId: "1:559656961315:web:ecc4e7809427c90d3c3896",
  measurementId: "G-518NV98KKQ",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };