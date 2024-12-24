const { Client, GatewayIntentBits } = require('discord.js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // .envファイルを読み込む

// 環境変数を利用
const BOT_TOKEN = process.env.BOT_TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ROLE_ID = process.env.ROLE_ID;
const DEV_MODE = process.env.DEV_MODE === 'true'; // booleanに変換

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log('Bot is ready!');
});

client.on('messageCreate', async (message) => {
    if (message.channel.id !== CHANNEL_ID || !message.attachments.size) return;

    const attachment = message.attachments.first();
    const fileName = `./temp/${Date.now()}-${attachment.name}`;
    
    // ファイルを保存
    const response = await fetch(attachment.url);
    const buffer = await response.buffer();
    fs.writeFileSync(fileName, buffer);

    if (DEV_MODE) {
        console.log(`Image saved at: ${fileName}`);
    }

    // Pythonスクリプトを実行
    const pythonProcess = spawn('python3', ['process_result.py', fileName, './dataset']);

    pythonProcess.stdout.on('data', (data) => {
        const result = JSON.parse(data.toString());
        const { song, result: scoreData } = result;

        // レート計算
        const totalNotes = Object.values(scoreData).reduce((a, b) => a + b, 0);
        const accuracy = ((scoreData.PERFECT + 0.8 * scoreData.GREAT + 0.5 * scoreData.GOOD) / totalNotes) * 100;

        // Discordに結果を投稿
        const responseMessage = `
**楽曲情報**
- 曲名: ${song.name}
- 難易度: ${song.difficulty}
- レベル: ${song.level}

**スコア詳細**
- PERFECT: ${scoreData.PERFECT}
- GREAT: ${scoreData.GREAT}
- GOOD: ${scoreData.GOOD}
- BAD: ${scoreData.BAD}
- MISS: ${scoreData.MISS}

**精度**
- Accuracy: ${accuracy.toFixed(2)}%
`;
        message.reply(responseMessage);

        // 一時ファイル削除
        fs.unlinkSync(fileName);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
    });
});

client.login(BOT_TOKEN);
