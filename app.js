import { firebaseConfig } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ============================================================
// INIT
// ============================================================
const CONFIGURED = firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('COLLE_TA');
let app = null, auth = null, db = null;
if (CONFIGURED) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let state = {
  user: null,
  trades: [],
  accounts: [],
  activeAccountId: 'all',
  editingId: null,
  authMode: 'login', // 'login' | 'signup'
  lang: 'fr',
  pnlPeriod: 30,
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const THEMES = ['sombre', 'clair', 'minuit', 'emeraude'];

// ============================================================
// I18N — FR / EN
// ============================================================
const TRANSLATIONS = {
  fr: {
    'nav.features': 'Fonctionnalités', 'nav.how': 'Comment ça marche', 'nav.contact': 'Contact',
    'nav.theme': 'Thème', 'nav.login': 'Se connecter', 'nav.start': 'Commencer',
    'hero.eyebrow': 'JOURNAL DE TRADING PERSONNEL',
    'hero.title': 'Trade avec discipline.<br>Progresse avec des <span class="accent">données</span>.',
    'hero.sub': "Prince-QUEST FX enregistre chaque trade, met à jour ton capital en temps réel et révèle les habitudes qui font — ou défont — ta performance.",
    'hero.cta-primary': 'Créer mon compte gratuitement', 'hero.cta-secondary': 'Se connecter',
    'hero.visual-title': 'PNL CUMULÉ · 30J', 'hero.visual-wr': 'WIN RATE', 'hero.visual-pf': 'PROFIT FACTOR', 'hero.visual-trades': 'TRADES',
    'features.eyebrow': 'TOUT-EN-UN', 'features.title': 'Un poste de contrôle pour ton trading',
    'features.sub': 'Chaque outil dont tu as besoin pour enregistrer, comprendre et corriger ta performance — au même endroit.',
    'features.f1-title': 'Journal automatique', 'features.f1-body': "Enregistre chaque trade — entrée, SL/TP, résultat — et regarde ton capital se mettre à jour tout seul.",
    'features.f2-title': 'Statistiques en direct', 'features.f2-body': 'Win rate, profit factor, expectancy, drawdown : calculés en continu, sans tableur à jour.',
    'features.f3-title': 'Analyse de performance', 'features.f3-body': 'Des graphiques clairs pour voir ce qui marche par stratégie, actif, jour et session.',
    'features.f4-title': 'Psychologie du trader', 'features.f4-body': 'Note ton état émotionnel à chaque trade et repère les erreurs qui reviennent.',
    'features.f5-title': 'Gestion du risque', 'features.f5-body': 'Calculateur de taille de position et alerte automatique si tu dépasses ta limite.',
    'features.f6-title': 'Multi-comptes', 'features.f6-body': 'Suis tes comptes réel, prop firm et crypto séparément — ou tous ensemble, en un coup d\u2019œil.',
    'how.eyebrow': 'EN 3 ÉTAPES', 'how.title': 'Comment ça marche',
    'how.s1-title': 'Configure ton compte', 'how.s1-body': 'Capital de départ, devise, type de compte (réel, prop firm ou crypto).',
    'how.s2-title': 'Enregistre tes trades', 'how.s2-body': 'En quelques secondes, à chaud ou après coup, avec ou sans connexion.',
    'how.s3-title': 'Suis ta progression', 'how.s3-body': 'Statistiques et graphiques mis à jour automatiquement, trade après trade.',
    'ctaband.title': 'Prêt à trader avec des données, pas des impressions ?', 'ctaband.sub': 'Gratuit, privé, et synchronisé sur tous tes appareils.', 'ctaband.button': 'Créer mon compte',
    'auth.back': "← Retour à l'accueil",
    'auth.subtitle-login': "Connecte-toi pour accéder à ton journal, synchronisé sur tous tes appareils.",
    'auth.subtitle-signup': "Crée ton compte pour synchroniser ton journal sur tous tes appareils.",
    'auth.email': 'Email', 'auth.password': 'Mot de passe',
    'auth.submit-login': 'Se connecter', 'auth.submit-signup': 'Créer mon compte',
    'auth.google': 'Continuer avec Google', 'auth.or': 'ou',
    'auth.toggle-to-signup': 'Pas encore de compte ? Créer un compte',
    'auth.toggle-to-login': 'Déjà un compte ? Se connecter',
    'auth.forgot-password': 'Mot de passe oublié ?',
    'authvisual.title': 'TRADER', 'authvisual.sub': 'Ce que tu deviens quand tu mesures ce que tu fais.',
    'authvisual.time': 'TIME', 'authvisual.emotion': 'EMOTION', 'authvisual.analysis': 'ANALYSIS',
    'authvisual.discipline': 'DISCIPLINE', 'authvisual.risk': 'RISK', 'authvisual.reward': 'REWARD',
    'auth.err-popup-closed': 'Fenêtre de connexion fermée avant la fin.',
    'auth.reset-need-email': "Renseigne d'abord ton email ci-dessus, puis clique à nouveau sur « Mot de passe oublié ? ».",
    'auth.reset-sent': 'Email envoyé : consulte ta boîte de réception pour réinitialiser ton mot de passe.',
    'auth.err-toomany': 'Trop de tentatives. Réessaie dans quelques minutes.',
    'asetup.title': 'Configure ton premier compte de trading',
    'asetup.sub': "Renseigne ces infos une fois — tu pourras ajouter d'autres comptes (crypto, prop firm…) ensuite. La plateforme suit ton capital automatiquement à chaque trade clôturé.",
    'asetup.name': 'Nom du compte', 'asetup.type': 'Type de compte', 'asetup.capital': 'Capital initial',
    'asetup.currency': 'Devise principale', 'asetup.country': 'Pays', 'asetup.org': 'Broker / Organisme', 'asetup.submit': 'Commencer',
    'acctype.reel': 'Compte réel', 'acctype.propfirm': 'Prop Firm', 'acctype.crypto': 'Crypto', 'acctype.demo': 'Démo',
    'ticker.capital': 'Capital', 'ticker.winrate': 'Win Rate', 'ticker.rr': 'R:R moy.', 'ticker.pf': 'Profit Factor', 'ticker.exp': 'Expectancy', 'ticker.dd': 'Drawdown max',
    'tab.dashboard': '🏠 Tableau de bord', 'tab.journal': '📊 Journal', 'tab.stats': '📈 Statistiques', 'tab.analyse': '🎯 Analyse', 'tab.psycho': '🧠 Psychologie', 'tab.risque': '🚨 Risque', 'tab.parametres': '⚙️ Réglages',
    'banner.tagline': '💹 Prince-QUEST FX — suivi automatique de ta performance', 'banner.privacy': '🔒 Données privées, synchronisées via Firebase',
    'dash.accounts': 'Mes comptes', 'dash.overview': "Vue d'ensemble", 'dash.pnl-title': 'Évolution du PnL cumulé',
    'dash.buysell-title': 'Répartition Achat / Vente', 'dash.daily-title': 'Résultat par jour (30J)',
    'dash.all-accounts': 'Tous les comptes', 'dash.add-account': 'Créer un compte', 'dash.trades-word': 'trades',
    'journal.new-trade': 'Nouveau trade', 'journal.collapse': '− Réduire', 'journal.expand': '+ Agrandir',
    'journal.history': 'Historique des trades', 'journal.search-placeholder': 'Rechercher un actif, une stratégie…',
    'f.account': 'Compte', 'f.date': 'Date', 'f.time': 'Heure', 'f.asset': 'Actif', 'f.direction': 'Type', 'f.buy': 'Achat', 'f.sell': 'Vente',
    'f.entry': "Prix d'entrée", 'f.sl': 'Stop Loss', 'f.tp': 'Take Profit', 'f.exit': 'Prix de sortie', 'f.lot': 'Taille position (lot)',
    'f.result': 'Résultat', 'f.currency': 'Devise', 'f.strategy': 'Stratégie', 'f.session': 'Session',
    'f.psycho-divider': '🧠 Psychologie', 'f.emotion': 'État émotionnel', 'f.confidence': 'Niveau de confiance (1-10)',
    'f.followed-plan': 'Plan respecté ?', 'f.yes': 'Oui', 'f.no': 'Non', 'f.mistake': 'Erreur commise', 'f.lesson': 'Leçon apprise',
    'f.risk-divider': '🚨 Gestion du risque', 'f.risk-percent': 'Risque en %', 'f.risk-amount': 'Risque en montant',
    'f.suggested-size': 'Taille position suggérée', 'f.notes': 'Annotations / notes', 'f.save': 'Enregistrer le trade', 'f.update': 'Mettre à jour le trade', 'f.cancel-edit': 'Annuler la modification',
    'session.asia': 'Asie', 'session.london': 'Londres', 'session.ny': 'New York',
    'emotion.calm': 'Calme', 'emotion.confident': 'Confiant', 'emotion.stressed': 'Stressé', 'emotion.impatient': 'Impatient', 'emotion.euphoric': 'Euphorique', 'emotion.tired': 'Fatigué',
    'stats.title': 'Statistiques automatiques',
    'analyse.title': 'Vue graphique', 'analyse.winloss': 'Répartition Gains / Pertes',
    'analyse.by-strategy-chart': 'Résultat net par stratégie', 'analyse.by-asset-chart': 'Résultat net par actif',
    'analyse.by-strategy': 'Performance par stratégie', 'analyse.by-asset': 'Performance par actif',
    'analyse.by-day': 'Performance par jour de la semaine', 'analyse.by-hour': 'Performance par heure de trading', 'analyse.by-session': 'Performance par session',
    'analyse.wins': 'Gains', 'analyse.losses': 'Pertes', 'analyse.breakeven': 'Neutre',
    'psycho.title': 'Journal psychologique', 'psycho.mistakes': 'Erreurs & leçons',
    'risk.calc-title': 'Calculateur de taille de position', 'risk.balance': 'Capital du compte', 'risk.risk-percent': 'Risque souhaité (%)',
    'risk.out-amount': 'Montant risqué', 'risk.out-size': 'Taille de position suggérée',
    'risk.formula-note': "Formule simplifiée : taille = montant risqué ÷ |entrée − SL|. À ajuster selon la valeur du pip / lot de ton broker (surtout pour XAUUSD et les indices).",
    'risk.limit-title': 'Limite de risque', 'risk.limit-alert': 'Alerte si le risque dépasse (%)',
    'settings.title': 'Réglages', 'settings.connected-as': 'Connecté en tant que', 'settings.logout': 'Se déconnecter',
    'settings.accounts-title': 'Comptes de trading', 'settings.accounts-hint': "Gère tes comptes de trading depuis l'onglet Tableau de bord (créer, modifier, supprimer).",
    'settings.appearance': 'Apparence', 'settings.theme': 'Thème', 'settings.bg-animated': 'Activer le fond animé', 'settings.language': 'Langue',
    'settings.export': 'Exporter', 'settings.export-csv': 'Exporter en CSV',
    'theme.sombre': 'Terminal sombre', 'theme.clair': 'Clair', 'theme.minuit': 'Minuit', 'theme.emeraude': 'Émeraude',
    'amodal.title-create': 'Nouveau compte', 'amodal.title-edit': 'Modifier le compte', 'amodal.save': 'Enregistrer', 'amodal.delete': 'Supprimer ce compte', 'amodal.edit-short': 'Modifier',
    'stat.total': 'Trades totaux', 'stat.winrate': 'Taux de réussite', 'stat.rr': 'Ratio R:R moyen', 'stat.pf': 'Profit Factor',
    'stat.expectancy': 'Espérance mathématique', 'stat.avgwin': 'Gain moyen', 'stat.avgloss': 'Perte moyenne', 'stat.net': 'Résultat net',
    'stat.winstreak': 'Série de gains max', 'stat.lossstreak': 'Série de pertes max', 'stat.maxdd': 'Drawdown maximal',
    'psycho.avgconfidence': 'Confiance moyenne', 'psycho.planfollowed': 'Plan respecté', 'psycho.plannotfollowed': 'Plan non respecté',
    'psycho.wrfollowed': 'WinRate (plan respecté)', 'psycho.wrnotfollowed': 'WinRate (plan non respecté)',
    'day.sun': 'Dimanche', 'day.mon': 'Lundi', 'day.tue': 'Mardi', 'day.wed': 'Mercredi', 'day.thu': 'Jeudi', 'day.fri': 'Vendredi', 'day.sat': 'Samedi',
    'chart.empty': 'Pas encore de données.', 'empty.trades': "Aucun trade pour l'instant. Ajoute ton premier trade ci-dessus.",
    'empty.psycho-log': 'Aucune erreur/leçon enregistrée pour l\u2019instant.',
    'toast.trade-saved': 'Trade enregistré.', 'toast.trade-updated': 'Trade mis à jour.', 'toast.trade-deleted': 'Trade supprimé.',
    'toast.account-saved': 'Compte enregistré.', 'toast.account-deleted': 'Compte supprimé.', 'toast.cannot-delete-last-account': 'Impossible de supprimer ton dernier compte.',
    'toast.error': 'Erreur', 'toast.no-trades-to-export': 'Aucun trade à exporter.',
    'confirm.delete-trade': 'Supprimer ce trade définitivement ?', 'confirm.delete-account': 'Supprimer ce compte et le retirer de tes filtres ? Les trades associés resteront enregistrés.',
    'auth.err-invalid': 'Email ou mot de passe incorrect.', 'auth.err-inuse': 'Un compte existe déjà avec cet email.',
    'auth.err-weak': 'Le mot de passe doit contenir au moins 6 caractères.', 'auth.err-email': 'Adresse email invalide.',
  },
  en: {
    'nav.features': 'Features', 'nav.how': 'How it works', 'nav.contact': 'Contact',
    'nav.theme': 'Theme', 'nav.login': 'Log in', 'nav.start': 'Get started',
    'hero.eyebrow': 'PERSONAL TRADING JOURNAL',
    'hero.title': 'Trade with discipline.<br>Improve with <span class="accent">data</span>.',
    'hero.sub': "Prince-QUEST FX logs every trade, updates your capital in real time, and reveals the habits that make — or break — your performance.",
    'hero.cta-primary': 'Create my free account', 'hero.cta-secondary': 'Log in',
    'hero.visual-title': 'CUMULATIVE PNL · 30D', 'hero.visual-wr': 'WIN RATE', 'hero.visual-pf': 'PROFIT FACTOR', 'hero.visual-trades': 'TRADES',
    'features.eyebrow': 'ALL-IN-ONE', 'features.title': 'A control room for your trading',
    'features.sub': 'Every tool you need to log, understand and fix your performance — in one place.',
    'features.f1-title': 'Automatic journal', 'features.f1-body': 'Log every trade — entry, SL/TP, result — and watch your capital update itself.',
    'features.f2-title': 'Live statistics', 'features.f2-body': 'Win rate, profit factor, expectancy, drawdown: calculated continuously, no spreadsheet needed.',
    'features.f3-title': 'Performance analysis', 'features.f3-body': 'Clear charts to see what works by strategy, asset, day and session.',
    'features.f4-title': 'Trader psychology', 'features.f4-body': 'Log your emotional state on every trade and spot the mistakes that keep coming back.',
    'features.f5-title': 'Risk management', 'features.f5-body': 'Position size calculator and automatic alert if you exceed your limit.',
    'features.f6-title': 'Multiple accounts', 'features.f6-body': 'Track your live, prop firm and crypto accounts separately — or all together at a glance.',
    'how.eyebrow': 'IN 3 STEPS', 'how.title': 'How it works',
    'how.s1-title': 'Set up your account', 'how.s1-body': 'Starting capital, currency, account type (live, prop firm or crypto).',
    'how.s2-title': 'Log your trades', 'how.s2-body': 'In seconds, live or after the fact, online or offline.',
    'how.s3-title': 'Track your progress', 'how.s3-body': 'Stats and charts updated automatically, trade after trade.',
    'ctaband.title': 'Ready to trade on data, not gut feeling?', 'ctaband.sub': 'Free, private, and synced across all your devices.', 'ctaband.button': 'Create my account',
    'auth.back': '← Back to home',
    'auth.subtitle-login': 'Log in to access your journal, synced across all your devices.',
    'auth.subtitle-signup': 'Create your account to sync your journal across all your devices.',
    'auth.email': 'Email', 'auth.password': 'Password',
    'auth.submit-login': 'Log in', 'auth.submit-signup': 'Create my account',
    'auth.toggle-to-signup': "Don't have an account yet? Sign up",
    'auth.toggle-to-login': 'Already have an account? Log in',
    'auth.forgot-password': 'Forgot your password?',
    'auth.google': 'Continue with Google', 'auth.or': 'or',
    'authvisual.title': 'TRADER', 'authvisual.sub': 'What you become when you measure what you do.',
    'authvisual.time': 'TIME', 'authvisual.emotion': 'EMOTION', 'authvisual.analysis': 'ANALYSIS',
    'authvisual.discipline': 'DISCIPLINE', 'authvisual.risk': 'RISK', 'authvisual.reward': 'REWARD',
    'auth.err-popup-closed': 'Sign-in window closed before completing.',
    'auth.reset-need-email': 'Enter your email above first, then click "Forgot your password?" again.',
    'auth.reset-sent': 'Email sent — check your inbox to reset your password.',
    'auth.err-toomany': 'Too many attempts. Please try again in a few minutes.',
    'asetup.title': 'Set up your first trading account',
    'asetup.sub': "Fill this in once — you'll be able to add other accounts (crypto, prop firm…) later. The platform tracks your capital automatically on every closed trade.",
    'asetup.name': 'Account name', 'asetup.type': 'Account type', 'asetup.capital': 'Starting capital',
    'asetup.currency': 'Main currency', 'asetup.country': 'Country', 'asetup.org': 'Broker / Organization', 'asetup.submit': 'Get started',
    'acctype.reel': 'Live account', 'acctype.propfirm': 'Prop Firm', 'acctype.crypto': 'Crypto', 'acctype.demo': 'Demo',
    'ticker.capital': 'Capital', 'ticker.winrate': 'Win Rate', 'ticker.rr': 'Avg R:R', 'ticker.pf': 'Profit Factor', 'ticker.exp': 'Expectancy', 'ticker.dd': 'Max Drawdown',
    'tab.dashboard': '🏠 Dashboard', 'tab.journal': '📊 Journal', 'tab.stats': '📈 Statistics', 'tab.analyse': '🎯 Analysis', 'tab.psycho': '🧠 Psychology', 'tab.risque': '🚨 Risk', 'tab.parametres': '⚙️ Settings',
    'banner.tagline': '💹 Prince-QUEST FX — automatic performance tracking', 'banner.privacy': '🔒 Private data, synced via Firebase',
    'dash.accounts': 'My accounts', 'dash.overview': 'Overview', 'dash.pnl-title': 'Cumulative PnL over time',
    'dash.buysell-title': 'Buy / Sell split', 'dash.daily-title': 'Daily result (30D)',
    'dash.all-accounts': 'All accounts', 'dash.add-account': 'Create account', 'dash.trades-word': 'trades',
    'journal.new-trade': 'New trade', 'journal.collapse': '− Collapse', 'journal.expand': '+ Expand',
    'journal.history': 'Trade history', 'journal.search-placeholder': 'Search an asset, a strategy…',
    'f.account': 'Account', 'f.date': 'Date', 'f.time': 'Time', 'f.asset': 'Asset', 'f.direction': 'Type', 'f.buy': 'Buy', 'f.sell': 'Sell',
    'f.entry': 'Entry price', 'f.sl': 'Stop Loss', 'f.tp': 'Take Profit', 'f.exit': 'Exit price', 'f.lot': 'Position size (lot)',
    'f.result': 'Result', 'f.currency': 'Currency', 'f.strategy': 'Strategy', 'f.session': 'Session',
    'f.psycho-divider': '🧠 Psychology', 'f.emotion': 'Emotional state', 'f.confidence': 'Confidence level (1-10)',
    'f.followed-plan': 'Followed plan?', 'f.yes': 'Yes', 'f.no': 'No', 'f.mistake': 'Mistake made', 'f.lesson': 'Lesson learned',
    'f.risk-divider': '🚨 Risk management', 'f.risk-percent': 'Risk in %', 'f.risk-amount': 'Risk amount',
    'f.suggested-size': 'Suggested position size', 'f.notes': 'Notes / annotations', 'f.save': 'Save trade', 'f.update': 'Update trade', 'f.cancel-edit': 'Cancel edit',
    'session.asia': 'Asia', 'session.london': 'London', 'session.ny': 'New York',
    'emotion.calm': 'Calm', 'emotion.confident': 'Confident', 'emotion.stressed': 'Stressed', 'emotion.impatient': 'Impatient', 'emotion.euphoric': 'Euphoric', 'emotion.tired': 'Tired',
    'stats.title': 'Automatic statistics',
    'analyse.title': 'Chart view', 'analyse.winloss': 'Win / Loss split',
    'analyse.by-strategy-chart': 'Net result by strategy', 'analyse.by-asset-chart': 'Net result by asset',
    'analyse.by-strategy': 'Performance by strategy', 'analyse.by-asset': 'Performance by asset',
    'analyse.by-day': 'Performance by day of week', 'analyse.by-hour': 'Performance by trading hour', 'analyse.by-session': 'Performance by session',
    'analyse.wins': 'Wins', 'analyse.losses': 'Losses', 'analyse.breakeven': 'Breakeven',
    'psycho.title': 'Psychology journal', 'psycho.mistakes': 'Mistakes & lessons',
    'risk.calc-title': 'Position size calculator', 'risk.balance': 'Account balance', 'risk.risk-percent': 'Desired risk (%)',
    'risk.out-amount': 'Amount at risk', 'risk.out-size': 'Suggested position size',
    'risk.formula-note': 'Simplified formula: size = amount at risk ÷ |entry − SL|. Adjust to your broker\u2019s pip/lot value (especially for XAUUSD and indices).',
    'risk.limit-title': 'Risk limit', 'risk.limit-alert': 'Alert if risk exceeds (%)',
    'settings.title': 'Settings', 'settings.connected-as': 'Logged in as', 'settings.logout': 'Log out',
    'settings.accounts-title': 'Trading accounts', 'settings.accounts-hint': 'Manage your trading accounts from the Dashboard tab (create, edit, delete).',
    'settings.appearance': 'Appearance', 'settings.theme': 'Theme', 'settings.bg-animated': 'Enable animated background', 'settings.language': 'Language',
    'settings.export': 'Export', 'settings.export-csv': 'Export as CSV',
    'theme.sombre': 'Dark terminal', 'theme.clair': 'Light', 'theme.minuit': 'Midnight', 'theme.emeraude': 'Emerald',
    'amodal.title-create': 'New account', 'amodal.title-edit': 'Edit account', 'amodal.save': 'Save', 'amodal.delete': 'Delete this account', 'amodal.edit-short': 'Edit',
    'stat.total': 'Total trades', 'stat.winrate': 'Win rate', 'stat.rr': 'Average R:R', 'stat.pf': 'Profit Factor',
    'stat.expectancy': 'Expectancy', 'stat.avgwin': 'Average win', 'stat.avgloss': 'Average loss', 'stat.net': 'Net result',
    'stat.winstreak': 'Max win streak', 'stat.lossstreak': 'Max loss streak', 'stat.maxdd': 'Max drawdown',
    'psycho.avgconfidence': 'Average confidence', 'psycho.planfollowed': 'Plan followed', 'psycho.plannotfollowed': 'Plan not followed',
    'psycho.wrfollowed': 'Win rate (plan followed)', 'psycho.wrnotfollowed': 'Win rate (plan not followed)',
    'day.sun': 'Sunday', 'day.mon': 'Monday', 'day.tue': 'Tuesday', 'day.wed': 'Wednesday', 'day.thu': 'Thursday', 'day.fri': 'Friday', 'day.sat': 'Saturday',
    'chart.empty': 'No data yet.', 'empty.trades': 'No trades yet. Add your first trade above.',
    'empty.psycho-log': 'No mistakes/lessons logged yet.',
    'toast.trade-saved': 'Trade saved.', 'toast.trade-updated': 'Trade updated.', 'toast.trade-deleted': 'Trade deleted.',
    'toast.account-saved': 'Account saved.', 'toast.account-deleted': 'Account deleted.', 'toast.cannot-delete-last-account': "You can't delete your last account.",
    'toast.error': 'Error', 'toast.no-trades-to-export': 'No trades to export.',
    'confirm.delete-trade': 'Permanently delete this trade?', 'confirm.delete-account': 'Delete this account and remove it from your filters? Associated trades will stay recorded.',
    'auth.err-invalid': 'Incorrect email or password.', 'auth.err-inuse': 'An account already exists with this email.',
    'auth.err-weak': 'Password must be at least 6 characters.', 'auth.err-email': 'Invalid email address.',
  },
};

function t(key) {
  return (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][key]) || TRANSLATIONS.fr[key] || key;
}

