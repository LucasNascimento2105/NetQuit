use crate::{
    AccessPointInfo, DispositivoRadar, PortaInfo, RotaInfo, SessaoCisco, UsuarioConta, VlanInfo,
    WifiRede,
};

pub struct SimuladorCiscoIOS {
    pub hostname_eq: String,
    pub host_ip: String,
    pub portas: Vec<PortaInfo>,
    pub vlans: Vec<VlanInfo>,
    pub redes_wifi: Vec<WifiRede>,
    pub aps: Vec<AccessPointInfo>,
    pub rotas: Vec<RotaInfo>,
    pub dispositivos: Vec<DispositivoRadar>,
    pub usuarios_roteador: Vec<UsuarioConta>,
}

impl SimuladorCiscoIOS {
    pub fn new(host_ip: &str) -> Self {
        Self {
            hostname_eq: "Roteador-Matriz-ISR2911".to_string(),
            host_ip: host_ip.to_string(),
            portas: vec![
                PortaInfo {
                    nome: "GigabitEthernet0/0".into(),
                    ligada: true,
                    ip: host_ip.into(),
                    mask: "255.255.255.0".into(),
                    sw_mode: "".into(),
                    vlans: vec![],
                    descricao: "Servidor_ERP_Principal".into(),
                    clock_rate: "".into(),
                },
                PortaInfo {
                    nome: "GigabitEthernet0/1".into(),
                    ligada: true,
                    ip: "unassigned".into(),
                    mask: "".into(),
                    sw_mode: "trunk".into(),
                    vlans: vec!["10".into(), "20".into(), "30".into()],
                    descricao: "Uplink_Switch_Core".into(),
                    clock_rate: "".into(),
                },
                PortaInfo {
                    nome: "FastEthernet0/1".into(),
                    ligada: true,
                    ip: "unassigned".into(),
                    mask: "".into(),
                    sw_mode: "access".into(),
                    vlans: vec!["10".into()],
                    descricao: "Estacao_Financeiro".into(),
                    clock_rate: "".into(),
                },
                PortaInfo {
                    nome: "FastEthernet0/2".into(),
                    ligada: true,
                    ip: "unassigned".into(),
                    mask: "".into(),
                    sw_mode: "access".into(),
                    vlans: vec!["20".into()],
                    descricao: "Producao_Industria".into(),
                    clock_rate: "".into(),
                },
                PortaInfo {
                    nome: "FastEthernet0/3".into(),
                    ligada: false,
                    ip: "unassigned".into(),
                    mask: "".into(),
                    sw_mode: "access".into(),
                    vlans: vec!["1".into()],
                    descricao: "Porta_Reserva".into(),
                    clock_rate: "".into(),
                },
                PortaInfo {
                    nome: "Serial0/0/0".into(),
                    ligada: true,
                    ip: "10.0.0.1".into(),
                    mask: "255.255.255.252".into(),
                    sw_mode: "".into(),
                    vlans: vec![],
                    descricao: "Link_Filial_WAN".into(),
                    clock_rate: "64000".into(),
                },
            ],
            vlans: vec![
                VlanInfo { id: "1".into(), nome: "default".into(), status: "active".into(), portas: "Fa0/3".into(), gateway_svi: "192.168.1.1".into() },
                VlanInfo { id: "10".into(), nome: "Administracao".into(), status: "active".into(), portas: "Fa0/1, Gi0/1(T)".into(), gateway_svi: "192.168.10.1".into() },
                VlanInfo { id: "20".into(), nome: "Producao".into(), status: "active".into(), portas: "Fa0/2, Gi0/1(T)".into(), gateway_svi: "192.168.20.1".into() },
                VlanInfo { id: "30".into(), nome: "Visitantes".into(), status: "active".into(), portas: "Gi0/1(T)".into(), gateway_svi: "192.168.30.1".into() },
            ],
            redes_wifi: vec![
                WifiRede {
                    ssid: "FATEC_CORPORATIVO".into(),
                    seguranca: "WPA2-PSK (AES)".into(),
                    chave: "CiscoCorp2026".into(),
                    pool_ip: "192.168.10.0/24".into(),
                    radio: "Dot11Radio1".into(),
                    arquitetura: "IOS-XE (WLC)".into(),
                    vlans: vec!["10".into(), "20".into()],
                    status: "Ativa".into(),
                },
                WifiRede {
                    ssid: "FATEC_VISITANTES".into(),
                    seguranca: "Aberta (Sem Senha)".into(),
                    chave: "".into(),
                    pool_ip: "192.168.30.0/24".into(),
                    radio: "Dot11Radio0".into(),
                    arquitetura: "IOS Dot11 (AP/ISR)".into(),
                    vlans: vec!["30".into()],
                    status: "Ativa".into(),
                },
            ],
            aps: vec![
                AccessPointInfo {
                    nome: "AP-BLOCO-A-WLC".into(),
                    ip: "192.168.1.241".into(),
                    arquitetura: "Lightweight CAPWAP (WLC / IOS-XE)".into(),
                    modelo: "C9115AXI-Z".into(),
                    ssid: "FATEC_CORPORATIVO".into(),
                    vlans: vec!["10".into(), "20".into()],
                    seguranca: "WPA2-PSK (AES)".into(),
                    chave: "CiscoCorp2026".into(),
                    banda: "Dual-Band (2.4 + 5 GHz)".into(),
                    canal: "36".into(),
                    potencia: "100%".into(),
                    online: true,
                    status: "Registrado (UP)".into(),
                },
                AccessPointInfo {
                    nome: "AP-AUDITORIO-IOS".into(),
                    ip: "192.168.1.242".into(),
                    arquitetura: "Autonomo Cisco IOS (Aironet Direto)".into(),
                    modelo: "AIR-AP2702I".into(),
                    ssid: "FATEC_VISITANTES".into(),
                    vlans: vec!["30".into()],
                    seguranca: "WPA2-PSK (AES)".into(),
                    chave: "Visitantes2026".into(),
                    banda: "2.4 GHz (802.11b/g/n)".into(),
                    canal: "6".into(),
                    potencia: "75%".into(),
                    online: true,
                    status: "Online (SSH no AP)".into(),
                },
                AccessPointInfo {
                    nome: "AP-DEPOSITO-OFFLINE".into(),
                    ip: "192.168.99.250".into(),
                    arquitetura: "Autonomo Cisco IOS (Aironet Direto)".into(),
                    modelo: "AIR-AP1242G".into(),
                    ssid: "FATEC_ESTOQUE".into(),
                    vlans: vec!["20".into()],
                    seguranca: "WPA2-PSK (AES)".into(),
                    chave: "Estoque2026".into(),
                    banda: "2.4 GHz (802.11b/g/n)".into(),
                    canal: "11".into(),
                    potencia: "50%".into(),
                    online: false,
                    status: "Offline (Somente Leitura)".into(),
                },
            ],
            rotas: vec![
                RotaInfo {
                    rede: "0.0.0.0".into(),
                    mask: "0.0.0.0".into(),
                    next_hop: "10.0.0.2".into(),
                    ad: "1".into(),
                    protocolo_vizinhos: "OSPF (redistribute static subnets)".into(),
                },
                RotaInfo {
                    rede: "10.50.0.0".into(),
                    mask: "255.255.255.0".into(),
                    next_hop: "10.0.0.2".into(),
                    ad: "1".into(),
                    protocolo_vizinhos: "Nao ensinar vizinhos".into(),
                },
            ],
            dispositivos: vec![
                DispositivoRadar { ip: "192.168.1.10".into(), mac: "00:1A:2B:3C:4D:01".into(), hostname: "SRV-ERP-01".into(), interface: "Gi0/0".into(), download_mbps: 142.5, upload_mbps: 38.2, volume_acumulado_mb: 18420.0, novo: false },
                DispositivoRadar { ip: "192.168.10.22".into(), mac: "00:1A:2B:3C:4D:14".into(), hostname: "PC-FINANCEIRO-04".into(), interface: "Fa0/1".into(), download_mbps: 24.8, upload_mbps: 6.1, volume_acumulado_mb: 2310.5, novo: false },
                DispositivoRadar { ip: "192.168.30.88".into(), mac: "AA:BB:CC:99:10:FE".into(), hostname: "Smartphone-Visitante".into(), interface: "Dot11Radio0".into(), download_mbps: 11.4, upload_mbps: 2.3, volume_acumulado_mb: 412.0, novo: true },
            ],
            usuarios_roteador: vec![
                UsuarioConta { username: "admin".into(), privilegio: 15, origem: "roteador".into(), senha: "********".into() },
                UsuarioConta { username: "operador".into(), privilegio: 7, origem: "roteador".into(), senha: "********".into() },
            ],
        }
    }
}

impl SessaoCisco for SimuladorCiscoIOS {
    fn send_command(&mut self, cmd: &str) -> Result<String, String> {
        let low = cmd.trim().to_lowercase();
        if low.starts_with("write") || low.starts_with("copy run") {
            return Ok("Building configuration...\n[OK]".into());
        }
        if low.starts_with("show version") {
            return Ok(format!(
                "Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.7(3)M\n{} uptime is 14 days, 6 hours, 12 minutes",
                self.hostname_eq
            ));
        }
        Ok(format!("{}# {}\n[Simulador Cisco IOS OK]", self.hostname_eq, cmd))
    }

    fn send_config_set(&mut self, cmds: &[String]) -> Result<String, String> {
        let mut out = vec![format!("{}# configure terminal", self.hostname_eq)];
        for c in cmds {
            out.push(format!("{}(config)# {}", self.hostname_eq, c));
        }
        out.push(format!("{}# end", self.hostname_eq));
        Ok(out.join("\n"))
    }

    fn hostname(&self) -> String {
        self.hostname_eq.clone()
    }

    fn is_simulated(&self) -> bool {
        true
    }
}
