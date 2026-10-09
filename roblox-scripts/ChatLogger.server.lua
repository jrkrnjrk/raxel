--[[
  Chat logger for the Discord group bot.
  Place this Script in ServerScriptService.
  Game Settings > Security > Allow HTTP Requests = On.
  Allow the bot domain under HTTP requests if Roblox asks.
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local TextChatService = game:GetService("TextChatService")

local API_URL = "{{API_URL}}"
local API_SECRET = "{{API_SECRET}}"

local function post(body)
	task.spawn(function()
		local ok, result = pcall(function()
			return HttpService:RequestAsync({
				Url = API_URL .. "/api/chatlogs",
				Method = "POST",
				Headers = {
					["Content-Type"] = "application/json",
					["x-api-secret"] = API_SECRET,
				},
				Body = HttpService:JSONEncode(body),
			})
		end)
		if not ok then
			warn("[ChatLogs] " .. tostring(result))
		elseif not result.Success then
			warn("[ChatLogs] API " .. tostring(result.StatusCode) .. " " .. tostring(result.Body))
		end
	end)
end

local function logMessage(userId, username, message)
	if type(message) ~= "string" or message == "" then
		return
	end
	post({
		userId = userId,
		username = username,
		message = string.sub(message, 1, 500),
		placeId = game.PlaceId,
		time = os.time(),
	})
end

local function hookLegacy(player)
	player.Chatted:Connect(function(message)
		logMessage(player.UserId, player.Name, message)
	end)
end

if TextChatService.ChatVersion == Enum.ChatVersion.TextChatService then
	TextChatService.MessageReceived:Connect(function(textChatMessage)
		local source = textChatMessage.TextSource
		if not source then
			return
		end
		local player = Players:GetPlayerByUserId(source.UserId)
		logMessage(source.UserId, player and player.Name or "Unknown", textChatMessage.Text)
	end)
else
	Players.PlayerAdded:Connect(hookLegacy)
	for _, player in ipairs(Players:GetPlayers()) do
		hookLegacy(player)
	end
end