function applyI18n() {
  document.documentElement.setAttribute('lang', state.lang);
  $$('[data-i18n]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n')); });
  $$('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  $$('.lang-code').forEach(el => { el.textContent = state.lang.toUpperCase(); });
  const langSelect = $('#settings-language');
  if (langSelect) langSelect.value = state.lang;
}

function setLang(lang) {
  state.lang = (lang === 'en') ? 'en' : 'fr';
  localStorage.setItem('journal-lang', state.lang);
  applyI18n();
  updateAuthModeUI();
  if (state.user) renderAll();
}

$$('.lang-quick-toggle').forEach(btn => {
  btn.addEventListener('click', () => setLang(state.lang === 'fr' ? 'en' : 'fr'));
});
$('#settings-language')?.addEventListener('change', (e) => setLang(e.target.value));

// ============================================================
// APPARENCE (thème + fond animé) — appliqué dès le chargement,
// indépendamment de l'écran affiché (setup/auth/app).
// ============================================================
function applyTheme(name) {
  const theme = THEMES.includes(name) ? name : 'sombre';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('journal-theme', theme);
  const select = $('#settings-theme');
  if (select) select.value = theme;
  $$('.theme-quick-toggle .qt-icon').forEach(el => { el.textContent = theme === 'clair' ? '☀️' : '🌙'; });
}

