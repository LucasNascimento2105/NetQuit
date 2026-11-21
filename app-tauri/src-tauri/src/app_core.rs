use chrono::Local;
use netcontrol_core::simulator::SimuladorCiscoIOS;
use netcontrol_core::ssh_real::SessaoSSHReal;
use netcontrol_core::vendors::{
    detectar_fabricante, traduzir_acao_incidente, traduzir_ap, traduzir_porta, traduzir_rota,
    traduzir_wifi, Fabricante,
};
use netcontrol_core::{
    AccessPointInfo, AlertaItem, ConfigApp, DispositivoRadar, GerenciadorAlertas, PortaInfo,
    RotaInfo, SessaoCisco, UsuarioConta, VlanInfo, WifiRede,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize, Clone)]
pub struct BackupItem {
    pub arquivo: String,
    pub data_hora: String,
    pub tamanho_bytes: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CanalRfInfo {
    pub radio: String,
    pub banda: String,
    pub canal: String,
    pub largura: String,
    pub potencia: String,
    pub arquitetura: String,
}

struct AppState {
    modo_teste_fixo: bool,
    sim: Mutex<SimuladorCiscoIOS>,
    sessao_real: Mutex<Option<SessaoSSHReal>>,
    ip_conectado: Mutex<String>,
    fabricante: Mutex<Fabricante>,
    dominio: Mutex<String>,
    banner: Mutex<String>,
    canais_rf: Mutex<Vec<CanalRfInfo>>,
    alertas: GerenciadorAlertas,
    usuarios_app: Mutex<Vec<UsuarioConta>>,
    config: Mutex<ConfigApp>,
    operador_ativo: Mutex<(String, u8)>,
    pasta_dados: PathBuf,
}

impl AppState {
    fn executar_config(&self, cmds: &[String]) -> Result<String, String> {
        let mut real_guard = self.sessao_real.lock().unwrap();
        if let Some(ref mut ssh) = *real_guard {
            let out = ssh.send_config_set(cmds)?;
            let fab = self.fabricante.lock().unwrap().clone();
            let _ = ssh.send_command(fab.comando_salvar());
            return Ok(out);
        }
        if !self.modo_teste_fixo {
            return Err("Nenhum equipamento conectado via SSH. Va em 'Radar & ARP' e clique em 'Conectar SSH' no dispositivo desejado.".into());
        }
        let mut sim = self.sim.lock().unwrap();
        sim.send_config_set(cmds)
    }

    fn executar_leitura(&self, cmd: &str) -> Result<String, String> {
        let mut real_guard = self.sessao_real.lock().unwrap();
        if let Some(ref mut ssh) = *real_guard {
            return ssh.send_command(cmd);
        }
        if !self.modo_teste_fixo {
            return Err("Nenhum equipamento conectado via SSH. Conecte primeiro pela tabela ARP em 'Radar & Tráfego'.".into());
        }
        let mut sim = self.sim.lock().unwrap();
        sim.send_command(cmd)
    }

    fn pasta_backups(&self) -> PathBuf {
        let dir = PathBuf::from(if self.modo_teste_fixo { "backups_teste" } else { "backups" });
        let _ = fs::create_dir_all(&dir);
        dir
    }

