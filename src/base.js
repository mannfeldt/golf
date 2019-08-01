import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';

const golfConfig = {
  apiKey: 'AIzaSyA1LCnNtukZ_zxfJwCeaEgKTU-BNrprX24',
  authDomain: 'stagehoot-golf.firebaseapp.com',
  databaseURL: 'https://stagehoot-golf.firebaseio.com',
  projectId: 'stagehoot-golf',
  storageBucket: 'stagehoot-golf.appspot.com',
  messagingSenderId: '688320597897',
  appId: '1:688320597897:web:8279c87d63b8e6fa',
};


const fire = firebase.initializeApp(golfConfig, 'golf');

export { fire };
