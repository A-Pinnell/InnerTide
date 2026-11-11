namespace Inner_Tide.Services {
    public sealed record LevelReward(int Level, string Title, string Description, string? FishSpecies = null);

    public static class LevelRewardCatalog {
        public const int ObjectStoreUnlockLevel = 2;
        public const int RareFishUnlockLevel = 4;
        private static readonly IReadOnlyDictionary<string, int> FishUnlockLevels =
            new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase) {
                ["Butterfly Ray"] = RareFishUnlockLevel,
                ["Australian Prowfish"] = RareFishUnlockLevel,
                ["Gombessa"] = RareFishUnlockLevel,
                ["Pelican Eel"] = 6,
                ["Longfin Dragonfish"] = 6,
                ["Grunion"] = 6,
                ["Pacific Trout"] = 8,
                ["Hillstream Loach"] = 8,
                ["Skate"] = 8,
                ["River Stingray"] = 10,
                ["Black Neon Tetra"] = 10,
                ["Tarwhine"] = 10,
                ["Ammonite"] = 12,
                ["Longnose Chimaera"] = 12,
                ["Dab"] = 12,
                ["Blobfish"] = 14,
                ["Merluccid Hake"] = 14,
                ["Orbicular Batfish"] = 14,
                ["Sacramento Blackfish"] = 16,
                ["Man-of-War Fish"] = 16,
                ["Bank Sea Bass"] = 16,
                ["Colorado Squawfish"] = 18,
                ["Featherback"] = 18,
                ["Viperfish"] = 18,
                ["Armorhead Catfish"] = 20,
                ["Tigerperch"] = 20,
                ["Mola Mola"] = 20,
                ["Yellowtail Snapper"] = 22,
                ["Oarfish"] = 22
            };

        private static readonly IReadOnlyList<LevelReward> Rewards = Array.AsReadOnly(new[] {
            new LevelReward(
                ObjectStoreUnlockLevel,
                "Aquarium objects",
                "Browse and buy decorations in the Tank Store.")
        }.Concat(FishUnlockLevels.Select(entry =>
            new LevelReward(entry.Value, entry.Key, "A new fish is available in the Tank Store.", entry.Key)
        )).ToArray());

        public static IReadOnlyList<LevelReward> GetAllRewards() => Rewards;

        public static int? GetRequiredLevelForFish(string? species) {
            return species != null && FishUnlockLevels.TryGetValue(species.Trim(), out var requiredLevel)
                ? requiredLevel
                : null;
        }

        public static IReadOnlyList<LevelReward> GetUnlockedRewards(int previousLevel, int currentLevel) {
            return Rewards
                .Where(reward => previousLevel < reward.Level && currentLevel >= reward.Level)
                .ToArray();
        }
    }
}