function toggleQuickTheme() {
  const current = localStorage.getItem('journal-theme') || 'sombre';
  applyTheme(current === 'clair' ? 'sombre' : 'clair');
}
$$('.theme-quick-toggle').forEach(btn => btn.addEventListener('click', toggleQuickTheme));

function applyBgAnimated(enabled) {
  document.body.classList.toggle('bg-animated', !!enabled);
  localStorage.setItem('journal-bg-animated', enabled ? '1' : '0');
  const checkbox = $('#settings-bg-animated');
  if (checkbox) checkbox.checked = !!enabled;
}

function initAppearance() {
  applyTheme(localStorage.getItem('journal-theme') || 'sombre');
  const savedBg = localStorage.getItem('journal-bg-animated');
  applyBgAnimated(savedBg === null ? true : savedBg === '1');
  state.lang = localStorage.getItem('journal-lang') || 'fr';
  applyI18n();
}

$('#settings-theme')?.addEventListener('change', (e) => applyTheme(e.target.value));
$('#settings-bg-animated')?.addEventListener('change', (e) => applyBgAnimated(e.target.checked));

initAppearance();
renderHeroMiniChart();

// ============================================================
// AFFICHER / MASQUER LE MOT DE PASSE
// ============================================================
$('#auth-password-toggle')?.addEventListener('click', () => {
  const input = $('#auth-password');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  $('#auth-password-toggle').textContent = isHidden ? '🙈' : '👁';
  $('#auth-password-toggle').setAttribute('aria-label', isHidden ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
});

// ============================================================
// NAVIGATION PUBLIQUE (landing <-> auth)
// ============================================================
$$('.js-goto-login').forEach(btn => btn.addEventListener('click', () => { state.authMode = 'login'; updateAuthModeUI(); show('auth-screen'); }));
$$('.js-goto-signup').forEach(btn => btn.addEventListener('click', () => { state.authMode = 'signup'; updateAuthModeUI(); show('auth-screen'); }));
$$('.js-goto-landing').forEach(btn => btn.addEventListener('click', () => show('landing-screen')));
$$('.landing-nav-link[data-scroll]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

function updateAuthModeUI() {
  const isSignup = state.authMode === 'signup';
  $('#auth-submit-btn').textContent = isSignup ? t('auth.submit-signup') : t('auth.submit-login');
  $('#auth-toggle-mode').textContent = isSignup ? t('auth.toggle-to-login') : t('auth.toggle-to-signup');
  $('#auth-subtitle').textContent = isSignup ? t('auth.subtitle-signup') : t('auth.subtitle-login');
  $('#auth-forgot-password').classList.toggle('hidden', isSignup);
  $('#auth-error').classList.add('hidden');
  $('#auth-info').classList.add('hidden');
}

// ============================================================
// BOOT
// ============================================================
async function boot() {
  if (!CONFIGURED) {
    show('setup-screen');
    return;
  }
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      state.user = user;
      await enterApp();
    } else {
      state.user = null;
      state.trades = [];
      state.accounts = [];
      show('landing-screen');
    }
  });
}

