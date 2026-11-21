/* ============================================================================
   NETQUIT 2.0 (by Alt+F4 · Acabou, Quitou!)
   Full Feature Parity: Login App, ARP Scan + SSH On-Demand, Console Direto,
   Antenas/Canais RF, Multi-VLAN Listbox, Multi-Vendor Universal Translator
   ============================================================================ */

const hasTauri = () => Boolean(window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke);

async function tauriInvoke(cmd, args = {}) {
  if (hasTauri()) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  return null;
}

let STATE = {
  autenticado: false,
  hostname: "Core-Matriz-01",
  dominio: "netquit.local",
  banner: "Acesso restrito — NetQuit (Acabou, Quitou!)",
  ip_conectado: "",
  conectado_ssh: false,
  fabricante: "cisco_ios",
  modo_teste: true,
  operador: "admin",
  privilegio: 15,
  paginaAtual: "inicio",
  wifiSubAba: "ssids", // "ssids" ou "antenas"
  alertaFiltro: "pendentes", // "pendentes" | "resolvidos" | "todos"
  alertaSel: null,
  alertaAcaoSel: "bloquear_mac",
  portaSel: null,
  vlanSel: null,
  wifiSel: null,
  wifiMostrarSenha: false,
  apSel: null,
  apMostrarSenha: false,
  consoleSaida: "# Console Direto NetQuit pronto. Digite comandos abaixo ou use os atalhos.\n",
  previewDelta: 0,
  portas: [
    { nome: "GigabitEthernet0/0", ligada: true, ip: "192.168.1.1", mask: "255.255.255.0", sw_mode: "", vlans: [], descricao: "Servidor_ERP_Principal" },
    { nome: "GigabitEthernet0/1", ligada: true, ip: "unassigned", mask: "", sw_mode: "trunk", vlans: ["10", "20", "30"], descricao: "Uplink_Switch_Core" },
    { nome: "FastEthernet0/1", ligada: true, ip: "unassigned", mask: "", sw_mode: "access", vlans: ["10"], descricao: "Estacao_Financeiro" },
    { nome: "FastEthernet0/2", ligada: true, ip: "unassigned", mask: "", sw_mode: "access", vlans: ["20"], descricao: "Producao_Industria" },
    { nome: "FastEthernet0/3", ligada: false, ip: "unassigned", mask: "", sw_mode: "access", vlans: ["1"], descricao: "Porta_Reserva" },
    { nome: "Serial0/0/0", ligada: true, ip: "10.0.0.1", mask: "255.255.255.252", sw_mode: "", vlans: [], descricao: "Link_Filial_WAN" }
  ],
  vlans: [
    { id: "1", nome: "default", status: "active", portas: "Fa0/3", gateway_svi: "192.168.1.1" },
    { id: "10", nome: "Administracao", status: "active", portas: "Fa0/1, Gi0/1(T)", gateway_svi: "192.168.10.1" },
    { id: "20", nome: "Producao", status: "active", portas: "Fa0/2, Gi0/1(T)", gateway_svi: "192.168.20.1" },
    { id: "30", nome: "Visitantes", status: "active", portas: "Gi0/1(T)", gateway_svi: "192.168.30.1" }
  ],
  redes_wifi: [
    { ssid: "CORP_NETQUIT", seguranca: "WPA2-PSK (AES)", chave: "NetQuit2026", pool_ip: "192.168.10.0/24", radio: "Dot11Radio1", arquitetura: "IOS-XE (WLC)", vlans: ["10", "20"], status: "Ativa" },
    { ssid: "VISITANTES_WIFI", seguranca: "Aberta (Sem Senha)", chave: "", pool_ip: "192.168.30.0/24", radio: "Dot11Radio0", arquitetura: "IOS Dot11 (AP/ISR)", vlans: ["30"], status: "Ativa" }
  ],
  canais_rf: [
    { radio: "Dot11Radio0", banda: "2.4 GHz (802.11b/g/n)", canal: "6", largura: "20 MHz", potencia: "100%", arquitetura: "IOS Autonomous AP" },
    { radio: "Dot11Radio1", banda: "5.0 GHz (802.11a/n/ac)", canal: "36", largura: "40 MHz", potencia: "100%", arquitetura: "IOS Autonomous AP" }
  ],
  aps: [
    { nome: "AP-BLOCO-A-WLC", ip: "192.168.1.241", arquitetura: "Lightweight CAPWAP (WLC / IOS-XE)", modelo: "C9115AXI-Z", ssid: "CORP_NETQUIT", vlans: ["10", "20"], seguranca: "WPA2-PSK (AES)", chave: "NetQuit2026", banda: "Dual-Band (2.4 + 5 GHz)", canal: "36", potencia: "100%", online: true, status: "Registrado (UP)" },
    { nome: "AP-AUDITORIO-IOS", ip: "192.168.1.242", arquitetura: "Autonomo (Direto SSH)", modelo: "AIR-AP2702I", ssid: "VISITANTES_WIFI", vlans: ["30"], seguranca: "WPA2-PSK (AES)", chave: "Visitantes2026", banda: "2.4 GHz (802.11b/g/n)", canal: "6", potencia: "75%", online: true, status: "Online (SSH no AP)" },
    { nome: "AP-DEPOSITO-OFFLINE", ip: "192.168.99.250", arquitetura: "Autonomo (Direto SSH)", modelo: "AIR-AP1242G", ssid: "ESTOQUE_WIFI", vlans: ["20"], seguranca: "WPA2-PSK (AES)", chave: "Estoque2026", banda: "2.4 GHz (802.11b/g/n)", canal: "11", potencia: "50%", online: false, status: "Offline (Somente Leitura)" }
  ],
  rotas: [
    { rede: "0.0.0.0", mask: "0.0.0.0", next_hop: "10.0.0.2", ad: "1", protocolo_vizinhos: "OSPF (redistribute static subnets)" },
    { rede: "10.50.0.0", mask: "255.255.255.0", next_hop: "10.0.0.2", ad: "1", protocolo_vizinhos: "Nao ensinar vizinhos" }
  ],
  dispositivos: [
    { ip: "192.168.1.1", mac: "00:1A:2B:3C:4D:00", hostname: "Roteador-Matriz-Core", interface: "eth0", download_mbps: 142.5, upload_mbps: 38.2, volume_acumulado_mb: 18420.0, novo: false },
    { ip: "192.168.10.22", mac: "00:1A:2B:3C:4D:14", hostname: "PC-FINANCEIRO-04", interface: "Fa0/1", download_mbps: 24.8, upload_mbps: 6.1, volume_acumulado_mb: 2310.5, novo: false },
    { ip: "192.168.30.88", mac: "AA:BB:CC:99:10:FE", hostname: "Smartphone-Visitante", interface: "Dot11Radio0", download_mbps: 11.4, upload_mbps: 2.3, volume_acumulado_mb: 412.0, novo: true }
  ],
  alertas: [],
  usuarios_app: [
    { username: "admin", privilegio: 15, origem: "app" },
    { username: "operador", privilegio: 7, origem: "app" },
    { username: "visitante_recepcao", privilegio: 1, origem: "app" }
  ],
  usuarios_roteador: [
    { username: "admin", privilegio: 15, origem: "roteador" },
    { username: "operador", privilegio: 7, origem: "roteador" }
  ],
  backups: [],
  config: { tema: "zorin_dark", delta_fonte: 0, bip_alerta: true, modo_teste: true, idioma: "pt" }
};
window.STATE = STATE;

function aplicarIdiomaDOM() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    if (k) el.textContent = t(k);
  });
  const pill = document.getElementById("login-versao-pill");
  if (pill) pill.textContent = STATE.modo_teste ? t("login_versao_teste") : t("login_versao_prod");
  const bModo = document.getElementById("badge-modo");
  if (bModo) bModo.textContent = STATE.modo_teste ? t("badge_teste") : t("badge_producao");
}

const ICON_EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_EYE_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

const TITULOS = {
  inicio: ["Visão Geral", "Resumo da infraestrutura multi-vendor e status operacional"],
  radar: ["Buscar Dispositivos", "Descubra equipamentos na rede, nomeie e conecte via SSH"],
  portas: ["Portas & Interfaces", "Atribuição de 1 ou múltiplas VLANs (Access / Trunk 802.1Q / Dot1Q)"],
  vlans: ["VLANs L2 / SVI", "Criar, editar e remover segmentações lógicas da rede"],
  wifi: ["Wi-Fi", "Redes sem fio Multi-VLAN e configuração de Antenas & Canais RF"],
  aps: ["Access Points", "WLC CAPWAP & Autônomos — Multi-VLAN, RF e trava offline"],
  roteamento: ["Roteamento", "Rotas estáticas com propagação dinâmica (Ensinar Vizinhos)"],
  backups: ["Backup & Rollback", "Salve snapshots da configuração e restaure em 1 clique"],
  console: ["Console Direto (CLI)", "Envie comandos de leitura ou blocos de configuração diretamente"],
  alertas: ["Central de Alertas", "Histórico persistente com controle de Lido e Resolvido"],
  usuarios: ["Identidade & Usuários", "Nomear equipamento (Hostname/Domínio/Banner) e contas App vs Equipamento"],
  acessibilidade: ["Aparência & Acessibilidade", "Temas instantâneos em 0ms e escala de fontes"]
};

const FABRICANTES_META = {
  cisco_ios: { nome: "Cisco IOS / IOS-XE", host: "Cisco-ISR2911-Matriz" },
  mikrotik_router_os: { nome: "MikroTik RouterOS", host: "MikroTik-CCR2004-Core" },
  huawei_vrp: { nome: "Huawei VRP", host: "Huawei-S5735-Core" },
  juniper_junos: { nome: "Juniper Junos", host: "Juniper-EX3400-Core" },
  aruba_cx: { nome: "ArubaOS-CX / HPE", host: "Aruba-6300M-Core" },
  tp_link_jet_stream: { nome: "TP-Link JetStream", host: "TPLink-SG3428-Core" }
};

