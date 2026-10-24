
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace InnerTide.Desktop
{
    public sealed class ServerManager : IDisposable
    {
        private Process? serverProcess;
        private readonly HttpClient http = new()
        {
            Timeout = TimeSpan.FromSeconds(2)
        };

        public const string Url = "http://127.0.0.1:5000";

        public async Task StartAsync(string serverExe)
        {
            if (!File.Exists(serverExe))
                throw new FileNotFoundException(
                    "The Inner Tide server executable was not found.",
                    serverExe);

            serverProcess = Process.Start(new ProcessStartInfo
            {
                FileName = serverExe,
                WorkingDirectory = Path.GetDirectoryName(serverExe)!,
                UseShellExecute = false,
                CreateNoWindow = true,
                Environment =
                {
                    ["ASPNETCORE_URLS"] = Url,
                    ["ASPNETCORE_ENVIRONMENT"] = "Production"
                }
            }) ?? throw new InvalidOperationException(
                "Could not start the Inner Tide server.");

            for (int i = 0; i < 60; i++)
            {
                if (serverProcess.HasExited)
                    throw new InvalidOperationException(
                        "The Inner Tide server stopped unexpectedly.");

                try
                {
                    using var response = await http.GetAsync(Url);
                    return;
                }
                catch (HttpRequestException) { }
                catch (TaskCanceledException) { }

                await Task.Delay(500);
            }

            throw new TimeoutException(
                "Inner Tide did not start within 30 seconds.");
        }

        public void Dispose()
        {
            http.Dispose();

            if (serverProcess is { HasExited: false })
                serverProcess.Kill(entireProcessTree: true);

            serverProcess?.Dispose();
        }
    }
}
