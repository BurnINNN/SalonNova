require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY;
const NEXT_WEBHOOK_URL = process.env.NEXT_WEBHOOK_URL;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// Validation de la clé API
const authenticate = (req, res, next) => {
  const apiKey = req.headers['apikey'] || req.query.apikey;
  if (GATEWAY_API_KEY && apiKey !== GATEWAY_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

// État global
let sharedClient = null;
let latestQrCode = null;
let connectionState = 'close'; // 'open', 'connecting', 'close'
const lastInboundTime = new Map(); // Expéditeur -> Date de son dernier message entrant (pour le chat en direct)

// --- FILE D'ATTENTE DE MESSAGES (QUEUE) ---
class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.lastSentTime = 0;
  }

  enqueue(item) {
    this.queue.push(item);
    this.processNext();
  }

  async processNext() {
    if (this.processing) return;
    if (this.queue.length === 0) return;

    this.processing = true;
    const item = this.queue.shift();

    try {
      const now = Date.now();
      let requiredDelay = 0;

      if (item.isInteractive) {
        // Chat en direct avec l'IA : Délai humain (4 à 8s de réflexion + 2 à 4s de frappe)
        const thinkingTime = Math.floor(Math.random() * 4000) + 4000;
        const typingTime = Math.floor(Math.random() * 2000) + 2000;
        requiredDelay = thinkingTime + typingTime;
        console.log(`[QUEUE] Message interactif pour ${item.to}. Simulation de frappe : ${requiredDelay}ms...`);
        
        // Simuler "En train d'écrire..." avant l'envoi
        try {
          const chat = await sharedClient.getChatById(item.to);
          await chat.sendStateTyping();
        } catch (e) {
          console.warn('[QUEUE] Impossible de déclencher l\'état Typing:', e.message);
        }
      } else {
        // Rappel de RDV / Campagne automatique : Espacement strict de 5 minutes (300 000 ms)
        const minSpacing = 300000; // 5 minutes
        const elapsed = now - this.lastSentTime;
        if (elapsed < minSpacing) {
          requiredDelay = minSpacing - elapsed;
          console.log(`[QUEUE] Rappel automatique pour ${item.to}. Attente anti-ban : ${Math.round(requiredDelay / 1000)} secondes...`);
        }
      }

      if (requiredDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, requiredDelay));
      }

      // Envoi du message
      console.log(`[QUEUE] Envoi du message à ${item.to} : "${item.text.substring(0, 30)}..."`);
      const sentMsg = await sharedClient.sendMessage(item.to, item.text);
      
      // Stopper l'état d'écriture si interactif
      if (item.isInteractive) {
        try {
          const chat = await sharedClient.getChatById(item.to);
          await chat.clearState();
        } catch (e) {}
      }

      this.lastSentTime = Date.now();
      item.resolve({ success: true, messageId: sentMsg.id.id });
    } catch (error) {
      console.error(`[QUEUE] Échec de l'envoi à ${item.to}:`, error);
      item.reject(error);
    } finally {
      this.processing = false;
      this.processNext();
    }
  }
}

const globalQueue = new MessageQueue();

// --- INITIALISATION DU CLIENT WHATSAPP ---
function initializeWhatsAppClient() {
  if (sharedClient) return;

  console.log('[WHATSAPP] Initialisation du client unique...');
  connectionState = 'connecting';

  sharedClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth',
      clientId: 'shared_gateway'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
    }
  });

  sharedClient.on('qr', async (qr) => {
    console.log('\n--- 📲 NOUVEAU QR CODE A SCANNER ---');
    qrcodeTerminal.generate(qr, { small: true });
    
    try {
      latestQrCode = await QRCode.toDataURL(qr);
      connectionState = 'connecting';
    } catch (err) {
      console.error('[WHATSAPP] Erreur de conversion QR Code:', err);
    }
  });

  sharedClient.on('ready', () => {
    console.log('[WHATSAPP] Le client unique est CONNECTÉ et prêt !');
    connectionState = 'open';
    latestQrCode = null;
  });

  sharedClient.on('auth_failure', (msg) => {
    console.error('[WHATSAPP] Échec d\'authentification :', msg);
    connectionState = 'close';
    latestQrCode = null;
  });

  sharedClient.on('disconnected', (reason) => {
    console.log('[WHATSAPP] Client déconnecté :', reason);
    connectionState = 'close';
    latestQrCode = null;
  });

  // Gestion des messages entrants
  sharedClient.on('message', async (msg) => {
    // Ignorer les groupes et les statuts
    if (msg.from.includes('@g.us') || msg.isStatus) return;

    console.log(`[WHATSAPP] Message reçu de ${msg.from}: ${msg.body.substring(0, 30)}`);
    
    // Noter le timestamp du dernier message entrant de cet utilisateur (pour le chat interactif prioritaire)
    lastInboundTime.set(msg.from, Date.now());

    // Relayer le message vers l'application Next.js via Webhook
    if (NEXT_WEBHOOK_URL) {
      try {
        const payload = {
          event: 'messages.upsert',
          instance: 'shared_gateway',
          data: {
            key: {
              remoteJid: msg.from,
              fromMe: msg.fromMe,
              id: msg.id.id
            },
            pushName: msg._data.notifyName || 'Client',
            message: msg.hasMedia && msg.type === 'image' ? {
              imageMessage: {
                caption: msg.body || ''
              }
            } : {
              conversation: msg.body
            }
          }
        };

        const headers = { 'Content-Type': 'application/json' };
        if (WEBHOOK_VERIFY_TOKEN) {
          headers['Authorization'] = `Bearer ${WEBHOOK_VERIFY_TOKEN}`;
        }

        console.log(`[WEBHOOK] Envoi vers Next.js...`);
        const response = await fetch(NEXT_WEBHOOK_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          console.warn('[WEBHOOK] Échec de transmission webhook :', await response.text());
        }
      } catch (err) {
        console.error('[WEBHOOK] Erreur lors de l\'envoi du webhook :', err.message);
      }
    }
  });

  sharedClient.initialize().catch(err => {
    console.error('[WHATSAPP] Erreur critique d\'initialisation:', err);
    connectionState = 'close';
  });
}

