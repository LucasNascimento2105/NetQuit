use crate::SessaoCisco;
use ssh2::Session;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

/// Cliente SSHv2 real para roteadores e switches Cisco IOS / IOS-XE.
pub struct SessaoSSHReal {
    pub host: String,
    pub hostname_eq: String,
    sess: Session,
}

impl SessaoSSHReal {
    pub fn connect(host: &str, port: u16, user: &str, pass: &str) -> Result<Self, String> {
        let addr = format!("{}:{}", host, port);
        let tcp = TcpStream::connect_timeout(
            &addr.parse().map_err(|e| format!("Endereco invalido: {}", e))?,
            Duration::from_secs(8),
        )
        .map_err(|e| format!("Falha ao conectar em {}: {}", addr, e))?;

        let mut sess = Session::new().map_err(|e| format!("Erro SSH init: {}", e))?;
        sess.set_tcp_stream(tcp);
        sess.handshake().map_err(|e| format!("Handshake SSH falhou: {}", e))?;
        sess.userauth_password(user, pass)
            .map_err(|e| format!("Autenticacao SSH recusada: {}", e))?;

        if !sess.authenticated() {
            return Err("Falha de autenticacao no equipamento Cisco.".into());
        }

        Ok(Self {
            host: host.to_string(),
            hostname_eq: host.to_string(),
            sess,
        })
    }

    fn exec_shell(&mut self, lines: &[String]) -> Result<String, String> {
        let mut channel = self
            .sess
            .channel_session()
            .map_err(|e| format!("Erro ao abrir canal SSH: {}", e))?;
        channel
            .request_pty("vt100", None, None)
            .map_err(|e| format!("Erro PTY: {}", e))?;
        channel.shell().map_err(|e| format!("Erro Shell: {}", e))?;

        let mut payload = String::from("terminal length 0\n");
        for l in lines {
            payload.push_str(l);
            payload.push('\n');
        }
        payload.push_str("exit\n");

        channel
            .write_all(payload.as_bytes())
            .map_err(|e| format!("Erro escrita SSH: {}", e))?;
        channel.flush().ok();

        let mut output = String::new();
        let _ = channel.read_to_string(&mut output);
        let _ = channel.wait_close();
        Ok(output)
    }
}

impl SessaoCisco for SessaoSSHReal {
    fn send_command(&mut self, cmd: &str) -> Result<String, String> {
        self.exec_shell(&[cmd.to_string()])
    }

    fn send_config_set(&mut self, cmds: &[String]) -> Result<String, String> {
        let mut full = vec!["configure terminal".to_string()];
        full.extend(cmds.iter().cloned());
        full.push("end".to_string());
        self.exec_shell(&full)
    }

    fn hostname(&self) -> String {
        self.hostname_eq.clone()
    }

    fn is_simulated(&self) -> bool {
        false
    }
}
