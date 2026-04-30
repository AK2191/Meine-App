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
  { icon: '🏋️', title: '10 Kniebeugen', desc: 'Mache 10 saubere Kniebeugen. Langsam runter, stabil hoch.', points: 10 },
  { icon: '💪', title: '10 Wand-Liegestütze', desc: 'Mache 10 leichte Liegestütze an der Wand oder am Tisch.', points: 10 },
  { icon: '🧘', title: '60 Sekunden Dehnen', desc: 'Dehne Schultern, Rücken oder Beine für 60 Sekunden.', points: 8 },
  { icon: '🚶', title: '3 Minuten gehen', desc: 'Gehe 3 Minuten locker durch den Raum oder draußen.', points: 8 },
  { icon: '⏱️', title: '20 Sekunden Plank', desc: 'Halte 20 Sekunden Unterarmstütz. Alternative: Knie am Boden.', points: 12 },
  { icon: '🙆', title: 'Nacken lockern', desc: 'Rolle Schultern 10-mal und neige den Kopf sanft nach links/rechts.', points: 6 }
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
      desc: c.desc,
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
  await sendToTokens(tokens, 'Change: heutige Sport-Challenges', '3 kleine Sportübungen warten heute auf dich.');
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