function show(id) {
  ['landing-screen', 'setup-screen', 'auth-screen', 'account-setup-screen', 'app'].forEach(s => $('#' + s).classList.toggle('hidden', s !== id));
}

async function enterApp() {
  await loadAccounts();
  if (!state.accounts.length) {
    const migrated = await migrateLegacyAccount();
    if (migrated) await loadAccounts();
  }
  if (!state.accounts.length) {
    show('account-setup-screen');
    return;
  }
  show('app');
  $('#settings-email').textContent = state.user.email;
  setDefaultDateTime();
  await loadTrades();
  renderAccountFilterSelect();
  renderAccountFormSelect();
  renderAll();
}

// ============================================================
// COMPTES DE TRADING (multi-comptes)
// ============================================================
async function loadAccounts() {
  try {
    const q = query(collection(db, 'trading_accounts'), where('user_id', '==', state.user.uid));
    const snap = await getDocs(q);
    state.accounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    toast(t('toast.error') + ' : ' + err.message);
  }
}

async function migrateLegacyAccount() {
  try {
    const snap = await getDoc(doc(db, 'account_settings', state.user.uid));
    if (!snap.exists()) return false;
    const legacy = snap.data();
    await addDoc(collection(db, 'trading_accounts'), {
      user_id: state.user.uid,
      name: legacy.organization || (legacy.account_type === 'propfirm' ? 'Prop Firm' : 'Compte principal'),
      account_type: legacy.account_type || 'reel',
      initial_capital: legacy.initial_capital || 0,
      currency: legacy.currency || '$',
      country: legacy.country || null,
      organization: legacy.organization || null,
      created_at: Date.now(),
    });
    return true;
  } catch (err) {
    return false;
  }
}

$('#account-setup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    user_id: state.user.uid,
    name: $('#as-name').value.trim() || 'Compte principal',
    account_type: $('#as-type').value,
    initial_capital: Number($('#as-capital').value),
    currency: $('#as-currency').value,
    country: $('#as-country').value.trim() || null,
    organization: $('#as-org').value.trim() || null,
    created_at: Date.now(),
  };
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await addDoc(collection(db, 'trading_accounts'), payload);
    await enterApp();
  } catch (err) {
    $('#account-setup-error').textContent = err.message;
    $('#account-setup-error').classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
});

function computeAccountCapital(acc) {
  const net = state.trades
    .filter(tr => tr.account_id === acc.id && tr.result_value !== null && tr.result_value !== undefined && tr.result_currency === acc.currency)
    .reduce((s, tr) => s + tr.result_value, 0);
  return acc.initial_capital + net;
}

function renderAccountFilterSelect() {
  const sel = $('#account-filter-select');
  sel.innerHTML = `<option value="all">${t('dash.all-accounts')}</option>` +
    state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  sel.value = state.activeAccountId;
}
$('#account-filter-select').addEventListener('change', (e) => {
  state.activeAccountId = e.target.value;
  renderAll();
});

function renderAccountFormSelect() {
  const sel = $('#f-account');
  sel.innerHTML = state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  if (state.activeAccountId !== 'all' && state.accounts.some(a => a.id === state.activeAccountId)) {
    sel.value = state.activeAccountId;
  } else if (state.accounts.length) {
    sel.value = state.accounts[0].id;
  }
}

