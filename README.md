# Roblox group bot

Discord slash-command bot for Roblox group `186309460`. Rank changes use a Roblox account cookie. Activity and chat logs come from Studio scripts that post to this bot. Made to run on Railway.

## Commands

| Command | Who | What it does |
| --- | --- | --- |
| `/terminate username` | Staff | Sets them to the lowest assignable rank |
| `/promote username` | Staff | Moves them up one rank |
| `/demote username` | Staff | Moves them down one rank |
| `/setrank username rank` | Staff | Rank name, rank number, or role id |
| `/activity-script` | Staff | Sends the Studio activity script |
| `/activity-reset` | Staff | Clears everyone's tracked activity |
| `/activity-user username` | Anyone | Hours and minutes tracked |
| `/myinfo` | Anyone | Rank of the verified Roblox account |
| `/verify username` | Anyone | DMs a bio code and an "I put it there" button |
| `/highest-activity` | Anyone | Player with the most tracked time |
| `/chatlogs` | Staff | Latest 100 messages as a text file |
| `/chatlogs-script` | Staff | Sends the Studio chat log script |
| `/purge amount` | Staff | Deletes up to 100 recent messages |
| `/ban user` | Staff | Bans a Discord member |
| `/kick user` | Staff | Kicks a Discord member |
| `/warn user` | Staff | Stores a warning |
| `/infractions user` | Staff | Lists warnings |
| `/unwarn user id` | Staff | Removes a warning |
| `/unban userid` | Staff | Unbans a Discord user id |
| `/mute user minutes` | Staff | Timeouts a member |
| `/unmute user` | Staff | Clears a timeout |
| `/softban user` | Staff | Bans and unbans to delete 7 days of messages |
| `/community-ban username` | Staff | Bans them from the Roblox group |
| `/community-unban username` | Staff | Removes the group ban |
| `/lockdown enabled` | Staff | Rank 100+ only can stay in the game |
| `/lockdown-script` | Staff | Studio script that enforces lockdown |

Staff means Administrator, or a role id listed in `STAFF_ROLE_IDS`.

The cookie account cannot assign Guest or Owner, and it can only change people ranked below it. Terminate uses the lowest rank above Guest.

## Railway

1. Create a Discord application, add a bot, and copy the bot token.
2. Invite it with the `bot` and `applications.commands` scopes. Enable Server Members Intent is not required.
3. Log into the Roblox account that should rank people. In the browser devtools, copy the `.ROBLOSECURITY` cookie value. That account must outrank the people the bot will change. Do not commit the cookie.
4. Push this folder to a GitHub repo, or upload it in Railway.
5. Add a volume mounted at `/data` so verification, activity, and chat logs survive restarts.
6. Generate a public domain. Set variables:

```
DISCORD_TOKEN=...
GUILD_ID=your discord server id
GROUP_ID=186309460
ROBLOX_COOKIE=the .ROBLOSECURITY value
API_SECRET=a long random string
STAFF_ROLE_IDS=role id,another role id
PUBLIC_URL=https://your-app.up.railway.app
DATA_DIR=/data
```

`GUILD_ID` registers commands instantly. Without it, global commands can take up to an hour.

7. Deploy. Open `/health` and you should see `{"ok":true}`.

## Studio

1. Run `/activity-script` and `/chatlogs-script`.
2. Put both scripts in ServerScriptService.
3. Game Settings > Security > Allow HTTP Requests.
4. Allow the Railway domain if the place uses an HTTP allowlist.
5. Join the game. Activity flushes every 20 seconds and when a player leaves. Chat posts as messages are sent. Lockdown only works after `Lockdown.server.lua` is in the game.

## Verify

`/verify YourRobloxName` DMs a code. Put that code in the Roblox profile About box and press **I put it there**. The link is saved and `/myinfo` uses it. The code can be removed afterward.
