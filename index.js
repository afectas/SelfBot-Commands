import { Client, Collection, RichPresence } from "discord.js-selfbot-v13";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ checkUpdate: false });
client.commands = new Collection();

client.selfConfig = {
    prefix: ",",
    token: "TU_TOKEN_AQUI",
    appID: "ID_DE_TU_APPLICACION", 
    rotatorEnabled: true,
    currentIndex: 0,
    statusMessages: ["Status 1", "Status 2", "Status 3"],
    rpcText: "Your Text",
    rpcState: "Your Text",
    rpcType: "STREAMING", // PLAYING, WATCHING, LISTENING, STREAMING
    rpcTwitch: "https://twitch.tv" 
};

const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));
        
        for (const file of commandFiles) {
            const filePath = `./commands/${folder}/${file}`;
            try {
                const { default: command } = await import(filePath);
                if (command && command.name) {
                    client.commands.set(command.name, command);
                }
            } catch (error) {
                console.error(`[X]  ERROR LOADING... ${file}:`, error);
            }
        }
    }
}

const updatePresence = () => {
    if (!client.selfConfig.rotatorEnabled) return;

    const { statusMessages, currentIndex, rpcText, rpcState, rpcType, rpcTwitch, appID } = client.selfConfig;
    const currentStatus = statusMessages[currentIndex];

    const r = new RichPresence(client)
        .setApplicationId(appID)
        .setType(rpcType)
        .setURL(rpcTwitch)
        .setState(rpcState)
        .setDetails(rpcText)
        .setStartTimestamp(Date.now());

    client.user.setPresence({ 
        activities: [r, { name: currentStatus, type: "WATCHING" }] 
    });

    client.selfConfig.currentIndex = (currentIndex + 1) % statusMessages.length;
};

client.on("ready", async () => {
    console.clear();
    console.log(chalk.magentaBright(`
    ╔══════════════════════════════════════╗
    ║          BOT CONECTADO               ║
    ╚══════════════════════════════════════╝
    
    [$] USER: ${chalk.white.bold(client.user.tag)}
    [$] ID: ${chalk.white(client.user.id)}
    [$] COMMANDS: ${chalk.white(client.commands.size)}`)};
  
    
    updatePresence();
    setInterval(updatePresence, 15000);
});

client.on("messageCreate", async (message) => {
    if (message.author.id !== client.user.id) return;
    if (!message.content.startsWith(client.selfConfig.prefix)) return;

    const args = message.content.slice(client.selfConfig.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || 
                    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    try {
        await command.execute(client, message, args);
    } catch (error) {
        console.error("[X]  ERROR:", error);
        await message.edit(`\`${error.message}\``).catch(() => {});
    }
});

client.login(client.selfConfig.token).catch(err => {
    console.error("[X]   ERROR LOGGIN  (INVALID TOKEN):", err);
});
