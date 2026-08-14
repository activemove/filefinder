using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Windows.Forms;

internal sealed class FileFinderLauncher : ApplicationContext
{
    private readonly NotifyIcon tray;
    private readonly Form splash;
    private readonly Timer watcher;
    private Process core;
    private Process ai;
    private readonly string baseDir;
    private readonly string corePath;

    public FileFinderLauncher()
    {
        baseDir = AppDomain.CurrentDomain.BaseDirectory;
        corePath = Path.Combine(baseDir, "FileFinder-core.exe");
        tray = new NotifyIcon();
        tray.Icon = SystemIcons.Application;
        tray.Text = "FileFinder - www.damc.it";
        tray.Visible = true;
        tray.DoubleClick += delegate { OpenFileFinder(); };
        tray.ContextMenuStrip = BuildMenu();
        StartLocalAi();

        splash = BuildSplash();
        watcher = new Timer();
        watcher.Interval = 180;
        watcher.Tick += WatchCore;
        splash.Shown += delegate {
            splash.BeginInvoke(new Action(delegate {
                OpenFileFinder();
                watcher.Start();
            }));
        };
        splash.Show();
    }

    private ContextMenuStrip BuildMenu()
    {
        ContextMenuStrip menu = new ContextMenuStrip();
        menu.Items.Add("Apri FileFinder", null, delegate { OpenFileFinder(); });
        menu.Items.Add("Apri cartella programma", null, delegate { Process.Start("explorer.exe", baseDir); });
        menu.Items.Add("App installate Windows", null, delegate { Process.Start("ms-settings:appsfeatures"); });
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Crediti - www.damc.it", null, delegate { Process.Start("https://www.damc.it"); });
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Chiudi tutto", null, delegate { CloseEverything(); });
        return menu;
    }

    private void StartLocalAi()
    {
        string server = Path.Combine(baseDir, "ai", "llama-server.exe");
        string model = Path.Combine(baseDir, "ai", "qwen2.5-1.5b-instruct-q4_k_m.gguf");
        if (!File.Exists(server) || !File.Exists(model)) return;
        if (Process.GetProcessesByName("llama-server").Any()) return;
        ProcessStartInfo info = new ProcessStartInfo(server, "-m \"" + model + "\" --host 127.0.0.1 --port 11435 -c 4096 -ngl 0 --no-webui");
        info.WorkingDirectory = Path.Combine(baseDir, "ai");
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        info.WindowStyle = ProcessWindowStyle.Hidden;
        ai = Process.Start(info);
    }

    private Form BuildSplash()
    {
        Form form = new Form();
        form.FormBorderStyle = FormBorderStyle.None;
        form.StartPosition = FormStartPosition.Manual;
        form.Bounds = Screen.PrimaryScreen.Bounds;
        form.BackColor = Color.FromArgb(10, 14, 18);
        form.Opacity = 0.94;
        form.ShowInTaskbar = false;
        form.TopMost = true;

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Dock = DockStyle.Fill;
        layout.ColumnCount = 1;
        layout.RowCount = 4;
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 190));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 86));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 50));

        PictureBox logo = new PictureBox();
        logo.Size = new Size(180, 180);
        logo.Anchor = AnchorStyles.None;
        logo.SizeMode = PictureBoxSizeMode.Zoom;
        string logoPath = Path.Combine(baseDir, "filefinder-logo.png");
        if (File.Exists(logoPath)) logo.Image = Image.FromFile(logoPath);

        Label title = new Label();
        title.Text = "FileFinder\nPreparazione del filesystem...";
        title.ForeColor = Color.White;
        title.Font = new Font("Segoe UI", 16, FontStyle.Regular);
        title.TextAlign = ContentAlignment.MiddleCenter;
        title.Dock = DockStyle.Fill;
        title.AutoSize = false;
        title.Padding = new Padding(12, 4, 12, 8);

        layout.Controls.Add(new Panel(), 0, 0);
        layout.Controls.Add(logo, 0, 1);
        layout.Controls.Add(title, 0, 2);
        form.Controls.Add(layout);
        return form;
    }

    private void OpenFileFinder()
    {
        Process window = FindCoreWindow();
        if (window != null) {
            Native.ShowWindow(window.MainWindowHandle, 9);
            Native.SetForegroundWindow(window.MainWindowHandle);
            return;
        }
        Process running = Process.GetProcessesByName("FileFinder-core").FirstOrDefault();
        if (running != null) { core = running; watcher.Start(); return; }
        if (!File.Exists(corePath)) {
            splash.Hide();
            MessageBox.Show("FileFinder-core.exe non trovato accanto al launcher.", "FileFinder", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }
        ProcessStartInfo info = new ProcessStartInfo(corePath);
        info.WorkingDirectory = baseDir;
        info.UseShellExecute = false;
        info.EnvironmentVariables["FILEFINDER_LAUNCHED"] = "1";
        info.EnvironmentVariables["FILEFINDER_HOME"] = baseDir;
        core = Process.Start(info);
    }

    private void WatchCore(object sender, EventArgs e)
    {
        Process visible = FindCoreWindow();
        if (visible != null) {
            splash.Hide();
            watcher.Stop();
        }
    }

    private Process FindCoreWindow()
    {
        return Process.GetProcessesByName("FileFinder").FirstOrDefault(p => p.Id != Process.GetCurrentProcess().Id && p.MainWindowHandle != IntPtr.Zero);
    }

    private void CloseEverything()
    {
        foreach (Process process in Process.GetProcessesByName("FileFinder-core")) {
            try { Process.Start(new ProcessStartInfo("taskkill", "/PID " + process.Id + " /T /F") { CreateNoWindow = true, UseShellExecute = false }).WaitForExit(3000); } catch { }
        }
        foreach (Process process in Process.GetProcessesByName("llama-server")) {
            try { process.Kill(); } catch { }
        }
        tray.Visible = false;
        tray.Dispose();
        splash.Close();
        ExitThread();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) { watcher.Dispose(); tray.Dispose(); splash.Dispose(); }
        base.Dispose(disposing);
    }

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new FileFinderLauncher());
    }

    private static class Native
    {
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        internal static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        internal static extern bool SetForegroundWindow(IntPtr hWnd);
    }
}
