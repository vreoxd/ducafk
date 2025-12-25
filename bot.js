const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock, GoalXZ, GoalGetToBlock, GoalFollow } = require('mineflayer-pathfinder').goals;
const autoeat = require('mineflayer-auto-eat').plugin;
const armorManager = require('mineflayer-armor-manager');
const webinventory = require('mineflayer-web-inventory');
const pvp = require('mineflayer-pvp').plugin;
const { Vec3 } = require('vec3');
const readline = require('readline');
const express = require('express');

const bots = []; // tüm botları saklamak için
let webInvStarted = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const config = require('./settings.json');
const app = express();

app.get('/', (req, res) => res.send('Bot Is Ready'));
app.listen(3000, () => console.log('Server started'));

// ===================== CREATE BOT =====================
function createBot(account, delay) {
  setTimeout(() => {
    const serverSplit = config.server.ip.split(':');
    const bot = mineflayer.createBot({
      username: account.username,
      password: account.password,
      auth: account.type,
      host: serverSplit[0],
      port: Number(serverSplit[1]),
      version: config.server.version,
    });

    bots.push(bot);

    // login
    bot.on('login', () => {
      bot.loadPlugin(pathfinder);
      bot.loadPlugin(pvp);
      const mcData = require('minecraft-data')(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.settings.colorsEnabled = false;
      bot.pathfinder.setMovements(defaultMove);
      process.title = `${bot.username} @ ${config.server.ip}`;
    });

    // spawn
    bot.once('spawn', () => {
      log(`${bot.username} sunucuya girdi`);

      // AUTO LOGIN
      if (config.utils['auto-auth'].enabled) {
        setTimeout(() => bot.chat(`/login ${config.utils['auto-auth'].password}`), 1000);
      }

      // chat-messages
      if (config.utils['chat-messages'].enabled) {
        let messages = config.utils['chat-messages'].messages;
        let delayMsg = config.utils['chat-messages']['repeat-delay'] * 1000;
        let i = 0;
        setInterval(() => {
          bot.chat(messages[i]);
          i = (i + 1) % messages.length;
        }, delayMsg);
      }

      // anti-afk basit
      if (config.utils['anti-afk'].enabled) {
        setInterval(() => {
          bot.swingArm('right');
          bot.look(bot.entity.yaw + 0.5, bot.entity.pitch, true);
        }, 5000);
      }
    });

    // auto reconnect
    if (config.utils['auto-reconnect']) {
      bot.on('end', () => {
        setTimeout(() => createBot(account, 0), config.utils['auto-reconnect-delay']);
      });
    }

    // error & kicked
    bot.on('kicked', reason => warn(`${bot.username} kicked: ${reason}`));
    bot.on('error', err => berror(`${bot.username} error: ${err.message}`));

  }, delay);
}

// ===================== BAŞLAT =====================
config['bot-accounts'].forEach((account, i) => {
  createBot(account, i * 5000); // 5 saniye arayla
});

// ===================== CONSOLE COMMANDS =====================
rl.on('line', (input) => {
  const args = input.trim().split(' ');

  // /tpa <hedef> <botNumarası>
  if (args[0] === '/tpa' && args[2]) {
    const botIndex = parseInt(args[2], 10) - 1;
    if (bots[botIndex]) {
      bots[botIndex].chat(`/tpa ${args[1]}`);
      log(`Komut ${bots[botIndex].username} tarafından gönderildi`);
    } else {
      warn(`Bot numarası geçersiz: ${args[2]}`);
    }
  } else {
    // tüm botlara gönder
    bots.forEach(bot => bot.chat(input));
    log(`Komut tüm botlara gönderildi: ${input}`);
  }
});

// ===================== LOG SYSTEM =====================
const now = new Date();
const time = now.toLocaleString().replace(',', '-').replace(' ', '');

function log(input) { console.log(`[INFO] ${input}`); rl.prompt(true); }
function warn(input) { console.warn(`[WARN] ${input}`); rl.prompt(true); }
function berror(input) { console.error(`[ERROR] ${input}`); rl.prompt(true); }