    fn carregar_apelidos(&self) -> HashMap<String, String> {
        let p = self.pasta_dados.join("apelidos_rede.json");
        fs::read_to_string(p)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    fn salvar_apelidos(&self, mapa: &HashMap<String, String>) {
        let p = self.pasta_dados.join("apelidos_rede.json");
        if let Ok(json) = serde_json::to_string_pretty(mapa) {
            let _ = fs::write(p, json);
        }
    }
}

#[derive(Serialize)]
struct EstadoCompleto {
    hostname: String,
    dominio: String,
    banner: String,
    ip_conectado: String,
    conectado_ssh: bool,
    fabricante: Fabricante,
    modo_teste: bool,
    operador: String,
    privilegio: u8,
    portas: Vec<PortaInfo>,
    vlans: Vec<VlanInfo>,
    redes_wifi: Vec<WifiRede>,
    canais_rf: Vec<CanalRfInfo>,
    aps: Vec<AccessPointInfo>,
    rotas: Vec<RotaInfo>,
    dispositivos: Vec<DispositivoRadar>,
    alertas: Vec<AlertaItem>,
    usuarios_app: Vec<UsuarioConta>,
    usuarios_roteador: Vec<UsuarioConta>,
    backups: Vec<BackupItem>,
    config: ConfigApp,
}

#[derive(Deserialize)]
struct PayloadLoginApp {
    usuario: String,
    senha: String,
}

#[derive(Serialize)]
struct RespostaLoginApp {
    ok: bool,
    mensagem: String,
    operador: String,
    privilegio: u8,
    modo_teste: bool,
}

#[derive(Deserialize)]
struct PayloadConectarSsh {
    ip: String,
    porta_ssh: u16,
    usuario: String,
    senha: String,
}

#[derive(Serialize)]
struct RespostaSsh {
    ok: bool,
    mensagem: String,
    fabricante: Fabricante,
    hostname: String,
    ip: String,
}

#[derive(Deserialize)]
struct PayloadPorta {
    nome: String,
    ligada: bool,
    ip: String,
    mask: String,
    descricao: String,
    vlans: Vec<String>,
    modo_especial: String,
    eh_switch: bool,
}

fn listar_backups_dir(dir: &Path) -> Vec<BackupItem> {
    let mut itens = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for e in entries.flatten() {
            let p = e.path();
            if p.extension().and_then(|s| s.to_str()) == Some("cfg") {
                let meta = e.metadata().ok();
                itens.push(BackupItem {
                    arquivo: e.file_name().to_string_lossy().to_string(),
                    data_hora: Local::now().format("%Y-%m-%d %H:%M").to_string(),
                    tamanho_bytes: meta.map(|m| m.len()).unwrap_or(0),
                });
            }
        }
    }
    itens.sort_by(|a, b| b.arquivo.cmp(&a.arquivo));
    itens
}

/// Le a tabela ARP real do sistema operacional (Linux `ip neigh` ou Windows `arp -a`).
fn ler_arp_sistema(apelidos: &HashMap<String, String>) -> Vec<DispositivoRadar> {
    let mut lista = Vec::new();
    #[cfg(target_os = "linux")]
    let saida = Command::new("ip").args(["neigh", "show"]).output().ok();
    #[cfg(target_os = "windows")]
    let saida = Command::new("arp").args(["-a"]).output().ok();
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    let saida: Option<std::process::Output> = None;

    if let Some(out) = saida {
        let txt = String::from_utf8_lossy(&out.stdout);
        for line in txt.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            #[cfg(target_os = "linux")]
            {
                // Format: 192.168.1.1 dev eth0 lladdr aa:bb:cc:dd:ee:ff REACHABLE
                if parts.len() >= 5 && parts[0].contains('.') {
                    let ip = parts[0].to_string();
                    let iface = parts.get(2).cloned().unwrap_or("lan").to_string();
                    if let Some(pos_ll) = parts.iter().position(|&p| p == "lladdr") {
                        if let Some(mac_raw) = parts.get(pos_ll + 1) {
                            let mac = mac_raw.to_uppercase();
                            let nome = apelidos
                                .get(&mac)
                                .cloned()
                                .unwrap_or_else(|| format!("Host-{}", ip));
                            lista.push(DispositivoRadar {
                                ip,
                                mac,
                                hostname: nome,
                                interface: iface,
                                download_mbps: 0.0,
                                upload_mbps: 0.0,
                                volume_acumulado_mb: 0.0,
                                novo: false,
                            });
                        }
                    }
                }
            }
            #[cfg(target_os = "windows")]
            {
                if parts.len() >= 3 && parts[0].contains('.') && (parts[1].contains('-') || parts[1].contains(':')) {
                    let ip = parts[0].to_string();
                    let mac = parts[1].replace('-', ":").to_uppercase();
                    let nome = apelidos
                        .get(&mac)
                        .cloned()
                        .unwrap_or_else(|| format!("Host-{}", ip));
                    lista.push(DispositivoRadar {
                        ip,
                        mac,
                        hostname: nome,
                        interface: "LAN".into(),
                        download_mbps: 0.0,
                        upload_mbps: 0.0,
                        volume_acumulado_mb: 0.0,
                        novo: false,
                    });
                }
            }
        }
    }
    lista
}

