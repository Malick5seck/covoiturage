importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyALeUCREBj_NOOll-_rCkRHEhji1LoN1oo",
  authDomain: "warr-gainde.firebaseapp.com",
  projectId: "warr-gains",
  storageBucket: "warr-gainde.firebasestorage.app",
  messagingSenderId: "559656961315",
  appId: "1:559656961315:web:ecc4e7809427c90d3c3896",
  measurementId: "G-518NV98KKQ",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Notification reçue en arrière-plan :', payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/favicon.svg',
  });
});