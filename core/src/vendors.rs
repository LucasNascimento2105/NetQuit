use crate::{AccessPointInfo, RotaInfo, WifiRede};
use serde::{Deserialize, Serialize};

/// Fabricantes de equipamentos de rede suportados pelo motor universal NetQuit (by Alt+F4).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Fabricante {
    CiscoIos,
    MikrotikRouterOs,
    HuaweiVrp,
    JuniperJunos,
    ArubaCx,
    TpLinkJetStream,
}

impl Fabricante {
    pub fn nome_exibicao(&self) -> &'static str {
        match self {
            Fabricante::CiscoIos => "Cisco IOS / IOS-XE",
            Fabricante::MikrotikRouterOs => "MikroTik RouterOS",
            Fabricante::HuaweiVrp => "Huawei VRP",
            Fabricante::JuniperJunos => "Juniper Junos",
            Fabricante::ArubaCx => "ArubaOS-CX / HPE",
            Fabricante::TpLinkJetStream => "TP-Link JetStream / Omada",
        }
    }

    pub fn comando_salvar(&self) -> &'static str {
        match self {
            Fabricante::CiscoIos => "write memory",
            Fabricante::MikrotikRouterOs => "# RouterOS salva automaticamente",
            Fabricante::HuaweiVrp => "save force",
            Fabricante::JuniperJunos => "commit and-quit",
            Fabricante::ArubaCx => "write memory",
            Fabricante::TpLinkJetStream => "copy running-config startup-config",
        }
    }

    pub fn from_slug(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "mikrotik" | "mikrotik_router_os" | "routeros" => Fabricante::MikrotikRouterOs,
            "huawei" | "huawei_vrp" | "vrp" => Fabricante::HuaweiVrp,
            "juniper" | "juniper_junos" | "junos" => Fabricante::JuniperJunos,
            "aruba" | "aruba_cx" | "hp" | "hpe" => Fabricante::ArubaCx,
            "tplink" | "tp_link_jet_stream" | "tp-link" | "omada" => Fabricante::TpLinkJetStream,
            _ => Fabricante::CiscoIos,
        }
    }
}

/// Reconhecimento automatico (Auto-Fingerprinting) da marca/SO do equipamento
/// a partir do banner SSH, prompt ou saida de comando de versao.
pub fn detectar_fabricante(banner_ou_saida: &str) -> Fabricante {
    let low = banner_ou_saida.to_lowercase();
    if low.contains("mikrotik") || low.contains("routeros") || low.contains("[admin@") {
        Fabricante::MikrotikRouterOs
    } else if low.contains("huawei") || low.contains("versatile routing platform") || low.contains("vrp") || low.contains("<huawei>") {
        Fabricante::HuaweiVrp
    } else if low.contains("junos") || low.contains("juniper") || low.contains("set interfaces") {
        Fabricante::JuniperJunos
    } else if low.contains("aruba") || low.contains("procurve") || low.contains("hewlett-packard") || low.contains("arubaos") {
        Fabricante::ArubaCx
    } else if low.contains("tp-link") || low.contains("jetstream") || low.contains("omada") {
        Fabricante::TpLinkJetStream
    } else {
        Fabricante::CiscoIos
    }
}