#[tauri::command]
fn autenticar_app(state: State<'_, AppState>, payload: PayloadLoginApp) -> RespostaLoginApp {
    let user = payload.usuario.trim().to_string();
    let pass = payload.senha.trim().to_string();
    let u_app = state.usuarios_app.lock().unwrap();
    let conta = u_app.iter().find(|u| u.username == user && u.senha == pass).cloned();
    drop(u_app);

    let conta = match conta {
        Some(c) => c,
        None => {
            return RespostaLoginApp {
                ok: false,
                mensagem: "Usuário ou senha inválidos no NetQuit (padrão: admin / admin123).".into(),
                operador: String::new(),
                privilegio: 0,
                modo_teste: state.modo_teste_fixo,
            };
        }
    };

    *state.operador_ativo.lock().unwrap() = (conta.username.clone(), conta.privilegio);
    if conta.privilegio <= 1 {
        state.alertas.registrar(
            "aviso",
            "Seguranca RBAC",
            &format!("Atividade de Visitante: {}", conta.username),
            "Login efetuado com perfil Visitante (somente leitura).",
            "rbac",
            Some(&format!("visitante_login|{}", conta.username)),
        );
    }

    RespostaLoginApp {
        ok: true,
        mensagem: format!(
            "Bem-vindo ao NetQuit ({}) como {} (Nv. {})",
            if state.modo_teste_fixo { "Versão Teste" } else { "Versão Produção" },
            conta.username,
            conta.privilegio
        ),
        operador: conta.username,
        privilegio: conta.privilegio,
        modo_teste: state.modo_teste_fixo,
    }
}

#[tauri::command]
fn escanear_arp_rede(state: State<'_, AppState>) -> Vec<DispositivoRadar> {
    let apelidos = state.carregar_apelidos();
    if state.modo_teste_fixo {
        let mut sim = state.sim.lock().unwrap();
        for d in &mut sim.dispositivos {
            if let Some(ap) = apelidos.get(&d.mac.to_uppercase()) {
                d.hostname = ap.clone();
            }
        }
        return sim.dispositivos.clone();
    }
    ler_arp_sistema(&apelidos)
}

#[tauri::command]
fn apelidar_dispositivo(state: State<'_, AppState>, mac: String, apelido: String) -> Result<String, String> {
    let mac_up = mac.trim().to_uppercase();
    let nome = apelido.trim().to_string();
    if mac_up.is_empty() || nome.is_empty() {
        return Err("Informe o MAC e o nome/apelido do dispositivo.".into());
    }
    let mut mapa = state.carregar_apelidos();
    mapa.insert(mac_up.clone(), nome.clone());
    state.salvar_apelidos(&mapa);

    let mut sim = state.sim.lock().unwrap();
    for d in &mut sim.dispositivos {
        if d.mac.to_uppercase() == mac_up {
            d.hostname = nome.clone();
        }
    }
    Ok(format!("Dispositivo {} nomeado como '{}'.", mac_up, nome))
}

#[tauri::command]
fn conectar_ssh_dispositivo(state: State<'_, AppState>, payload: PayloadConectarSsh) -> RespostaSsh {
    let ip = payload.ip.trim().to_string();
    let porta = if payload.porta_ssh == 0 { 22 } else { payload.porta_ssh };
    if state.modo_teste_fixo {
        let mut sim = state.sim.lock().unwrap();
        sim.host_ip = ip.clone();
        *state.ip_conectado.lock().unwrap() = ip.clone();
        let fab = state.fabricante.lock().unwrap().clone();
        return RespostaSsh {
            ok: true,
            mensagem: format!("Simulador conectado em {} ({})", ip, fab.nome_exibicao()),
            fabricante: fab,
            hostname: sim.hostname(),
            ip,
        };
    }

    match SessaoSSHReal::connect(&ip, porta, payload.usuario.trim(), payload.senha.trim()) {
        Ok(mut ssh) => {
            let banner = ssh.send_command("show version").unwrap_or_default();
            let fab = detectar_fabricante(&banner);
            let hname = ssh.hostname();
            *state.fabricante.lock().unwrap() = fab.clone();
            *state.sessao_real.lock().unwrap() = Some(ssh);
            *state.ip_conectado.lock().unwrap() = ip.clone();
            RespostaSsh {
                ok: true,
                mensagem: format!("SSHv2 conectado em {} — Marca detectada: {}", ip, fab.nome_exibicao()),
                fabricante: fab,
                hostname: hname,
                ip,
            }
        }
        Err(e) => RespostaSsh {
            ok: false,
            mensagem: format!("Falha SSH em {}:{}: {}", ip, porta, e),
            fabricante: state.fabricante.lock().unwrap().clone(),
            hostname: String::new(),
            ip,
        },
    }
}

