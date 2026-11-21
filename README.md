<div align="center">

# NetQuit — Universal Multi-Vendor Network Automation

**By Alt+F4 · *"Acabou, Quitou!"***

[🇧🇷 Português](#-português) · [🇺🇸 English](#-english)

</div>

---

## 🇧🇷 Português

O **NetQuit** é uma suíte nativa e ultraleve de automação e monitoramento de redes escrita em **Rust + Tauri v2**, com interface gráfica moderna (troca de temas e fontes em 0ms sem piscar) e versão **CLI (Terminal)** no mesmo projeto — com **versão Produção** e **versão Teste (Simulador)** separadas e 100% idênticas.

### Principais Recursos
* **Motor Universal Multi-Vendor (Auto-Detecção + Tradução):** identifica a marca do equipamento via SSH e traduz a mesma ação visual para a sintaxe nativa de:
  * **Cisco IOS / IOS-XE** · **MikroTik RouterOS** · **Huawei VRP** · **Juniper Junos** · **ArubaOS-CX / HPE** · **TP-Link JetStream / Omada**
* **Binários Separados com 100% de Paridade:**
  * `netquit-gui` — **Produção (Real):** login local no app, **Buscar Dispositivos** (varredura ARP real `ip neigh` / `arp -a`), apelidos persistentes e conexão **SSHv2 real sob demanda**.
  * `netquit-gui-teste` — **Teste (Simulador Offline):** mesma interface e funcionalidades com simulador multi-vendor completo e perfis rápidos RBAC.
  * `netquit-cli` — **Terminal (CLI):** ~1,3 MB, zero dependência gráfica (`--teste` ou `--host <IP>`).
* **Atribuição Multi-VLAN via Listbox (`☐ / ☑`):** selecione 1 ou múltiplas VLANs por clique simples em **Portas** (Access / Trunk 802.1Q / Dot1Q), **Redes Wi-Fi** (`vlan group` / subinterfaces) e **Access Points** (com trava *somente visualização* quando offline).
* **Wi-Fi & Antenas RF:** submenu dedicado para **Redes Sem Fio (SSIDs)** e **Antenas & Canais RF** (2.4/5 GHz, canal, largura 20/40/80 MHz e potência).
* **Console Direto (CLI):** envio direto de comandos de leitura (`show ...`) ou blocos de configuração (`configure terminal`, Nv. 15).
* **Roteamento com "Ensinar Vizinhos":** rotas estáticas com propagação automática via OSPF, RIP, EIGRP ou BGP.
* **Alertas, Backup & Identidade:** histórico persistente em JSON (`lido` / `resolvido`), alertas de visitantes/RBAC, Backup & Rollback, renomear equipamento (*Hostname*, *Domínio*, *Banner*) e usuários separados (**App vs Equipamento**) com importação em 1 clique.
* **Acessibilidade & Temas em 0ms:** 4 temas (*Escuro*, *Claro*, *Alto Contraste*, *Daltônico Okabe-Ito*) e slider segmentado de fontes (`-2 pt` a `+4 pt`).

### Dependências por Sistema Operacional
| Sistema | Usuário Final (Executável Pronto) | Desenvolvedor (Compilar do Código-Fonte) |
| :--- | :--- | :--- |
| **Windows 10 / 11** | **Nada a instalar** (WebView2 já vem nativo no Windows) | Rust ([rustup.rs](https://rustup.rs)) + Visual Studio Build Tools (C++) |
| **Linux (Zorin / Ubuntu / Debian)** | `libgtk-3-0` e `libwebkit2gtk-4.1-0` (já vêm na maioria das distros; CLI não precisa de nada) | `sudo apt install -y build-essential curl git pkg-config libssl-dev libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev` + Rust |

> **Node.js não é necessário!** O frontend usa HTML5 + CSS3 + ES2022 puros. Veja detalhes completos em [`REQUIREMENTS.md`](./REQUIREMENTS.md).

### Instalação e Uso
```bash
# Compilar todos os binários (Produção, Teste e CLI)
cargo build --release --workspace

# Executar no Linux (ou 2 cliques nos .exe no Windows)
./target/release/netquit-gui          # Produção (Real)
./target/release/netquit-gui-teste    # Teste (Simulador Offline)
./target/release/netquit-cli --teste  # Terminal (CLI)
```

### Credenciais Padrão (RBAC)
| Usuário | Senha | Privilégio | Perfil |
| :--- | :--- | :---: | :--- |
| `admin` | `admin123` | **15** | Administrador Total |
| `operador` | `operador123` | **7** | Operador L2 (Portas e VLANs) |
| `visitante_recepcao` | `visita123` | **1** | Visitante (Somente Leitura + Alertas RBAC) |

---

## 🇺🇸 English

**NetQuit** is a lightweight, native multi-vendor network automation and monitoring suite built with **Rust + Tauri v2**, featuring a modern desktop UI (0ms flicker-free theme and font switching) alongside an ultra-lightweight **CLI** — shipping separate **Production** and **Test/Simulator** binaries with 100% feature parity.

### Key Features
* **Universal Multi-Vendor Engine (Auto-Fingerprinting + CLI Translation):** automatically identifies the device vendor over SSH and translates visual actions into native syntax for:
  * **Cisco IOS / IOS-XE** · **MikroTik RouterOS** · **Huawei VRP** · **Juniper Junos** · **ArubaOS-CX / HPE** · **TP-Link JetStream / Omada**
* **Separate Binaries with 100% Parity:**
  * `netquit-gui` — **Production (Real):** local app login, **Device Discovery** (real LAN ARP scan via `ip neigh` / `arp -a`), persistent device aliases, and on-demand **SSHv2** connections.
  * `netquit-gui-teste` — **Test (Offline Simulator):** identical UI and features backed by a full multi-vendor simulator and quick RBAC profiles.
  * `netquit-cli` — **Terminal (CLI):** ~1.3 MB, zero GUI dependencies (`--teste` or `--host <IP>`).
* **Interactive Multi-VLAN Listbox (`☐ / ☑`):** single-click multi-selection of VLANs across **Ports** (Access / 802.1Q Trunk / Dot1Q), **Wi-Fi SSIDs** (`vlan group` / subinterfaces), and **Access Points** (with automatic read-only lock when offline).
* **Wi-Fi & RF Antennas:** dedicated sidebar submenu for **Wireless Networks (SSIDs)** and **RF Antennas & Channels** (2.4/5 GHz, channel, 20/40/80 MHz width, and TX power).
* **Direct CLI Console:** send read commands (`show ...`) or configuration blocks (`configure terminal`, level 15) directly to the device.
* **Routing with Dynamic Redistribution:** static routes with automatic propagation to neighbors via OSPF, RIP, EIGRP, or BGP.
* **Alerts, Backup & Identity:** persistent JSON alert history (`read` / `resolved`), visitor/RBAC alerts, Backup & Rollback, device identity (*Hostname*, *Domain*, *MOTD Banner*), and separated **App vs Device** accounts with 1-click import.
* **Accessibility & 0ms Themes:** 4 instant themes (*Dark*, *Light*, *High Contrast*, *Okabe-Ito Colorblind*) and discrete segmented font scaling (`-2 pt` to `+4 pt`).

### System Requirements
| OS | End Users (Pre-built Binary) | Developers (Build from Source) |
| :--- | :--- | :--- |
| **Windows 10 / 11** | **Nothing to install** (WebView2 is built into Windows) | Rust ([rustup.rs](https://rustup.rs)) + Visual Studio Build Tools (C++) |
| **Linux (Zorin / Ubuntu / Debian)** | `libgtk-3-0` & `libwebkit2gtk-4.1-0` (pre-installed on most desktop distros; CLI needs nothing) | `sudo apt install -y build-essential curl git pkg-config libssl-dev libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev` + Rust |

> **No Node.js required!** The frontend is pure HTML5 + CSS3 + ES2022. See [`REQUIREMENTS.md`](./REQUIREMENTS.md) for full details.

### Build & Run
```bash
# Build all release binaries (Production GUI, Test GUI, and CLI)
cargo build --release --workspace

# Run on Linux (or double-click the .exe files on Windows)
./target/release/netquit-gui          # Production (Real)
./target/release/netquit-gui-teste    # Test (Offline Simulator)
./target/release/netquit-cli --teste  # Terminal (CLI)
```

### Default Credentials (RBAC)
| Username | Password | Privilege | Role |
| :--- | :--- | :---: | :--- |
| `admin` | `admin123` | **15** | Full Administrator |
| `operador` | `operador123` | **7** | L2 Operator (Ports & VLANs) |
| `visitante_recepcao` | `visita123` | **1** | Guest (Read-Only + RBAC Alerts) |

---

## Project Structure
```text
NetQuit/
├── core/                  # Rust Core (SSHv2, Simulator, Multi-Vendor Translator, JSON Alerts)
├── app-cli/               # Lightweight Terminal CLI
├── app-tauri/             # Tauri v2 Desktop App (Production + Test binaries)
│   ├── src-tauri/         # Rust Backend + IPC + OS ARP Scanner
│   └── ui/                # Modern UI (Pure HTML5 + CSS3 + ES2022, zero Node.js)
├── .github/workflows/     # Automated CI builds (Windows .exe + Linux binaries)
├── Cargo.toml             # Cargo Workspace & Rust dependencies
├── REQUIREMENTS.md        # OS-specific dependencies (Windows & Linux)
└── .gitignore
```
