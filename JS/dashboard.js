import {
  mostrarToast,
  mostrarElemento,
  ocultarElemento,
  salvarEstadoFormulario,
  getEstadoFormulario,
} from "./utils.js";

class DashboardManager {
  constructor() {
    this.inicializarElementos();
    this.tipoUsuarioAtual = "";
    this.idUsuarioAtual = null;
    this.idCelulaAtual = null;
    this.inicializarEventListeners();
  }

  inicializarElementos() {
    this.dashboard = document.querySelector("#dashboard");
    this.dashboardContent = document.querySelector("#dashboardContent");
    this.modalContainer = document.querySelector("#modalContainer");
    this.modalTitle = document.querySelector("#modalTitle");
    this.modalContent = document.querySelector("#modalContent");
    this.btnCloseModal = document.querySelector("#btnCloseModal");
    this.btnLogout = document.querySelector("#btnLogout");
    this.loadingOverlay = document.querySelector("#loadingOverlay");

    if (!this.dashboard || !this.dashboardContent) {
      throw new Error("Elementos essenciais do dashboard não encontrados");
    }
  }

  mostrarLoading() {
    if (this.loadingOverlay) {
      mostrarElemento(this.loadingOverlay);
    }
  }

  ocultarLoading() {
    if (this.loadingOverlay) {
      ocultarElemento(this.loadingOverlay);
    }
  }

  async carregarDashboard(tipoUsuario, idUsuario, idCelula) {
    try {
      this.mostrarLoading();

      this.tipoUsuarioAtual = tipoUsuario;
      this.idUsuarioAtual = idUsuario;
      this.idCelulaAtual = idCelula;

      console.log("Carregando dashboard:", {
        tipoUsuario,
        idUsuario,
        idCelula,
      });

      let url = "http://localhost:3000/usuarios";
      let mensagemCarregamento = "";

      switch (tipoUsuario) {
        case "LiderCelula":
          if (!idCelula) {
            throw new Error("ID da célula não fornecido para líder");
          }
          url = `http://localhost:3000/celulas/${idCelula}/usuarios`;
          mensagemCarregamento = "Carregando membros da célula...";
          break;
        case "UsuarioComum":
          if (!idUsuario) {
            throw new Error("ID do usuário não fornecido");
          }
          url = `http://localhost:3000/usuarios/${idUsuario}`;
          mensagemCarregamento = "Carregando seu perfil...";
          break;
        case "Administrador":
          mensagemCarregamento = "Carregando lista de usuários...";
          break;
        default:
          throw new Error("Tipo de usuário não reconhecido");
      }

      if (this.dashboardContent) {
        this.dashboardContent.innerHTML =
          this.gerarLoadingHTML(mensagemCarregamento);
      }

      const response = await this.fetchComTimeout(url);
      const dados = await response.json();

      let conteudo = "";
      switch (tipoUsuario) {
        case "Administrador":
          conteudo = this.gerarConteudoAdmin(dados);
          break;
        case "LiderCelula":
          conteudo = this.gerarConteudoLider(dados);
          this.mostrarMensagemResultado(dados);
          break;
        case "UsuarioComum":
          conteudo = this.gerarConteudoUsuario(dados);
          break;
      }

      this.atualizarConteudoDashboard(conteudo);
    } catch (error) {
      console.error("Erro ao carregar os dados da dashboard:", error);
      this.tratarErroCarregamento(error);
    } finally {
      this.ocultarLoading();
    }
  }