#[tauri::command]
fn executar_comando_direto(state: State<'_, AppState>, comando: String, modo_config: bool) -> Result<String, String> {
    let linhas: Vec<String> = comando
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();
    if linhas.is_empty() {
        return Err("Digite pelo menos um comando.".into());
    }
    if modo_config {
        state.executar_config(&linhas)
    } else {
        let mut saidas = Vec::new();
        for l in &linhas {
            saidas.push(state.executar_leitura(l)?);
        }
        Ok(saidas.join("\n\n"))
    }
}

#[tauri::command]
fn configurar_identidade(state: State<'_, AppState>, hostname: String, dominio: String, banner: String) -> Result<String, String> {
    let h = hostname.trim().replace(' ', "-");
    let d = dominio.trim().to_string();
    let b = banner.trim().to_string();
    let mut cmds = Vec::new();
    if !h.is_empty() {
        cmds.push(format!("hostname {}", h));
    }
    if !d.is_empty() {
        cmds.push(format!("ip domain-name {}", d));
    }
    if !b.is_empty() {
        cmds.push(format!("banner motd # {} #", b));
    }
    let saida = state.executar_config(&cmds)?;
    if !h.is_empty() {
        state.sim.lock().unwrap().hostname_eq = h;
    }
    if !d.is_empty() {
        *state.dominio.lock().unwrap() = d;
    }
    *state.banner.lock().unwrap() = b;
    Ok(saida)
}

#[tauri::command]
fn salvar_canal_rf(state: State<'_, AppState>, info: CanalRfInfo) -> Result<String, String> {
    let cmds = vec![
        format!("interface {}", info.radio),
        format!("channel {}", info.canal),
        format!("channel width {}", info.largura.split_whitespace().next().unwrap_or("20")),
        format!("power local {}", info.potencia.replace('%', "")),
        "no shutdown".into(),
        "exit".into(),
    ];
    let saida = state.executar_config(&cmds)?;
    let mut canais = state.canais_rf.lock().unwrap();
    if let Some(pos) = canais.iter().position(|c| c.radio == info.radio) {
        canais[pos] = info;
    } else {
        canais.push(info);
    }
    Ok(saida)
}

#[tauri::command]
fn definir_fabricante(state: State<'_, AppState>, slug: String) -> Fabricante {
    let fab = Fabricante::from_slug(&slug);
    *state.fabricante.lock().unwrap() = fab.clone();
    fab
}

#[tauri::command]
fn obter_estado_completo(state: State<'_, AppState>) -> EstadoCompleto {
    let sim = state.sim.lock().unwrap();
    let cfg = state.config.lock().unwrap().clone();
    let fab = state.fabricante.lock().unwrap().clone();
    let u_app = state.usuarios_app.lock().unwrap().clone();
    let (op, priv_nv) = state.operador_ativo.lock().unwrap().clone();
    let backups = listar_backups_dir(&state.pasta_backups());
    let conectado_ssh = state.modo_teste_fixo || state.sessao_real.lock().unwrap().is_some();
    let ip_conectado = state.ip_conectado.lock().unwrap().clone();
    let apelidos = state.carregar_apelidos();
    let dispositivos = if state.modo_teste_fixo {
        sim.dispositivos.clone()
    } else {
        ler_arp_sistema(&apelidos)
    };
    EstadoCompleto {
        hostname: sim.hostname(),
        dominio: state.dominio.lock().unwrap().clone(),
        banner: state.banner.lock().unwrap().clone(),
        ip_conectado,
        conectado_ssh,
        fabricante: fab,
        modo_teste: state.modo_teste_fixo,
        operador: op,
        privilegio: priv_nv,
        portas: sim.portas.clone(),
        vlans: sim.vlans.clone(),
        redes_wifi: sim.redes_wifi.clone(),
        canais_rf: state.canais_rf.lock().unwrap().clone(),
        aps: sim.aps.clone(),
        rotas: sim.rotas.clone(),
        dispositivos,
        alertas: state.alertas.listar(),
        usuarios_app: u_app,
        usuarios_roteador: sim.usuarios_roteador.clone(),
        backups,
        config: cfg,
    }
}