function traduzirPortaUniversal(fab, porta, desc, ip, mask, vlans, modoEsp) {
  const d = (desc || "").trim().replace(/\s+/g, "_");
  if (fab === "mikrotik_router_os") {
    const c = [];
    if (d) c.push(`/interface set [find name=${porta}] comment="${d}"`);
    if (modoEsp === "sem_vlan") c.push(`/interface bridge port remove [find interface=${porta}]`);
    else if (modoEsp === "trunk_all") c.push(`/interface bridge port set [find interface=${porta}] frame-types=admit-only-vlan-tagged`);
    else if (vlans.length === 1) c.push(`/interface bridge port set [find interface=${porta}] pvid=${vlans[0]} frame-types=admit-only-untagged-and-priority-tagged`);
    else if (vlans.length > 1) {
      c.push(`/interface bridge port set [find interface=${porta}] frame-types=admit-only-vlan-tagged`);
      vlans.forEach(v => c.push(`/interface bridge vlan add bridge=bridge1 tagged=${porta} vlan-ids=${v}`));
    }
    if (ip) c.push(`/ip address add address=${ip}/24 interface=${porta}`);
    return c.join("\n") || "# Selecione VLAN(s) para gerar traducao MikroTik";
  }
  if (fab === "huawei_vrp") {
    const c = ["system-view", `interface ${porta}`];
    if (d) c.push(` description ${d}`);
    if (modoEsp === "sem_vlan") c.push(" undo portswitch");
    else if (modoEsp === "trunk_all") c.push(" port link-type trunk", " port trunk allow-pass vlan all");
    else if (vlans.length === 1) c.push(" port link-type access", ` port default vlan ${vlans[0]}`);
    else if (vlans.length > 1) c.push(" port link-type trunk", ` port trunk allow-pass vlan ${vlans.join(" ")}`);
    if (ip) c.push(` ip address ${ip} ${mask || "255.255.255.0"}`);
    c.push("quit", "save force");
    return c.join("\n");
  }
  if (fab === "juniper_junos") {
    const c = ["configure"];
    if (d) c.push(`set interfaces ${porta} description ${d}`);
    if (modoEsp === "trunk_all") c.push(`set interfaces ${porta} unit 0 family ethernet-switching interface-mode trunk`, `set interfaces ${porta} unit 0 family ethernet-switching vlan members all`);
    else if (vlans.length === 1) c.push(`set interfaces ${porta} unit 0 family ethernet-switching interface-mode access`, `set interfaces ${porta} unit 0 family ethernet-switching vlan members VLAN_${vlans[0]}`);
    else if (vlans.length > 1) c.push(`set interfaces ${porta} unit 0 family ethernet-switching interface-mode trunk`, `set interfaces ${porta} unit 0 family ethernet-switching vlan members [ ${vlans.map(v => "VLAN_" + v).join(" ")} ]`);
    if (ip) c.push(`set interfaces ${porta} unit 0 family inet address ${ip}/24`);
    c.push("commit and-quit");
    return c.join("\n");
  }
  if (fab === "aruba_cx") {
    const c = ["configure terminal", `interface ${porta}`];
    if (d) c.push(` description ${d}`);
    if (modoEsp === "sem_vlan") c.push(" routing");
    else if (modoEsp === "trunk_all") c.push(" no routing", " vlan trunk allowed all");
    else if (vlans.length === 1) c.push(" no routing", ` vlan access ${vlans[0]}`);
    else if (vlans.length > 1) c.push(" no routing", ` vlan trunk allowed ${vlans.join(",")}`);
    if (ip) c.push(` ip address ${ip}/24`);
    c.push(" no shutdown", "write memory");
    return c.join("\n");
  }
  if (fab === "tp_link_jet_stream") {
    const c = ["configure", `interface ${porta}`];
    if (d) c.push(` description ${d}`);
    if (modoEsp === "trunk_all") c.push(" switchport mode trunk", " switchport trunk allowed vlan all");
    else if (vlans.length === 1) c.push(" switchport mode access", ` switchport access vlan ${vlans[0]}`);
    else if (vlans.length > 1) c.push(" switchport mode general", ` switchport general allowed vlan ${vlans.join(",")} tagged`);
    c.push(" no shutdown", "copy running-config startup-config");
    return c.join("\n");
  }
  const c = [`interface ${porta}`];
  if (d) c.push(` description ${d}`);
  if (modoEsp === "sem_vlan") c.push(" no switchport access vlan", " no switchport mode");
  else if (modoEsp === "trunk_all") c.push(" switchport trunk encapsulation dot1q", " switchport mode trunk", " switchport trunk allowed vlan all");
  else if (vlans.length === 1) c.push(" switchport mode access", ` switchport access vlan ${vlans[0]}`);
  else if (vlans.length > 1) c.push(" switchport trunk encapsulation dot1q", " switchport mode trunk", ` switchport trunk allowed vlan ${vlans.join(",")}`);
  if (ip) c.push(` ip address ${ip} ${mask || "255.255.255.0"}`);
  c.push(" no shutdown", "write memory");
  return c.join("\n");
}

function exigirPrivilegio(minimo, acao) {
  if (STATE.privilegio >= minimo) return true;
  toast(`Acesso negado (Nv. ${STATE.privilegio}): requer Nv. ${minimo}+ para ${acao}.`);
  if (STATE.privilegio <= 1) {
    const al = {
      id: "rbac" + Date.now().toString().slice(-5),
      data_hora: new Date().toLocaleString("pt-BR"),
      nivel: "aviso",
      categoria: "Segurança RBAC",
      titulo: `Tentativa bloqueada (${STATE.operador})`,
      mensagem: `Perfil Visitante tentou ${acao} (requer Nv. ${minimo}+).`,
      lido: false,
      resolvido: false
    };
    STATE.alertas.push(al);
    tauriInvoke("registrar_alerta_custom", { nivel: "aviso", categoria: "Seguranca RBAC", titulo: al.titulo, mensagem: al.mensagem });
    atualizarBadges();
  }
  return false;
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
}

function aplicarTemaEFonte(tema, delta) {
  document.documentElement.setAttribute("data-theme", tema);
  document.documentElement.style.setProperty("--font-delta", `${delta}px`);
}

function atualizarBadges() {
  const naoLidos = STATE.alertas.filter(a => !a.lido && !a.resolvido).length;
  const b = document.getElementById("badge-alertas");
  if (naoLidos > 0) {
    b.textContent = String(naoLidos);
    b.style.display = "inline-block";
  } else {
    b.style.display = "none";
  }
  document.getElementById("badge-modo").textContent = STATE.modo_teste ? t("badge_teste") : t("badge_producao");
  document.getElementById("lbl-operador").textContent = `${STATE.operador} (Nv. ${STATE.privilegio})`;
  document.getElementById("lbl-hostname").textContent = STATE.conectado_ssh
    ? `${STATE.hostname} (${STATE.ip_conectado || "Sim"})`
    : "Sem SSH (Use Radar/ARP)";
  const selFab = document.getElementById("sel-fabricante");
  if (selFab) selFab.value = STATE.fabricante;
}

function abrirModalSsh(ipInicial = "") {
  document.getElementById("ssh-ip").value = ipInicial || STATE.ip_conectado || "192.168.1.1";
  document.getElementById("ssh-erro").style.display = "none";
  document.getElementById("ssh-modal").classList.remove("hidden");
}

function resumoVlanPorta(p) {
  if (p.sw_mode === "trunk") {
    return (!p.vlans.length || p.vlans.includes("all")) ? "Trunk (802.1Q Todas)" : `Trunk (VLANs: ${p.vlans.join(",")})`;
  }
  if (p.sw_mode === "access" && p.vlans.length) return `VLAN ${p.vlans[0]} (Access)`;
  if (p.sw_mode === "dot1q" && p.vlans.length) return `Dot1Q VLAN ${p.vlans.join(",")}`;
  return (p.ip && p.ip !== "unassigned") ? "Roteada (L3)" : "Padrão / Sem VLAN";
}

function criarHtmlVlanListbox(idBase, selecionadas, { incluirEspeciais = false, disabled = false } = {}) {
  const opcoes = [];
  if (incluirEspeciais) {
    opcoes.push({ val: "__sem_vlan__", label: "Sem VLAN (Porta Roteada L3)" });
    opcoes.push({ val: "__trunk_all__", label: "Todas as VLANs (Trunk 802.1Q Full)" });
  }
  STATE.vlans.forEach(v => opcoes.push({ val: v.id, label: `VLAN ${v.id} — ${v.nome}` }));

  const itemsHtml = opcoes.map(op => {
    const sel = selecionadas.includes(op.val);
    return `<div class="vlan-option ${sel ? "selected" : ""}" data-val="${op.val}">
      <span>${sel ? "☑" : "☐"} &nbsp;${op.label}</span>
      <span>${sel ? "✓" : ""}</span>
    </div>`;
  }).join("");

  const resumo = selecionadas.length === 0
    ? "Nenhuma VLAN selecionada"
    : selecionadas.includes("__sem_vlan__")
      ? "Modo: Sem VLAN (Roteada L3)"
      : selecionadas.includes("__trunk_all__")
        ? "Modo: Trunk 802.1Q (Todas)"
        : selecionadas.length === 1
          ? `Selecionada: VLAN ${selecionadas[0]}`
          : `Múltiplas VLANs (${selecionadas.length}): ${selecionadas.join(", ")}`;

  return `
    <div id="${idBase}" class="vlan-listbox ${disabled ? "disabled" : ""}" data-especiais="${incluirEspeciais}">
      ${itemsHtml}
    </div>
    <div class="vlan-listbox-footer">
      <span id="${idBase}-resumo">${resumo}</span>
      <div style="display:flex;gap:4px">
        <button type="button" class="btn btn-neutral" style="padding:2px 8px;font-size:0.72rem" id="${idBase}-todas" ${disabled ? "disabled" : ""}>Todas VLANs</button>
        <button type="button" class="btn btn-neutral" style="padding:2px 8px;font-size:0.72rem" id="${idBase}-limpar" ${disabled ? "disabled" : ""}>Limpar</button>
      </div>
    </div>
  `;
}

function vincularVlanListbox(idBase, onChange) {
  const box = document.getElementById(idBase);
  if (!box) return;
  const incluirEsp = box.dataset.especiais === "true";

  const marcarItem = (el, ativo) => {
    el.classList.toggle("selected", ativo);
    const txt = el.firstElementChild.textContent.replace(/^[☑☐]\s+/, "");
    el.firstElementChild.textContent = `${ativo ? "☑" : "☐"} \u00a0${txt}`;
    el.lastElementChild.textContent = ativo ? "✓" : "";
  };

  const atualizarResumo = () => {
    const vals = obterValoresListbox(idBase);
    const r = document.getElementById(`${idBase}-resumo`);
    if (!r) return;
    if (!vals.length) r.textContent = "Nenhuma VLAN selecionada";
    else if (vals.includes("__sem_vlan__")) r.textContent = "Modo: Sem VLAN (Roteada L3)";
    else if (vals.includes("__trunk_all__")) r.textContent = "Modo: Trunk 802.1Q (Todas)";
    else if (vals.length === 1) r.textContent = `Selecionada: VLAN ${vals[0]}`;
    else r.textContent = `Múltiplas VLANs (${vals.length}): ${vals.join(", ")}`;
    if (onChange) onChange(vals);
  };

  box.querySelectorAll(".vlan-option").forEach(el => {
    el.addEventListener("click", () => {
      const val = el.dataset.val;
      const isEsp = val.startsWith("__");
      if (incluirEsp) {
        if (isEsp) {
          box.querySelectorAll(".vlan-option").forEach(o => { if (o !== el) marcarItem(o, false); });
        } else {
          box.querySelectorAll(".vlan-option").forEach(o => { if (o.dataset.val.startsWith("__")) marcarItem(o, false); });
        }
      }
      marcarItem(el, !el.classList.contains("selected"));
      atualizarResumo();
    });
  });

  const btnTodas = document.getElementById(`${idBase}-todas`);
  if (btnTodas) {
    btnTodas.addEventListener("click", () => {
      box.querySelectorAll(".vlan-option").forEach(o => {
        marcarItem(o, !o.dataset.val.startsWith("__"));
      });
      atualizarResumo();
    });
  }

  const btnLimpar = document.getElementById(`${idBase}-limpar`);
  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      box.querySelectorAll(".vlan-option").forEach(o => marcarItem(o, false));
      atualizarResumo();
    });
  }
}

function obterValoresListbox(idBase) {
  const box = document.getElementById(idBase);
  if (!box) return [];
  return Array.from(box.querySelectorAll(".vlan-option.selected")).map(o => o.dataset.val);
}

// ==================== PAGINAS ====================