function renderAccountsRow() {
  const el = $('#accounts-row');
  const cards = state.accounts.map(acc => {
    const capital = computeAccountCapital(acc);
    const tradeCount = state.trades.filter(tr => tr.account_id === acc.id).length;
    const cls = capital >= acc.initial_capital ? 'pos' : 'neg';
    return `<div class="account-card">
      <div class="account-card-top">
        <span class="account-card-name">${escapeHtml(acc.name)}</span>
        <span class="account-badge ${acc.account_type === 'propfirm' ? 'propfirm' : 'reel'}">${t('acctype.' + (acc.account_type || 'reel'))}</span>
      </div>
      <span class="account-card-meta">${tradeCount} ${t('dash.trades-word')}</span>
      <span class="account-card-value ${cls}">${fmt(capital, 2)} ${acc.currency}</span>
      <div class="account-card-actions">
        <button class="btn btn-ghost btn-sm" data-editacc="${acc.id}">✎ ${t('amodal.edit-short')}</button>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = cards + `<button class="account-card-add" id="account-add-btn">+ ${t('dash.add-account')}</button>`;
  el.querySelectorAll('[data-editacc]').forEach(b => b.addEventListener('click', () => openAccountModal(b.dataset.editacc)));
  $('#account-add-btn').addEventListener('click', () => openAccountModal());
}

function openAccountModal(accountId = null) {
  const isEdit = !!accountId;
  $('#account-modal-title').textContent = isEdit ? t('amodal.title-edit') : t('amodal.title-create');
  $('#account-modal-delete').classList.toggle('hidden', !isEdit);
  $('#account-modal-error').classList.add('hidden');
  if (isEdit) {
    const acc = state.accounts.find(a => a.id === accountId);
    if (!acc) return;
    $('#am-id').value = acc.id;
    $('#am-name').value = acc.name || '';
    $('#am-type').value = acc.account_type || 'reel';
    $('#am-capital').value = acc.initial_capital;
    $('#am-currency').value = acc.currency;
    $('#am-country').value = acc.country || '';
    $('#am-org').value = acc.organization || '';
  } else {
    $('#account-modal-form').reset();
    $('#am-id').value = '';
  }
  $('#account-modal').classList.remove('hidden');
}
function closeAccountModal() { $('#account-modal').classList.add('hidden'); }

$('#account-modal-close').addEventListener('click', closeAccountModal);
$('#account-modal').addEventListener('click', (e) => { if (e.target.id === 'account-modal') closeAccountModal(); });

$('#account-modal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#am-id').value;
  const payload = {
    user_id: state.user.uid,
    name: $('#am-name').value.trim(),
    account_type: $('#am-type').value,
    initial_capital: Number($('#am-capital').value),
    currency: $('#am-currency').value,
    country: $('#am-country').value.trim() || null,
    organization: $('#am-org').value.trim() || null,
  };
  try {
    if (id) {
      await updateDoc(doc(db, 'trading_accounts', id), payload);
    } else {
      payload.created_at = Date.now();
      await addDoc(collection(db, 'trading_accounts'), payload);
    }
    await loadAccounts();
    renderAccountFilterSelect();
    renderAccountFormSelect();
    renderAll();
    closeAccountModal();
    toast(t('toast.account-saved'));
  } catch (err) {
    $('#account-modal-error').textContent = err.message;
    $('#account-modal-error').classList.remove('hidden');
  }
});

$('#account-modal-delete').addEventListener('click', async () => {
  const id = $('#am-id').value;
  if (!id) return;
  if (state.accounts.length <= 1) { toast(t('toast.cannot-delete-last-account')); return; }
  if (!confirm(t('confirm.delete-account'))) return;
  try {
    await deleteDoc(doc(db, 'trading_accounts', id));
    if (state.activeAccountId === id) state.activeAccountId = 'all';
    await loadAccounts();
    await loadTrades();
    renderAccountFilterSelect();
    renderAccountFormSelect();
    renderAll();
    closeAccountModal();
    toast(t('toast.account-deleted'));
  } catch (err) {
    toast(t('toast.error') + ' : ' + err.message);
  }
});

function getFilteredTrades() {
  if (state.activeAccountId === 'all') return state.trades;
  return state.trades.filter(tr => tr.account_id === state.activeAccountId);
}

function setDefaultDateTime() {
  const now = new Date();
  $('#f-date').value = now.toISOString().slice(0, 10);
  $('#f-time').value = now.toTimeString().slice(0, 5);
}

// ============================================================
// AUTH
// ============================================================
$('#auth-toggle-mode').addEventListener('click', () => {
  state.authMode = state.authMode === 'login' ? 'signup' : 'login';
  updateAuthModeUI();
});

$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  $('#auth-error').classList.add('hidden');
  $('#auth-submit-btn').disabled = true;
  try {
    if (state.authMode === 'signup') {
      await createUserWithEmailAndPassword(auth, email, password);
      toast("Compte créé. Tu es maintenant connecté.");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    $('#auth-error').textContent = translateAuthError(err.code || err.message);
    $('#auth-error').classList.remove('hidden');
  } finally {
    $('#auth-submit-btn').disabled = false;
  }
});

function translateAuthError(code) {
  if (/invalid-credential|wrong-password|user-not-found/i.test(code)) return t('auth.err-invalid');
  if (/email-already-in-use|account-exists-with-different-credential/i.test(code)) return t('auth.err-inuse');
  if (/weak-password/i.test(code)) return t('auth.err-weak');
  if (/invalid-email/i.test(code)) return t('auth.err-email');
  if (/too-many-requests/i.test(code)) return t('auth.err-toomany');
  return code;
}

$('#google-signin-btn').addEventListener('click', async () => {
  $('#auth-error').classList.add('hidden');
  $('#auth-info').classList.add('hidden');
  $('#google-signin-btn').disabled = true;
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // onAuthStateChanged prend le relais et affiche l'app.
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      $('#auth-error').textContent = translateAuthError(err.code || err.message);
      $('#auth-error').classList.remove('hidden');
    }
  } finally {
    $('#google-signin-btn').disabled = false;
  }
});

$('#auth-forgot-password').addEventListener('click', async () => {
  const email = $('#auth-email').value.trim();
  $('#auth-error').classList.add('hidden');
  $('#auth-info').classList.add('hidden');
  if (!email) {
    $('#auth-error').textContent = t('auth.reset-need-email');
    $('#auth-error').classList.remove('hidden');
    $('#auth-email').focus();
    return;
  }
  $('#auth-forgot-password').disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
    $('#auth-info').textContent = t('auth.reset-sent');
    $('#auth-info').classList.remove('hidden');
  } catch (err) {
    $('#auth-error').textContent = translateAuthError(err.code || err.message);
    $('#auth-error').classList.remove('hidden');
  } finally {
    $('#auth-forgot-password').disabled = false;
  }
});

async function doLogout() {
  await signOut(auth);
}
$('#logout-btn').addEventListener('click', doLogout);
$('#settings-logout-btn').addEventListener('click', doLogout);

// ============================================================
// TABS
// ============================================================
$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    $$('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('#panel-' + btn.dataset.tab).classList.add('active');
  });
});

$('#toggle-form-btn').addEventListener('click', () => {
  const form = $('#trade-form');
  const collapsed = form.style.display === 'none';
  form.style.display = collapsed ? 'grid' : 'none';
  $('#toggle-form-btn').textContent = collapsed ? t('journal.collapse') : t('journal.expand');
});

// ============================================================
// CRUD TRADES
// ============================================================
async function loadTrades() {
  try {
    const q = query(
      collection(db, 'trades'),
      where('user_id', '==', state.user.uid),
      orderBy('trade_date', 'asc'),
      orderBy('trade_time', 'asc'),
    );
    const snap = await getDocs(q);
    state.trades = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    toast(t('toast.error') + ' : ' + err.message);
  }
}

$('#trade-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#save-trade-btn').disabled = true;
  try {
    const payload = {
      user_id: state.user.uid,
      account_id: $('#f-account').value,
      trade_date: $('#f-date').value,
      trade_time: $('#f-time').value,
      asset: $('#f-asset').value.trim().toUpperCase(),
      direction: $('#f-direction').value,
      entry_price: numOrNull($('#f-entry').value),
      stop_loss: numOrNull($('#f-sl').value),
      take_profit: numOrNull($('#f-tp').value),
      exit_price: numOrNull($('#f-exit').value),
      lot_size: numOrNull($('#f-lot').value),
      result_value: numOrNull($('#f-result').value),
      result_currency: $('#f-currency').value,
      strategy: $('#f-strategy').value.trim() || null,
      session: $('#f-session').value || null,
      emotion_before: $('#f-emotion').value || null,
      confidence_level: numOrNull($('#f-confidence').value),
      followed_plan: $('#f-followed-plan').value === 'oui',
      mistake: $('#f-mistake').value.trim() || null,
      lesson: $('#f-lesson').value.trim() || null,
      risk_percent: numOrNull($('#f-risk-percent').value),
      risk_amount: numOrNull($('#f-risk-amount').value),
      notes: $('#f-notes').value.trim() || null,
    };

    let tradeId = state.editingId;
    if (tradeId) {
      await updateDoc(doc(db, 'trades', tradeId), payload);
    } else {
      const ref2 = await addDoc(collection(db, 'trades'), payload);
      tradeId = ref2.id;
    }

    const wasEdit = !!state.editingId;
    resetForm();
    await loadTrades();
    renderAll();

    if (payload.result_value !== null && payload.result_value !== undefined) {
      const sign = payload.result_value > 0 ? 'gain' : (payload.result_value < 0 ? 'perte' : 'résultat neutre');
      toast(`${wasEdit ? t('toast.trade-updated') : t('toast.trade-saved')} — ${sign} de ${fmt(Math.abs(payload.result_value), 2)} ${payload.result_currency}.`);
    } else {
      toast(wasEdit ? t('toast.trade-updated') : t('toast.trade-saved'));
    }
  } catch (err) {
    toast(t('toast.error') + ' : ' + err.message);
  } finally {
    $('#save-trade-btn').disabled = false;
  }
});

function numOrNull(v) { return v === '' || v === null || v === undefined ? null : Number(v); }

function resetForm() {
  $('#trade-form').reset();
  setDefaultDateTime();
  renderAccountFormSelect();
  state.editingId = null;
  $('#cancel-edit-btn').classList.add('hidden');
  $('#save-trade-btn').textContent = t('f.save');
}

$('#cancel-edit-btn').addEventListener('click', resetForm);

async function editTrade(id) {
  const tr = state.trades.find(x => x.id === id);
  if (!tr) return;
  state.editingId = id;
  renderAccountFormSelect();
  if (tr.account_id) $('#f-account').value = tr.account_id;
  $('#f-date').value = tr.trade_date || '';
  $('#f-time').value = tr.trade_time || '';
  $('#f-asset').value = tr.asset || '';
  $('#f-direction').value = tr.direction || 'achat';
  $('#f-entry').value = tr.entry_price ?? '';
  $('#f-sl').value = tr.stop_loss ?? '';
  $('#f-tp').value = tr.take_profit ?? '';
  $('#f-exit').value = tr.exit_price ?? '';
  $('#f-lot').value = tr.lot_size ?? '';
  $('#f-result').value = tr.result_value ?? '';
  $('#f-currency').value = tr.result_currency || '$';
  $('#f-strategy').value = tr.strategy || '';
  $('#f-session').value = tr.session || '';
  $('#f-emotion').value = tr.emotion_before || '';
  $('#f-confidence').value = tr.confidence_level ?? '';
  $('#f-followed-plan').value = tr.followed_plan ? 'oui' : 'non';
  $('#f-mistake').value = tr.mistake || '';
  $('#f-lesson').value = tr.lesson || '';
  $('#f-risk-percent').value = tr.risk_percent ?? '';
  $('#f-risk-amount').value = tr.risk_amount ?? '';
  $('#f-notes').value = tr.notes || '';
  $('#cancel-edit-btn').classList.remove('hidden');
  $('#save-trade-btn').textContent = t('f.update');
  $('#trade-form').style.display = 'grid';
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'journal'));
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-journal'));
  $('#trade-form').scrollIntoView({ behavior: 'smooth' });
}

async function deleteTrade(id) {
  if (!confirm(t('confirm.delete-trade'))) return;
  try {
    await deleteDoc(doc(db, 'trades', id));
    await loadTrades();
    renderAll();
    toast(t('toast.trade-deleted'));
  } catch (err) {
    toast(t('toast.error') + ' : ' + err.message);
  }
}

// live risk amount preview in the form
['f-entry', 'f-sl', 'f-risk-percent'].forEach(id => {
  $('#' + id)?.addEventListener('input', updateFormRiskPreview);
});
function updateFormRiskPreview() {
  const entry = Number($('#f-entry').value);
  const sl = Number($('#f-sl').value);
  const riskPercent = Number($('#f-risk-percent').value);
  const limit = Number($('#settings-risk-limit')?.value || 2);
  if (riskPercent) {
    $('#risk-alert').classList.toggle('hidden', riskPercent <= limit);
    $('#risk-alert').textContent = `⚠️ Risque de ${riskPercent}% > limite fixée de ${limit}%.`;
  } else {
    $('#risk-alert').classList.add('hidden');
  }
}

// ============================================================
// SEARCH
// ============================================================
$('#trade-search').addEventListener('input', () => renderTradesList());

// ============================================================
// STATS ENGINE
// ============================================================
function computeStats(trades) {
  const withResult = trades.filter(tr => tr.result_value !== null && tr.result_value !== undefined);
  const total = withResult.length;
  const wins = withResult.filter(tr => tr.result_value > 0);
  const losses = withResult.filter(tr => tr.result_value < 0);
  const winRate = total ? (wins.length / total) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((s, tr) => s + tr.result_value, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, tr) => s + tr.result_value, 0) / losses.length : 0;
  const grossProfit = wins.reduce((s, tr) => s + tr.result_value, 0);
  const grossLoss = Math.abs(losses.reduce((s, tr) => s + tr.result_value, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
  const lossRate = total ? losses.length / total : 0;
  const expectancy = (winRate / 100) * avgWin + lossRate * avgLoss;

  const rrValues = trades
    .filter(tr => tr.entry_price != null && tr.stop_loss != null && tr.take_profit != null)
    .map(tr => {
      const risk = Math.abs(tr.entry_price - tr.stop_loss);
      const reward = Math.abs(tr.take_profit - tr.entry_price);
      return risk > 0 ? reward / risk : null;
    })
    .filter(v => v !== null);
  const avgRR = rrValues.length ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;

  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  withResult.forEach(tr => {
    if (tr.result_value > 0) { curWin++; curLoss = 0; }
    else if (tr.result_value < 0) { curLoss++; curWin = 0; }
    maxWinStreak = Math.max(maxWinStreak, curWin);
    maxLossStreak = Math.max(maxLossStreak, curLoss);
  });

  let equity = 0, peak = 0, maxDD = 0;
  withResult.forEach(tr => {
    equity += tr.result_value;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, peak - equity);
  });

  return {
    total, winRate, avgWin, avgLoss, profitFactor, expectancy, avgRR,
    maxWinStreak, maxLossStreak, maxDD, grossProfit, grossLoss,
    netResult: grossProfit - grossLoss,
  };
}

function groupBy(trades, keyFn) {
  const groups = {};
  trades.forEach(tr => {
    const key = keyFn(tr);
    if (key === null || key === undefined || key === '') return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tr);
  });
  return groups;
}

// ============================================================
// GRAPHIQUES SVG (maison, hors-ligne, sans dépendance)
// ============================================================
function makeLineAreaChart(labels, values, { height = 180 } = {}) {
  const width = 600;
  const padding = { top: 14, right: 14, bottom: 22, left: 14 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = (max - min) || 1;
  const stepX = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + h - ((v - min) / range) * h;
    return [x, y];
  });
  const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const zeroY = padding.top + h - ((0 - min) / range) * h;
  const last = pts[pts.length - 1];
  const first = pts[0];
  const areaD = `${pathD} L${last[0].toFixed(1)},${zeroY.toFixed(1)} L${first[0].toFixed(1)},${zeroY.toFixed(1)} Z`;
  const uid = 'grad' + Math.random().toString(36).slice(2, 8);
  const labelIdxs = values.length > 1 ? [0, Math.floor((values.length - 1) / 2), values.length - 1] : [0];
  const axisLabels = labelIdxs.map(i => `<text class="axis-label" x="${pts[i][0].toFixed(1)}" y="${height - 6}" text-anchor="middle">${escapeHtml(labels[i] || '')}</text>`).join('');
  return `<svg class="svg-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--amber)" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="var(--amber)" stop-opacity="0"/>
    </linearGradient></defs>
    <line class="grid-line" x1="${padding.left}" y1="${zeroY.toFixed(1)}" x2="${width - padding.right}" y2="${zeroY.toFixed(1)}" stroke-dasharray="3,3"/>
    <path class="area-fill" d="${areaD}" fill="url(#${uid})" stroke="none"/>
    <path class="line-path" d="${pathD}"/>
    <circle class="dot-marker" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.5"/>
    ${axisLabels}
  </svg>`;
}

function makeDonutChart(segments, { size = 160 } = {}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 18;
  let offset = 0;
  const circles = total > 0 ? segments.filter(s => s.value > 0).map(seg => {
    const frac = seg.value / total;
    const dash = frac * circumference;
    const circle = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${seg.colorVar}" stroke-width="${strokeWidth}" stroke-dasharray="${dash.toFixed(1)} ${(circumference - dash).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dash;
    return circle;
  }).join('') : `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="var(--border)" stroke-width="${strokeWidth}"/>`;
  return `<svg class="svg-chart" viewBox="0 0 ${size} ${size}" style="max-width:${size}px; margin:0 auto; display:block;">
    ${circles}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-center-value" font-size="20" fill="var(--text)">${total}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-center-label" font-size="10">${escapeHtml(t('dash.trades-word'))}</text>
  </svg>`;
}

function makeBarChart(labels, values, { height = 180 } = {}) {
  const width = 600;
  const padding = { top: 10, right: 10, bottom: 22, left: 10 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;
  const maxAbs = Math.max(1, ...values.map(v => Math.abs(v)));
  const zeroY = padding.top + h / 2;
  const step = w / values.length;
  const barW = Math.max(2, step * 0.6);
  const bars = values.map((v, i) => {
    const x = padding.left + i * step + (step - barW) / 2;
    const barH = Math.abs(v) / maxAbs * (h / 2 - 4);
    const y = v >= 0 ? zeroY - barH : zeroY;
    return `<rect class="${v >= 0 ? 'bar-pos' : 'bar-neg'}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, barH).toFixed(1)}" rx="2"/>`;
  }).join('');
  const labelIdxs = values.length > 1 ? [0, Math.floor((values.length - 1) / 2), values.length - 1] : [0];
  const axisLabels = labelIdxs.map(i => {
    const x = padding.left + i * step + step / 2;
    return `<text class="axis-label" x="${x.toFixed(1)}" y="${height - 4}" text-anchor="middle">${escapeHtml(labels[i] || '')}</text>`;
  }).join('');
  return `<svg class="svg-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    <line class="grid-line" x1="${padding.left}" y1="${zeroY.toFixed(1)}" x2="${width - padding.right}" y2="${zeroY.toFixed(1)}"/>
    ${bars}
    ${axisLabels}
  </svg>`;
}

function makeHBarComparison(entries) {
  if (!entries.length) return '';
  const maxAbs = Math.max(1, ...entries.map(e => Math.abs(e.value)));
  const width = 600;
  const rowH = 26, gap = 12;
  const h = entries.length * (rowH + gap);
  const midX = width / 2;
  const usable = width / 2 - 90;
  const bars = entries.map((e, i) => {
    const y = i * (rowH + gap);
    const barLen = Math.abs(e.value) / maxAbs * usable;
    const x = e.value >= 0 ? midX : midX - barLen;
    const cls = e.value >= 0 ? 'bar-pos' : 'bar-neg';
    return `<text x="${(midX - usable - 8).toFixed(1)}" y="${(y + rowH / 2 + 4).toFixed(1)}" text-anchor="end" class="axis-label" font-size="10">${escapeHtml(String(e.name))}</text>
      <rect class="${cls}" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" width="${barLen.toFixed(1)}" height="${rowH - 6}" rx="3"/>
      <text x="${(e.value >= 0 ? x + barLen + 6 : x - 6).toFixed(1)}" y="${(y + rowH / 2 + 4).toFixed(1)}" text-anchor="${e.value >= 0 ? 'start' : 'end'}" class="axis-label" font-size="9">${e.value >= 0 ? '+' : ''}${fmt(e.value, 0)}</text>`;
  }).join('');
  return `<svg class="svg-chart" viewBox="0 0 ${width} ${h + 6}">
    <line class="grid-line" x1="${midX}" y1="0" x2="${midX}" y2="${h}"/>
    ${bars}
  </svg>`;
}

function renderHeroMiniChart() {
  const el = $('#hero-mini-chart');
  if (!el) return;
  const demo = [120, 180, 150, 260, 300, 280, 360, 340, 420, 480, 450, 540, 600, 580, 650, 700, 680, 760, 820, 790, 860, 900, 880, 950, 1010, 980, 1050, 1020, 1068];
  el.innerHTML = makeLineAreaChart(demo.map(() => ''), demo, { height: 150 });
}

function renderPnlChart(trades) {
  const period = state.pnlPeriod;
  const withResult = trades.filter(tr => tr.result_value != null && tr.trade_date)
    .sort((a, b) => (a.trade_date + (a.trade_time || '')).localeCompare(b.trade_date + (b.trade_time || '')));
  let filtered = withResult;
  if (period !== 'all') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(period));
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    filtered = withResult.filter(tr => tr.trade_date >= cutoffStr);
  }
  const el = $('#chart-pnl');
  if (!filtered.length) { el.innerHTML = `<div class="chart-empty">${t('chart.empty')}</div>`; return; }
  let cum = 0;
  const values = filtered.map(tr => (cum += tr.result_value));
  const labels = filtered.map(tr => tr.trade_date.slice(5));
  el.innerHTML = makeLineAreaChart(labels, values, { height: 220 });
}

$$('#pnl-period-group .chart-period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('#pnl-period-group .chart-period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.pnlPeriod = btn.dataset.period === 'all' ? 'all' : Number(btn.dataset.period);
    renderPnlChart(getFilteredTrades());
  });
});

function renderBuySellDonut(trades) {
  const buy = trades.filter(tr => tr.direction === 'achat').length;
  const sell = trades.filter(tr => tr.direction === 'vente').length;
  const el = $('#chart-buysell');
  if (!buy && !sell) { el.innerHTML = `<div class="chart-empty">${t('chart.empty')}</div>`; return; }
  el.innerHTML = makeDonutChart([
    { label: t('f.buy'), value: buy, colorVar: 'var(--green)' },
    { label: t('f.sell'), value: sell, colorVar: 'var(--red)' },
  ], { size: 170 }) + `<div class="chart-legend">
    <span class="chart-legend-item"><span class="chart-legend-dot" style="background:var(--green)"></span>${t('f.buy')} (${buy})</span>
    <span class="chart-legend-item"><span class="chart-legend-dot" style="background:var(--red)"></span>${t('f.sell')} (${sell})</span>
  </div>`;
}

function renderDailyResultChart(trades) {
  const withResult = trades.filter(tr => tr.result_value != null && tr.trade_date);
  const byDay = {};
  withResult.forEach(tr => { byDay[tr.trade_date] = (byDay[tr.trade_date] || 0) + tr.result_value; });
  const days = Object.keys(byDay).sort().slice(-30);
  const el = $('#chart-daily-result');
  if (!days.length) { el.innerHTML = `<div class="chart-empty">${t('chart.empty')}</div>`; return; }
  const values = days.map(d => byDay[d]);
  const labels = days.map(d => d.slice(5));
  el.innerHTML = makeBarChart(labels, values, { height: 200 });
}

function renderDashboardCharts() {
  const trades = getFilteredTrades();
  renderPnlChart(trades);
  renderBuySellDonut(trades);
  renderDailyResultChart(trades);
}

function renderWinLossDonut(trades) {
  const withResult = trades.filter(tr => tr.result_value != null);
  const wins = withResult.filter(tr => tr.result_value > 0).length;
  const losses = withResult.filter(tr => tr.result_value < 0).length;
  const breakeven = withResult.length - wins - losses;
  const el = $('#chart-winloss');
  if (!withResult.length) { el.innerHTML = `<div class="chart-empty">${t('chart.empty')}</div>`; return; }
  const segs = [
    { label: t('analyse.wins'), value: wins, colorVar: 'var(--green)' },
    { label: t('analyse.losses'), value: losses, colorVar: 'var(--red)' },
  ];
  if (breakeven > 0) segs.push({ label: t('analyse.breakeven'), value: breakeven, colorVar: 'var(--muted)' });
  el.innerHTML = makeDonutChart(segs, { size: 170 }) + `<div class="chart-legend">
    <span class="chart-legend-item"><span class="chart-legend-dot" style="background:var(--green)"></span>${t('analyse.wins')} (${wins})</span>
    <span class="chart-legend-item"><span class="chart-legend-dot" style="background:var(--red)"></span>${t('analyse.losses')} (${losses})</span>
    ${breakeven > 0 ? `<span class="chart-legend-item"><span class="chart-legend-dot" style="background:var(--muted)"></span>${t('analyse.breakeven')} (${breakeven})</span>` : ''}
  </div>`;
}

function renderStrategyBar(trades) {
  const groups = groupBy(trades, tr => tr.strategy);
  const entries = Object.entries(groups).map(([name, ts]) => ({ name, value: computeStats(ts).netResult })).sort((a, b) => b.value - a.value).slice(0, 8);
  const el = $('#chart-strategy-bar');
  el.innerHTML = entries.length ? makeHBarComparison(entries) : `<div class="chart-empty">${t('chart.empty')}</div>`;
}

function renderAssetBar(trades) {
  const groups = groupBy(trades, tr => tr.asset);
  const entries = Object.entries(groups).map(([name, ts]) => ({ name, value: computeStats(ts).netResult })).sort((a, b) => b.value - a.value).slice(0, 8);
  const el = $('#chart-asset-bar');
  el.innerHTML = entries.length ? makeHBarComparison(entries) : `<div class="chart-empty">${t('chart.empty')}</div>`;
}

function renderAnalyseCharts() {
  const trades = getFilteredTrades();
  renderWinLossDonut(trades);
  renderStrategyBar(trades);
  renderAssetBar(trades);
}

// ============================================================
// RENDER
// ============================================================
function renderAll() {
  renderAccountsRow();
  renderTicker();
  renderTradesList();
  renderStats();
  renderBreakdowns();
  renderPsycho();
  renderDashboardCharts();
  renderAnalyseCharts();
}

function fmt(n, decimals = 2) {
  if (n === null || n === undefined || Number.isNaN(n) || !Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function renderTicker() {
  const trades = getFilteredTrades();
  const s = computeStats(trades);

  if (state.accounts.length) {
    let capital, currency, badgeText, badgeClass;
    if (state.activeAccountId !== 'all') {
      const acc = state.accounts.find(a => a.id === state.activeAccountId);
      if (acc) {
        capital = computeAccountCapital(acc);
        currency = acc.currency;
        badgeText = t('acctype.' + (acc.account_type || 'reel'));
        badgeClass = acc.account_type === 'propfirm' ? 'propfirm' : 'reel';
      }
    } else {
      currency = state.accounts[0].currency;
      capital = state.accounts.reduce((sum, acc) => sum + computeAccountCapital(acc), 0);
      badgeText = t('dash.all-accounts');
      badgeClass = 'reel';
    }
    const initialSum = state.activeAccountId !== 'all'
      ? (state.accounts.find(a => a.id === state.activeAccountId)?.initial_capital || 0)
      : state.accounts.reduce((s2, a) => s2 + a.initial_capital, 0);
    $('#t-capital').textContent = fmt(capital, 2) + ' ' + currency;
    $('#t-capital').className = 'ticker-value ' + (capital >= initialSum ? 'pos' : 'neg');
    const badge = $('#t-account-badge');
    badge.textContent = badgeText;
    badge.className = 'account-badge ' + badgeClass;
  } else {
    $('#t-capital').textContent = '—';
  }

  $('#t-winrate').textContent = s.total ? fmt(s.winRate, 1) + '%' : '—';
  $('#t-rr').textContent = s.avgRR ? '1:' + fmt(s.avgRR, 2) : '—';
  $('#t-pf').textContent = Number.isFinite(s.profitFactor) ? fmt(s.profitFactor, 2) : '∞';
  $('#t-exp').textContent = s.total ? fmt(s.expectancy, 2) : '—';
  $('#t-dd').textContent = s.total ? fmt(s.maxDD, 2) : '—';
  $('#t-exp').className = 'ticker-value ' + (s.expectancy >= 0 ? 'pos' : 'neg');
}

function renderTradesList() {
  const container = $('#trades-list');
  const searchQuery = $('#trade-search').value.trim().toLowerCase();
  let trades = [...getFilteredTrades()].reverse();
  if (searchQuery) {
    trades = trades.filter(tr =>
      (tr.asset || '').toLowerCase().includes(searchQuery) ||
      (tr.strategy || '').toLowerCase().includes(searchQuery)
    );
  }
  if (!trades.length) {
    container.innerHTML = `<div class="empty-state">${t('empty.trades')}</div>`;
    return;
  }
  container.innerHTML = trades.map(tr => {
    const result = tr.result_value;
    const resClass = result > 0 ? 'pos' : (result < 0 ? 'neg' : '');
    const resText = result !== null && result !== undefined ? (result > 0 ? '+' : '') + fmt(result) + ' ' + (tr.result_currency || '') : '—';
    const accName = state.accounts.find(a => a.id === tr.account_id)?.name;
    return `
      <div class="trade-row">
        <span class="trade-side ${tr.direction}">${tr.direction === 'achat' ? t('f.buy') : t('f.sell')}</span>
        <div class="trade-main">
          <div class="trade-asset">${escapeHtml(tr.asset)} ${tr.strategy ? '· ' + escapeHtml(tr.strategy) : ''}</div>
          <div class="trade-meta">${tr.trade_date || ''} ${tr.trade_time || ''} ${accName ? '· ' + escapeHtml(accName) : ''} ${tr.lot_size ? '· ' + tr.lot_size + ' lot' : ''}</div>
        </div>
        <div class="trade-result ${resClass}">${resText}</div>
        <div class="trade-actions">
          <button class="icon-btn" data-edit="${tr.id}" title="Modifier">✎</button>
          <button class="icon-btn" data-del="${tr.id}" title="Supprimer">🗑</button>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editTrade(b.dataset.edit)));
  container.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteTrade(b.dataset.del)));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderStats() {
  const s = computeStats(getFilteredTrades());
  const cards = [
    [t('stat.total'), s.total, ''],
    [t('stat.winrate'), fmt(s.winRate, 1) + '%', s.winRate >= 50 ? 'pos' : 'neg'],
    [t('stat.rr'), s.avgRR ? '1:' + fmt(s.avgRR, 2) : '—', ''],
    [t('stat.pf'), Number.isFinite(s.profitFactor) ? fmt(s.profitFactor, 2) : '∞', s.profitFactor >= 1 ? 'pos' : 'neg'],
    [t('stat.expectancy'), fmt(s.expectancy, 2), s.expectancy >= 0 ? 'pos' : 'neg'],
    [t('stat.avgwin'), fmt(s.avgWin, 2), 'pos'],
    [t('stat.avgloss'), fmt(s.avgLoss, 2), 'neg'],
    [t('stat.net'), fmt(s.netResult, 2), s.netResult >= 0 ? 'pos' : 'neg'],
    [t('stat.winstreak'), s.maxWinStreak, 'pos'],
    [t('stat.lossstreak'), s.maxLossStreak, 'neg'],
    [t('stat.maxdd'), fmt(s.maxDD, 2), 'neg'],
  ];
  $('#stats-grid').innerHTML = cards.map(([label, value, cls]) => `
    <div class="stat-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value ${cls}">${value}</div>
    </div>`).join('');
}