#[tauri::command]
fn salvar_porta(state: State<'_, AppState>, payload: PayloadPorta) -> Result<String, String> {
    let fab = state.fabricante.lock().unwrap().clone();
    let cmds = traduzir_porta(
        &fab,
        &payload.nome,
        &payload.descricao,
        &payload.ip,
        &payload.mask,
        &payload.vlans,
        &payload.modo_especial,
        payload.eh_switch,
    );
    let saida = state.executar_config(&cmds)?;
    let mut sim = state.sim.lock().unwrap();
    if let Some(p) = sim.portas.iter_mut().find(|x| x.nome == payload.nome) {
        p.ligada = payload.ligada;
        p.ip = if payload.ip.is_empty() { "unassigned".into() } else { payload.ip };
        p.mask = payload.mask;
        p.descricao = payload.descricao;
        if payload.modo_especial == "sem_vlan" {
            p.sw_mode = String::new();
            p.vlans = vec![];
        } else if payload.modo_especial == "trunk_all" {
            p.sw_mode = "trunk".into();
            p.vlans = vec!["all".into()];
        } else if payload.vlans.len() == 1 {
            p.sw_mode = if payload.eh_switch { "access".into() } else { "dot1q".into() };
            p.vlans = payload.vlans;
        } else if payload.vlans.len() > 1 {
            p.sw_mode = if payload.eh_switch { "trunk".into() } else { "dot1q".into() };
            p.vlans = payload.vlans;
        }
    }
    Ok(saida)
}

#[tauri::command]
fn salvar_vlan(state: State<'_, AppState>, vlan: VlanInfo) -> Result<String, String> {
    let cmds = vec![
        format!("vlan {}", vlan.id),
        format!("name {}", vlan.nome.replace(' ', "_")),
        "exit".into(),
    ];
    let saida = state.executar_config(&cmds)?;
    let mut sim = state.sim.lock().unwrap();
    if let Some(pos) = sim.vlans.iter().position(|v| v.id == vlan.id) {
        sim.vlans[pos] = vlan;
    } else {
        sim.vlans.push(vlan);
    }
    Ok(saida)
}

#[tauri::command]
fn excluir_vlan(state: State<'_, AppState>, id: String) -> Result<String, String> {
    let saida = state.executar_config(&[format!("no vlan {}", id)])?;
    let mut sim = state.sim.lock().unwrap();
    sim.vlans.retain(|v| v.id != id);
    Ok(saida)
}

#[tauri::command]
fn salvar_wifi(state: State<'_, AppState>, wifi: WifiRede) -> Result<String, String> {
    let fab = state.fabricante.lock().unwrap().clone();
    let cmds = traduzir_wifi(&fab, &wifi);
    let saida = state.executar_config(&cmds)?;
    let mut sim = state.sim.lock().unwrap();
    if let Some(pos) = sim.redes_wifi.iter().position(|w| w.ssid == wifi.ssid) {
        sim.redes_wifi[pos] = wifi;
    } else {
        sim.redes_wifi.push(wifi);
    }
    Ok(saida)
}

#[tauri::command]
fn remover_wifi(state: State<'_, AppState>, ssid: String) -> Result<String, String> {
    let saida = state.executar_config(&[format!("no dot11 ssid {}", ssid)])?;
    let mut sim = state.sim.lock().unwrap();
    sim.redes_wifi.retain(|w| w.ssid != ssid);
    Ok(saida)
}

#[tauri::command]
fn salvar_ap(state: State<'_, AppState>, ap: AccessPointInfo) -> Result<String, String> {
    if !ap.online {
        return Err("AP offline: modo somente visualizacao.".into());
    }
    let fab = state.fabricante.lock().unwrap().clone();
    let cmds = traduzir_ap(&fab, &ap);
    let saida = state.executar_config(&cmds)?;
    let mut sim = state.sim.lock().unwrap();
    if let Some(pos) = sim.aps.iter().position(|x| x.nome == ap.nome) {
        sim.aps[pos] = ap;
    } else {
        sim.aps.push(ap);
    }
    Ok(saida)
}

