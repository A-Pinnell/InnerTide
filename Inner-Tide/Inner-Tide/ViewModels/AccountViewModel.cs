namespace Inner_Tide.ViewModels {
    public class AccountViewModel {
        public RegisterViewModel Register { get; set; } = new();

        public LoginViewModel Login { get; set; } = new();
    }
}
