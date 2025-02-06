import { carregarDashboard } from "./dashboard.js";
import {
  mostrarToast,
  mostrarElemento,
  ocultarElemento,
  salvarEstadoFormulario,
  getEstadoFormulario,
} from "./utils.js";
import { storageManager } from "./storagemanager.js";

function togglePasswordVisibility(passwordInput, toggleButton) {
  // Alterna entre mostrar e esconder a senha
  const isPasswordVisible = passwordInput.type === "text";
  passwordInput.type = isPasswordVisible ? "password" : "text";

  // Seleciona o SVG dentro do botão
  const svgIcon = toggleButton.querySelector("svg");

  if (isPasswordVisible) {
    // Quando a senha está visível, adiciona a linha diagonal
    svgIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        `;
  } else {
    // Quando a senha está escondida, remove a linha diagonal
    svgIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        `;
  }
}

// Adiciona event listeners para os campos de senha
document.addEventListener("DOMContentLoaded", () => {
  // Login
  const toggleSenhaLogin = document.getElementById("toggleSenhaLogin");
  const senhaLogin = document.getElementById("senhalogin");

  toggleSenhaLogin.addEventListener("click", () => {
    togglePasswordVisibility(senhaLogin, toggleSenhaLogin);
  });

  // Cadastro - Senha
  const toggleSenhaCadastro = document.getElementById("toggleSenhaCadastro");
  const senhaCadastro = document.getElementById("senhaCadastro");

  toggleSenhaCadastro.addEventListener("click", () => {
    togglePasswordVisibility(senhaCadastro, toggleSenhaCadastro);
  });

  // Cadastro - Confirmar Senha
  const toggleConfirmeSenhaCadastro = document.getElementById(
    "toggleConfirmeSenhaCadastro"
  );
  const confirmeSenhaCadastro = document.getElementById(
    "confirmeSenhaCadastro"
  );

  toggleConfirmeSenhaCadastro.addEventListener("click", () => {
    togglePasswordVisibility(
      confirmeSenhaCadastro,
      toggleConfirmeSenhaCadastro
    );
  });
});

class FormManager {
  constructor() {
    this.inicializarElementos();
    this.inicializarEventos();
    this.configurarToastr();
    this.verificarEstadoInicial();
  }

  inicializarElementos() {
    // Formulários
    this.loginForm = document.querySelector("#loginForm");
    this.cadastroForm = document.querySelector("#cadastroForm");
    this.redefinirForm = document.querySelector("#redefinirForm");
    this.dashboard = document.querySelector("#dashboard");

    // Campos de Login
    this.loginUsuario = document.querySelector("#loginUsuario");
    this.senhaLogin = document.querySelector("#senhalogin");
    this.btnLogin = document.querySelector("#btnLogin");

    // Navegação
    this.linkCadastro = document.querySelector("#linkCadastro");
    this.linkVoltarLogin = document.querySelector("#linkVoltarLogin");
    this.linkEsqueciSenha = document.querySelector("#linkEsqueciSenha");
    this.btnLogout = document.querySelector("#btnLogout");

    // UI
    this.btnToggleDarkMode = document.querySelector("#btnToggleDarkMode");
    this.loadingOverlay = document.querySelector("#loadingOverlay");

    if (!this.loginForm || !this.cadastroForm || !this.dashboard) {
      console.error("Elementos essenciais não encontrados");
    }
  }

  configurarToastr() {
    toastr.options = {
      closeButton: true,
      debug: false,
      newestOnTop: true,
      progressBar: true,
      positionClass: "toast-top-right",
      preventDuplicates: true,
      onclick: null,
      showDuration: "300",
      hideDuration: "1000",
      timeOut: "5000",
      extendedTimeOut: "1000",
      showEasing: "swing",
      hideEasing: "linear",
      showMethod: "fadeIn",
      hideMethod: "fadeOut",
      tapToDismiss: false,
    };
  }