#[tauri::command]
fn remover_ap(state: State<'_, AppState>, nome: String) -> Result<String, String> {
    let mut sim = state.sim.lock().unwrap();
    sim.aps.retain(|a| a.nome != nome);
    Ok(format!("AP {} removido do inventario.", nome))
}

#[tauri::command]
fn salvar_rota(state: State<'_, AppState>, rota: RotaInfo) -> Result<String, String> {
    let fab = state.fabricante.lock().unwrap().clone();
    let cmds = traduzir_rota(&fab, &rota);
    let saida = state.executar_config(&cmds)?;
    let mut sim = state.sim.lock().unwrap();
    sim.rotas.push(rota);
    Ok(saida)
}

#[tauri::command]
fn remover_rota(state: State<'_, AppState>, rede: String) -> Result<String, String> {
    let mut sim = state.sim.lock().unwrap();
    sim.rotas.retain(|r| r.rede != rede);
    Ok(format!("Rota {} removida.", rede))
}

#[tauri::command]
fn criar_backup(state: State<'_, AppState>, rotulo: String) -> Result<BackupItem, String> {
    let dir = state.pasta_backups();
    let stamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let limpo = rotulo.trim().replace(' ', "_");
    let nome_arq = if limpo.is_empty() {
        format!("backup_{}.cfg", stamp)
    } else {
        format!("backup_{}_{}.cfg", stamp, limpo)
    };
    let sim = state.sim.lock().unwrap();
    let conteudo = format!(
        "! NetQuit Backup - {} ({})\n! Portas: {} | VLANs: {} | Wi-Fi: {} | APs: {}\nend\n",
        sim.hostname(),
        stamp,
        sim.portas.len(),
        sim.vlans.len(),
        sim.redes_wifi.len(),
        sim.aps.len()
    );
    let caminho = dir.join(&nome_arq);
    fs::write(&caminho, &conteudo).map_err(|e| format!("Erro ao gravar backup: {}", e))?;
    Ok(BackupItem {
        arquivo: nome_arq,
        data_hora: Local::now().format("%Y-%m-%d %H:%M").to_string(),
        tamanho_bytes: conteudo.len() as u64,
    })
}

#[tauri::command]
fn criar_usuario_app(state: State<'_, AppState>, conta: UsuarioConta) -> Result<String, String> {
    let mut u_app = state.usuarios_app.lock().unwrap();
    if u_app.iter().any(|u| u.username == conta.username) {
        return Err("Ja existe um usuario do app com este nome.".into());
    }
    u_app.push(conta);
    Ok("Usuario do aplicativo criado com sucesso.".into())
}

#[derive(Deserialize)]
struct PayloadResponderAlerta {
    id: String,
    acao: String, // "bloquear_mac" | "trancar_porta" | "quarentena_vlan" | "autorizar_dispositivo" | "ciencia"
    mac: String,
    iface: String,
    apelido: String,
    nota: String,
    usuario: String,
}

