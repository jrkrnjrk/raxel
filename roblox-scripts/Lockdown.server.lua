--[[
  Lockdown gate for the Discord group bot.
  Place this Script in ServerScriptService.
  While lockdown is on, only group rank {{MIN_RANK}} or higher can stay.
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local API_URL = "{{API_URL}}"
local API_SECRET = "{{API_SECRET}}"
local GROUP_ID = {{GROUP_ID}}
local FALLBACK_MIN_RANK = {{MIN_RANK}}

local locked = false
local minRank = FALLBACK_MIN_RANK

local function refresh()
	local ok, result = pcall(function()
		return HttpService:RequestAsync({
			Url = API_URL .. "/api/lockdown",
			Method = "GET",
			Headers = {
				["x-api-secret"] = API_SECRET,
			},
		})
	end)
	if not ok or not result.Success then
		warn("[Lockdown] could not reach the bot")
		return
	end
	local decoded = HttpService:JSONDecode(result.Body)
	locked = decoded.locked == true
	minRank = tonumber(decoded.minRank) or FALLBACK_MIN_RANK
end

local function allowed(player)
	if not locked then
		return true
	end
	local ok, rank = pcall(function()
		return player:GetRankInGroup(GROUP_ID)
	end)
	return ok and rank >= minRank
end

local function enforce(player)
	if allowed(player) then
		return
	end
	player:Kick("This game is locked. Rank " .. minRank .. "+ in the group is required.")
end

task.spawn(function()
	while true do
		refresh()
		if locked then
			for _, player in ipairs(Players:GetPlayers()) do
				enforce(player)
			end
		end
		task.wait(15)
	end
end)

Players.PlayerAdded:Connect(function(player)
	task.defer(function()
		enforce(player)
	end)
end)
