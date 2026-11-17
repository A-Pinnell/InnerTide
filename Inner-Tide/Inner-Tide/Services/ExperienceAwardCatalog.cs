using Inner_Tide.Models;

namespace Inner_Tide.Services
{
    public static class ExperienceAwardCatalog
    {
        public static int AwardExperience(User user, int experience) {
            if (experience <= 0 || user.AccountLevel >= 99) {
                return 0;
            }

            var remainingExperience = (long)user.CurrentXP + experience;
            while (user.AccountLevel < 99) {
                var requiredExperience = user.AccountLevel * 100;
                user.XPForNextLevel = requiredExperience;
                if (remainingExperience < requiredExperience) {
                    break;
                }

                remainingExperience -= requiredExperience;
                user.AccountLevel++;
            }

            user.CurrentXP = (int)Math.Min(remainingExperience, int.MaxValue);
            user.XPForNextLevel = user.AccountLevel >= 99
                ? 9900
                : user.AccountLevel * 100;
            return experience;
        }

        public static int ForTask(string timeFrame, bool priority) {
            return (timeFrame.ToLowerInvariant(), priority) switch {
                ("daily", false) => 1,
                ("weekly", false) => 3,
                ("monthly", false) => 5,
                ("daily", true) => 2,
                ("weekly", true) => 6,
                ("monthly", true) => 10,
                _ => 0
            };
        }
    }
}