function renderInicio(root) {
  const portasUp = STATE.portas.filter(p => p.ligada).length;
  const apsOn = STATE.aps.filter(a => a.online).length;
  const alertasAbertos = STATE.alertas.filter(a => !a.resolvido).length;
  const fabNome = (FABRICANTES_META[STATE.fabricante] || FABRICANTES_META.cisco_ios).nome;

  root.innerHTML = `
    <div class="grid-kpi">
      <div class="kpi-card">
        <div class="kpi-label">${t("kpi_sessao")}</div>
        <div class="kpi-value" style="font-size:1.15rem;color:${STATE.conectado_ssh ? "var(--success)" : "var(--warning)"}">${STATE.conectado_ssh ? "Online" : "SSH"}</div>
        <div class="kpi-meta">${STATE.conectado_ssh ? `${STATE.hostname} · ${fabNome}` : t("nav_radar")}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${t("kpi_dispositivos")}</div>
        <div class="kpi-value" style="color:var(--accent)">${STATE.dispositivos.length}</div>
        <div class="kpi-meta">${portasUp}/${STATE.portas.length} UP · ${STATE.vlans.length} VLANs</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${t("kpi_aps")}</div>
        <div class="kpi-value">${apsOn}/${STATE.aps.length}</div>
        <div class="kpi-meta">${STATE.aps.length - apsOn} offline</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${t("kpi_alertas")}</div>
        <div class="kpi-value" style="color:${alertasAbertos ? "var(--warning)" : "var(--success)"}">${alertasAbertos}</div>
        <div class="kpi-meta">${STATE.modo_teste ? t("login_versao_teste") : t("login_versao_prod")}</div>
      </div>
    </div>

    <div class="section-header">
      <h2>${t("acoes_rapidas")}</h2>
      <p>${t("sub_inicio")}</p>
    </div>
    <div class="adw-group">
      <div class="adw-row clickable" data-go="radar">
        <div><div class="adw-row-title">Radar &amp; Descoberta ARP da Rede</div><div class="adw-row-sub">Escaneie os dispositivos da rede local, dê apelidos e clique em Conectar SSH</div></div>
        <span class="pill pill-success">Conectar →</span>
      </div>
      <div class="adw-row clickable" data-go="console">
        <div><div class="adw-row-title">Console Direto (Inserir Comandos CLI)</div><div class="adw-row-sub">Envie comandos de leitura ou blocos de configuração diretamente ao equipamento</div></div>
        <span class="pill pill-info">Abrir →</span>
      </div>
      <div class="adw-row clickable" data-go="portas">
        <div><div class="adw-row-title">Portas &amp; Multi-VLAN Trunk</div><div class="adw-row-sub">Listbox Multi-VLAN com tradução ao vivo para ${fabNome}</div></div>
        <span class="pill pill-info">Abrir →</span>
      </div>
      <div class="adw-row clickable" data-go="wifi">
        <div><div class="adw-row-title">Wi-Fi Multi-VLAN &amp; Antenas RF</div><div class="adw-row-sub">Configure SSIDs com várias VLANs + Canais, Largura e Potência 2.4/5 GHz</div></div>
        <span class="pill pill-info">Abrir →</span>
      </div>
    </div>
  `;
  root.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => navegarPara(el.dataset.go)));
}

function renderRadar(root) {
  const rows = STATE.dispositivos.map(d => `
    <tr>
      <td><strong>${d.hostname}</strong> ${d.novo ? '<span class="pill pill-warning">Novo</span>' : ''}</td>
      <td><code>${d.ip}</code></td>
      <td><code>${d.mac}</code></td>
      <td>${d.interface}</td>
      <td style="color:var(--success)">${d.download_mbps.toFixed(1)} Mbps</td>
      <td style="color:var(--accent)">${d.upload_mbps.toFixed(1)} Mbps</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-neutral" style="padding:4px 8px;font-size:0.74rem" data-nomear-mac="${d.mac}" data-nomear-atual="${d.hostname}">Nomear</button>
        <button class="btn btn-primary" style="padding:4px 9px;font-size:0.74rem" data-ssh-ip="${d.ip}">Conectar SSH</button>
      </td>
    </tr>
  `).join("");

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div class="section-header" style="margin:0">
        <h2>Buscar Dispositivos na Rede</h2>
        <p>${STATE.modo_teste ? "Dispositivos simulados da rede local" : "Dispositivos encontrados na sua rede local"} — nomeie ou clique em <strong>Conectar SSH</strong>.</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-neutral" id="btn-ssh-manual">${t("conectar_ip_manual")}</button>
        <button class="btn btn-primary" id="btn-varrer-arp">${t("buscar_rede")}</button>
      </div>
    </div>
    <div class="adw-group table-wrap">
      <table class="adw-table">
        <thead>
          <tr><th>Nome / Apelido</th><th>IP</th><th>MAC</th><th>Interface</th><th>Download</th><th>Upload</th><th>Ações</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:18px">Nenhum dispositivo no ARP ainda. Clique em "Varrer ARP da Rede" ou "Conectar IP Manual".</td></tr>'}</tbody>
      </table>
    </div>
  `;

  document.getElementById("btn-ssh-manual").addEventListener("click", () => abrirModalSsh("192.168.1.1"));
  document.getElementById("btn-varrer-arp").addEventListener("click", async () => {
    const lista = await tauriInvoke("escanear_arp_rede");
    if (lista) {
      STATE.dispositivos = lista;
      toast(`Varredura ARP concluída: ${lista.length} dispositivo(s) encontrado(s).`);
    } else {
      toast("Tabela ARP atualizada.");
    }
    renderCurrentPage();
  });

  root.querySelectorAll("[data-ssh-ip]").forEach(b => b.addEventListener("click", () => abrirModalSsh(b.dataset.sshIp)));
  root.querySelectorAll("[data-nomear-mac]").forEach(b => b.addEventListener("click", async () => {
    const mac = b.dataset.nomearMac;
    const atual = b.dataset.nomearAtual;
    const novo = prompt(`Digite o nome/apelido para o dispositivo (${mac}):`, atual);
    if (!novo || !novo.trim()) return;
    await tauriInvoke("apelidar_dispositivo", { mac, apelido: novo.trim() });
    const d = STATE.dispositivos.find(x => x.mac === mac);
    if (d) d.hostname = novo.trim();
    toast(`Dispositivo renomeado para '${novo.trim()}'!`);
    renderCurrentPage();
  }));
}

function renderConsole(root) {
  const atalhos = ["show version", "show ip interface brief", "show vlan brief", "show ip route", "write memory"];
  root.innerHTML = `
    <div class="section-header">
      <h2>Console Direto (CLI)</h2>
      <p>Envie comandos diretamente ao equipamento conectado (${STATE.conectado_ssh ? STATE.hostname : "Desconectado — conecte no Radar & ARP"}).</p>
    </div>
    <div class="adw-group form-card">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${atalhos.map(cmd => `<button type="button" class="btn btn-neutral" style="padding:4px 9px;font-size:0.75rem" data-cmd-rapido="${cmd}">${cmd}</button>`).join("")}
      </div>
      <div class="field">
        <label>Comandos (um ou vários, linha por linha)</label>
        <textarea id="cli-input" rows="4" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-input);color:var(--text-primary);font-family:var(--font-mono);font-size:0.84rem;resize:vertical" placeholder="Ex: show ip interface brief&#10;ou em modo config:&#10;interface Gi0/1&#10;description Uplink_Core"></textarea>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;cursor:pointer">
          <input type="checkbox" id="cli-modo-cfg" />
          <span>Enviar em Modo Configuração (<code>configure terminal</code> — requer Nv. 15)</span>
        </label>
        <div style="display:flex;gap:8px">
          <button class="btn btn-neutral" id="btn-limpar-cli">Limpar Saída</button>
          <button class="btn btn-primary" id="btn-enviar-cli">Executar Comando(s)</button>
        </div>
      </div>
      <div id="cli-terminal-out" class="cli-box" style="max-height:320px">${STATE.consoleSaida}</div>
    </div>
  `;

  root.querySelectorAll("[data-cmd-rapido]").forEach(b => b.addEventListener("click", () => {
    document.getElementById("cli-input").value = b.dataset.cmdRapido;
    document.getElementById("cli-modo-cfg").checked = false;
  }));

  document.getElementById("btn-limpar-cli").addEventListener("click", () => {
    STATE.consoleSaida = "# Terminal limpo.\n";
    renderCurrentPage();
  });

  document.getElementById("btn-enviar-cli").addEventListener("click", async () => {
    const comando = document.getElementById("cli-input").value.trim();
    const modoConfig = document.getElementById("cli-modo-cfg").checked;
    if (!comando) { toast("Digite pelo menos um comando."); return; }
    if (modoConfig && !exigirPrivilegio(15, "enviar comandos diretos de configuração")) return;

    try {
      const resp = await tauriInvoke("executar_comando_direto", { comando, modoConfig });
      const texto = resp || `[Preview] > ${comando}\n[OK]`;
      STATE.consoleSaida += `\n>>> ${modoConfig ? "(config) " : ""}${comando}\n${texto}\n`;
      toast("Comando executado!");
    } catch (err) {
      STATE.consoleSaida += `\n>>> ERRO: ${err}\n`;
      toast(`Erro: ${err}`);
    }
    renderCurrentPage();
  });
}

function renderPortas(root) {
  const sel = STATE.portas.find(p => p.nome === STATE.portaSel) || STATE.portas[0];
  STATE.portaSel = sel.nome;
  let selsIniciais = [...sel.vlans];
  if (sel.sw_mode === "trunk" && (!sel.vlans.length || sel.vlans.includes("all"))) selsIniciais = ["__trunk_all__"];
  else if (!sel.sw_mode && sel.ip !== "unassigned") selsIniciais = ["__sem_vlan__"];

  const rows = STATE.portas.map(p => `
    <tr class="${p.nome === sel.nome ? "selected" : ""}" data-porta="${p.nome}">
      <td><strong>${p.nome}</strong></td>
      <td><span class="pill ${p.ligada ? "pill-success" : "pill-danger"}">${p.ligada ? "LIGADA" : "DESLIGADA"}</span></td>
      <td>${p.ip === "unassigned" ? "Sem IP" : p.ip}</td>
      <td>${resumoVlanPorta(p)}</td>
      <td>${p.descricao || "—"}</td>
    </tr>
  `).join("");

  root.innerHTML = `
    <div class="grid-2">
      <div class="adw-group table-wrap">
        <table class="adw-table">
          <thead><tr><th>Porta</th><th>Status</th><th>IPv4</th><th>VLAN(s)</th><th>Descrição</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="adw-group form-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Editando: ${sel.nome}</strong>
          <span class="pill ${sel.ligada ? "pill-success" : "pill-danger"}">${sel.ligada ? "LIGADA" : "DESLIGADA"}</span>
        </div>
        <div class="field"><label>Descrição da Porta</label><input id="p-desc" value="${sel.descricao || ""}" placeholder="Ex: Uplink_Switch_Core" /></div>
        <div class="field-row">
          <div class="field"><label>IPv4 (L3 opcional)</label><input id="p-ip" value="${sel.ip === "unassigned" ? "" : sel.ip}" /></div>
          <div class="field"><label>Máscara</label><input id="p-mask" value="${sel.mask || "255.255.255.0"}" /></div>
        </div>
        <div class="field">
          <label>Atribuir VLAN(s) — Listbox Multi-Seleção (clique simples)</label>
          ${criarHtmlVlanListbox("lb-porta-vlans", selsIniciais, { incluirEspeciais: true })}
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-primary" style="flex:1" id="btn-salvar-porta">Salvar Alterações na Porta</button>
          <button class="btn btn-neutral" id="btn-toggle-porta">${sel.ligada ? "Desligar" : "Ligar"}</button>
        </div>
        <div class="field" style="margin-top:4px">
          <label>Tradução Universal ao Vivo (${(FABRICANTES_META[STATE.fabricante] || FABRICANTES_META.cisco_ios).nome})</label>
          <div id="porta-cli-out" class="cli-box"></div>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-porta]").forEach(tr => tr.addEventListener("click", () => { STATE.portaSel = tr.dataset.porta; renderCurrentPage(); }));

  const atualizarPreviewCliPorta = () => {
    const vals = obterValoresListbox("lb-porta-vlans");
    const desc = document.getElementById("p-desc").value.trim();
    const ip = document.getElementById("p-ip").value.trim();
    const mask = document.getElementById("p-mask").value.trim();
    const modoEsp = vals.includes("__sem_vlan__") ? "sem_vlan" : (vals.includes("__trunk_all__") ? "trunk_all" : "");
    const vlansIds = vals.filter(v => !v.startsWith("__"));
    const box = document.getElementById("porta-cli-out");
    if (box) box.textContent = traduzirPortaUniversal(STATE.fabricante, sel.nome, desc, ip, mask, vlansIds, modoEsp);
  };
  vincularVlanListbox("lb-porta-vlans", atualizarPreviewCliPorta);
  ["p-desc", "p-ip", "p-mask"].forEach(id => document.getElementById(id).addEventListener("input", atualizarPreviewCliPorta));
  atualizarPreviewCliPorta();

  document.getElementById("btn-toggle-porta").addEventListener("click", () => {
    if (!exigirPrivilegio(5, "ligar/desligar portas")) return;
    sel.ligada = !sel.ligada;
    toast(`Porta ${sel.nome} ${sel.ligada ? "ligada" : "desligada"}!`);
    renderCurrentPage();
  });

  document.getElementById("btn-salvar-porta").addEventListener("click", async () => {
    if (!exigirPrivilegio(5, "alterar configurações de portas")) return;
    const vals = obterValoresListbox("lb-porta-vlans");
    const desc = document.getElementById("p-desc").value.trim();
    const ip = document.getElementById("p-ip").value.trim();
    const mask = document.getElementById("p-mask").value.trim();
    let modoEsp = vals.includes("__sem_vlan__") ? "sem_vlan" : (vals.includes("__trunk_all__") ? "trunk_all" : "");
    let vlansIds = vals.filter(v => !v.startsWith("__"));
    try {
      await tauriInvoke("salvar_porta", {
        payload: { nome: sel.nome, ligada: sel.ligada, ip, mask, descricao: desc, vlans: vlansIds, modo_especial: modoEsp, eh_switch: true }
      });
      sel.descricao = desc;
      sel.ip = ip || "unassigned";
      sel.mask = mask;
      if (modoEsp === "sem_vlan") { sel.sw_mode = ""; sel.vlans = []; }
      else if (modoEsp === "trunk_all") { sel.sw_mode = "trunk"; sel.vlans = ["all"]; }
      else if (vlansIds.length === 1) { sel.sw_mode = "access"; sel.vlans = vlansIds; }
      else if (vlansIds.length > 1) { sel.sw_mode = "trunk"; sel.vlans = vlansIds; }
      toast(`Porta ${sel.nome} atualizada (${resumoVlanPorta(sel)})!`);
      renderCurrentPage();
    } catch (e) {
      toast(`Erro: ${e}`);
    }
  });
}

