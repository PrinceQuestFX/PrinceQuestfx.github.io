// ============================================================
// CONFIGURATION FIREBASE
// ============================================================
// 1. Va sur https://console.firebase.google.com, crée un projet gratuit
// 2. Dans "Paramètres du projet" > onglet "Général" > section
//    "Vos applications", clique sur l'icône Web </> pour ajouter une app.
// 3. Firebase t'affiche un objet firebaseConfig : copie-le et colle-le
//    ci-dessous, à la place de l'objet actuel.
// 4. Authentication > Sign-in method > active "Email/Password".
// 5. Firestore Database > Créer une base > mode production.
// 6. Applique les règles de sécurité fournies dans firestore.rules
//    (voir README.md, section Firebase).
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCVm2Su4XmurGMF9UL0Na5oKhn8IBsjFac",
  authDomain: "prince-quest-fx.firebaseapp.com",
  projectId: "prince-quest-fx",
  storageBucket: "prince-quest-fx.firebasestorage.app",
  messagingSenderId: "943710164838",
  appId: "1:943710164838:web:54d99cabe770aec98e1aa7",
};
