using Inner_Tide.Models;

namespace Inner_Tide.ViewModels {
    public class QuizMenuViewModel {
        public required IReadOnlyList<QuizMenuCardViewModel> Quizzes { get; init; }
    }

    public class QuizMenuCardViewModel {
        public required Quiz Quiz { get; init; }

        public required int CategoryPercentage { get; init; }

        public required int ProgressPercentage { get; init; }

        public required int QuestionCount { get; init; }

        public required bool IsPriority { get; init; }

        public required bool IsCompleted { get; init; }
    }
}