/// Motor de Traducao Universal (equivalente ao Jinja2 em Python) para Portas & Multi-VLAN.
pub fn traduzir_porta(
    fab: &Fabricante,
    porta: &str,
    descricao: &str,
    ip: &str,
    mask: &str,
    vlans: &[String],
    modo_especial: &str,
    eh_switch: bool,
) -> Vec<String> {
    let desc_limpa = descricao.trim().replace(' ', "_");
    match fab {
        Fabricante::CiscoIos => {
            crate::montar_comandos_porta_multivlan(porta, descricao, ip, mask, vlans, modo_especial, eh_switch)
        }
        Fabricante::MikrotikRouterOs => {
            let mut cmds = Vec::new();
            if !desc_limpa.is_empty() {
                cmds.push(format!("/interface set [find name={}] comment=\"{}\"", porta, desc_limpa));
            }
            if modo_especial == "sem_vlan" {
                cmds.push(format!("/interface bridge port remove [find interface={}]", porta));
            } else if modo_especial == "trunk_all" {
                cmds.push(format!("/interface bridge port set [find interface={}] frame-types=admit-only-vlan-tagged", porta));
            } else if vlans.len() == 1 {
                cmds.push(format!("/interface bridge port set [find interface={}] pvid={} frame-types=admit-only-untagged-and-priority-tagged", porta, vlans[0]));
            } else if vlans.len() > 1 {
                cmds.push(format!("/interface bridge port set [find interface={}] frame-types=admit-only-vlan-tagged", porta));
                for v in vlans {
                    cmds.push(format!("/interface bridge vlan add bridge=bridge1 tagged={} vlan-ids={}", porta, v));
                }
            }
            if !ip.trim().is_empty() {
                cmds.push(format!("/ip address add address={}/24 interface={}", ip.trim(), porta));
            }
            cmds
        }
        Fabricante::HuaweiVrp => {
            let mut cmds = vec!["system-view".into(), format!("interface {}", porta)];
            if !desc_limpa.is_empty() {
                cmds.push(format!("description {}", desc_limpa));
            }
            if modo_especial == "sem_vlan" {
                cmds.push("undo portswitch".into());
            } else if modo_especial == "trunk_all" {
                cmds.push("port link-type trunk".into());
                cmds.push("port trunk allow-pass vlan all".into());
            } else if vlans.len() == 1 {
                cmds.push("port link-type access".into());
                cmds.push(format!("port default vlan {}", vlans[0]));
            } else if vlans.len() > 1 {
                cmds.push("port link-type trunk".into());
                cmds.push(format!("port trunk allow-pass vlan {}", vlans.join(" ")));
            }
            if !ip.trim().is_empty() && !mask.trim().is_empty() {
                cmds.push(format!("ip address {} {}", ip.trim(), mask.trim()));
            }
            cmds.push("quit".into());
            cmds.push("return".into());
            cmds
        }
        Fabricante::JuniperJunos => {
            let mut cmds = vec!["configure".into()];
            if !desc_limpa.is_empty() {
                cmds.push(format!("set interfaces {} description {}", porta, desc_limpa));
            }
            if modo_especial == "trunk_all" {
                cmds.push(format!("set interfaces {} unit 0 family ethernet-switching interface-mode trunk", porta));
                cmds.push(format!("set interfaces {} unit 0 family ethernet-switching vlan members all", porta));
            } else if vlans.len() == 1 {
                cmds.push(format!("set interfaces {} unit 0 family ethernet-switching interface-mode access", porta));
                cmds.push(format!("set interfaces {} unit 0 family ethernet-switching vlan members VLAN_{}", porta, vlans[0]));
            } else if vlans.len() > 1 {
                cmds.push(format!("set interfaces {} unit 0 family ethernet-switching interface-mode trunk", porta));
                let membros = vlans.iter().map(|v| format!("VLAN_{}", v)).collect::<Vec<_>>().join(" ");
                cmds.push(format!("set interfaces {} unit 0 family ethernet-switching vlan members [ {} ]", porta, membros));
            }
            if !ip.trim().is_empty() {
                cmds.push(format!("set interfaces {} unit 0 family inet address {}/24", porta, ip.trim()));
            }
            cmds.push("commit".into());
            cmds
        }
        Fabricante::ArubaCx => {
            let mut cmds = vec!["configure terminal".into(), format!("interface {}", porta)];
            if !desc_limpa.is_empty() {
                cmds.push(format!("description {}", desc_limpa));
            }
            if modo_especial == "sem_vlan" {
                cmds.push("routing".into());
            } else if modo_especial == "trunk_all" {
                cmds.push("no routing".into());
                cmds.push("vlan trunk allowed all".into());
            } else if vlans.len() == 1 {
                cmds.push("no routing".into());
                cmds.push(format!("vlan access {}", vlans[0]));
            } else if vlans.len() > 1 {
                cmds.push("no routing".into());
                cmds.push(format!("vlan trunk allowed {}", vlans.join(",")));
            }
            if !ip.trim().is_empty() {
                cmds.push(format!("ip address {}/24", ip.trim()));
            }
            cmds.push("no shutdown".into());
            cmds.push("exit".into());
            cmds
        }
        Fabricante::TpLinkJetStream => {
            let mut cmds = vec!["configure".into(), format!("interface {}", porta)];
            if !desc_limpa.is_empty() {
                cmds.push(format!("description {}", desc_limpa));
            }
            if modo_especial == "trunk_all" {
                cmds.push("switchport mode trunk".into());
                cmds.push("switchport trunk allowed vlan all".into());
            } else if vlans.len() == 1 {
                cmds.push("switchport mode access".into());
                cmds.push(format!("switchport access vlan {}", vlans[0]));
            } else if vlans.len() > 1 {
                cmds.push("switchport mode general".into());
                cmds.push(format!("switchport general allowed vlan {} tagged", vlans.join(",")));
            }
            cmds.push("no shutdown".into());
            cmds.push("exit".into());
            cmds
        }
    }
}