  inicializarEventos() {
    // Eventos de Navegação
    this.linkCadastro?.addEventListener("click", (e) => this.irParaCadastro(e));
    this.linkVoltarLogin?.addEventListener("click", (e) =>
      this.voltarParaLogin(e)
    );
    this.linkEsqueciSenha?.addEventListener("click", (e) =>
      this.mostrarRecuperacaoSenha(e)
    );

    // Login/Logout
    this.btnLogin?.addEventListener("click", () => this.realizarLogin());
    this.btnLogout?.addEventListener("click", () => this.realizarLogout());

    // Tema
    this.btnToggleDarkMode?.addEventListener("click", () =>
      this.alternarTema()
    );

    // Cadastro
    document
      .querySelector("#btnCadastrar")
      ?.addEventListener("click", (e) => this.realizarCadastro(e));

    // Redefinição de Senha
    document
      .querySelector("#btnRedefinirSenha")
      ?.addEventListener("click", () => this.redefinirSenha());

    // Validações
    this.inicializarValidacoes();

    // Enter nos formulários
    this.inicializarEnterForms();
  }

  async verificarEmail() {
    const emailInput = document.querySelector("#email");
    if (!emailInput) return;
    const email = emailInput.value.trim();

    // Validação do formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailInput.classList.add("input-error");
      mostrarToast("Por favor, insira um e-mail válido.", "error");
      return;
    }

