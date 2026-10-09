--[[
  Activity tracker for the Discord group bot.
  Place this Script in ServerScriptService.
  Game Settings > Security > Allow HTTP Requests = On.
  Allow the bot domain under HTTP requests if Roblox asks.
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local API_URL = "{{API_URL}}"
local API_SECRET = "{{API_SECRET}}"
local FLUSH_SECONDS = 60

local joinedAt = {}

local function post(body)
	local ok, result = pcall(function()
		return HttpService:RequestAsync({
			Url = API_URL .. "/api/activity",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
				["x-api-secret"] = API_SECRET,
			},
			Body = HttpService:JSONEncode(body),
		})
	end)
	if not ok then
		warn("[Activity] request failed: " .. tostring(result))
		return false
	end
	if not result.Success then
		warn("[Activity] API " .. tostring(result.StatusCode) .. " " .. tostring(result.Body))
		return false
	end
	return true
end

local function flush(player, resetClock)
	local start = joinedAt[player.UserId]
	if not start then
		return
	end
	local seconds = os.time() - start
	if seconds < 1 then
		return
	end
	local sent = post({
		updates = {
			{
				userId = player.UserId,
				username = player.Name,
				seconds = seconds,
				placeId = game.PlaceId,
			},
		},
	})
	if sent and resetClock then
		joinedAt[player.UserId] = os.time()
	end
end

local function track(player)
	joinedAt[player.UserId] = os.time()
end

Players.PlayerAdded:Connect(track)
Players.PlayerRemoving:Connect(function(player)
	flush(player, false)
	joinedAt[player.UserId] = nil
end)

for _, player in ipairs(Players:GetPlayers()) do
	track(player)
end

task.spawn(function()
	while true do
		task.wait(FLUSH_SECONDS)
		for _, player in ipairs(Players:GetPlayers()) do
			flush(player, true)
		end
	end
end)
