namespace Inner_Tide.Services {
    public sealed record LevelReward(int Level, string Title, string Description, string? FishSpecies = null);

    public static class LevelRewardCatalog {
        public const int ObjectStoreUnlockLevel = 5;
        public const int RareFishUnlockLevel = 6;
        private static readonly IReadOnlyDictionary<string, int> FishUnlockLevels =
            new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase) {
                ["Pink Salmon"] = 2,
                ["Butterfly Ray"] = RareFishUnlockLevel,
                ["Australian Prowfish"] = RareFishUnlockLevel,
                ["Gombessa"] = RareFishUnlockLevel,
                ["Pelican Eel"] = 8,
                ["Longfin Dragonfish"] = 8,
                ["Grunion"] = 8,
                ["Pacific Trout"] = 10,
                ["Hillstream Loach"] = 10,
                ["Skate"] = 10,
                ["River Stingray"] = 12,
                ["Black Neon Tetra"] = 12,
                ["Tarwhine"] = 12,
                ["Ammonite"] = 14,
                ["Longnose Chimaera"] = 14,
                ["Dab"] = 14,
                ["Blobfish"] = 16,
                ["Merluccid Hake"] = 16,
                ["Orbicular Batfish"] = 16,
                ["Sacramento Blackfish"] = 18,
                ["Man-of-War Fish"] = 18,
                ["Bank Sea Bass"] = 18,
                ["Colorado Squawfish"] = 20,
                ["Featherback"] = 20,
                ["Viperfish"] = 20,
                ["Armorhead Catfish"] = 22,
                ["Tigerperch"] = 22,
                ["Mola Mola"] = 22,
                ["Yellowtail Snapper"] = 24,
                ["Oarfish"] = 24
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