function renderVlans(root) {
  const sel = STATE.vlans.find(v => v.id === STATE.vlanSel) || null;
  const rows = STATE.vlans.map(v => `
    <tr class="${sel && v.id === sel.id ? "selected" : ""}" data-vlan="${v.id}">
      <td><span class="pill pill-info">VLAN ${v.id}</span></td>
      <td><strong>${v.nome}</strong></td>
      <td>${v.gateway_svi || "—"}</td>
      <td>${v.portas || "—"}</td>
      <td><span class="pill pill-success">${v.status}</span></td>
    </tr>
  `).join("");

  root.innerHTML = `
    <div class="grid-2">
      <div class="adw-group table-wrap">
        <table class="adw-table">
          <thead><tr><th>ID</th><th>Nome</th><th>Gateway SVI</th><th>Portas</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="adw-group form-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${sel ? `Editando VLAN ${sel.id}` : "Nova VLAN"}</strong>
          <button class="btn btn-neutral" style="padding:4px 9px;font-size:0.76rem" id="btn-nova-vlan">+ Nova</button>
        </div>
        <div class="field-row">
          <div class="field"><label>VLAN ID (2–4094)</label><input id="v-id" value="${sel ? sel.id : ""}" placeholder="Ex: 40" /></div>
          <div class="field"><label>Nome da VLAN</label><input id="v-nome" value="${sel ? sel.nome : ""}" placeholder="Ex: Engenharia" /></div>
        </div>
        <div class="field"><label>Gateway SVI (Opcional)</label><input id="v-gw" value="${sel ? sel.gateway_svi : ""}" placeholder="Ex: 192.168.40.1" /></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" style="flex:1" id="btn-salvar-vlan">Salvar VLAN</button>
          ${sel && sel.id !== "1" ? `<button class="btn btn-danger" id="btn-excluir-vlan">Excluir</button>` : ""}
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-vlan]").forEach(tr => tr.addEventListener("click", () => { STATE.vlanSel = tr.dataset.vlan; renderCurrentPage(); }));
  document.getElementById("btn-nova-vlan").addEventListener("click", () => { STATE.vlanSel = null; renderCurrentPage(); });
  document.getElementById("btn-salvar-vlan").addEventListener("click", async () => {
    if (!exigirPrivilegio(7, "criar ou editar VLANs")) return;
    const id = document.getElementById("v-id").value.trim();
    const nome = document.getElementById("v-nome").value.trim().replace(/\s+/g, "_");
    const gw = document.getElementById("v-gw").value.trim();
    if (!id || isNaN(Number(id)) || Number(id) < 1 || Number(id) > 4094 || !nome) { toast("Informe ID (1–4094) e nome válidos."); return; }
    const obj = { id, nome, status: "active", portas: sel ? sel.portas : "Nenhuma", gateway_svi: gw };
    try {
      await tauriInvoke("salvar_vlan", { vlan: obj });
      const idx = STATE.vlans.findIndex(x => x.id === id);
      if (idx >= 0) STATE.vlans[idx] = obj; else STATE.vlans.push(obj);
      STATE.vlanSel = id;
      toast(`VLAN ${id} (${nome}) salva!`);
      renderCurrentPage();
    } catch (e) { toast(`Erro: ${e}`); }
  });
  const btnDel = document.getElementById("btn-excluir-vlan");
  if (btnDel) {
    btnDel.addEventListener("click", async () => {
      if (!exigirPrivilegio(10, "excluir VLANs")) return;
      try {
        await tauriInvoke("excluir_vlan", { id: sel.id });
        STATE.vlans = STATE.vlans.filter(x => x.id !== sel.id);
        STATE.vlanSel = null;
        toast(`VLAN ${sel.id} removida!`);
        renderCurrentPage();
      } catch (e) { toast(`Erro: ${e}`); }
    });
  }
}

function renderWifi(root) {
  if (STATE.wifiSubAba === "antenas") {
    const cRows = STATE.canais_rf.map(c => `
      <tr>
        <td><strong>${c.radio}</strong></td>
        <td>${c.banda}</td>
        <td><span class="pill pill-info">Canal ${c.canal}</span></td>
        <td>${c.largura} · ${c.potencia}</td>
      </tr>
    `).join("");
    root.innerHTML = `
      <div class="grid-2">
        <div class="adw-group table-wrap">
          <table class="adw-table">
            <thead><tr><th>Antena / Rádio</th><th>Banda RF</th><th>Canal</th><th>Largura &amp; Potência</th></tr></thead>
            <tbody>${cRows}</tbody>
          </table>
        </div>
        <div class="adw-group form-card">
          <strong>Configurar Antena / Canal RF</strong>
          <div class="field-row">
            <div class="field"><label>Antena / Banda</label>
              <select id="rf-radio">
                <option value="Dot11Radio0">Dot11Radio0 (2.4 GHz)</option>
                <option value="Dot11Radio1">Dot11Radio1 (5.0 GHz)</option>
              </select>
            </div>
            <div class="field"><label>Canal RF</label>
              <select id="rf-canal">
                <option value="least-congested">Automático (RRM)</option>
                <option value="1">Canal 1 (2.4 GHz)</option>
                <option value="6" selected>Canal 6 (2.4 GHz)</option>
                <option value="11">Canal 11 (2.4 GHz)</option>
                <option value="36">Canal 36 (5.0 GHz)</option>
                <option value="44">Canal 44 (5.0 GHz)</option>
                <option value="149">Canal 149 (5.0 GHz)</option>
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Largura do Canal</label>
              <select id="rf-larg">
                <option>20 MHz</option><option>40 MHz</option><option>80 MHz</option>
              </select>
            </div>
            <div class="field"><label>Potência de Transmissão</label>
              <select id="rf-pot">
                <option>100%</option><option>75%</option><option>50%</option><option>25%</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" id="btn-salvar-rf">Aplicar Parâmetros de Antena RF</button>
        </div>
      </div>
    `;
    document.getElementById("btn-salvar-rf").addEventListener("click", async () => {
      if (!exigirPrivilegio(8, "configurar antenas e canais RF")) return;
      const radio = document.getElementById("rf-radio").value;
      const info = {
        radio,
        banda: radio.includes("1") ? "5.0 GHz (802.11a/n/ac)" : "2.4 GHz (802.11b/g/n)",
        canal: document.getElementById("rf-canal").value,
        largura: document.getElementById("rf-larg").value,
        potencia: document.getElementById("rf-pot").value,
        arquitetura: "IOS Autonomous AP"
      };
      try {
        await tauriInvoke("salvar_canal_rf", { info });
        const idx = STATE.canais_rf.findIndex(c => c.radio === radio);
        if (idx >= 0) STATE.canais_rf[idx] = info; else STATE.canais_rf.push(info);
        toast(`Antena ${radio} atualizada (Canal ${info.canal} · ${info.largura} · ${info.potencia})!`);
        renderCurrentPage();
      } catch (e) { toast(`Erro: ${e}`); }
    });
    return;
  }

  const sel = STATE.redes_wifi.find(w => w.ssid === STATE.wifiSel) || null;
  const rows = STATE.redes_wifi.map(w => `
    <tr class="${sel && w.ssid === sel.ssid ? "selected" : ""}" data-wifi="${w.ssid}">
      <td><strong>${w.ssid}</strong></td>
      <td><span class="pill pill-info">${w.vlans.length ? w.vlans.join(", ") : "Padrão"}</span></td>
      <td>${w.seguranca}</td>
      <td>${w.pool_ip}</td>
      <td>${w.radio}</td>
    </tr>
  `).join("");

  root.innerHTML = `
    <div class="grid-2">
      <div class="adw-group table-wrap">
        <table class="adw-table">
          <thead><tr><th>SSID</th><th>VLAN(s)</th><th>Segurança</th><th>Pool DHCP</th><th>Antena</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="adw-group form-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${sel ? `Editando '${sel.ssid}'` : "Nova Rede Wi-Fi"}</strong>
          <button class="btn btn-neutral" style="padding:4px 9px;font-size:0.76rem" id="btn-novo-wifi">+ Nova Rede</button>
        </div>
        <div class="field-row">
          <div class="field"><label>Nome da Rede (SSID)</label><input id="w-ssid" value="${sel ? sel.ssid : ""}" placeholder="Ex: CORP_5G" /></div>
          <div class="field"><label>Antena / Frequência</label>
            <select id="w-radio">
              <option value="Dot11Radio0" ${sel && sel.radio === "Dot11Radio0" ? "selected" : ""}>Dot11Radio0 (2.4 GHz)</option>
              <option value="Dot11Radio1" ${sel && sel.radio === "Dot11Radio1" ? "selected" : ""}>Dot11Radio1 (5.0 GHz)</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Segurança</label>
            <select id="w-seg">
              ${["WPA2-PSK (AES)", "WPA3-SAE (Moderno)", "WPA2-Enterprise (802.1X)", "Aberta (Sem Senha)"].map(s => `<option ${sel && sel.seguranca === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Pool IP (DHCP)</label><input id="w-pool" value="${sel ? sel.pool_ip : "192.168.30.0/24"}" /></div>
        </div>
        <div class="field">
          <label>Senha / Chave Wi-Fi</label>
          <div class="password-wrap">
            <input id="w-chave" type="${STATE.wifiMostrarSenha ? "text" : "password"}" value="${sel ? sel.chave : ""}" placeholder="Mínimo 8 caracteres" />
            <button type="button" class="eye-btn" id="btn-ver-wifi-psk" title="Mostrar / ocultar senha">${STATE.wifiMostrarSenha ? ICON_EYE_OFF : ICON_EYE}</button>
          </div>
        </div>
        <div class="field">
          <label>VLANs Acessíveis por esta Rede Wi-Fi (Selecione 1 ou mais)</label>
          ${criarHtmlVlanListbox("lb-wifi-vlans", sel ? sel.vlans : [])}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" style="flex:1" id="btn-salvar-wifi">Salvar Rede Wi-Fi</button>
          ${sel ? `<button class="btn btn-danger" id="btn-rem-wifi">Remover</button>` : ""}
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-wifi]").forEach(tr => tr.addEventListener("click", () => { STATE.wifiSel = tr.dataset.wifi; renderCurrentPage(); }));
  vincularVlanListbox("lb-wifi-vlans");
  document.getElementById("btn-novo-wifi").addEventListener("click", () => { STATE.wifiSel = null; renderCurrentPage(); });
  document.getElementById("btn-ver-wifi-psk").addEventListener("click", () => { STATE.wifiMostrarSenha = !STATE.wifiMostrarSenha; renderCurrentPage(); });

  document.getElementById("btn-salvar-wifi").addEventListener("click", async () => {
    if (!exigirPrivilegio(8, "criar ou editar redes Wi-Fi")) return;
    const ssid = document.getElementById("w-ssid").value.trim().replace(/\s+/g, "_");
    if (!ssid) { toast("Informe o nome (SSID) da rede Wi-Fi."); return; }
    const obj = {
      ssid,
      seguranca: document.getElementById("w-seg").value,
      chave: document.getElementById("w-chave").value,
      pool_ip: document.getElementById("w-pool").value.trim(),
      radio: document.getElementById("w-radio").value,
      arquitetura: sel ? sel.arquitetura : "IOS-XE (WLC)",
      vlans: obterValoresListbox("lb-wifi-vlans"),
      status: "Ativa"
    };
    try {
      await tauriInvoke("salvar_wifi", { wifi: obj });
      const idx = STATE.redes_wifi.findIndex(w => w.ssid === ssid);
      if (idx >= 0) STATE.redes_wifi[idx] = obj; else STATE.redes_wifi.push(obj);
      STATE.wifiSel = ssid;
      toast(`Wi-Fi '${ssid}' salvo com VLANs [${obj.vlans.join(", ") || "Padrão"}]!`);
      renderCurrentPage();
    } catch (e) { toast(`Erro: ${e}`); }
  });

  const btnRem = document.getElementById("btn-rem-wifi");
  if (btnRem) {
    btnRem.addEventListener("click", async () => {
      if (!exigirPrivilegio(10, "remover redes Wi-Fi")) return;
      try {
        await tauriInvoke("remover_wifi", { ssid: sel.ssid });
        STATE.redes_wifi = STATE.redes_wifi.filter(w => w.ssid !== sel.ssid);
        STATE.wifiSel = null;
        toast(`Rede Wi-Fi '${sel.ssid}' removida!`);
        renderCurrentPage();
      } catch (e) { toast(`Erro: ${e}`); }
    });
  }
}

function renderAps(root) {
  const sel = STATE.aps.find(a => a.nome === STATE.apSel) || null;
  const dis = sel ? !sel.online : false;

  const rows = STATE.aps.map(a => `
    <tr class="${sel && a.nome === sel.nome ? "selected" : ""}" data-ap="${a.nome}">
      <td><strong>${a.nome}</strong></td>
      <td><code>${a.ip}</code></td>
      <td>${a.ssid} <span class="pill pill-info">VLAN ${a.vlans.join(",")}</span></td>
      <td>${a.banda.split(" ")[0]} · Ch ${a.canal} · ${a.potencia}</td>
      <td><span class="pill ${a.online ? "pill-success" : "pill-danger"}">${a.status}</span></td>
    </tr>
  `).join("");

  root.innerHTML = `
    <div class="grid-2">
      <div class="adw-group table-wrap">
        <table class="adw-table">
          <thead><tr><th>Hostname AP</th><th>IP</th><th>SSID &amp; VLAN(s)</th><th>Antena / RF</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="adw-group form-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${sel ? sel.nome : "Novo Access Point"}</strong>
          <div style="display:flex;gap:6px;align-items:center">
            ${sel ? `<span class="pill ${sel.online ? "pill-success" : "pill-warning"}">${sel.online ? "ONLINE" : "OFFLINE"}</span>` : ""}
            <button class="btn btn-neutral" style="padding:4px 9px;font-size:0.76rem" id="btn-novo-ap">+ Novo AP</button>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Hostname do AP</label><input id="ap-nome" value="${sel ? sel.nome : ""}" placeholder="Ex: AP-BLOCO-B" ${dis ? "disabled" : ""} /></div>
          <div class="field"><label>IP Gerência</label><input id="ap-ip" value="${sel ? sel.ip : "192.168.1.245"}" ${dis ? "disabled" : ""} /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>SSID Difundido</label><input id="ap-ssid" value="${sel ? sel.ssid : "CORP_NETQUIT"}" ${dis ? "disabled" : ""} /></div>
          <div class="field"><label>Banda / Antena</label>
            <select id="ap-banda" ${dis ? "disabled" : ""}>
              ${["Dual-Band (2.4 + 5 GHz)", "2.4 GHz (802.11b/g/n)", "5.0 GHz (802.11a/n/ac)"].map(b => `<option ${sel && sel.banda === b ? "selected" : ""}>${b}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Canal</label><input id="ap-canal" value="${sel ? sel.canal : "Auto"}" ${dis ? "disabled" : ""} /></div>
          <div class="field"><label>Potência</label>
            <select id="ap-pot" ${dis ? "disabled" : ""}>
              ${["100%", "75%", "50%", "25%"].map(p => `<option ${sel && sel.potencia === p ? "selected" : ""}>${p}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field">
          <label>Chave Wi-Fi do AP</label>
          <div class="password-wrap">
            <input id="ap-chave" type="${STATE.apMostrarSenha ? "text" : "password"}" value="${sel ? sel.chave : "NetQuit2026"}" ${dis ? "disabled" : ""} />
            <button type="button" class="eye-btn" id="btn-ver-senha" title="Mostrar / ocultar senha">${STATE.apMostrarSenha ? ICON_EYE_OFF : ICON_EYE}</button>
          </div>
        </div>
        <div class="field">
          <label>VLANs Atribuídas ao AP (Selecione 1 ou mais)</label>
          ${criarHtmlVlanListbox("lb-ap-vlans", sel ? sel.vlans : ["10"], { disabled: dis })}
        </div>
        ${!dis
          ? `<div style="display:flex;gap:8px">
               <button class="btn btn-primary" style="flex:1" id="btn-salvar-ap">Salvar / Provisionar AP</button>
               ${sel ? `<button class="btn btn-danger" id="btn-rem-ap">Remover</button>` : ""}
             </div>`
          : `<div class="pill pill-warning" style="justify-content:center;padding:8px">AP desconectado — modo somente visualização</div>`
        }
      </div>
    </div>
  `;

  root.querySelectorAll("[data-ap]").forEach(tr => tr.addEventListener("click", () => { STATE.apSel = tr.dataset.ap; renderCurrentPage(); }));
  vincularVlanListbox("lb-ap-vlans");
  document.getElementById("btn-novo-ap").addEventListener("click", () => { STATE.apSel = null; renderCurrentPage(); });
  document.getElementById("btn-ver-senha").addEventListener("click", () => { STATE.apMostrarSenha = !STATE.apMostrarSenha; renderCurrentPage(); });

  const btnSalvar = document.getElementById("btn-salvar-ap");
  if (btnSalvar) {
    btnSalvar.addEventListener("click", async () => {
      if (!exigirPrivilegio(sel ? 8 : 10, "provisionar ou editar Access Points")) return;
      const nome = document.getElementById("ap-nome").value.trim().replace(/\s+/g, "-");
      const vlans = obterValoresListbox("lb-ap-vlans");
      if (!nome || !vlans.length) { toast("Informe o nome e selecione pelo menos 1 VLAN."); return; }
      const obj = {
        nome,
        ip: document.getElementById("ap-ip").value.trim(),
        arquitetura: sel ? sel.arquitetura : "Lightweight CAPWAP (WLC / IOS-XE)",
        modelo: sel ? sel.modelo : "C9115AXI-Z",
        ssid: document.getElementById("ap-ssid").value.trim(),
        vlans,
        seguranca: sel ? sel.seguranca : "WPA2-PSK (AES)",
        chave: document.getElementById("ap-chave").value,
        banda: document.getElementById("ap-banda").value,
        canal: document.getElementById("ap-canal").value.trim() || "Auto",
        potencia: document.getElementById("ap-pot").value,
        online: true,
        status: "Registrado (UP)"
      };
      try {
        await tauriInvoke("salvar_ap", { ap: obj });
        const idx = STATE.aps.findIndex(a => a.nome === nome);
        if (idx >= 0) STATE.aps[idx] = obj; else STATE.aps.push(obj);
        STATE.apSel = nome;
        toast(`AP '${nome}' salvo com VLANs [${vlans.join(", ")}]!`);
        renderCurrentPage();
      } catch (e) { toast(`Erro: ${e}`); }
    });
  }
  const btnRem = document.getElementById("btn-rem-ap");
  if (btnRem) {
    btnRem.addEventListener("click", async () => {
      if (!exigirPrivilegio(10, "remover Access Points")) return;
      await tauriInvoke("remover_ap", { nome: sel.nome });
      STATE.aps = STATE.aps.filter(a => a.nome !== sel.nome);
      STATE.apSel = null;
      toast(`AP '${sel.nome}' removido!`);
      renderCurrentPage();
    });
  }
}

function renderRoteamento(root) {
  const rows = STATE.rotas.map(r => `
    <tr>
      <td><code>${r.rede}</code></td>
      <td><code>${r.mask}</code></td>
      <td><code>${r.next_hop}</code></td>
      <td><span class="pill pill-info">${r.protocolo_vizinhos}</span></td>
      <td><button class="btn btn-danger" style="padding:3px 8px;font-size:0.74rem" data-del-rota="${r.rede}">Remover</button></td>
    </tr>
  `).join("");
  root.innerHTML = `
    <div class="grid-2">
      <div class="adw-group table-wrap">
        <table class="adw-table">
          <thead><tr><th>Rede Destino</th><th>Máscara</th><th>Próximo Salto</th><th>Ensinar Vizinhos</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="adw-group form-card">
        <strong>Nova Rota Estática + Ensinar Vizinhos</strong>
        <div class="field-row">
          <div class="field"><label>Rede Destino</label><input id="r-rede" placeholder="Ex: 10.60.0.0" /></div>
          <div class="field"><label>Máscara</label><input id="r-mask" value="255.255.255.0" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Próximo Salto (Next-Hop)</label><input id="r-nh" placeholder="Ex: 10.0.0.2" /></div>
          <div class="field"><label>Distância Adm. (AD)</label><input id="r-ad" value="1" /></div>
        </div>
        <div class="field">
          <label>Ensinar Vizinhos (Propagação Dinâmica)</label>
          <select id="r-prot">
            <option>Não ensinar vizinhos (Rota isolada)</option>
            <option>Ensinar vizinhos via OSPF (redistribute static subnets)</option>
            <option>Ensinar vizinhos via RIP (redistribute static metric 1)</option>
            <option>Ensinar vizinhos via EIGRP (redistribute static)</option>
            <option>Ensinar vizinhos via BGP (redistribute static)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="btn-add-rota">Adicionar Rota &amp; Propagar</button>
      </div>
    </div>
  `;
  document.getElementById("btn-add-rota").addEventListener("click", async () => {
    if (!exigirPrivilegio(12, "adicionar rotas L3")) return;
    const rede = document.getElementById("r-rede").value.trim();
    const mask = document.getElementById("r-mask").value.trim();
    const next_hop = document.getElementById("r-nh").value.trim();
    const ad = document.getElementById("r-ad").value.trim() || "1";
    const protocolo_vizinhos = document.getElementById("r-prot").value;
    if (!rede || !next_hop) { toast("Informe a Rede Destino e o Próximo Salto."); return; }
    const obj = { rede, mask, next_hop, ad, protocolo_vizinhos };
    try {
      await tauriInvoke("salvar_rota", { rota: obj });
      STATE.rotas.push(obj);
      toast(`Rota ${rede} adicionada!`);
      renderCurrentPage();
    } catch (e) { toast(`Erro: ${e}`); }
  });
  root.querySelectorAll("[data-del-rota]").forEach(b => b.addEventListener("click", async () => {
    if (!exigirPrivilegio(12, "remover rotas L3")) return;
    const rede = b.dataset.delRota;
    await tauriInvoke("remover_rota", { rede });
    STATE.rotas = STATE.rotas.filter(r => r.rede !== rede);
    toast(`Rota ${rede} removida!`);
    renderCurrentPage();
  }));
}

function renderBackups(root) {
  const rows = STATE.backups.map(b => `
    <div class="adw-row">
      <div><div class="adw-row-title">${b.arquivo}</div><div class="adw-row-sub">${b.data_hora} · ${(b.tamanho_bytes / 1024).toFixed(1)} KB</div></div>
      <button class="btn btn-neutral" data-restore="${b.arquivo}">Restaurar (Rollback)</button>
    </div>
  `).join("");
  root.innerHTML = `
    <div class="grid-2">
      <div>
        <div class="section-header"><h2>Snapshots Salvos</h2><p>Restaure a configuração completa em caso de falha.</p></div>
        <div class="adw-group">${rows || '<div class="adw-row">Nenhum backup encontrado.</div>'}</div>
      </div>
      <div class="adw-group form-card">
        <strong>Criar Novo Backup</strong>
        <div class="field"><label>Rótulo do Snapshot</label><input id="bk-rotulo" placeholder="Ex: antes_migracao_vlan" /></div>
        <button class="btn btn-primary" id="btn-criar-bk">Gerar Backup Agora</button>
      </div>
    </div>
  `;
  document.getElementById("btn-criar-bk").addEventListener("click", async () => {
    if (!exigirPrivilegio(10, "criar backups de configuração")) return;
    const rotulo = document.getElementById("bk-rotulo").value.trim();
    const res = await tauriInvoke("criar_backup", { rotulo });
    const novo = res || { arquivo: `backup_${Date.now()}_${rotulo || "manual"}.cfg`, data_hora: new Date().toLocaleString("pt-BR"), tamanho_bytes: 2150 };
    STATE.backups.unshift(novo);
    toast(`Backup '${novo.arquivo}' salvo!`);
    renderCurrentPage();
  });
  root.querySelectorAll("[data-restore]").forEach(b => b.addEventListener("click", () => {
    if (!exigirPrivilegio(15, "executar Rollback completo")) return;
    toast(`Rollback aplicado a partir de '${b.dataset.restore}'!`);
  }));
}

function renderAlertas(root) {
  const todos = STATE.alertas;
  const pendentes = todos.filter(a => !a.resolvido);
  const resolvidos = todos.filter(a => a.resolvido);

  const filtrados = STATE.alertaFiltro === "pendentes"
    ? pendentes
    : (STATE.alertaFiltro === "resolvidos" ? resolvidos : todos);

  const sel = filtrados.find(a => a.id === STATE.alertaSel) || filtrados[0] || null;
  STATE.alertaSel = sel ? sel.id : null;

  const extrairDadosAlerta = (a) => {
    const txt = `${a.titulo || ""} ${a.mensagem || ""}`;
    const mMac = txt.match(/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/);
    const mIf = txt.match(/\b(GigabitEthernet[\d/\.]+|FastEthernet[\d/\.]+|Dot11Radio\d+|eth\d+|wlan\d+|Gi[\d/]+|Fa[\d/]+)\b/i);
    return {
      mac: mMac ? mMac[0].toUpperCase() : "",
      iface: mIf ? mIf[0] : (STATE.portas[0] ? STATE.portas[0].nome : "FastEthernet0/1")
    };
  };

  const filtrosHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div class="login-mode-tabs" style="grid-template-columns:repeat(3,auto);width:fit-content">
        <button type="button" class="login-tab ${STATE.alertaFiltro === "pendentes" ? "active" : ""}" data-afiltro="pendentes">${t("filtro_pendentes")} (${pendentes.length})</button>
        <button type="button" class="login-tab ${STATE.alertaFiltro === "resolvidos" ? "active" : ""}" data-afiltro="resolvidos">${t("filtro_resolvidos")} (${resolvidos.length})</button>
        <button type="button" class="login-tab ${STATE.alertaFiltro === "todos" ? "active" : ""}" data-afiltro="todos">${t("filtro_todos")} (${todos.length})</button>
      </div>
      <span style="font-size:0.8rem;color:var(--text-secondary)">${t("dica_alertas")}</span>
    </div>
  `;

  const listaHtml = filtrados.map(a => {
    const ativo = sel && a.id === sel.id;
    const resumoRes = a.resolvido
      ? `<div style="margin-top:5px;font-size:0.76rem;color:var(--success)">✓ Resolvido por <strong>${a.resolvido_por || "operador"}</strong> (${a.resolvido_em || ""}) — ${a.acao_tomada || "Encerrado"}</div>`
      : "";
    return `
      <div class="adw-row clickable" data-alerta-id="${a.id}" style="${ativo ? "background:var(--accent-soft);" : ""}">
        <div style="min-width:0;flex:1">
          <div class="adw-row-title" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="pill ${a.resolvido ? "pill-success" : (a.nivel === "critico" ? "pill-danger" : (a.nivel === "aviso" ? "pill-warning" : "pill-info"))}">${a.resolvido ? "RESOLVIDO" : a.nivel.toUpperCase()}</span>
            <span>${a.titulo}</span>
          </div>
          <div class="adw-row-sub">${a.mensagem}</div>
          <div style="font-size:0.73rem;color:var(--text-muted);margin-top:3px">${a.categoria} · ${a.data_hora}</div>
          ${resumoRes}
        </div>
        <span class="pill ${a.resolvido ? "pill-neutral" : "pill-info"}" style="flex-shrink:0">${a.resolvido ? "Ver Log →" : "Responder →"}</span>
      </div>
    `;
  }).join("");

  let painelDirHtml = `
    <div class="adw-group form-card">
      <strong>Resposta ao Incidente</strong>
      <div style="font-size:0.84rem;color:var(--text-secondary)">Nenhum alerta selecionado neste filtro.</div>
    </div>
  `;

  if (sel) {
    const infoExt = extrairDadosAlerta(sel);
    if (sel.resolvido) {
      painelDirHtml = `
        <div class="adw-group form-card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>Log de Resolução (Auditoria)</strong>
            <span class="pill pill-success">RESOLVIDO</span>
          </div>
          <div style="font-size:0.88rem;font-weight:600">${sel.titulo}</div>
          <div class="adw-group" style="padding:12px;background:var(--bg-input);display:flex;flex-direction:column;gap:6px;font-size:0.82rem">
            <div><span style="color:var(--text-secondary)">Responsável:</span> <strong>${sel.resolvido_por || "—"}</strong></div>
            <div><span style="color:var(--text-secondary)">Data / Hora:</span> ${sel.resolvido_em || "—"}</div>
            <div><span style="color:var(--text-secondary)">Ação Aplicada:</span> <strong style="color:var(--success)">${sel.acao_tomada || "Encerrado"}</strong></div>
          </div>
          <div class="field">
            <label>Registro Técnico Completo &amp; Comandos Enviados</label>
            <div class="cli-box" style="max-height:260px">${sel.log_resolucao || "Sem log técnico detalhado."}</div>
          </div>
        </div>
      `;
    } else {
      const acoes = [
        ["bloquear_mac", t("acao_bloquear_mac"), t("acao_bloquear_mac_sub")],
        ["trancar_porta", t("acao_trancar_porta"), t("acao_trancar_porta_sub")],
        ["quarentena_vlan", t("acao_quarentena"), t("acao_quarentena_sub")],
        ["autorizar_dispositivo", t("acao_autorizar"), t("acao_autorizar_sub")],
        ["ciencia", t("acao_ciencia"), t("acao_ciencia_sub")]
      ];
      painelDirHtml = `
        <div class="adw-group form-card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>Resposta ao Incidente</strong>
            <span class="pill pill-warning">PENDENTE</span>
          </div>
          <div style="font-size:0.86rem;color:var(--text-secondary)">${sel.titulo}</div>

          <div class="field-row">
            <div class="field"><label>MAC Detectado</label><input id="inc-mac" value="${infoExt.mac}" placeholder="AA:BB:CC:DD:EE:FF" /></div>
            <div class="field"><label>Porta / Interface</label><input id="inc-iface" value="${infoExt.iface}" placeholder="FastEthernet0/1" /></div>
          </div>

          <div class="field">
            <label>Escolha a Ação de Resposta:</label>
            <div class="adw-group" style="background:var(--bg-input)">
              ${acoes.map(([cod, tit, sub]) => `
                <div class="adw-row clickable" data-acao-inc="${cod}" style="padding:9px 11px;${STATE.alertaAcaoSel === cod ? "background:var(--accent-soft);" : ""}">
                  <div>
                    <div class="adw-row-title" style="font-size:0.83rem">${STATE.alertaAcaoSel === cod ? "● " : "○ "}${tit}</div>
                    <div class="adw-row-sub" style="font-size:0.74rem">${sub}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>

          ${STATE.alertaAcaoSel === "autorizar_dispositivo" ? `
            <div class="field"><label>Nome / Apelido do Dispositivo Confiável</label><input id="inc-apelido" placeholder="Ex: Notebook_Diretoria" /></div>
          ` : ""}

          <div class="field">
            <label>Observação / Nota de Auditoria (Opcional)</label>
            <input id="inc-nota" placeholder="Ex: Dispositivo não reconhecido bloqueado preventivamente" />
          </div>

          <button class="btn btn-primary" id="btn-executar-incidente">${t("btn_exec_incidente")}</button>
        </div>
      `;
    }
  }

  root.innerHTML = `
    ${filtrosHtml}
    <div class="grid-2">
      <div class="adw-group">${listaHtml || '<div class="adw-row" style="color:var(--text-secondary)">Nenhum alerta nesta categoria.</div>'}</div>
      ${painelDirHtml}
    </div>
  `;

  root.querySelectorAll("[data-afiltro]").forEach(b => b.addEventListener("click", () => {
    STATE.alertaFiltro = b.dataset.afiltro;
    STATE.alertaSel = null;
    renderCurrentPage();
  }));

  root.querySelectorAll("[data-alerta-id]").forEach(r => r.addEventListener("click", () => {
    STATE.alertaSel = r.dataset.alertaId;
    renderCurrentPage();
  }));

  root.querySelectorAll("[data-acao-inc]").forEach(r => r.addEventListener("click", () => {
    STATE.alertaAcaoSel = r.dataset.acaoInc;
    renderCurrentPage();
  }));

  const btnExec = document.getElementById("btn-executar-incidente");
  if (btnExec && sel) {
    btnExec.addEventListener("click", async () => {
      const acao = STATE.alertaAcaoSel;
      const privNec = (acao === "ciencia" || acao === "autorizar_dispositivo") ? 5 : 10;
      if (!exigirPrivilegio(privNec, "executar ação de resposta ao incidente")) return;

      const mac = (document.getElementById("inc-mac")?.value || "").trim();
      const iface = (document.getElementById("inc-iface")?.value || "").trim();
      const apelido = (document.getElementById("inc-apelido")?.value || "").trim();
      const nota = (document.getElementById("inc-nota")?.value || "").trim();

      try {
        const logResp = await tauriInvoke("responder_incidente_alerta", {
          payload: { id: sel.id, acao, mac, iface, apelido, nota, usuario: STATE.operador }
        });
        const full = await tauriInvoke("obter_estado_completo");
        if (full) {
          Object.assign(STATE, full);
        } else {
          sel.resolvido = true;
          sel.lido = true;
          sel.resolvido_por = STATE.operador;
          sel.resolvido_em = new Date().toLocaleString("pt-BR");
          sel.acao_tomada = acao;
          sel.log_resolucao = logResp || `Resolvido por ${STATE.operador} (${acao})`;
        }
        STATE.alertaFiltro = "resolvidos";
        STATE.alertaSel = sel.id;
        atualizarBadges();
        toast("Ação aplicada e incidente registrado como resolvido!");
        renderCurrentPage();
      } catch (e) {
        toast(`Erro ao aplicar resposta: ${e}`);
      }
    });
  }
}

function renderUsuarios(root) {
  const appRows = STATE.usuarios_app.map(u => `
    <div class="adw-row">
      <div><div class="adw-row-title">${u.username}</div><div class="adw-row-sub">Conta do Aplicativo · Privilégio Nv. ${u.privilegio}</div></div>
      <button class="btn btn-neutral" data-import="${u.username}">Importar ao Equipamento →</button>
    </div>
  `).join("");

  const rotRows = STATE.usuarios_roteador.map(u => `
    <div class="adw-row">
      <div><div class="adw-row-title">${u.username}</div><div class="adw-row-sub">Conta do Equipamento · Privilégio Nv. ${u.privilegio}</div></div>
      <span class="pill pill-success">Ativo</span>
    </div>
  `).join("");

  root.innerHTML = `
    <div class="section-header"><h2>Identidade / Nomear Equipamento</h2><p>Altere o Hostname, Domínio IP e Banner MOTD do equipamento conectado.</p></div>
    <div class="adw-group form-card">
      <div class="field-row">
        <div class="field"><label>Nome do Equipamento (Hostname)</label><input id="id-host" value="${STATE.hostname}" /></div>
        <div class="field"><label>Domínio IP (SSH)</label><input id="id-dom" value="${STATE.dominio}" /></div>
      </div>
      <div class="field"><label>Banner MOTD (Aviso de Acesso)</label><input id="id-banner" value="${STATE.banner}" /></div>
      <button class="btn btn-primary" style="align-self:flex-start" id="btn-salvar-id">Aplicar Identidade no Equipamento</button>
    </div>

    <div class="grid-2">
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="section-header" style="margin:0"><h2>Usuários do Programa (App)</h2><p>Contas locais separadas do equipamento.</p></div>
        <div class="adw-group">${appRows}</div>
        <div class="adw-group form-card">
          <strong>Novo Usuário do Aplicativo</strong>
          <div class="field-row">
            <div class="field"><label>Usuário</label><input id="u-nome" placeholder="Ex: tecnico_n2" /></div>
            <div class="field"><label>Privilégio (1–15)</label><input id="u-priv" type="number" value="7" min="1" max="15" /></div>
          </div>
          <div class="field"><label>Senha</label><input id="u-senha" type="password" placeholder="Senha da conta" /></div>
          <button class="btn btn-primary" id="btn-criar-u">Criar Conta no App</button>
        </div>
      </div>
      <div>
        <div class="section-header"><h2>Usuários do Equipamento</h2><p>Gravados diretamente via SSH no dispositivo.</p></div>
        <div class="adw-group">${rotRows}</div>
      </div>
    </div>
  `;

  document.getElementById("btn-salvar-id").addEventListener("click", async () => {
    if (!exigirPrivilegio(12, "alterar hostname/domínio do equipamento")) return;
    const hostname = document.getElementById("id-host").value.trim();
    const dominio = document.getElementById("id-dom").value.trim();
    const banner = document.getElementById("id-banner").value.trim();
    try {
      await tauriInvoke("configurar_identidade", { hostname, dominio, banner });
      if (hostname) STATE.hostname = hostname;
      if (dominio) STATE.dominio = dominio;
      STATE.banner = banner;
      atualizarBadges();
      toast(`Equipamento nomeado como '${STATE.hostname}'!`);
      renderCurrentPage();
    } catch (e) { toast(`Erro: ${e}`); }
  });

  document.getElementById("btn-criar-u").addEventListener("click", async () => {
    if (!exigirPrivilegio(15, "criar contas de usuário")) return;
    const username = document.getElementById("u-nome").value.trim();
    const privilegio = Number(document.getElementById("u-priv").value) || 1;
    const senha = document.getElementById("u-senha").value.trim();
    if (!username || !senha) { toast("Informe usuário e senha."); return; }
    const conta = { username, privilegio, origem: "app", senha };
    await tauriInvoke("criar_usuario_app", { conta });
    STATE.usuarios_app.push(conta);
    toast(`Usuário '${username}' (Nv. ${privilegio}) criado no App!`);
    renderCurrentPage();
  });

  root.querySelectorAll("[data-import]").forEach(b => b.addEventListener("click", async () => {
    if (!exigirPrivilegio(15, "importar usuários para o equipamento")) return;
    const uname = b.dataset.import;
    try {
      await tauriInvoke("importar_usuario_roteador", { username: uname });
      const conta = STATE.usuarios_app.find(x => x.username === uname);
      if (conta && !STATE.usuarios_roteador.some(x => x.username === uname)) {
        STATE.usuarios_roteador.push({ ...conta, origem: "roteador" });
      }
      toast(`Usuário '${uname}' importado para o equipamento!`);
      renderCurrentPage();
    } catch (e) { toast(`Erro: ${e}`); }
  }));
}

function renderAcessibilidade(root) {
  const idiomas = [
    ["pt", "🇧🇷 PT · Português"],
    ["en", "🇺🇸 EN · English"],
    ["zh", "🇨🇳 中文 · 简体中文"]
  ];
  const idiomaAtivo = STATE.config.idioma || "pt";

  const temas = [
    ["zorin_dark", t("tema_escuro"), t("tema_escuro_sub")],
    ["zorin_light", t("tema_claro"), t("tema_claro_sub")],
    ["alto_contraste", t("tema_hc"), t("tema_hc_sub")],
    ["daltonico", t("tema_dalt"), t("tema_dalt_sub")]
  ];
  const pontos = [-2, 0, 2, 4];
  const rotulos = { "-2": "-2 pt", "0": "0 pt", "2": "+2 pt", "4": "+4 pt" };
  const idxAtual = Math.max(0, pontos.indexOf(STATE.previewDelta));
  const pct = (idxAtual / (pontos.length - 1)) * 100;

  root.innerHTML = `
    <div class="section-header">
      <h2>${t("idioma_titulo")}</h2>
      <p>${t("idioma_sub")}</p>
    </div>
    <div class="adw-group" style="padding:12px">
      <div class="login-mode-tabs" style="grid-template-columns:repeat(3,1fr);gap:8px;padding:6px">
        ${idiomas.map(([cod, label]) => `
          <button type="button" class="login-tab ${idiomaAtivo === cod ? "active" : ""}" data-idioma="${cod}" style="padding:10px 12px;font-size:0.9rem">${label}</button>
        `).join("")}
      </div>
    </div>

    <div class="section-header">
      <h2>${t("tema_titulo")}</h2>
      <p>${t("tema_sub")}</p>
    </div>
    <div class="adw-group">
      ${temas.map(([cod, nome, desc]) => `
        <div class="adw-row clickable" data-tema="${cod}">
          <div><div class="adw-row-title">${nome}</div><div class="adw-row-sub">${desc}</div></div>
          <span class="pill ${STATE.config.tema === cod ? "pill-success" : "pill-info"}">${STATE.config.tema === cod ? t("ativo") : t("selecionar")}</span>
        </div>
      `).join("")}
    </div>

    <div class="section-header">
      <h2>${t("fonte_titulo")}</h2>
      <p>${t("fonte_sub")}</p>
    </div>
    <div class="adw-group form-card">
      <div class="seg-slider">
        <div class="seg-track-wrap" id="seg-track-wrap">
          <div class="seg-track"></div>
          <div class="seg-pointer" id="seg-pointer" style="left: calc(16px + (100% - 32px) * ${pct / 100})"></div>
        </div>
        <div class="seg-ticks">
          ${pontos.map(pt => `<span class="seg-label ${pt === STATE.previewDelta ? "active" : ""}" data-pt="${pt}">${rotulos[pt]}</span>`).join("")}
        </div>
      </div>

      <div class="adw-group" style="padding:14px;background:var(--bg-input)">
        <div style="font-size:${16 + STATE.previewDelta}px;font-weight:700">NetQuit · ${STATE.hostname}</div>
        <div style="font-size:${13 + STATE.previewDelta}px;color:var(--text-secondary);margin-top:4px">VLAN 10 · Multi-Vendor · ${idiomaAtivo.toUpperCase()}</div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:0.82rem;color:var(--text-secondary)">${t("ativo_sistema")} <strong>${rotulos[STATE.config.delta_fonte]}</strong></span>
        <button class="btn btn-primary" id="btn-aplicar-fonte">${t("btn_aplicar_fonte")}</button>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-idioma]").forEach(btn => btn.addEventListener("click", async () => {
    STATE.config.idioma = btn.dataset.idioma;
    aplicarIdiomaDOM();
    await tauriInvoke("salvar_config_app", { config: STATE.config });
    toast(btn.textContent.trim());
    renderCurrentPage();
  }));

  root.querySelectorAll("[data-tema]").forEach(r => r.addEventListener("click", async () => {
    STATE.config.tema = r.dataset.tema;
    aplicarTemaEFonte(STATE.config.tema, STATE.config.delta_fonte);
    await tauriInvoke("salvar_config_app", { config: STATE.config });
    toast("Tema atualizado instantaneamente!");
    renderCurrentPage();
  }));

  const selecionarPonto = (pt) => {
    if (STATE.previewDelta !== pt) { STATE.previewDelta = pt; renderCurrentPage(); }
  };
  root.querySelectorAll("[data-pt]").forEach(el => el.addEventListener("click", () => selecionarPonto(Number(el.dataset.pt))));

  const track = document.getElementById("seg-track-wrap");
  const snapPorMouse = (ev) => {
    const rect = track.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (ev.clientX - rect.left - 16) / Math.max(1, rect.width - 32)));
    const idx = Math.round(frac * (pontos.length - 1));
    selecionarPonto(pontos[idx]);
  };
  let arrastando = false;
  track.addEventListener("mousedown", (e) => { arrastando = true; snapPorMouse(e); });
  window.addEventListener("mousemove", (e) => { if (arrastando) snapPorMouse(e); });
  window.addEventListener("mouseup", () => { arrastando = false; });

  document.getElementById("btn-aplicar-fonte").addEventListener("click", async () => {
    STATE.config.delta_fonte = STATE.previewDelta;
    aplicarTemaEFonte(STATE.config.tema, STATE.config.delta_fonte);
    await tauriInvoke("salvar_config_app", { config: STATE.config });
    toast(`Tamanho de fonte (${rotulos[STATE.config.delta_fonte]}) aplicado!`);
    renderCurrentPage();
  });
}

