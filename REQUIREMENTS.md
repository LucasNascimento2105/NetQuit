# System Requirements — NetQuit (Rust + Tauri v2)

## 1. End Users (Pre-built Binaries)

### Windows 10 / 11
- **No extra installation required:** Microsoft Edge WebView2 is pre-installed on Windows 10 (updated) and Windows 11. Just double-click `netquit-gui.exe` or `netquit-gui-teste.exe` (or run `netquit-cli.exe`).
- *Legacy Windows 7 / 8:* install the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### Linux (Zorin OS, Ubuntu, Debian, Linux Mint, Fedora)
- **CLI (`netquit-cli`):** zero external dependencies.
- **GUI (`netquit-gui` / `netquit-gui-teste`):** relies on GTK3 and WebKitGTK (pre-installed on most desktop distributions). If missing on minimal distros:
  ```bash
  sudo apt install -y libgtk-3-0 libwebkit2gtk-4.1-0
  ```

---

## 2. Developers (Build from Source)

### Linux (Ubuntu / Zorin OS / Debian)
```bash
# 1. System libraries (GTK3, WebKitGTK, OpenSSL, C toolchain)
sudo apt update
sudo apt install -y build-essential curl git pkg-config libssl-dev \
  libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev

# 2. Rust toolchain (rustc + cargo)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### Linux (Fedora / RHEL)
```bash
sudo dnf install -y gcc pkg-config openssl-devel gtk3-devel webkit2gtk4.1-devel librsvg2-devel
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Windows 10 / 11
1. Install **Visual Studio Build Tools** (*Desktop development with C++* workload).
2. Install **Rust (`rustup-init.exe`)** from [rustup.rs](https://rustup.rs).
3. **Node.js is NOT required** (the UI uses pure HTML5 + CSS3 + ES2022 with zero bundler).

### Rust Crates (automatically fetched by `Cargo.toml`)
- `tauri` v2 — Lightweight native desktop shell
- `ssh2` v0.9 — Real multi-vendor SSHv2 client
- `serde` / `serde_json` — JSON persistence (alerts, device aliases, app settings)
- `clap` v4 — CLI argument parser & accessibility flags
- `chrono` / `uuid` — Timestamps and unique IDs for alerts and backups