#[tauri::command]
fn responder_incidente_alerta(state: State<'_, AppState>, payload: PayloadResponderAlerta) -> Result<String, String> {
    let fab = state.fabricante.lock().unwrap().clone();
    let mut cmds_aplicados = Vec::new();
    let mut saida_cli = String::new();

    let (acao_curta, detalhe_base) = match payload.acao.as_str() {
        "bloquear_mac" => {
            cmds_aplicados = traduzir_acao_incidente(&fab, "bloquear_mac", &payload.mac, &payload.iface);
            saida_cli = state.executar_config(&cmds_aplicados)?;
            (
                format!("Dispositivo bloqueado (MAC {})", if payload.mac.is_empty() { "ACL" } else { &payload.mac }),
                format!("Bloqueio definitivo via MAC Blacklist/ACL em {}.", fab.nome_exibicao()),
            )
        }
        "trancar_porta" => {
            cmds_aplicados = traduzir_acao_incidente(&fab, "trancar_porta", &payload.mac, &payload.iface);
            saida_cli = state.executar_config(&cmds_aplicados)?;
            let mut sim = state.sim.lock().unwrap();
            if let Some(p) = sim.portas.iter_mut().find(|x| x.nome.eq_ignore_ascii_case(&payload.iface) || x.nome.contains(&payload.iface)) {
                p.ligada = false;
                p.descricao = "BLOQUEADA_INCIDENTE_NETQUIT".into();
            }
            (
                format!("Porta trancada ({})", if payload.iface.is_empty() { "Switch" } else { &payload.iface }),
                format!("Desconexão forçada (shutdown + port-security) aplicada em {}.", payload.iface),
            )
        }
        "quarentena_vlan" => {
            cmds_aplicados = traduzir_acao_incidente(&fab, "quarentena_vlan", &payload.mac, &payload.iface);
            saida_cli = state.executar_config(&cmds_aplicados)?;
            let mut sim = state.sim.lock().unwrap();
            if let Some(p) = sim.portas.iter_mut().find(|x| x.nome.eq_ignore_ascii_case(&payload.iface) || x.nome.contains(&payload.iface)) {
                p.sw_mode = "access".into();
                p.vlans = vec!["999".into()];
                p.descricao = "ISOLADA_QUARENTENA".into();
            }
            (
                format!("Isolado em Quarentena (VLAN 999 · {})", if payload.iface.is_empty() { "Porta" } else { &payload.iface }),
                "Dispositivo movido para VLAN 999 isolada sem acesso à rede corporativa.".into(),
            )
        }
        "autorizar_dispositivo" => {
            let mac_up = payload.mac.trim().to_uppercase();
            if !mac_up.is_empty() {
                let p_conf = state.pasta_dados.join("dispositivos_confiaveis.json");
                let mut lista: Vec<String> = fs::read_to_string(&p_conf)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
                if !lista.contains(&mac_up) {
                    lista.push(mac_up.clone());
                    if let Ok(j) = serde_json::to_string_pretty(&lista) {
                        let _ = fs::write(&p_conf, j);
                    }
                }
                if !payload.apelido.trim().is_empty() {
                    let mut ap = state.carregar_apelidos();
                    ap.insert(mac_up.clone(), payload.apelido.trim().to_string());
                    state.salvar_apelidos(&ap);
                }
                let mut sim = state.sim.lock().unwrap();
                for d in &mut sim.dispositivos {
                    if d.mac.to_uppercase() == mac_up {
                        d.novo = false;
                        if !payload.apelido.trim().is_empty() {
                            d.hostname = payload.apelido.trim().to_string();
                        }
                    }
                }
            }
            (
                format!("Autorizado na rede{}", if payload.apelido.trim().is_empty() { String::new() } else { format!(" ({})", payload.apelido.trim()) }),
                format!("Dispositivo {} adicionado à lista de confiáveis (Whitelist).", payload.mac),
            )
        }
        _ => (
            "Ciência registrada / Falso positivo".into(),
            "Incidente avaliado e encerrado sem alteração de configuração.".into(),
        ),
    };

    let mut log_partes = vec![
        format!("Responsável: {}", payload.usuario),
        format!("Ação: {}", acao_curta),
        format!("Detalhe: {}", detalhe_base),
    ];
    if !payload.nota.trim().is_empty() {
        log_partes.push(format!("Observação: {}", payload.nota.trim()));
    }
    if !cmds_aplicados.is_empty() {
        log_partes.push(format!("--- Comandos ({}) ---\n{}", fab.nome_exibicao(), cmds_aplicados.join("\n")));
    }
    if !saida_cli.trim().is_empty() {
        log_partes.push(format!("--- Retorno ---\n{}", saida_cli.trim()));
    }
    let log_completo = log_partes.join("\n");

    state.alertas.resolver_com_acao(&payload.id, &payload.usuario, &acao_curta, &log_completo);
    Ok(log_completo)
}

#[tauri::command]
fn marcar_alerta_lido(state: State<'_, AppState>, id: String, usuario: String) -> bool {
    state.alertas.marcar_lido(&id, &usuario)
}

#[tauri::command]
fn marcar_alerta_resolvido(state: State<'_, AppState>, id: String, usuario: String) -> bool {
    state.alertas.marcar_resolvido(&id, &usuario)
}

#[tauri::command]
fn registrar_alerta_custom(state: State<'_, AppState>, nivel: String, categoria: String, titulo: String, mensagem: String) -> AlertaItem {
    state.alertas.registrar(&nivel, &categoria, &titulo, &mensagem, "sistema", None)
}