  async fetchComTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(id);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro na requisição");
      }

      return response;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Tempo limite de requisição excedido");
      }
      throw error;
    }
  }

  gerarLoadingHTML(mensagem) {
    return `
            <div class="flex justify-center items-center p-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                <span class="text-lg">${mensagem}</span>
            </div>
        `;
  }

  mostrarMensagemResultado(dados) {
    if (Array.isArray(dados)) {
      if (dados.length === 0) {
        mostrarToast("Sua célula ainda não possui membros cadastrados", "info");
      } else {
        mostrarToast(
          `${dados.length} membro(s) encontrado(s) em sua célula`,
          "success"
        );
      }
    }
  }

  atualizarConteudoDashboard(conteudo) {
    if (this.dashboardContent) {
      this.dashboardContent.style.opacity = "0";
      setTimeout(() => {
        this.dashboardContent.innerHTML = conteudo;
        this.dashboardContent.style.opacity = "1";
        this.adicionarEventosDashboard();
      }, 300);
    }
  }

  tratarErroCarregamento(error) {
    const formularioAtivo = getEstadoFormulario();
    if (formularioAtivo === "loginForm" || formularioAtivo === "cadastroForm") {
      mostrarToast("Erro ao carregar dados do dashboard", "error");
    }
  }

  formatarTipoUsuario(tipo) {
    const tipos = {
      LiderCelula: "Líder de Célula",
      UsuarioComum: "Membro da Igreja",
      Administrador: "Administrador",
    };
    return tipos[tipo] || tipo;
  }

  gerarConteudoAdmin(dados) {
    return `
        <div class="flex flex-col items-center w-full">
            <h2 class="text-2xl font-bold mb-4 text-center">Painel do Administrador</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                ${dados
                  .filter((usuario) => usuario.email !== "admin@casadopai.com")
                  .map((usuario) => this.gerarCardUsuario(usuario))
                  .join("")}
            </div>
        </div>
    `;
  }

  gerarConteudoLider(dados) {
    if (!Array.isArray(dados) || dados.length === 0) {
      return `
                <div class="flex flex-col items-center w-full">
                    <h2 class="text-2xl font-bold mb-4 text-center">Painel do Líder de Célula</h2>
                    <p class="text-center">Nenhum membro encontrado para esta célula.</p>
                </div>
            `;
    }

    return `
            <div class="flex flex-col items-center w-full">
                <h2 class="text-2xl font-bold mb-4 text-center">Painel do Líder de Célula</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                    ${dados
                      .map((usuario) => this.gerarCardUsuario(usuario))
                      .join("")}
                </div>
            </div>
        `;
  }

  gerarConteudoUsuario(dados) {
    const usuario = dados;
    return `
            <div class="flex flex-col items-center w-full">
                <h2 class="text-2xl font-bold mb-4 text-center">Meu Perfil</h2>
                <div class="card bg-base-100 shadow-xl w-full max-w-2xl">
                    <div class="card-body">
                        <h3 class="card-title">${usuario.nomeCompleto}</h3>
                        <p>Email: ${usuario.email}</p>
                        <p>Telefone: ${usuario.telefone}</p>
                        <p>Célula: ${usuario.nomeCelula || "Não participa"}</p>
                        <div class="card-actions justify-end mt-2">
                            <button class="btn btn-primary btn-sm btn-detalhes" data-id="${
                              usuario.id
                            }">
                                Ver Mais Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  gerarCardUsuario(usuario) {
    return `
            <div class="card bg-base-100 shadow-xl user-card">
                <div class="card-body">
                    <h3 class="card-title">${usuario.nomeCompleto}</h3>
                    <p>Email: ${usuario.email}</p>
                    <p>Tipo: ${this.formatarTipoUsuario(
                      usuario.tipoUsuario
                    )}</p>
                    <p>Célula: ${usuario.nomeCelula || "Não associado"}</p>
                    <div class="card-actions justify-end mt-2">
                        <button class="btn btn-primary btn-sm btn-detalhes" data-id="${
                          usuario.id
                        }">
                            Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  adicionarEventosDashboard() {
    const btnDetalhes = document.querySelectorAll(".btn-detalhes");
    btnDetalhes.forEach((btn) => {
      btn.addEventListener("click", () =>
        this.mostrarDetalhesUsuario(btn.dataset.id)
      );
    });
  }

  async mostrarDetalhesUsuario(id) {
    if (!id) {
      mostrarToast("ID do usuário não definido", "error");
      return;
    }

    try {
      this.mostrarLoading();
      const response = await this.fetchComTimeout(
        `https://casadopai-v3.onrender.com/usuarios/${id}`
      );
      const usuario = await response.json();

      this.preencherDetalhesUsuario(usuario);
      this.abrirModal();
      mostrarToast("Detalhes do usuário carregados com sucesso", "success");
    } catch (error) {
      console.error("Erro ao carregar detalhes do usuário:", error);
      mostrarToast(
        error.message || "Erro ao carregar detalhes do usuário",
        "error"
      );
    } finally {
      this.ocultarLoading();
    }
  }

  preencherDetalhesUsuario(usuario) {
    if (this.modalTitle) {
      this.modalTitle.textContent = `Detalhes de ${usuario.nomeCompleto}`;
    }

    const conteudoModal = document.querySelector(
      "#conteudoDetalhesUsuario"
    )?.innerHTML;
    if (this.modalContent && conteudoModal) {
      this.modalContent.innerHTML = conteudoModal;
      this.preencherCamposUsuario(usuario);
      this.preencherCursosConcluidos(usuario);
      this.adicionarBotoesAcao(usuario);
    }
  }

  preencherCamposUsuario(usuario) {
    const campos = {
      "#detalhesEmail": usuario.email,
      "#detalhesTelefone": usuario.telefone,
      "#detalhesDataNascimento": usuario.dataNascimento
        ? new Date(usuario.dataNascimento).toLocaleDateString()
        : "Não disponível",
      "#detalhesTipoUsuario": this.formatarTipoUsuario(usuario.tipoUsuario),
      "#detalhesConcluiuBatismo": usuario.concluiuBatismo ? "Sim" : "Não",
      "#detalhesParticipouCafe": usuario.participouCafe ? "Sim" : "Não",
      "#detalhesParticipaMinisterio": usuario.participaMinisterio
        ? "Sim"
        : "Não",
      "#detalhesMinisterio": usuario.nomeMinisterio || "Não participa",
      "#detalhesParticipaCelula": usuario.participaCelula ? "Sim" : "Não",
      "#detalhesCelula": usuario.nomeCelula || "Não participa",
    };

    Object.entries(campos).forEach(([selector, value]) => {
      const elemento = document.querySelector(selector);
      if (elemento) elemento.textContent = value;
    });
  }

  preencherCursosConcluidos(usuario) {
    const listaCursos = document.querySelector("#listaCursosConcluidos");
    if (!listaCursos) return;

    listaCursos.innerHTML = "";
    const cursos = [
      { id: "cursoMeuNovoCaminho", nome: "Meu Novo Caminho" },
      { id: "cursoVidaDevocional", nome: "Vida Devocional" },
      { id: "cursoFamiliaCrista", nome: "Família Cristã" },
      { id: "cursoVidaProsperidade", nome: "Vida de Prosperidade" },
      { id: "cursoPrincipiosAutoridade", nome: "Princípios de Autoridade" },
      { id: "cursoVidaEspirito", nome: "Vida no Espírito" },
      { id: "cursoCaraterCristo", nome: "Caráter de Cristo" },
      { id: "cursoIdentidadesRestauradas", nome: "Identidades Restauradas" },
    ];

    cursos.forEach((curso) => {
      if (usuario[curso.id]) {
        listaCursos.innerHTML += `<li class="ml-4">${curso.nome}</li>`;
      }
    });
  }

  adicionarBotoesAcao(usuario) {
    const acoesUsuario = document.querySelector("#acoesUsuario");
    if (!acoesUsuario) return;

    if (
      this.tipoUsuarioAtual === "Administrador" ||
      (this.tipoUsuarioAtual === "LiderCelula" &&
        usuario.tipoUsuario !== "Administrador")
    ) {
      let botoesHTML = `
                <button class="btn btn-primary btn-sm mr-2" onclick="editarUsuario(${usuario.id})">Editar</button>
                <button class="btn btn-error btn-sm mr-2" onclick="deletarUsuario(${usuario.id})">Deletar</button>
            `;

      if (this.tipoUsuarioAtual === "Administrador") {
        if (
          usuario.tipoUsuario !== "Administrador" &&
          usuario.tipoUsuario !== "LiderCelula"
        ) {
          botoesHTML += `
                        <button class="btn btn-info btn-sm" onclick="tornarLider(${usuario.id})">
                            Tornar Líder
                        </button>
                    `;
        } else if (usuario.tipoUsuario === "LiderCelula") {
          botoesHTML += `
                        <button class="btn btn-warning btn-sm" onclick="rebaixarLider(${usuario.id})">
                            Rebaixar para Usuário Comum
                        </button>
                    `;
        }
      }
      acoesUsuario.innerHTML = botoesHTML;
    }
  }

  async editarUsuario(id) {
    if (!id) {
      mostrarToast("ID do usuário não definido", "error");
      return;
    }

    try {
      this.mostrarLoading();
      const response = await this.fetchComTimeout(
        `https://casadopai-v3.onrender.com/usuarios/${id}`
      );
      const usuario = await response.json();

      this.modalTitle.textContent = `Editar ${usuario.nomeCompleto}`;
      this.modalContent.innerHTML = this.gerarFormularioEdicao(usuario);

      const form = document.querySelector("#formEditarUsuario");
      form?.addEventListener("submit", (e) => this.salvarEdicaoUsuario(e, id));

      this.adicionarEventosValidacao();
      this.abrirModal();
    } catch (error) {
      console.error("Erro ao carregar dados para edição:", error);
      mostrarToast(
        error.message || "Erro ao carregar dados para edição",
        "error"
      );
    } finally {
      this.ocultarLoading();
    }
  }

  gerarFormularioEdicao(usuario) {
    return `
            <form id="formEditarUsuario" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Nome Completo</span>
                        </label>
                        <input type="text" id="editNomeCompleto" class="input input-bordered" 
                            value="${usuario.nomeCompleto}" required
                            onchange="this.classList.remove('input-error')">
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Email</span>
                        </label>
                        <input type="email" id="editEmail" class="input input-bordered" 
                            value="${usuario.email}" required
                            onchange="this.classList.remove('input-error')">
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Telefone</span>
                        </label>
                        <input type="tel" id="editTelefone" class="input input-bordered" 
                            value="${usuario.telefone}" required
                            onchange="this.classList.remove('input-error')">
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Data de Nascimento</span>
                        </label>
                        <input type="date" id="editDataNascimento" class="input input-bordered" 
                            value="${
                              new Date(usuario.dataNascimento)
                                .toISOString()
                                .split("T")[0]
                            }" required
                            onchange="this.classList.remove('input-error')">
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Ministério</span>
                        </label>
                        <select id="editMinisterio" class="select select-bordered">
                            <option value="" ${
                              usuario.nomeMinisterio ? "" : "selected"
                            }>Não participa</option>
                            <option value="Acolhimento" ${
                              usuario.nomeMinisterio === "Acolhimento"
                                ? "selected"
                                : ""
                            }>Acolhimento</option>
                            <option value="Mídias" ${
                              usuario.nomeMinisterio === "Mídias"
                                ? "selected"
                                : ""
                            }>Mídias</option>
                            <option value="Louvor" ${
                              usuario.nomeMinisterio === "Louvor"
                                ? "selected"
                                : ""
                            }>Louvor</option>
                            <option value="Dança" ${
                              usuario.nomeMinisterio === "Dança"
                                ? "selected"
                                : ""
                            }>Dança</option>
                            <option value="Infantil" ${
                              usuario.nomeMinisterio === "Infantil"
                                ? "selected"
                                : ""
                            }>Infantil</option>
                            <option value="Teens" ${
                              usuario.nomeMinisterio === "Teens"
                                ? "selected"
                                : ""
                            }>Teens</option>
                        </select>
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Célula</span>
                        </label>
                        <select id="editCelula" class="select select-bordered">
                            <option value="" ${
                              usuario.idCelula ? "" : "selected"
                            }>Não participa</option>
                            ${this.gerarOpcoesCelulas(usuario.idCelula)}
                        </select>
                    </div>

                    <div class="form-control">
                        <label class="label cursor-pointer">
                            <span class="label-text">Concluiu Batismo</span> 
                            <input type="checkbox" id="editConcluiuBatismo" class="checkbox" ${
                              usuario.concluiuBatismo ? "checked" : ""
                            }>
                        </label>
                    </div>
                </div>

                <div class="form-control mt-6">
                    <button type="submit" class="btn btn-primary w-full">Salvar Alterações</button>
                </div>
            </form>
        `;
  }

  gerarOpcoesCelulas(idCelulaSelecionada) {
    return `
            <option value="1" ${
              idCelulaSelecionada === 1 ? "selected" : ""
            }>Aba Pai</option>
            <option value="2" ${
              idCelulaSelecionada === 2 ? "selected" : ""
            }>Dunamis</option>
            <option value="3" ${
              idCelulaSelecionada === 3 ? "selected" : ""
            }>Exousia</option>
            <option value="4" ${
              idCelulaSelecionada === 4 ? "selected" : ""
            }>Koinonia</option>
            <option value="5" ${
              idCelulaSelecionada === 5 ? "selected" : ""
            }>Luz do Mundo</option>
            <option value="6" ${
              idCelulaSelecionada === 6 ? "selected" : ""
            }>Zoe</option>
            <option value="7" ${
              idCelulaSelecionada === 7 ? "selected" : ""
            }>A Rede</option>
            <option value="8" ${
              idCelulaSelecionada === 8 ? "selected" : ""
            }>Atos 2</option>
            <option value="9" ${
              idCelulaSelecionada === 9 ? "selected" : ""
            }>El Shamah</option>
            <option value="10" ${
              idCelulaSelecionada === 10 ? "selected" : ""
            }>Freedom</option>
            <option value="11" ${
              idCelulaSelecionada === 11 ? "selected" : ""
            }>Hermon</option>
            <option value="12" ${
              idCelulaSelecionada === 12 ? "selected" : ""
            }>Maranata</option>
            <option value="13" ${
              idCelulaSelecionada === 13 ? "selected" : ""
            }>Reobote</option>
            <option value="14" ${
              idCelulaSelecionada === 14 ? "selected" : ""
            }>Sal da Terra</option>
        `;
  }

  async salvarEdicaoUsuario(e, id) {
    e.preventDefault();

    const campos = {
      nomeCompleto: document.querySelector("#editNomeCompleto"),
      email: document.querySelector("#editEmail"),
      telefone: document.querySelector("#editTelefone"),
      dataNascimento: document.querySelector("#editDataNascimento"),
      ministerio: document.querySelector("#editMinisterio"),
      celula: document.querySelector("#editCelula"),
      concluiuBatismo: document.querySelector("#editConcluiuBatismo"),
    };

    if (!this.validarCamposEdicao(campos)) return;

    try {
      this.mostrarLoading();
      const dadosAtualizados = {
        nomeCompleto: campos.nomeCompleto.value,
        email: campos.email.value,
        telefone: campos.telefone.value,
        dataNascimento: campos.dataNascimento.value,
        nomeMinisterio: campos.ministerio.value,
        idCelula: campos.celula.value,
        concluiuBatismo: campos.concluiuBatismo.checked,
      };

      const response = await this.fetchComTimeout(
        `https://casadopai-v3.onrender.com/usuarios/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dadosAtualizados),
        }
      );

      await this.atualizarInterfaceAposAcao("Usuário atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      mostrarToast(error.message || "Erro ao atualizar usuário", "error");
    } finally {
      this.ocultarLoading();
    }
  }

  validarCamposEdicao(campos) {
    let temErro = false;
    Object.entries(campos).forEach(([nome, campo]) => {
      if (!campo.value.trim()) {
        campo.classList.add("input-error");
        mostrarToast(`O campo ${nome} é obrigatório`, "error");
        temErro = true;
      }
    });

    if (temErro) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(campos.email.value)) {
      campos.email.classList.add("input-error");
      mostrarToast("Por favor, insira um email válido", "error");
      return false;
    }

    return true;
  }

  async deletarUsuario(id) {
    if (!id) {
      mostrarToast("ID do usuário não definido", "error");
      return;
    }

    if (!confirm("Tem certeza que deseja deletar este usuário?")) return;

    try {
      this.mostrarLoading();
      await this.fetchComTimeout(
        `https://casadopai-v3.onrender.com/usuarios/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      await this.atualizarInterfaceAposAcao("Usuário deletado com sucesso");
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      mostrarToast(error.message || "Erro ao deletar usuário", "error");
    } finally {
      this.ocultarLoading();
    }
  }

  async tornarLider(id) {
    if (!id) {
      mostrarToast("ID do usuário não definido", "error");
      return;
    }

    if (
      !confirm("Tem certeza que deseja tornar este usuário um líder de célula?")
    ) {
      return;
    }

    const tornarLiderBtn = document.querySelector(`#btnTornarLider${id}`);
    this.gerenciarBotaoAcao(tornarLiderBtn, false);

    try {
      this.mostrarLoading();

      const verificacaoResponse = await this.fetchComTimeout(
        `https://casadopai-v3.onrender.com/usuarios/${id}`
      );
      const usuario = await verificacaoResponse.json();

      if (!usuario.idCelula) {
        mostrarToast(
          "O usuário precisa estar associado a uma célula para se tornar líder",
          "error"
        );
        return;
      }

      if (usuario.tipoUsuario === "LiderCelula") {
        mostrarToast("Este usuário já é líder de célula", "warning");
        return;
      }

      const response = await this.fetchComTimeout(
        `https://casadopai-v3.onrender.com/usuarios/${id}/tornar-lider`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      await this.atualizarInterfaceAposAcao(
        "Usuário promovido a líder de célula com sucesso"
      );
    } catch (error) {
      console.error("Erro ao promover usuário:", error);
      mostrarToast(
        error.message || "Erro ao promover usuário a líder",
        "error"
      );
    } finally {
      this.gerenciarBotaoAcao(tornarLiderBtn, true);
      this.ocultarLoading();
    }
  }

  async rebaixarLider(id) {
    if (!id) {
      mostrarToast("ID do usuário não definido", "error");
      return;
    }

    if (
      !confirm(
        "Tem certeza que deseja rebaixar este líder para usuário comum? Esta ação afetará todos os membros da célula."
      )
    ) {
      return;
    }

    const rebaixarBtn = document.querySelector(`#btnRebaixarLider${id}`);
    this.gerenciarBotaoAcao(rebaixarBtn, false);

    try {
      this.mostrarLoading();
      const verificacaoResponse = await this.fetchComTimeout(
        `https://casadopai-v3.onrender.com/usuarios/${id}`
      );
      const usuario = await verificacaoResponse.json();

      if (usuario.tipoUsuario !== "LiderCelula") {
        mostrarToast("Este usuário não é um líder de célula", "warning");
        return;
      }

      const response = await this.fetchComTimeout(
        `https://casadopai-v3.onrender.com/usuarios/${id}/rebaixar-lider`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      mostrarToast("Líder rebaixado para usuário comum com sucesso", "success");
      setTimeout(() => {
        this.fecharModal();
        this.carregarDashboard(
          this.tipoUsuarioAtual,
          this.idUsuarioAtual,
          this.idCelulaAtual
        );
      }, 1500);
    } catch (error) {
      console.error("Erro ao rebaixar líder:", error);
      mostrarToast(error.message || "Erro ao rebaixar líder", "error");
    } finally {
      this.gerenciarBotaoAcao(rebaixarBtn, true);
      this.ocultarLoading();
    }
  }

  gerenciarBotaoAcao(botao, habilitado = true) {
    if (!botao) return;

    botao.disabled = !habilitado;
    if (habilitado) {
      botao.classList.remove("opacity-50", "cursor-not-allowed");
    } else {
      botao.classList.add("opacity-50", "cursor-not-allowed");
    }
  }

  async atualizarInterfaceAposAcao(mensagem, tipo = "success", delay = 1500) {
    mostrarToast(mensagem, tipo);
    await new Promise((resolve) => setTimeout(resolve, delay));
    this.fecharModal();
    await this.carregarDashboard(
      this.tipoUsuarioAtual,
      this.idUsuarioAtual,
      this.idCelulaAtual
    );
  }

  inicializarEventListeners() {
    // Evento para fechar modal pelo botão
    document.querySelector("#btnCloseModal")?.addEventListener("click", () => {
      this.fecharModal();
    });

    // Evento para fechar modal clicando fora
    document
      .querySelector("#modalContainer")
      ?.addEventListener("click", (event) => {
        if (event.target.id === "modalContainer") {
          this.fecharModal();
        }
      });

    // Evento de logout
    document.querySelector("#btnLogout")?.addEventListener("click", () => {
      this.realizarLogout();
    });
  }

  adicionarEventosValidacao() {
    // Remover classes de erro ao digitar
    document.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        input.classList.remove("input-error");
      });
    });

    // Mascarar telefone
    const telefoneInput = document.querySelector("#editTelefone");
    if (telefoneInput) {
      telefoneInput.addEventListener("input", (event) => {
        let valor = event.target.value.replace(/\D/g, "");
        valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
        valor = valor.replace(/(\d)(\d{4})$/, "$1-$2");
        event.target.value = valor;
      });
    }

    // Validar email em tempo real
    const emailInput = document.querySelector("#editEmail");
    if (emailInput) {
      emailInput.addEventListener("blur", () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value)) {
          emailInput.classList.add("input-error");
          mostrarToast("Por favor, insira um email válido", "error");
        } else {
          emailInput.classList.remove("input-error");
        }
      });
    }
  }

  fecharModal() {
    if (this.modalContainer) {
      this.modalContainer.classList.remove("modal-open");
      if (this.modalTitle) this.modalTitle.textContent = "";
      if (this.modalContent) this.modalContent.innerHTML = "";
    }
  }

  abrirModal() {
    if (this.modalContainer) {
      this.modalContainer.classList.add("modal-open");
    }
  }

  async editarUsuario(id) {
    if (!id) {
      mostrarToast("ID do usuário não definido", "error");
      return;
    }

    try {
      this.mostrarLoading();
      const response = await this.fetchComTimeout(
        `https://casadopai-v3.onrender.com/usuarios/${id}`
      );
      const usuario = await response.json();

      if (this.modalTitle) {
        this.modalTitle.textContent = `Editar ${usuario.nomeCompleto}`;
      }

      if (this.modalContent) {
        this.modalContent.innerHTML = this.gerarFormularioEdicao(usuario);

        // Adicionar evento de submit ao formulário
        const form = document.querySelector("#formEditarUsuario");
        if (form) {
          form.addEventListener("submit", (e) =>
            this.salvarEdicaoUsuario(e, id)
          );
        }

        this.adicionarEventosValidacao();
        this.abrirModal();
      }
    } catch (error) {
      console.error("Erro ao carregar dados para edição:", error);
      mostrarToast(
        error.message || "Erro ao carregar dados para edição",
        "error"
      );
    } finally {
      this.ocultarLoading();
    }
  }

  realizarLogout() {
    const dashboard = document.querySelector("#dashboard");
    const loginForm = document.querySelector("#loginForm");

    if (dashboard && loginForm) {
      ocultarElemento(dashboard);
      mostrarElemento(loginForm);

      const loginUsuario = document.querySelector("#loginUsuario");
      const senhaLogin = document.querySelector("#senhalogin");

      if (loginUsuario) loginUsuario.value = "";
      if (senhaLogin) senhaLogin.value = "";
    }
  }
}

// Exportações e inicialização da classe
const dashboardManager = new DashboardManager();

// Exportar funções para uso global
export const carregarDashboard = (tipoUsuario, idUsuario, idCelula) =>
  dashboardManager.carregarDashboard(tipoUsuario, idUsuario, idCelula);

// Expor métodos para uso global
window.editarUsuario = (id) => dashboardManager.editarUsuario(id);
window.deletarUsuario = (id) => dashboardManager.deletarUsuario(id);
window.tornarLider = (id) => dashboardManager.tornarLider(id);
window.rebaixarLider = (id) => dashboardManager.rebaixarLider(id);
window.fecharModal = () => dashboardManager.fecharModal();