function renderBreakdownGroup(containerId, groups) {
  const entries = Object.entries(groups).map(([name, trades]) => {
    const s = computeStats(trades);
    return { name, ...s };
  }).sort((a, b) => b.netResult - a.netResult);

  const maxAbs = Math.max(1, ...entries.map(e => Math.abs(e.netResult)));

  const el = $('#' + containerId);
  if (!entries.length) { el.innerHTML = `<div class="empty-state">${t('chart.empty')}</div>`; return; }
  el.innerHTML = entries.map(e => `
    <div class="breakdown-row">
      <div class="breakdown-top">
        <span class="breakdown-name">${escapeHtml(String(e.name))}</span>
        <span class="breakdown-figures">${e.total} trades · ${fmt(e.winRate, 0)}% WR · ${e.netResult >= 0 ? '+' : ''}${fmt(e.netResult, 2)}</span>
      </div>
      <div class="breakdown-bar-track">
        <div class="breakdown-bar-fill ${e.netResult >= 0 ? 'pos' : 'neg'}" style="width:${Math.min(100, Math.abs(e.netResult) / maxAbs * 100)}%"></div>
      </div>
    </div>`).join('');
}

function renderBreakdowns() {
  const trades = getFilteredTrades();
  renderBreakdownGroup('breakdown-strategy', groupBy(trades, tr => tr.strategy));
  renderBreakdownGroup('breakdown-asset', groupBy(trades, tr => tr.asset));
  renderBreakdownGroup('breakdown-day', groupBy(trades, tr => {
    if (!tr.trade_date) return null;
    const d = new Date(tr.trade_date + 'T00:00:00');
    return t('day.' + DAY_KEYS[d.getDay()]);
  }));
  renderBreakdownGroup('breakdown-hour', groupBy(trades, tr => {
    if (!tr.trade_time) return null;
    return tr.trade_time.slice(0, 2) + 'h';
  }));
  renderBreakdownGroup('breakdown-session', groupBy(trades, tr => {
    const labels = { asie: t('session.asia'), londres: t('session.london'), new_york: t('session.ny') };
    return labels[tr.session] || null;
  }));
}

