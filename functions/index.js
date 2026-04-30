const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

function todayBerlinKey() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}

const AUTO_POOL = [
  { icon: '🧠', title: 'Zahlenrätsel', desc: 'Welche Zahl fehlt? 2 · 4 · 8 · 16 · ?', answer: '32', points: 8 },
  { icon: '🔤', title: 'Wortblitz', desc: 'Nenne in 60 Sekunden 5 Wörter, die mit S anfangen.', answer: 'frei', points: 6 },
  { icon: '🧩', title: 'Logik-Mini', desc: 'Wenn alle Blips Blops sind und alle Blops Blau sind: Sind alle Blips Blau?', answer: 'Ja', points: 8 },
  { icon: '🏃', title: '2-Minuten-Bewegung', desc: 'Mache 20 Kniebeugen oder 2 Minuten lockere Bewegung.', answer: 'erledigt', points: 10 },
  { icon: '🧘', title: 'Atem-Fokus', desc: 'Atme 10-mal ruhig ein und aus. Danach Challenge abhaken.', answer: 'erledigt', points: 5 },
  { icon: '👀', title: 'Augenpause', desc: '20 Sekunden aus dem Fenster oder in die Ferne schauen.', answer: 'erledigt', points: 5 },
  { icon: '💧', title: 'Wasser-Check', desc: 'Trinke ein Glas Wasser.', answer: 'erledigt', points: 5 },
  { icon: '🎯', title: 'Mini-Fokus', desc: 'Räume eine kleine Sache auf deinem Tisch weg.', answer: 'erledigt', points: 7 },
  { icon: '➕', title: 'Kopfrechnen', desc: 'Rechne ohne Taschenrechner: 17 + 28 + 9 = ?', answer: '54', points: 8 },
  { icon: '🕵️', title: 'Muster finden', desc: 'Was kommt als nächstes: A, C, F, J, O, ?', answer: 'U', points: 10 }
];

function seededIndex(dk, offset) {
  let n = 0;
  for (let i = 0; i < dk.length; i++) n = (n * 31 + dk.charCodeAt(i) + offset * 17) % 100000;
  return n % AUTO_POOL.length;
}

function dailyChallenges(dk) {
  return [0,1,2].map(i => {
    const c = AUTO_POOL[seededIndex(dk, i)];
    return {
      id: `auto_${dk}_${i}`,
      title: c.title,
      desc: c.desc + (c.answer && c.answer !== 'erledigt' ? `\nAntwort: ${c.answer}` : ''),
      points: c.points,
      icon: c.icon,
      date: dk,
      recurrence: 'once',
      active: true,
      auto: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
  });
}

async function sendToTokens(tokens, title, body) {
  const clean = [...new Set(tokens.filter(Boolean))];
  if (!clean.length) return;
  await admin.messaging().sendEachForMulticast({
    tokens: clean,
    notification: { title, body },
    webpush: {
      fcmOptions: { link: 'https://ak2191.github.io/Meine-App/' },
      notification: { icon: 'https://ak2191.github.io/Meine-App/icon-192.png', badge: 'https://ak2191.github.io/Meine-App/icon-192.png' }
    },
    data: { url: 'https://ak2191.github.io/Meine-App/' }
  });
}

exports.createDailyChallengesAndPush = onSchedule({
  schedule: '0 9 * * *',
  timeZone: 'Europe/Berlin',
  region: 'europe-west3'
}, async () => {
  const dk = todayBerlinKey();
  const batch = db.batch();
  for (const c of dailyChallenges(dk)) batch.set(db.collection('change_challenges').doc(c.id), c, { merge: true });
  await batch.commit();

  const players = await db.collection('change_players').where('pushEnabled', '==', true).get();
  const tokens = players.docs.map(d => d.data().fcmToken).filter(Boolean);
  await sendToTokens(tokens, 'Change: heutige Mini-Challenges', '3 kleine Rätsel/Trainingsübungen warten auf dich.');
});

exports.pushWhenChallengeCreated = onDocumentCreated({
  document: 'change_challenges/{challengeId}',
  region: 'europe-west3'
}, async (event) => {
  const c = event.data.data();
  if (!c || c.auto) return;
  const players = await db.collection('change_players').where('pushEnabled', '==', true).get();
  const tokens = players.docs.map(d => d.data().fcmToken).filter(Boolean);
  await sendToTokens(tokens, 'Neue Challenge in Change', `${c.icon || '🏆'} ${c.title || 'Neue Challenge'} · ${c.points || 0} Punkte`);
});