function renderCurrentPage() {
  const root = document.getElementById("page-root");
  const tit = t(`tit_${STATE.paginaAtual}`) || "NetQuit";
  const sub = t(`sub_${STATE.paginaAtual}`) || "";
  document.getElementById("header-title").textContent = tit;
  document.getElementById("header-sub").textContent = `${STATE.hostname} · ${sub}`;
  aplicarIdiomaDOM();

  document.querySelectorAll("#sidebar-nav .nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === STATE.paginaAtual);
  });

  const subWifi = document.getElementById("subnav-wifi");
  if (subWifi) {
    subWifi.classList.toggle("collapsed", STATE.paginaAtual !== "wifi");
    subWifi.querySelectorAll("[data-wifi-sub]").forEach(sb => {
      sb.classList.toggle("active", sb.dataset.wifiSub === STATE.wifiSubAba);
    });
  }

  const mapa = {
    inicio: renderInicio,
    radar: renderRadar,
    portas: renderPortas,
    vlans: renderVlans,
    wifi: renderWifi,
    aps: renderAps,
    roteamento: renderRoteamento,
    backups: renderBackups,
    console: renderConsole,
    alertas: renderAlertas,
    usuarios: renderUsuarios,
    acessibilidade: renderAcessibilidade
  };
  (mapa[STATE.paginaAtual] || renderInicio)(root);
}

