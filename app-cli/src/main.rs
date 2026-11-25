use clap::Parser;
use netcontrol_core::simulator::SimuladorCiscoIOS;
use netcontrol_core::{GerenciadorAlertas, SessaoCisco};
use std::io::{self, Write};
use std::path::Path;

#[derive(Parser, Debug)]
#[command(name = "netquit-cli", about = "NetQuit CLI (by Alt+F4 · Acabou, Quitou!) — Automacao Universal Multi-Vendor")]
struct Args {
    /// Ativa modo offline de simulacao/testes
    #[arg(long)]
    teste: bool,

    /// IP do roteador/switch Cisco
    #[arg(long, default_value = "192.168.1.1")]
    host: String,

    /// Desativa cores ANSI
    #[arg(long)]
    sem_cor: bool,

    /// Modo Alto Contraste
    #[arg(long)]
    alto_contraste: bool,

    /// Modo Daltonico (Okabe-Ito)
    #[arg(long)]
    daltonico: bool,

    /// Usa bordas ASCII puras (+ - |)
    #[arg(long)]
    ascii: bool,
}

fn ler_linha(prompt: &str) -> String {
    print!("{}", prompt);
    let _ = io::stdout().flush();
    let mut s = String::new();
    let _ = io::stdin().read_line(&mut s);
    s.trim().to_string()
}

fn main() {
    let args = Args::parse();
    let pasta_dados = if args.teste { "dados_rede_teste" } else { "dados_rede" };
    let alertas = GerenciadorAlertas::new(Path::new(pasta_dados));
    let sim = SimuladorCiscoIOS::new(&args.host);

    let cor_titulo = if args.sem_cor {
        ""
    } else if args.alto_contraste {
        "\x1b[1;97;40m"
    } else if args.daltonico {
        "\x1b[1;38;5;39m"
    } else {
        "\x1b[1;36m"
    };
    let reset = if args.sem_cor { "" } else { "\x1b[0m" };
    let linha = if args.ascii { "+----------------------------------------------------------+" } else { "────────────────────────────────────────────────────────────" };

    println!("{}{}{}", cor_titulo, linha, reset);
    println!("{}  NETQUIT CLI (by Alt+F4) - {}  {}", cor_titulo, if args.teste { "MODO TESTE" } else { "PRODUCAO" }, reset);
    println!("{}  Host: {} | Equipamento: {}  {}", cor_titulo, args.host, sim.hostname(), reset);
    println!("{}{}{}", cor_titulo, linha, reset);

    loop {
        println!("\n{}", linha);
        println!("  [1] Visao Geral");
        println!("  [2] Portas (Multi-VLAN)");
        println!("  [3] VLANs");
        println!("  [4] Wi-Fi (Multi-VLAN)");
        println!("  [5] Access Points");
        println!("  [6] Roteamento");
        println!("  [7] Radar & Trafego");
        println!("  [8] Central de Alertas");
        println!("  [0] Sair");
        println!("{}", linha);
        let op = ler_linha("\nEscolha uma opcao > ");
        match op.as_str() {
            "1" => {
                println!("\n--- VISAO GERAL ---");
                println!("Equipamento: {} | Portas: {} | VLANs: {} | Wi-Fi: {} | APs: {}",
                    sim.hostname(), sim.portas.len(), sim.vlans.len(), sim.redes_wifi.len(), sim.aps.len());
            }
            "2" => {
                println!("\n--- INTERFACES / PORTAS ---");
                for p in &sim.portas {
                    println!("  {:<20} | {:<9} | {:<15} | {}", p.nome, if p.ligada { "LIGADA" } else { "DESLIGADA" }, p.ip, p.vlan_resumo());
                }
            }
            "3" => {
                println!("\n--- VLANS ATIVAS ---");
                for v in &sim.vlans {
                    println!("  VLAN {:<4} | {:<16} | GW: {:<15} | Portas: {}", v.id, v.nome, v.gateway_svi, v.portas);
                }
            }
            "4" => {
                println!("\n--- REDES WI-FI (MULTI-VLAN) ---");
                for w in &sim.redes_wifi {
                    println!("  {:<20} | VLANs: {:<10} | {:<18} | Pool: {}", w.ssid, w.vlans.join(","), w.seguranca, w.pool_ip);
                }
            }
            "5" => {
                println!("\n--- ACCESS POINTS ---");
                for ap in &sim.aps {
                    println!("  {:<20} | {:<15} | VLANs: {:<8} | {}", ap.nome, ap.ip, ap.vlans.join(","), ap.status);
                }
            }
            "6" => {
                println!("\n--- TABELA DE ROTEAMENTO ---");
                for r in &sim.rotas {
                    println!("  {:<15} {:<15} -> {:<15} | {}", r.rede, r.mask, r.next_hop, r.protocolo_vizinhos);
                }
            }
            "7" => {
                println!("\n--- RADAR & TRAFEGO ---");
                for d in &sim.dispositivos {
                    println!("  {:<15} | {:<18} | Down: {:>6.1} Mbps | Up: {:>5.1} Mbps | Vol: {:>7.1} MB",
                        d.ip, d.hostname, d.download_mbps, d.upload_mbps, d.volume_acumulado_mb);
                }
            }
            "8" => {
                let lista = alertas.listar();
                println!("\n--- CENTRAL DE ALERTAS ({} registros) ---", lista.len());
                for a in lista.iter().rev().take(10) {
                    println!("  [{}] {} | Lido:{} | Resolvido:{} | {}", a.nivel.to_uppercase(), a.titulo, a.lido, a.resolvido, a.data_hora);
                }
            }
            "0" => {
                println!("Encerrando NetQuit CLI. Acabou, Quitou!");
                break;
            }
            _ => println!("Opcao invalida."),
        }
    }
}