function renderPsycho() {
  const trades = getFilteredTrades();
  const followedYes = trades.filter(tr => tr.followed_plan).length;
  const followedNo = trades.filter(tr => tr.followed_plan === false).length;
  const avgConfidence = (() => {
    const withC = trades.filter(tr => tr.confidence_level != null);
    return withC.length ? withC.reduce((s, tr) => s + tr.confidence_level, 0) / withC.length : 0;
  })();

  const s = computeStats(trades.filter(tr => tr.followed_plan));
  const sNot = computeStats(trades.filter(tr => tr.followed_plan === false));

  $('#psycho-summary').innerHTML = `
    <div class="stat-card"><div class="stat-label">${t('psycho.avgconfidence')}</div><div class="stat-value">${fmt(avgConfidence, 1)}/10</div></div>
    <div class="stat-card"><div class="stat-label">${t('psycho.planfollowed')}</div><div class="stat-value pos">${followedYes}</div></div>
    <div class="stat-card"><div class="stat-label">${t('psycho.plannotfollowed')}</div><div class="stat-value neg">${followedNo}</div></div>
    <div class="stat-card"><div class="stat-label">${t('psycho.wrfollowed')}</div><div class="stat-value">${fmt(s.winRate, 1)}%</div></div>
    <div class="stat-card"><div class="stat-label">${t('psycho.wrnotfollowed')}</div><div class="stat-value">${fmt(sNot.winRate, 1)}%</div></div>
  `;

  const withNotes = trades.filter(tr => tr.mistake || tr.lesson).reverse();
  $('#psycho-log').innerHTML = withNotes.length ? withNotes.map(tr => `
    <div class="trade-row" style="grid-template-columns: 1fr;">
      <div>
        <div class="trade-meta">${tr.trade_date} · ${escapeHtml(tr.asset)} ${tr.emotion_before ? '· ' + tr.emotion_before : ''}</div>
        ${tr.mistake ? `<div>❌ ${escapeHtml(tr.mistake)}</div>` : ''}
        ${tr.lesson ? `<div>💡 ${escapeHtml(tr.lesson)}</div>` : ''}
      </div>
    </div>`).join('') : `<div class="empty-state">${t('empty.psycho-log')}</div>`;
}

