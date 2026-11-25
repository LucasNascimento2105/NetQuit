pub mod simulator;
pub mod vendors;
#[cfg(feature = "real-ssh")]
pub mod ssh_real;

use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

/// Interface unificada de sessao Cisco (implementada tanto pelo Simulador offline quanto pelo SSHv2 real).
pub trait SessaoCisco: Send + Sync {
    fn send_command(&mut self, cmd: &str) -> Result<String, String>;
    fn send_config_set(&mut self, cmds: &[String]) -> Result<String, String>;
    fn hostname(&self) -> String;
    fn is_simulated(&self) -> bool;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortaInfo {
    pub nome: String,
    pub ligada: bool,
    pub ip: String,
    pub mask: String,
    pub sw_mode: String, // "", "access", "trunk", "dot1q"
    pub vlans: Vec<String>,
    pub descricao: String,
    pub clock_rate: String,
}

impl PortaInfo {
    pub fn vlan_resumo(&self) -> String {
        match self.sw_mode.as_str() {
            "trunk" => {
                if self.vlans.is_empty() || self.vlans.iter().any(|v| v == "all") {
                    "Trunk (802.1Q Todas)".to_string()
                } else {
                    format!("Trunk (VLANs: {})", self.vlans.join(","))
                }
            }
            "access" => {
                if let Some(v) = self.vlans.first() {
                    format!("VLAN {} (Access)", v)
                } else {
                    "Access (Padrao)".to_string()
                }
            }
            "dot1q" => format!("Dot1Q VLAN {}", self.vlans.join(",")),
            _ => {
                if !self.ip.is_empty() && self.ip != "unassigned" {
                    "Roteada (L3)".to_string()
                } else {
                    "Padrao / Sem VLAN".to_string()
                }
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VlanInfo {
    pub id: String,
    pub nome: String,
    pub status: String,
    pub portas: String,
    pub gateway_svi: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WifiRede {
    pub ssid: String,
    pub seguranca: String,
    pub chave: String,
    pub pool_ip: String,
    pub radio: String,
    pub arquitetura: String,
    pub vlans: Vec<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessPointInfo {
    pub nome: String,
    pub ip: String,
    pub arquitetura: String,
    pub modelo: String,
    pub ssid: String,
    pub vlans: Vec<String>,
    pub seguranca: String,
    pub chave: String,
    pub banda: String,
    pub canal: String,
    pub potencia: String,
    pub online: bool,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RotaInfo {
    pub rede: String,
    pub mask: String,
    pub next_hop: String,
    pub ad: String,
    pub protocolo_vizinhos: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DispositivoRadar {
    pub ip: String,
    pub mac: String,
    pub hostname: String,
    pub interface: String,
    pub download_mbps: f64,
    pub upload_mbps: f64,
    pub volume_acumulado_mb: f64,
    pub novo: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsuarioConta {
    pub username: String,
    pub privilegio: u8,
    pub origem: String, // "app" ou "roteador"
    pub senha: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertaItem {
    pub id: String,
    pub data_hora: String,
    pub ultima_ocorrencia: String,
    pub ocorrencias: u32,
    pub nivel: String, // "info", "aviso", "critico"
    pub categoria: String,
    pub titulo: String,
    pub mensagem: String,
    pub origem: String,
    pub assinatura: String,
    pub lido: bool,
    pub lido_por: String,
    pub lido_em: String,
    pub resolvido: bool,
    pub resolvido_por: String,
    pub resolvido_em: String,
    #[serde(default)]
    pub acao_tomada: String,
    #[serde(default)]
    pub log_resolucao: String,
}

fn default_idioma() -> String {
    "pt".to_string()
}

fn default_fabricante() -> String {
    "cisco_ios".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigApp {
    pub tema: String,        // "zorin_dark", "zorin_light", "alto_contraste", "daltonico"
    pub delta_fonte: i32,    // -2, 0, 2, 4
    pub bip_alerta: bool,
    pub modo_teste: bool,
    #[serde(default = "default_idioma")]
    pub idioma: String,      // "pt", "en", "zh"
    #[serde(default = "default_fabricante")]
    pub fabricante_padrao: String,
}

impl Default for ConfigApp {
    fn default() -> Self {
        Self {
            tema: "zorin_dark".to_string(),
            delta_fonte: 0,
            bip_alerta: true,
            modo_teste: true,
            idioma: "pt".to_string(),
            fabricante_padrao: "cisco_ios".to_string(),
        }
    }
}

pub struct GerenciadorAlertas {
    caminho: PathBuf,
}

impl GerenciadorAlertas {
    pub fn new(pasta_dados: &Path) -> Self {
        let _ = fs::create_dir_all(pasta_dados);
        let caminho = pasta_dados.join("alertas.json");
        if !caminho.exists() {
            let _ = fs::write(&caminho, "[]");
        }
        Self { caminho }
    }

    pub fn listar(&self) -> Vec<AlertaItem> {
        fs::read_to_string(&self.caminho)
            .ok()
            .and_then(|s| serde_json::from_str::<Vec<AlertaItem>>(&s).ok())
            .unwrap_or_default()
    }

    fn gravar(&self, lista: &[AlertaItem]) {
        if let Ok(json) = serde_json::to_string_pretty(lista) {
            let _ = fs::write(&self.caminho, json);
        }
    }

    pub fn registrar(
        &self,
        nivel: &str,
        categoria: &str,
        titulo: &str,
        mensagem: &str,
        origem: &str,
        assinatura: Option<&str>,
    ) -> AlertaItem {
        let agora = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let ass = assinatura
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("{}|{}", categoria, titulo));
        let mut lista = self.listar();

        if let Some(a) = lista.iter_mut().rev().find(|x| x.assinatura == ass && !x.resolvido) {
            a.ocorrencias += 1;
            a.ultima_ocorrencia = agora;
            if !mensagem.is_empty() {
                a.mensagem = mensagem.to_string();
            }
            a.lido = false;
            let ret = a.clone();
            self.gravar(&lista);
            return ret;
        }

        let novo = AlertaItem {
            id: Uuid::new_v4().simple().to_string()[..10].to_string(),
            data_hora: agora.clone(),
            ultima_ocorrencia: agora,
            ocorrencias: 1,
            nivel: nivel.to_string(),
            categoria: categoria.to_string(),
            titulo: titulo.to_string(),
            mensagem: mensagem.to_string(),
            origem: origem.to_string(),
            assinatura: ass,
            lido: false,
            lido_por: String::new(),
            lido_em: String::new(),
            resolvido: false,
            resolvido_por: String::new(),
            resolvido_em: String::new(),
            acao_tomada: String::new(),
            log_resolucao: String::new(),
        };
        lista.push(novo.clone());
        if lista.len() > 1000 {
            let excesso = lista.len() - 1000;
            lista.drain(0..excesso);
        }
        self.gravar(&lista);
        novo
    }

    pub fn marcar_lido(&self, id: &str, usuario: &str) -> bool {
        let mut lista = self.listar();
        if let Some(a) = lista.iter_mut().find(|x| x.id == id) {
            a.lido = true;
            a.lido_por = usuario.to_string();
            a.lido_em = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            self.gravar(&lista);
            return true;
        }
        false
    }

    pub fn marcar_resolvido(&self, id: &str, usuario: &str) -> bool {
        self.resolver_com_acao(id, usuario, "Resolvido manualmente", "Incidente encerrado pelo operador.")
    }

    pub fn resolver_com_acao(&self, id: &str, usuario: &str, acao_tomada: &str, log_resolucao: &str) -> bool {
        let mut lista = self.listar();
        if let Some(a) = lista.iter_mut().find(|x| x.id == id) {
            let agora = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            a.resolvido = true;
            a.lido = true;
            if a.lido_por.is_empty() {
                a.lido_por = usuario.to_string();
                a.lido_em = agora.clone();
            }
            a.resolvido_por = usuario.to_string();
            a.resolvido_em = agora;
            a.acao_tomada = acao_tomada.to_string();
            a.log_resolucao = log_resolucao.to_string();
            self.gravar(&lista);
            return true;
        }
        false
    }
}

/// Gera comandos Cisco IOS para atribuicao de 0, 1 ou Multiplas VLANs em uma porta.
pub fn montar_comandos_porta_multivlan(
    porta: &str,
    descricao: &str,
    ip: &str,
    mask: &str,
    vlans: &[String],
    modo_especial: &str, // "", "sem_vlan", "trunk_all"
    eh_switch: bool,
) -> Vec<String> {
    let mut cmds = vec![format!("interface {}", porta)];
    if !descricao.trim().is_empty() {
        cmds.push(format!("description {}", descricao.trim().replace(' ', "_")));
    } else {
        cmds.push("no description".to_string());
    }

    if modo_especial == "sem_vlan" {
        if eh_switch {
            cmds.push("no switchport access vlan".to_string());
            cmds.push("no switchport mode".to_string());
        }
    } else if modo_especial == "trunk_all" {
        if eh_switch {
            cmds.push("switchport trunk encapsulation dot1q".to_string());
            cmds.push("switchport mode trunk".to_string());
            cmds.push("switchport trunk allowed vlan all".to_string());
            cmds.push("no shutdown".to_string());
        } else {
            cmds.push("no ip address".to_string());
            cmds.push("no shutdown".to_string());
        }
    } else if vlans.len() == 1 {
        let vid = &vlans[0];
        if eh_switch {
            cmds.push("switchport mode access".to_string());
            cmds.push(format!("switchport access vlan {}", vid));
            cmds.push("no shutdown".to_string());
        } else {
            let pai = porta.split('.').next().unwrap_or(porta);
            cmds = vec![
                format!("interface {}", pai),
                "no shutdown".to_string(),
                "exit".to_string(),
                format!("interface {}.{}", pai, vid),
                format!("encapsulation dot1Q {}", vid),
            ];
            if !ip.trim().is_empty() && !mask.trim().is_empty() {
                cmds.push(format!("ip address {} {}", ip.trim(), mask.trim()));
            }
            cmds.push("exit".to_string());
            return cmds;
        }
    } else if vlans.len() > 1 {
        let csv = vlans.join(",");
        if eh_switch {
            cmds.push("switchport trunk encapsulation dot1q".to_string());
            cmds.push("switchport mode trunk".to_string());
            cmds.push(format!("switchport trunk allowed vlan {}", csv));
            cmds.push("no shutdown".to_string());
        } else {
            let pai = porta.split('.').next().unwrap_or(porta);
            cmds = vec![format!("interface {}", pai), "no shutdown".to_string(), "exit".to_string()];
            for (idx, vid) in vlans.iter().enumerate() {
                cmds.push(format!("interface {}.{}", pai, vid));
                cmds.push(format!("encapsulation dot1Q {}", vid));
                if idx == 0 && !ip.trim().is_empty() && !mask.trim().is_empty() {
                    cmds.push(format!("ip address {} {}", ip.trim(), mask.trim()));
                }
                cmds.push("exit".to_string());
            }
            return cmds;
        }
    }

    if !ip.trim().is_empty() && !mask.trim().is_empty() {
        if eh_switch && !porta.to_lowercase().starts_with("vlan") {
            cmds.push("no switchport".to_string());
        }
        cmds.push(format!("ip address {} {}", ip.trim(), mask.trim()));
    }
    cmds.push("exit".to_string());
    cmds
}

/// Gera comandos Cisco IOS / IOS-XE WLC para Wi-Fi com suporte a multiplas VLANs.
pub fn montar_comandos_wifi_multivlan(w: &WifiRede) -> Vec<String> {
    let mut cmds = Vec::new();
    let is_wlc = w.arquitetura.contains("IOS-XE") || w.arquitetura.contains("WLC");

    if is_wlc {
        if w.vlans.len() > 1 {
            cmds.push(format!("vlan group WIFI_{}_GRP vlan-list {}", w.ssid, w.vlans.join(",")));
        }
        cmds.push(format!("wlan {} 1 {}", w.ssid, w.ssid));
        if w.vlans.len() > 1 {
            cmds.push(format!("client vlan WIFI_{}_GRP", w.ssid));
        } else if let Some(v0) = w.vlans.first() {
            cmds.push(format!("client vlan {}", v0));
        }
        if w.seguranca.contains("Aberta") {
            cmds.push("no security wpa".to_string());
        } else if w.seguranca.contains("WPA3") {
            cmds.push("security wpa wpa3".to_string());
            cmds.push("security wpa akm sae".to_string());
            cmds.push(format!("security wpa psk set-key ascii 0 {}", w.chave));
        } else {
            cmds.push("security wpa wpa2".to_string());
            cmds.push("security wpa akm psk".to_string());
            cmds.push(format!("security wpa psk set-key ascii 0 {}", w.chave));
        }
        cmds.push("no shutdown".to_string());
        cmds.push("exit".to_string());
    } else {
        for v in &w.vlans {
            cmds.push(format!("dot11 vlan-name VLAN_{} vlan {}", v, v));
        }
        cmds.push(format!("dot11 ssid {}", w.ssid));
        if let Some(v0) = w.vlans.first() {
            cmds.push(format!("vlan {}", v0));
        }
        cmds.push("authentication open".to_string());
        if !w.seguranca.contains("Aberta") {
            cmds.push("authentication key-management wpa version 2".to_string());
            cmds.push(format!("wpa-psk ascii 0 {}", w.chave));
        }
        cmds.push("guest-mode".to_string());
        cmds.push("exit".to_string());
        cmds.push(format!("interface {}", w.radio));
        cmds.push(format!("ssid {}", w.ssid));
        cmds.push("no shutdown".to_string());
        cmds.push("exit".to_string());
        for (idx, v) in w.vlans.iter().enumerate() {
            cmds.push(format!("interface {}.{}", w.radio, v));
            cmds.push(format!("encapsulation dot1Q {}", v));
            cmds.push(format!("bridge-group {}", idx + 1));
            cmds.push("exit".to_string());
        }
    }
    cmds
}

/// Gera comandos Cisco IOS / WLC para Access Point com suporte a 1 ou multiplas VLANs.
pub fn montar_comandos_ap_multivlan(ap: &AccessPointInfo) -> Vec<String> {
    let vlans = if ap.vlans.is_empty() {
        vec!["10".to_string()]
    } else {
        ap.vlans.clone()
    };
    let vid0 = &vlans[0];
    let mut cmds = Vec::new();

    if ap.arquitetura.contains("WLC") {
        if vlans.len() > 1 {
            cmds.push(format!("vlan group AP_{}_VLANS vlan-list {}", ap.nome, vlans.join(",")));
        }
        cmds.push(format!("wlan {} {} {}", ap.ssid, vid0, ap.ssid));
        if vlans.len() > 1 {
            cmds.push(format!("client vlan AP_{}_VLANS", ap.nome));
        } else {
            cmds.push(format!("client vlan {}", vid0));
        }
        cmds.push("no shutdown".to_string());
        cmds.push("exit".to_string());
        cmds.push(format!("ap name {} location Campus_NetControl", ap.nome));
        return cmds;
    }

    cmds.push(format!("hostname {}", ap.nome));
    cmds.push("bridge irb".to_string());
    for v in &vlans {
        cmds.push(format!("dot11 vlan-name VLAN_{} vlan {}", v, v));
    }
    cmds.push(format!("dot11 ssid {}", ap.ssid));
    cmds.push(format!("vlan {}", vid0));
    cmds.push("guest-mode".to_string());
    cmds.push("exit".to_string());
    for (idx, v) in vlans.iter().enumerate() {
        cmds.push(format!("interface Dot11Radio0.{}", v));
        cmds.push(format!("encapsulation dot1Q {}", v));
        cmds.push(format!("bridge-group {}", idx + 1));
        cmds.push("exit".to_string());
        cmds.push(format!("interface GigabitEthernet0.{}", v));
        cmds.push(format!("encapsulation dot1Q {}", v));
        cmds.push(format!("bridge-group {}", idx + 1));
        cmds.push("exit".to_string());
    }
    cmds.push("interface BVI1".to_string());
    cmds.push(format!("ip address {} 255.255.255.0", ap.ip));
    cmds.push("no shutdown".to_string());
    cmds.push("exit".to_string());
    cmds
}

/// Gera comandos de rota estatica + propagacao opcional para vizinhos (OSPF, RIP, EIGRP, BGP).
pub fn montar_comandos_rota(rota: &RotaInfo) -> Vec<String> {
    let mut cmds = vec![format!(
        "ip route {} {} {} {}",
        rota.rede,
        rota.mask,
        rota.next_hop,
        if rota.ad.is_empty() { "1" } else { &rota.ad }
    )];
    let p = rota.protocolo_vizinhos.to_uppercase();
    if p.contains("OSPF") {
        cmds.extend(["router ospf 1".into(), "redistribute static subnets".into(), "exit".into()]);
    } else if p.contains("RIP") {
        cmds.extend(["router rip".into(), "redistribute static metric 1".into(), "exit".into()]);
    } else if p.contains("EIGRP") {
        cmds.extend(["router eigrp 100".into(), "redistribute static".into(), "exit".into()]);
    } else if p.contains("BGP") {
        cmds.extend(["router bgp 65001".into(), "redistribute static".into(), "exit".into()]);
    }
    cmds
}