/// Motor de Traducao Universal para Redes Wi-Fi Multi-VLAN.
pub fn traduzir_wifi(fab: &Fabricante, w: &WifiRede) -> Vec<String> {
    match fab {
        Fabricante::CiscoIos => crate::montar_comandos_wifi_multivlan(w),
        Fabricante::MikrotikRouterOs => {
            let mut cmds = vec![
                format!("/interface wireless security-profiles add name=PROF_{} mode=dynamic-keys wpa2-pre-shared-key=\"{}\"", w.ssid, w.chave),
                format!("/interface wireless add name=wlan_{} master-interface=wlan1 ssid=\"{}\" security-profile=PROF_{} disabled=no", w.ssid, w.ssid, w.ssid),
            ];
            for v in &w.vlans {
                cmds.push(format!("/interface bridge vlan add bridge=bridge1 tagged=wlan_{} vlan-ids={}", w.ssid, v));
            }
            cmds
        }
        Fabricante::HuaweiVrp => {
            let mut cmds = vec![
                "system-view".into(),
                "wlan".into(),
                format!("ssid-profile name PROF_{}", w.ssid),
                format!("ssid {}", w.ssid),
                "quit".into(),
                format!("vap-profile name VAP_{}", w.ssid),
                format!("ssid-profile PROF_{}", w.ssid),
            ];
            if w.vlans.len() > 1 {
                cmds.push(format!("service-vlan vlan-pool POOL_{} # VLANs {}", w.ssid, w.vlans.join(",")));
            } else if let Some(v0) = w.vlans.first() {
                cmds.push(format!("service-vlan vlan-id {}", v0));
            }
            cmds.push("quit".into());
            cmds.push("return".into());
            cmds
        }
        _ => {
            let mut cmds = vec![format!("# Traducao Universal ({}) — SSID {}", fab.nome_exibicao(), w.ssid)];
            cmds.extend(crate::montar_comandos_wifi_multivlan(w));
            cmds
        }
    }
}

/// Motor de Traducao Universal para Access Points Multi-VLAN.
pub fn traduzir_ap(fab: &Fabricante, ap: &AccessPointInfo) -> Vec<String> {
    match fab {
        Fabricante::CiscoIos => crate::montar_comandos_ap_multivlan(ap),
        Fabricante::MikrotikRouterOs => {
            let mut cmds = vec![
                format!("/caps-man configuration add name=CFG_{} ssid=\"{}\" datapath.bridge=bridge1", ap.nome, ap.ssid),
                format!("/caps-man provisioning add action=create-dynamic-enabled master-configuration=CFG_{} name-prefix={}", ap.nome, ap.nome),
            ];
            for v in &ap.vlans {
                cmds.push(format!("/interface bridge vlan add bridge=bridge1 tagged={} vlan-ids={}", ap.nome, v));
            }
            cmds
        }
        Fabricante::HuaweiVrp => {
            let mut cmds = vec![
                "system-view".into(),
                "wlan".into(),
                format!("ap-name {} # IP {} | VLANs {}", ap.nome, ap.ip, ap.vlans.join(",")),
                format!("vap-profile VAP_{} wlan 1 radio all", ap.ssid),
                "quit".into(),
                "return".into(),
            ];
            cmds
        }
        _ => crate::montar_comandos_ap_multivlan(ap),
    }
}

/// Motor de Traducao Universal para Roteamento + Ensinar Vizinhos.
pub fn traduzir_rota(fab: &Fabricante, rota: &RotaInfo) -> Vec<String> {
    match fab {
        Fabricante::CiscoIos => crate::montar_comandos_rota(rota),
        Fabricante::MikrotikRouterOs => {
            let mut cmds = vec![format!("/ip route add dst-address={}/24 gateway={} distance={}", rota.rede, rota.next_hop, if rota.ad.is_empty() { "1" } else { &rota.ad })];
            if rota.protocolo_vizinhos.to_uppercase().contains("OSPF") {
                cmds.push("/routing ospf instance set [find default=yes] redistribute-static=as-type-1".into());
            } else if rota.protocolo_vizinhos.to_uppercase().contains("BGP") {
                cmds.push("/routing bgp instance set default redistribute-static=yes".into());
            }
            cmds
        }
        Fabricante::HuaweiVrp => {
            let mut cmds = vec!["system-view".into(), format!("ip route-static {} {} {}", rota.rede, rota.mask, rota.next_hop)];
            if rota.protocolo_vizinhos.to_uppercase().contains("OSPF") {
                cmds.extend(["ospf 1".into(), "import-route static".into(), "quit".into()]);
            }
            cmds.push("return".into());
            cmds
        }
        Fabricante::JuniperJunos => {
            let mut cmds = vec![
                "configure".into(),
                format!("set routing-options static route {}/24 next-hop {}", rota.rede, rota.next_hop),
            ];
            if rota.protocolo_vizinhos.to_uppercase().contains("OSPF") {
                cmds.push("set protocols ospf export EXPORT_STATIC".into());
            }
            cmds.push("commit".into());
            cmds
        }
        _ => crate::montar_comandos_rota(rota),
    }
}