#[tauri::command]
fn importar_usuario_roteador(state: State<'_, AppState>, username: String) -> Result<String, String> {
    let u_app = state.usuarios_app.lock().unwrap();
    let conta = u_app
        .iter()
        .find(|u| u.username == username)
        .cloned()
        .ok_or_else(|| "Usuario nao encontrado nas contas do aplicativo.".to_string())?;
    drop(u_app);
    let cmd = format!("username {} privilege {} secret 0 {}", conta.username, conta.privilegio, conta.senha);
    let saida = state.executar_config(&[cmd])?;
    let mut sim = state.sim.lock().unwrap();
    if !sim.usuarios_roteador.iter().any(|u| u.username == conta.username) {
        let mut importado = conta;
        importado.origem = "roteador".into();
        sim.usuarios_roteador.push(importado);
    }
    Ok(saida)
}

#[tauri::command]
fn salvar_config_app(state: State<'_, AppState>, config: ConfigApp) -> ConfigApp {
    let mut c = state.config.lock().unwrap();
    *c = config.clone();
    config
}

pub fn run(modo_teste: bool) {
    let pasta_dados = PathBuf::from(if modo_teste { "dados_rede_teste" } else { "dados_rede" });
    let alertas = GerenciadorAlertas::new(&pasta_dados);
    if modo_teste && alertas.listar().is_empty() {
        alertas.registrar(
            "aviso",
            "Access Points",
            "AP offline: AP-DEPOSITO-OFFLINE",
            "O AP 192.168.99.250 nao responde na rede. Configuracao bloqueada (somente visualizacao).",
            "monitor",
            Some("ap_offline|AP-DEPOSITO-OFFLINE"),
        );
        alertas.registrar(
            "info",
            "Radar de Rede",
            "Novo dispositivo conectado: Smartphone-Visitante",
            "MAC AA:BB:CC:99:10:FE detectado na interface Dot11Radio0 (192.168.30.88).",
            "radar",
            Some("novo_disp|AA:BB:CC:99:10:FE"),
        );
    }

    let mut cfg = ConfigApp::default();
    cfg.modo_teste = modo_teste;

    let state = AppState {
        modo_teste_fixo: modo_teste,
        sim: Mutex::new(SimuladorCiscoIOS::new("192.168.1.1")),
        sessao_real: Mutex::new(None),
        ip_conectado: Mutex::new(if modo_teste { "192.168.1.1".into() } else { String::new() }),
        fabricante: Mutex::new(Fabricante::CiscoIos),
        dominio: Mutex::new("netquit.local".into()),
        banner: Mutex::new("Acesso restrito — NetQuit (Acabou, Quitou!)".into()),
        canais_rf: Mutex::new(vec![
            CanalRfInfo { radio: "Dot11Radio0".into(), banda: "2.4 GHz (802.11b/g/n)".into(), canal: "6".into(), largura: "20 MHz".into(), potencia: "100%".into(), arquitetura: "IOS Autonomous AP".into() },
            CanalRfInfo { radio: "Dot11Radio1".into(), banda: "5.0 GHz (802.11a/n/ac)".into(), canal: "36".into(), largura: "40 MHz".into(), potencia: "100%".into(), arquitetura: "IOS Autonomous AP".into() },
        ]),
        alertas,
        usuarios_app: Mutex::new(vec![
            UsuarioConta { username: "admin".into(), privilegio: 15, origem: "app".into(), senha: "admin123".into() },
            UsuarioConta { username: "operador".into(), privilegio: 7, origem: "app".into(), senha: "operador123".into() },
            UsuarioConta { username: "visitante_recepcao".into(), privilegio: 1, origem: "app".into(), senha: "visita123".into() },
        ]),
        config: Mutex::new(cfg),
        operador_ativo: Mutex::new(("admin".into(), 15)),
        pasta_dados,
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            autenticar_app,
            escanear_arp_rede,
            apelidar_dispositivo,
            conectar_ssh_dispositivo,
            executar_comando_direto,
            configurar_identidade,
            salvar_canal_rf,
            definir_fabricante,
            obter_estado_completo,
            salvar_porta,
            salvar_vlan,
            excluir_vlan,
            salvar_wifi,
            remover_wifi,
            salvar_ap,
            remover_ap,
            salvar_rota,
            remover_rota,
            criar_backup,
            criar_usuario_app,
            responder_incidente_alerta,
            marcar_alerta_lido,
            marcar_alerta_resolvido,
            registrar_alerta_custom,
            importar_usuario_roteador,
            salvar_config_app,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar NetQuit (Tauri)");
}
