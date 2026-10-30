namespace Inner_Tide.ViewModels {
    public class SetupQuizResultsViewModel {
        public required IReadOnlyList<SetupQuizCategoryProgress> Categories { get; init; }

        public required string StrongestCategory { get; init; }

        public required string FocusCategory { get; init; }
    }

    public class SetupQuizCategoryProgress {
        public required string Name { get; init; }

        public required int Percentage { get; init; }
    }
}
