
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows;

namespace InnerTide.Desktop
{
    public partial class MainWindow : Window
    {
        private Process? serverProcess;
        private string? serverFolder;

        private const string AppUrl = "http://127.0.0.1:5001";

        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
            Closed += MainWindow_Closed;
        }

        private async void MainWindow_Loaded(
            object sender, RoutedEventArgs e)
        {
            try
            {
                // Extract the embedded server bundle.
                serverFolder = Path.Combine(
                    Environment.GetFolderPath(
                        Environment.SpecialFolder.LocalApplicationData),
                    "InnerTide",
                    "Server");

                Directory.CreateDirectory(serverFolder);

                using (Stream? resource =
                    Assembly.GetExecutingAssembly()
                        .GetManifestResourceStream(
                            "InnerTideServerBundle.zip"))
                {
                    if (resource == null)
                        throw new FileNotFoundException(
                            "The server bundle is not embedded. " +
                            "Check the desktop project's .csproj file.");

                    using var archive = new ZipArchive(
                        resource, ZipArchiveMode.Read);

                    foreach (var entry in archive.Entries)
                    {
                        string destination = Path.GetFullPath(
                            Path.Combine(serverFolder, entry.FullName));

                        string root = Path.GetFullPath(serverFolder)
                            .TrimEnd(Path.DirectorySeparatorChar)
                            + Path.DirectorySeparatorChar;

                        if (!destination.StartsWith(
                            root, StringComparison.OrdinalIgnoreCase))
                        {
                            throw new InvalidDataException(
                                "Invalid path in server bundle.");
                        }

                        if (string.IsNullOrEmpty(entry.Name))
                        {
                            Directory.CreateDirectory(destination);
                            continue;
                        }

                        Directory.CreateDirectory(
                            Path.GetDirectoryName(destination)!);

                        entry.ExtractToFile(destination, true);
                    }
                }

                string serverExe = Path.Combine(
                    serverFolder, "Inner-Tide.exe");

                if (!File.Exists(serverExe))
                    throw new FileNotFoundException(
                        "Inner-Tide.exe was not found in the bundle.",
                        serverExe);

                // Start the server without a console window.
                var startInfo = new ProcessStartInfo
                {
                    FileName = serverExe,
                    WorkingDirectory = serverFolder,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                startInfo.Environment["ASPNETCORE_URLS"] = AppUrl;
                startInfo.Environment["ASPNETCORE_ENVIRONMENT"] =
                    "Production";

                serverProcess = Process.Start(startInfo)
                    ?? throw new InvalidOperationException(
                        "Could not start the server.");

                // Wait until the server responds.
                using var http = new HttpClient
                {
                    Timeout = TimeSpan.FromSeconds(2)
                };

                bool ready = false;

                for (int i = 0; i < 60; i++)
                {
                    if (serverProcess.HasExited)
                    {
                        throw new InvalidOperationException(
                            "The server stopped during startup. " +
                            "Check the database connection and configuration.");
                    }

                    try
                    {
                        using var response = await http.GetAsync(AppUrl);
                        ready = true;
                        break;
                    }
                    catch (HttpRequestException) { }
                    catch (TaskCanceledException) { }

                    await Task.Delay(500);
                }

                if (!ready)
                    throw new TimeoutException(
                        "The server did not respond at " + AppUrl);

                await webView.EnsureCoreWebView2Async();
                webView.CoreWebView2.Navigate(AppUrl);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    ex.ToString(),
                    "Inner Tide startup error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private void MainWindow_Closed(object? sender, EventArgs e)
        {
            if (serverProcess is { HasExited: false })
                serverProcess.Kill(entireProcessTree: true);

            serverProcess?.Dispose();
        }
    }
}
