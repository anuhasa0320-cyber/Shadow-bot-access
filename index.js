const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, onChildAdded, onChildChanged } = require('firebase/database');

const firebaseConfig = {
  databaseURL: "https://shadow-bot-access-68292-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let sock;
const TARGET_CHANNEL_JID = "YOUR_CHANNEL_ID@newsletter"; // මෙතැනට ඔයාගේ WhatsApp Channel එකේ JID එක දාන්න (උදා: 1203633xxxxxx@newsletter)
const BOT_PHONE_NUMBER = "947XXXXXXXX"; // මෙතැනට බොට්ගේ WhatsApp නම්බර් එක දාන්න

// දිනය සහ වෙලාව ලබාගැනීමේ ෆන්ෂන් එක
function getDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}/${month}/${day}`;
    
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const time = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

    return { date, time };
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    sock = makeWASocket({ 
        auth: state,
        printQRInTerminal: false 
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'close') {
            startBot();
        } else if (connection === 'open') {
            console.log('WhatsApp Bot එක සාර්ථකව Connect විය!');
            listenFirebaseChanges();
        }
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(BOT_PHONE_NUMBER);
                console.log(`\n==============================\nPAIRING CODE: ${code}\n==============================\n`);
            } catch (err) {
                console.log("Pairing code ලබාගැනීමේ දෝෂයක්:", err);
            }
        }, 4000);
    }
}

function listenFirebaseChanges() {
    const dbRef = ref(db, 'users'); 

    // 1. අලුතින් යූසර් කෙනෙක් ඇඩ් වෙද්දී
    onChildAdded(dbRef, async (snapshot) => {
        const data = snapshot.val();
        const name = data.name || 'N/A';
        const phone = data.number || data.phone || 'N/A';
        const { date, time } = getDateTime();

        const message = `✅ 𝗡𝗲𝘄 𝗨𝘀𝗲𝗿 𝗔𝗱𝗱𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 \n\n` +
                        `*👤 Name :* ${name}\n` +
                        `*📞 Number :* ${phone}\n` +
                        `*📆 Date :* ${date}\n` +
                        `*⏰ Time :* ${time}\n` +
                        `*⚡ Status :* Active 🟢\n\n` +
                        `> *𝐏ᴏᴡᴇʀᴇᴅ 𝐁ʏ 𝐒ʜᴀᴅᴏᴡ 👻*`;
        
        await sock.sendMessage(TARGET_CHANNEL_JID, { text: message });
    });

    // 2. ඩේටා වෙනස් වෙද්දී (Expire soon / Expired)
    onChildChanged(dbRef, async (snapshot) => {
        const data = snapshot.val();
        const name = data.name || 'N/A';
        const phone = data.number || data.phone || 'N/A';
        const status = (data.status || '').toLowerCase();
        const { date, time } = getDateTime();

        let message = '';

        if (status.includes('soon')) {
            message = `​​⏳ 𝗨𝘀𝗲𝗿 𝗘𝘅𝗽𝗶𝗿𝗶𝗻𝗴 𝗦𝗼𝗼𝗻\n\n` +
                      `*👤 Name :* ${name}\n` +
                      `*📞 Number :* ${phone}\n` +
                      `*📆 Date :* ${date}\n` +
                      `*⏰ Time :* ${time}\n` +
                      `*⚡ Status :* Expiring Soon 🟡\n\n` +
                      `> *𝐏ᴏᴡᴇʀᴇᴅ 𝐁ʏ 𝐒ʜᴀᴅᴏᴡ 👻*`;

        } else if (status.includes('expired')) {
            message = `​​❌ 𝗨𝘀𝗲𝗿 𝗘𝘅𝗽𝗶𝗿𝗲𝗱  \n\n` +
                      `*👤 Name :* ${name}\n` +
                      `*📞 Number :* ${phone}\n` +
                      `*📆 Date :* ${date}\n` +
                      `*⏰ Time :* ${time}\n` +
                      `*⚡ Status :* Expired 🔴\n\n` +
                      `> *𝐏ᴏᴡᴇʀᴇᴅ 𝐁ʏ 𝐒ʜᴀᴅᴏᴡ 👻*`;
        }

        if (message) {
            await sock.sendMessage(TARGET_CHANNEL_JID, { text: message });
        }
    });
}

startBot();