// Initialisation automatique au démarrage si besoin
initializeWhatsAppClient();

// --- ROUTES DE L'API REST COMPATIBLE ---

// 1. Créer/Démarrer l'instance
app.post('/instance/create', authenticate, (req, res) => {
  console.log('[API] Demande de création d\'instance...');
  initializeWhatsAppClient();
  res.json({
    success: true,
    message: 'Instance unique initialisée',
    instanceName: 'shared_gateway'
  });
});

// 2. Configurer le Webhook (Ne fait rien car l'URL est gérée par variable d'env, mais renvoie OK)
app.post('/webhook/set/:instanceName', authenticate, (req, res) => {
  res.json({ success: true, message: 'Webhook configuré par défaut via les variables d\'environnement.' });
});

// 3. Récupérer le QR code actuel
app.get('/instance/connect/:instanceName', authenticate, (req, res) => {
  if (connectionState === 'open') {
    return res.status(400).json({ error: 'WhatsApp est déjà connecté.' });
  }
  res.json({
    qrcode: {
      base64: latestQrCode
    },
    base64: latestQrCode
  });
});

// 4. Récupérer l'état de la connexion
app.get('/instance/connectionState/:instanceName', authenticate, (req, res) => {
  res.json({
    instance: {
      state: connectionState
    }
  });
});

// 5. Supprimer l'instance (Déconnexion)
app.delete('/instance/delete/:instanceName', authenticate, async (req, res) => {
  console.log('[API] Demande de déconnexion et suppression...');
  if (sharedClient) {
    try {
      await sharedClient.logout();
      await sharedClient.destroy();
    } catch (e) {
      console.warn('[API] Erreur lors de la déconnexion physique:', e.message);
    }
    sharedClient = null;
    connectionState = 'close';
    latestQrCode = null;
  }
  res.json({ success: true, message: 'Instance déconnectée avec succès' });
});

// 6. Télécharger l'image reçue en Base64 (pour Gemini)
app.post('/chat/getBase64FromMediaMessage/:instanceName', authenticate, async (req, res) => {
  const { message } = req.body;
  const messageId = message?.key?.id;
  const remoteJid = message?.key?.remoteJid;

  if (!messageId || !remoteJid) {
    return res.status(400).json({ error: 'Message ID et remoteJid sont requis.' });
  }

  try {
    if (!sharedClient || connectionState !== 'open') {
      return res.status(400).json({ error: 'Client WhatsApp non connecté.' });
    }

    const chat = await sharedClient.getChatById(remoteJid);
    const messages = await chat.fetchMessages({ limit: 50 });
    const msg = messages.find(m => m.id.id === messageId);

    if (!msg || !msg.hasMedia) {
      return res.status(404).json({ error: 'Média de message introuvable.' });
    }

    const media = await msg.downloadMedia();
    if (!media) {
      return res.status(404).json({ error: 'Échec de téléchargement du média.' });
    }

    res.json({
      base64: media.data,
      mimetype: media.mimetype
    });
  } catch (error) {
    console.error('[API] Erreur téléchargement média:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Envoi d'un message texte (Intègre la file d'attente anti-ban)
app.post('/message/sendText/:instanceName', authenticate, async (req, res) => {
  const { number, text } = req.body;

  if (!number || !text) {
    return res.status(400).json({ error: 'Le numéro de destinataire et le texte sont obligatoires.' });
  }

  if (!sharedClient || connectionState !== 'open') {
    return res.status(400).json({ error: 'Client WhatsApp non connecté.' });
  }

  // Formater le numéro de téléphone pour WhatsApp (ex: "33612345678@c.us")
  let cleanNumber = number.replace(/[^\d]/g, '');
  if (!cleanNumber.endsWith('@c.us')) {
    cleanNumber = `${cleanNumber}@c.us`;
  }

  // Détecter si le message est une réponse interactive
  // (si le client nous a écrit au cours des 15 dernières minutes)
  const lastInbound = lastInboundTime.get(cleanNumber);
  const isInteractive = lastInbound && (Date.now() - lastInbound < 15 * 60 * 1000);

  // Envelopper dans une Promesse pour renvoyer le statut ou l'enfiler
  new Promise((resolve, reject) => {
    globalQueue.enqueue({
      to: cleanNumber,
      text: text,
      isInteractive: !!isInteractive,
      resolve,
      reject
    });
  });

  // On répond immédiatement OK à Next.js pour éviter les Timeouts Vercel
  res.json({
    status: 'PENDING',
    message: 'Message en cours de traitement dans la file d\'attente sécurisée.',
    messageId: `msg_${Date.now()}`
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP', connectionState });
});

app.listen(PORT, () => {
  console.log(`[SERVEUR] Passerelle WhatsApp active sur le port ${PORT}`);
});