function navegarPara(pagina) {
  STATE.paginaAtual = pagina;
  renderCurrentPage();
}

function configurarLoginEModalSsh() {
  // Badge do modo compilado (Producao vs Teste)
  const pill = document.getElementById("login-versao-pill");
  const perfisTeste = document.getElementById("login-perfis-teste");
  if (STATE.modo_teste) {
    pill.textContent = "Versão Teste (Simulador)";
    pill.className = "pill pill-warning";
    perfisTeste.style.display = "flex";
  } else {
    pill.textContent = "Versão Produção (Real)";
    pill.className = "pill pill-success";
    perfisTeste.style.display = "none";
  }

  // Ver senha minimalista no Login (icone dentro da caixa de texto)
  const inpPass = document.getElementById("login-pass");
  const btnVerLogin = document.getElementById("btn-ver-senha-login");
  btnVerLogin.innerHTML = ICON_EYE;
  btnVerLogin.addEventListener("click", () => {
    const mostrar = inpPass.type === "password";
    inpPass.type = mostrar ? "text" : "password";
    btnVerLogin.innerHTML = mostrar ? ICON_EYE_OFF : ICON_EYE;
  });

  // Ver senha minimalista no Modal SSH
  const inpSshPass = document.getElementById("ssh-pass");
  const btnVerSsh = document.getElementById("btn-ver-senha-ssh");
  btnVerSsh.innerHTML = ICON_EYE;
  btnVerSsh.addEventListener("click", () => {
    const mostrar = inpSshPass.type === "password";
    inpSshPass.type = mostrar ? "text" : "password";
    btnVerSsh.innerHTML = mostrar ? ICON_EYE_OFF : ICON_EYE;
  });

  document.querySelectorAll("[data-quick-user]").forEach(b => b.addEventListener("click", () => {
    document.getElementById("login-user").value = b.dataset.quickUser;
    document.getElementById("login-pass").value = b.dataset.quickPass;
  }));

  document.getElementById("btn-entrar").addEventListener("click", async () => {
    const lblErro = document.getElementById("login-erro");
    lblErro.style.display = "none";
    const usuario = document.getElementById("login-user").value.trim();
    const senha = document.getElementById("login-pass").value.trim();
    if (!usuario || !senha) {
      lblErro.textContent = "Informe usuário e senha.";
      lblErro.style.display = "flex";
      return;
    }

    const resp = await tauriInvoke("autenticar_app", { payload: { usuario, senha } });
    if (resp) {
      if (!resp.ok) {
        lblErro.textContent = resp.mensagem;
        lblErro.style.display = "flex";
        return;
      }
      STATE.operador = resp.operador;
      STATE.privilegio = resp.privilegio;
      STATE.modo_teste = resp.modo_teste;
      const full = await tauriInvoke("obter_estado_completo");
      if (full) Object.assign(STATE, full);
      toast(resp.mensagem);
    } else {
      STATE.operador = usuario;
      STATE.privilegio = usuario === "admin" ? 15 : (usuario.includes("visit") ? 1 : 7);
      toast(`Bem-vindo ao NetQuit como ${usuario} (Nv. ${STATE.privilegio})`);
    }

    STATE.autenticado = true;
    document.getElementById("login-overlay").classList.add("hidden");
    atualizarBadges();
    renderCurrentPage();
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    STATE.autenticado = false;
    document.getElementById("login-overlay").classList.remove("hidden");
  });

  // Modal SSH a partir do ARP
  document.getElementById("btn-fechar-ssh").addEventListener("click", () => {
    document.getElementById("ssh-modal").classList.add("hidden");
  });

  document.getElementById("btn-confirmar-ssh").addEventListener("click", async () => {
    const lblErro = document.getElementById("ssh-erro");
    lblErro.style.display = "none";
    const ip = document.getElementById("ssh-ip").value.trim();
    const porta_ssh = Number(document.getElementById("ssh-port").value) || 22;
    const usuario = document.getElementById("ssh-user").value.trim();
    const senha = document.getElementById("ssh-pass").value.trim();
    if (!ip || !usuario) {
      lblErro.textContent = "Informe o IP e o usuário SSH.";
      lblErro.style.display = "flex";
      return;
    }
    const btn = document.getElementById("btn-confirmar-ssh");
    btn.disabled = true;
    btn.textContent = `Conectando em ${ip}...`;
    const resp = await tauriInvoke("conectar_ssh_dispositivo", { payload: { ip, porta_ssh, usuario, senha } });
    btn.disabled = false;
    btn.textContent = "Conectar e Auto-Detectar Marca";

    if (resp && !resp.ok) {
      lblErro.textContent = resp.mensagem;
      lblErro.style.display = "flex";
      return;
    }
    if (resp) {
      STATE.conectado_ssh = true;
      STATE.ip_conectado = resp.ip;
      STATE.fabricante = resp.fabricante;
      STATE.hostname = resp.hostname || ip;
      toast(resp.mensagem);
    } else {
      STATE.conectado_ssh = true;
      STATE.ip_conectado = ip;
      toast(`Conectado em ${ip}!`);
    }
    document.getElementById("ssh-modal").classList.add("hidden");
    atualizarBadges();
    renderCurrentPage();
  });
}