/// Motor de Traducao Universal para Acoes de Resposta a Incidentes (Central de Alertas).
/// acao: "bloquear_mac" | "trancar_porta" | "quarentena_vlan"
pub fn traduzir_acao_incidente(fab: &Fabricante, acao: &str, mac: &str, iface: &str) -> Vec<String> {
    let mac_limpo = if mac.trim().is_empty() { "00:00:00:00:00:00" } else { mac.trim() };
    let porta = if iface.trim().is_empty() { "FastEthernet0/1" } else { iface.trim() };

    match acao {
        "bloquear_mac" => match fab {
            Fabricante::MikrotikRouterOs => vec![
                format!("/interface bridge filter add chain=input action=drop src-mac-address={}/FF:FF:FF:FF:FF:FF comment=\"NetQuit_Block\"", mac_limpo),
                format!("/interface bridge filter add chain=forward action=drop src-mac-address={}/FF:FF:FF:FF:FF:FF comment=\"NetQuit_Block\"", mac_limpo),
            ],
            Fabricante::HuaweiVrp => vec![
                "system-view".into(),
                format!("mac-address blackhole {}", mac_limpo.replace(':', "-")),
                "return".into(),
            ],
            Fabricante::JuniperJunos => vec![
                "configure".into(),
                format!("set firewall family ethernet-switching filter NETQUIT_BLOCK term BLOCK_MAC from source-mac-address {}", mac_limpo),
                "set firewall family ethernet-switching filter NETQUIT_BLOCK term BLOCK_MAC then discard".into(),
                "commit".into(),
            ],
            Fabricante::ArubaCx => vec![
                "configure terminal".into(),
                "access-list mac NETQUIT_DENY".into(),
                format!("10 deny {} any", mac_limpo),
                "exit".into(),
            ],
            _ => {
                // Cisco IOS / TP-Link
                let mac_cisco = mac_limpo.replace(':', "").to_lowercase();
                let fmt_cisco = if mac_cisco.len() == 12 {
                    format!("{}.{}.{}", &mac_cisco[0..4], &mac_cisco[4..8], &mac_cisco[8..12])
                } else {
                    mac_limpo.to_string()
                };
                vec![
                    "mac access-list extended NETQUIT_BLACKLIST".into(),
                    format!("deny host {} any", fmt_cisco),
                    "permit any any".into(),
                    "exit".into(),
                    format!("mac address-table static {} vlan 1 drop", fmt_cisco),
                ]
            }
        },
        "trancar_porta" => match fab {
            Fabricante::MikrotikRouterOs => vec![
                format!("/interface disable [find name={}]", porta),
            ],
            Fabricante::HuaweiVrp => vec![
                "system-view".into(),
                format!("interface {}", porta),
                "shutdown".into(),
                "port-security enable".into(),
                "quit".into(),
                "return".into(),
            ],
            Fabricante::JuniperJunos => vec![
                "configure".into(),
                format!("set interfaces {} disable", porta),
                "commit".into(),
            ],
            _ => vec![
                format!("interface {}", porta),
                "shutdown".into(),
                "switchport port-security".into(),
                "switchport port-security violation shutdown".into(),
                "description BLOQUEADA_INCIDENTE_NETQUIT".into(),
                "exit".into(),
            ],
        },
        "quarentena_vlan" => match fab {
            Fabricante::MikrotikRouterOs => vec![
                format!("/interface bridge port set [find interface={}] pvid=999", porta),
            ],
            Fabricante::HuaweiVrp => vec![
                "system-view".into(),
                "vlan 999".into(),
                "description QUARENTENA_NETQUIT".into(),
                "quit".into(),
                format!("interface {}", porta),
                "port link-type access".into(),
                "port default vlan 999".into(),
                "quit".into(),
                "return".into(),
            ],
            _ => vec![
                "vlan 999".into(),
                "name QUARENTENA_NETQUIT".into(),
                "exit".into(),
                format!("interface {}", porta),
                "switchport mode access".into(),
                "switchport access vlan 999".into(),
                "description ISOLADA_QUARENTENA".into(),
                "exit".into(),
            ],
        },
        _ => vec![],
    }
}