// ============================================================
// CALCULATEUR DE RISQUE (onglet dédié)
// ============================================================
['calc-balance', 'calc-risk-percent', 'calc-entry', 'calc-sl'].forEach(id => {
  $('#' + id).addEventListener('input', updateCalc);
});
function updateCalc() {
  const balance = Number($('#calc-balance').value);
  const riskPercent = Number($('#calc-risk-percent').value);
  const entry = Number($('#calc-entry').value);
  const sl = Number($('#calc-sl').value);
  if (!balance || !riskPercent || !entry || !sl || entry === sl) {
    $('#calc-out-amount').textContent = '—';
    $('#calc-out-size').textContent = '—';
    return;
  }
  const riskAmount = balance * (riskPercent / 100);
  const size = riskAmount / Math.abs(entry - sl);
  $('#calc-out-amount').textContent = fmt(riskAmount, 2);
  $('#calc-out-size').textContent = fmt(size, 4) + ' unités';
}

// ============================================================
// EXPORT CSV
// ============================================================
$('#export-csv-btn').addEventListener('click', () => {
  const trades = getFilteredTrades();
  if (!trades.length) { toast(t('toast.no-trades-to-export')); return; }
  const headers = Object.keys(trades[0]);
  const rows = trades.map(tr => headers.map(h => JSON.stringify(tr[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journal-trading-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// ============================================================
// SERVICE WORKER (PWA offline shell + installable)
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

boot();