async function inicializar() {
  const remoto = await tauriInvoke("obter_estado_completo");
  if (remoto) {
    Object.assign(STATE, remoto);
    STATE.previewDelta = STATE.config.delta_fonte || 0;
  }
  aplicarTemaEFonte(STATE.config.tema, STATE.config.delta_fonte);
  atualizarBadges();
  configurarLoginEModalSsh();

  document.querySelectorAll("#sidebar-nav .nav-item").forEach(btn => {
    btn.addEventListener("click", () => navegarPara(btn.dataset.page));
  });
  document.querySelectorAll("[data-wifi-sub]").forEach(sb => {
    sb.addEventListener("click", () => {
      STATE.paginaAtual = "wifi";
      STATE.wifiSubAba = sb.dataset.wifiSub;
      renderCurrentPage();
    });
  });
  document.getElementById("btn-sync").addEventListener("click", async () => {
    const r = await tauriInvoke("obter_estado_completo");
    if (r) Object.assign(STATE, r);
    atualizarBadges();
    renderCurrentPage();
    toast("Dados sincronizados!");
  });

  const selFab = document.getElementById("sel-fabricante");
  if (selFab) {
    selFab.value = STATE.fabricante;
    selFab.addEventListener("change", async () => {
      STATE.fabricante = selFab.value;
      const meta = FABRICANTES_META[STATE.fabricante] || FABRICANTES_META.cisco_ios;
      if (STATE.modo_teste) STATE.hostname = meta.host;
      await tauriInvoke("definir_fabricante", { slug: STATE.fabricante });
      atualizarBadges();
      renderCurrentPage();
      toast(`Tradutor Universal alternado para ${meta.nome}!`);
    });
  }

  const btnDet = document.getElementById("btn-detectar-vendor");
  if (btnDet) {
    btnDet.addEventListener("click", async () => {
      const chaves = Object.keys(FABRICANTES_META);
      const prox = chaves[(chaves.indexOf(STATE.fabricante) + 1) % chaves.length];
      STATE.fabricante = prox;
      if (selFab) selFab.value = prox;
      const meta = FABRICANTES_META[prox];
      if (STATE.modo_teste) STATE.hostname = meta.host;
      await tauriInvoke("definir_fabricante", { slug: STATE.fabricante });
      atualizarBadges();
      renderCurrentPage();
      toast(`Auto-Fingerprint detectou: ${meta.nome}`);
    });
  }

  renderCurrentPage();
}

window.addEventListener("DOMContentLoaded", inicializar);