    try {
      this.mostrarLoading();
      const response = await fetch(
        "https://casadopai-v3.onrender.com/usuarios/"
      );
      if (!response.ok) throw new Error("Erro na resposta da rede");
      const usuarios = await response.json();
      const emailJaEmUso = usuarios.some((usuario) => usuario.email === email);
      if (emailJaEmUso) {
        emailInput.classList.add("input-error");
        mostrarToast("Este e-mail já está em uso.", "error");
      } else {
        emailInput.classList.remove("input-error");
        mostrarToast("E-mail disponível!", "success");
      }
    } catch (error) {
      console.error("Erro ao verificar o e-mail:", error);
      mostrarToast("Erro ao verificar o e-mail. Tente novamente.", "error");
    } finally {
      this.ocultarLoading();
    }
  }

  inicializarValidacoes() {
    // Email
    const emailInput = document.querySelector("#email");
    emailInput?.addEventListener("blur", () => this.verificarEmail());

    // Senha
    const senhaCadastro = document.querySelector("#senhaCadastro");
    const confirmeSenhaCadastro = document.querySelector(
      "#confirmeSenhaCadastro"
    );

    senhaCadastro?.addEventListener("input", () => this.verificarForcaSenha());
    confirmeSenhaCadastro?.addEventListener("input", () =>
      this.verificarForcaSenha()
    );

    // Máscara de telefone
    const telefoneInput = document.querySelector("#telefone");
    telefoneInput?.addEventListener("input", (e) => this.mascaraTelefone(e));

    // Campos condicionais
    this.inicializarCamposCondicionais();
  }

  inicializarCamposCondicionais() {
    const participaMinisterio = document.querySelector("#participaMinisterio");
    const selectMinisterio = document.querySelector("#selectMinisterio");
    const participaCelula = document.querySelector("#participaCelula");
    const selectCelula = document.querySelector("#selectCelula");

    participaMinisterio?.addEventListener("change", () => {
      if (selectMinisterio) {
        participaMinisterio.checked
          ? mostrarElemento(selectMinisterio)
          : ocultarElemento(selectMinisterio);
      }
    });

    participaCelula?.addEventListener("change", () => {
      if (selectCelula) {
        participaCelula.checked
          ? mostrarElemento(selectCelula)
          : ocultarElemento(selectCelula);
      }
    });
  }

  verificarEstadoInicial() {
    const usuarioLogado = storageManager.getUsuarioLogado();
    const formularioAtivo = getEstadoFormulario();

    if (usuarioLogado) {
      this.mostrarDashboard(usuarioLogado);
    } else if (formularioAtivo === "cadastro") {
      this.mostrarCadastro();
    } else {
      this.mostrarLogin();
    }

    // Verificar tema
    this.verificarTema();
  }

  mostrarDashboard(usuario) {
    ocultarElemento(this.loginForm);
    ocultarElemento(this.cadastroForm);
    mostrarElemento(this.dashboard);
    carregarDashboard(usuario.tipoUsuario, usuario.idUsuario, usuario.idCelula);
  }

  mostrarCadastro() {
    ocultarElemento(this.loginForm);
    mostrarElemento(this.cadastroForm);
    ocultarElemento(this.dashboard);
  }

  mostrarLogin() {
    mostrarElemento(this.loginForm);
    ocultarElemento(this.cadastroForm);
    ocultarElemento(this.dashboard);
  }

  verificarTema() {
    const isDarkMode =
      localStorage.getItem(storageManager.KEYS.TEMA) === "true";
    document.documentElement.setAttribute(
      "data-theme",
      isDarkMode ? "dark" : "light"
    );
  }

  mostrarLoading() {
    if (this.loadingOverlay) mostrarElemento(this.loadingOverlay);
  }

  ocultarLoading() {
    if (this.loadingOverlay) ocultarElemento(this.loadingOverlay);
  }

  // Métodos de Navegação
  irParaCadastro(e) {
    e.preventDefault();
    salvarEstadoFormulario("cadastro");
    this.trocarFormulario(this.cadastroForm, this.loginForm);
  }

  voltarParaLogin(e) {
    e.preventDefault();
    salvarEstadoFormulario("login");
    this.trocarFormulario(this.loginForm, this.cadastroForm);
  }

  // Sistema de Login/Logout
  async realizarLogin() {
    const usuario = this.loginUsuario?.value?.trim();
    const senha = this.senhaLogin?.value?.trim();

    if (!this.validarCamposLogin(usuario, senha)) return;

    if (usuario === "Administrador" && senha === "Password321@") {
      this.loginSucesso("Administrador", null, null);
      return;
    }

    try {
      this.mostrarLoading();
      const response = await fetch("https://casadopai-v3.onrender.com/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: usuario, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Erro ao autenticar usuário"
        );
      }

      this.loginSucesso(
        data.usuario.tipoUsuario,
        data.usuario.id,
        data.usuario.idCelula
      );
    } catch (error) {
      mostrarToast(error.message, "error");
      this.marcarCamposErro(["loginUsuario", "senhalogin"]);
    } finally {
      this.ocultarLoading();
    }
  }

  validarCamposLogin(usuario, senha) {
    if (!usuario || !senha) {
      mostrarToast("Por favor, preencha todos os campos!", "error");
      if (!usuario) this.loginUsuario?.classList.add("input-error");
      if (!senha) this.senhaLogin?.classList.add("input-error");
      return false;
    }
    return true;
  }

  loginSucesso(tipoUsuario, idUsuario, idCelula) {
    storageManager.salvarUsuarioLogado({
      tipoUsuario,
      idUsuario: idUsuario ? parseInt(idUsuario) : null,
      idCelula: idCelula ? parseInt(idCelula) : null,
    });

    salvarEstadoFormulario("dashboard");
    this.mostrarDashboard({ tipoUsuario, idUsuario, idCelula });
    mostrarToast("Login realizado com sucesso!", "success");
  }

  realizarLogout() {
    storageManager.limparUsuarioLogado();
    salvarEstadoFormulario("login");

    if (this.loginUsuario) this.loginUsuario.value = "";
    if (this.senhaLogin) this.senhaLogin.value = "";

    this.mostrarLogin();
  }

  // Sistema de Cadastro
  async realizarCadastro(e) {
    e.preventDefault();

    if (!this.validarFormularioCadastro()) return;

    const dadosCadastro = this.coletarDadosCadastro();

    try {
      this.mostrarLoading();
      const response = await fetch(
        "https://casadopai-v3.onrender.com/usuarios",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dadosCadastro),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao cadastrar usuário");
      }

      mostrarToast("Cadastro realizado com sucesso!", "success");
      this.resetarFormulario(this.cadastroForm);
      this.voltarParaLogin(new Event("click"));
    } catch (error) {
      console.error("Erro no cadastro:", error);
      mostrarToast(
        "Erro ao realizar cadastro. Por favor, tente novamente.",
        "error"
      );
    } finally {
      this.ocultarLoading();
    }
  }

  validarFormularioCadastro() {
    const camposObrigatorios = [
      { id: "nomeCompleto", label: "Nome Completo" },
      { id: "email", label: "Email" },
      { id: "telefone", label: "Telefone" },
      { id: "dataNascimento", label: "Data de Nascimento" },
      { id: "senhaCadastro", label: "Senha" },
      { id: "confirmeSenhaCadastro", label: "Confirmar Senha" },
    ];

    // Limpar erros anteriores
    this.limparErrosFormulario();

    // Validar campos vazios
    const camposVazios = this.verificarCamposVazios(camposObrigatorios);
    if (camposVazios.length > 0) {
      mostrarToast(
        `Por favor, preencha os campos: ${camposVazios.join(", ")}`,
        "error"
      );
      return false;
    }

    // Validar email
    if (!this.validarEmail()) return false;

    // Validar senha
    if (!this.validarSenha()) return false;

    return true;
  }

  limparErrosFormulario() {
    document.querySelectorAll(".input-error").forEach((input) => {
      input.classList.remove("input-error");
    });
  }

  verificarCamposVazios(campos) {
    return campos
      .filter(({ id }) => !document.querySelector(`#${id}`)?.value?.trim())
      .map(({ label }) => label);
  }

  validarEmail() {
    const email = document.querySelector("#email").value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      document.querySelector("#email").classList.add("input-error");
      mostrarToast("Por favor, insira um email válido", "error");
      return false;
    }
    return true;
  }

  validarSenha() {
    const senha = document.querySelector("#senhaCadastro").value;
    const confirmeSenha = document.querySelector(
      "#confirmeSenhaCadastro"
    ).value;

    if (senha.length < 8) {
      this.marcarErroSenha("A senha deve ter no mínimo 8 caracteres");
      return false;
    }

    if (!/(?=.*[A-Z])/.test(senha)) {
      this.marcarErroSenha(
        "A senha deve conter pelo menos uma letra maiúscula"
      );
      return false;
    }

    if (!/(?=.*[0-9])/.test(senha)) {
      this.marcarErroSenha("A senha deve conter pelo menos um número");
      return false;
    }

    if (!/(?=.*[!@#$%^&*])/.test(senha)) {
      this.marcarErroSenha(
        "A senha deve conter pelo menos um caractere especial (!@#$%^&*)"
      );
      return false;
    }

    if (senha !== confirmeSenha) {
      document.querySelector("#senhaCadastro").classList.add("input-error");
      document
        .querySelector("#confirmeSenhaCadastro")
        .classList.add("input-error");
      mostrarToast("As senhas não coincidem", "error");
      return false;
    }

    return true;
  }

  marcarErroSenha(mensagem) {
    document.querySelector("#senhaCadastro").classList.add("input-error");
    mostrarToast(mensagem, "error");
  }

  coletarDadosCadastro() {
    const dadosBasicos = {
      nomeCompleto: document.querySelector("#nomeCompleto")?.value?.trim(),
      email: document.querySelector("#email")?.value?.trim(),
      telefone: document.querySelector("#telefone")?.value?.trim(),
      dataNascimento: document.querySelector("#dataNascimento")?.value?.trim(),
      senha: document.querySelector("#senhaCadastro")?.value?.trim(),
    };

    const checkboxes = {
      concluiuBatismo:
        document.querySelector("#concluiuBatismo")?.checked || false,
      participouCafe:
        document.querySelector("#participouCafe")?.checked || false,
      participaMinisterio:
        document.querySelector("#participaMinisterio")?.checked || false,
      participaCelula:
        document.querySelector("#participaCelula")?.checked || false,
    };

    const selects = {
      nomeMinisterio:
        document.querySelector("#selectMinisterio")?.value?.trim() || "",
      idCelula: document.querySelector("#selectCelula")?.value?.trim() || "",
      tipoUsuario: "UsuarioComum",
    };

    const cursos = [
      "cursoMeuNovoCaminho",
      "cursoVidaDevocional",
      "cursoFamiliaCrista",
      "cursoVidaProsperidade",
      "cursoPrincipiosAutoridade",
      "cursoVidaEspirito",
      "cursoCaraterCristo",
      "cursoIdentidadesRestauradas",
    ].reduce(
      (acc, curso) => ({
        ...acc,
        [curso]: document.querySelector(`#${curso}`)?.checked || false,
      }),
      {}
    );

    return {
      ...dadosBasicos,
      ...checkboxes,
      ...selects,
      ...cursos,
    };
  }

  // Recuperação de Senha
  async mostrarRecuperacaoSenha(e) {
    e.preventDefault();

    const formulario = `
            <div id="formRecuperacaoSenha" class="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
                <div class="modal modal-open">
                    <div class="modal-box relative">
                        <h2 class="font-bold text-lg mb-4">Recuperação de Senha</h2>
                        <p class="mb-4">Digite seu e-mail cadastrado para receber o link de recuperação de senha.</p>
                        <div class="form-control">
                            <input type="email" id="emailRecuperacao" placeholder="Digite seu e-mail" 
                                class="input input-bordered w-full" required>
                        </div>
                        <div class="modal-action">
                            <button id="botaoRecuperar" class="btn btn-primary">Enviar E-mail</button>
                            <button id="botaoFechar" class="btn">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", formulario);

    // Eventos do formulário de recuperação
    this.inicializarEventosRecuperacao();
  }

  inicializarEventosRecuperacao() {
    document
      .querySelector("#botaoRecuperar")
      ?.addEventListener("click", () => this.enviarEmailRecuperacao());

    document
      .querySelector("#botaoFechar")
      ?.addEventListener("click", () => this.fecharModalRecuperacao());

    document
      .querySelector("#formRecuperacaoSenha")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "formRecuperacaoSenha") {
          this.fecharModalRecuperacao();
        }
      });

    document
      .querySelector("#emailRecuperacao")
      ?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.enviarEmailRecuperacao();
        }
      });
  }

  async enviarEmailRecuperacao() {
    const emailInput = document.querySelector("#emailRecuperacao");
    const email = emailInput?.value?.trim();

    if (!this.validarEmailRecuperacao(email)) return;

    try {
      this.mostrarLoading();
      const response = await fetch(
        "https://casadopai-v3.onrender.com/recuperar-senha",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const dados = await response.json();

      if (response.ok) {
        mostrarToast("E-mail de recuperação enviado com sucesso!", "success");
        setTimeout(() => this.fecharModalRecuperacao(), 1500);
      } else {
        throw new Error(dados.error || "Erro ao enviar e-mail de recuperação");
      }
    } catch (error) {
      console.error("Erro ao enviar e-mail:", error);
      mostrarToast(
        "Erro ao enviar e-mail. Tente novamente mais tarde.",
        "error"
      );
    } finally {
      this.ocultarLoading();
    }
  }

  validarEmailRecuperacao(email) {
    if (!email) {
      mostrarToast("Por favor, digite seu e-mail", "error");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      mostrarToast("Por favor, digite um e-mail válido", "error");
      return false;
    }

    return true;
  }

  fecharModalRecuperacao() {
    const modal = document.querySelector("#formRecuperacaoSenha");
    if (modal) {
      modal.classList.add("fade-out");
      setTimeout(() => modal.remove(), 300);
    }
  }

  // Redefinição de Senha
  async redefinirSenha() {
    const { novaSenha, confirmaSenha } = this.obterSenhasRedefinicao();

    if (!this.validarSenhasRedefinicao(novaSenha, confirmaSenha)) return;

    try {
      this.mostrarLoading();
      const token = new URLSearchParams(window.location.search).get("token");

      if (!token) {
        mostrarToast("Token não encontrado", "error");
        return;
      }

      const response = await fetch(
        "https://casadopai-v3.onrender.com/atualizar-senha",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, novaSenha }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar senha");
      }

      this.senhaRedefinidaComSucesso();
    } catch (error) {
      console.error("Erro:", error);
      mostrarToast(error.message || "Erro ao atualizar senha", "error");
    } finally {
      this.ocultarLoading();
    }
  }

  obterSenhasRedefinicao() {
    return {
      novaSenha: document.querySelector("#novaSenha")?.value,
      confirmaSenha: document.querySelector("#confirmaSenhaNova")?.value,
    };
  }

  validarSenhasRedefinicao(novaSenha, confirmaSenha) {
    if (!novaSenha || !confirmaSenha) {
      mostrarToast("Por favor, preencha todos os campos", "error");
      return false;
    }

    if (novaSenha !== confirmaSenha) {
      mostrarToast("As senhas não coincidem", "error");
      return false;
    }

    if (novaSenha.length < 8) {
      mostrarToast("A senha deve ter no mínimo 8 caracteres", "error");
      return false;
    }

    return true;
  }

  senhaRedefinidaComSucesso() {
    mostrarToast("Senha atualizada com sucesso!", "success");
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
  }

  // Manipulação de Formulários
  trocarFormulario(mostrar, ocultar) {
    if (!mostrar || !ocultar) return;

    ocultar.classList.add("fade-out");

    setTimeout(() => {
      ocultarElemento(ocultar);
      ocultar.classList.remove("fade-out");
      mostrarElemento(mostrar);
      mostrar.classList.add("fade-in");

      setTimeout(() => {
        mostrar.classList.remove("fade-in");
      }, 500);
    }, 500);

    this.resetarFormulario(ocultar);
  }

  resetarFormulario(form) {
    if (!form) return;

    if (form instanceof HTMLFormElement) {
      form.reset();
    }

    form.querySelectorAll("input, textarea, select").forEach((input) => {
      if (input.type === "checkbox" || input.type === "radio") {
        input.checked = false;
      } else {
        input.value = "";
      }
      input.classList.remove("input-error");
    });
  }

  // Validações
  verificarForcaSenha() {
    const senha = document.querySelector("#senhaCadastro")?.value;
    const confirmeSenha = document.querySelector(
      "#confirmeSenhaCadastro"
    )?.value;
    const forcaSenha = document.querySelector("#forcaSenha");
    const forcaSenhaTexto = document.querySelector("#forcaSenhaTexto");

    if (!senha || !forcaSenha || !forcaSenhaTexto) return;

    const forca = this.calcularForcaSenha(senha);
    this.atualizarIndicadorForcaSenha(
      forca,
      forcaSenha,
      forcaSenhaTexto,
      senha,
      confirmeSenha
    );
  }

  calcularForcaSenha(senha) {
    let forca = 0;
    if (senha.length >= 8) forca += 20;
    if (senha.match(/[a-z]+/)) forca += 20;
    if (senha.match(/[A-Z]+/)) forca += 20;
    if (senha.match(/[0-9]+/)) forca += 20;
    if (senha.match(/[$@#&!]+/)) forca += 20;
    return forca;
  }

  atualizarIndicadorForcaSenha(forca, elemento, texto, senha, confirmeSenha) {
    elemento.value = forca;

    if (confirmeSenha && senha !== confirmeSenha) {
      texto.textContent = "As senhas não coincidem";
      this.atualizarClassesForcaSenha(elemento, "error");
      return;
    }

    const forcas = {
      100: { texto: "Muito Forte", classe: "success" },
      80: { texto: "Forte", classe: "success" },
      60: { texto: "Média", classe: "warning" },
      40: { texto: "Fraca", classe: "error" },
      0: { texto: "Muito Fraca", classe: "error" },
    };

    // Verifica os níveis em ordem decrescente
    for (const [limite, config] of Object.entries(forcas).sort(
      (a, b) => b[0] - a[0]
    )) {
      if (forca >= Number(limite)) {
        texto.textContent = `Força da senha: ${config.texto}`;
        this.atualizarClassesForcaSenha(elemento, config.classe);
        break;
      }
    }
  }

  atualizarClassesForcaSenha(elemento, tipo) {
    elemento.classList.remove(
      "progress-success",
      "progress-warning",
      "progress-error"
    );
    elemento.classList.add(`progress-${tipo}`);
  }

  // Utilitários
  alternarTema() {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    const novoTema = isDark ? "light" : "dark";

    html.setAttribute("data-theme", novoTema);
    localStorage.setItem(storageManager.KEYS.TEMA, (!isDark).toString());
  }

  mascaraTelefone(event) {
    let valor = event.target.value.replace(/\D/g, "");
    valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
    valor = valor.replace(/(\d)(\d{4})$/, "$1-$2");
    event.target.value = valor;
  }

  inicializarEnterForms() {
    this.adicionarEventoEnter("#loginForm", "#btnLogin");
    this.adicionarEventoEnter("#cadastroForm", "#btnCadastrar");
  }

  adicionarEventoEnter(formId, buttonId) {
    const form = document.querySelector(formId);
    const button = document.querySelector(buttonId);

    if (!form || !button) return;

    form.addEventListener("keydown", (event) => {
      if (event.target.tagName === "TEXTAREA" || event.key !== "Enter") return;

      event.preventDefault();

      if (formId === "#loginForm") {
        this.realizarLogin();
      } else if (formId === "#cadastroForm") {
        this.realizarCadastro(event);
      }
    });
  }

  marcarCamposErro(campos) {
    campos.forEach((campo) => {
      document.querySelector(`#${campo}`)?.classList.add("input-error");
    });
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  new FormManager();
});
