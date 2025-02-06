export const storageManager = {
    KEYS: {
        USUARIO_LOGADO: 'usuarioLogado',
        DADOS_CADASTRO: 'dadosCadastro',
        TEMA: 'darkMode',
        ULTIMA_SESSAO: 'ultimaSessao',
        PREFERENCIAS: 'preferenciasUsuario',
        ESTADO_FORMULARIO: 'estadoFormulario',
        ESTADO_ATUAL: 'estadoAtual',
        CELULA_SELECIONADA: 'celulaSelecionadaId'
    },

    ESTADO_CELULA: {
        id: null,
        nome: null,
        timestamp: null
    },

    TEMPO_EXPIRACAO: 24 * 60 * 60 * 1000,
    

    // Função específica para gerenciar a célula selecionada
    salvarCelulaSelecionada(celulaId) {
        if (!celulaId || isNaN(parseInt(celulaId))) return false;
        
        const id = parseInt(celulaId, 10);
        console.log('Salvando célula selecionada:', id);
        
        return this._salvar(this.KEYS.CELULA_SELECIONADA, id);
    },
    
    getCelulaSelecionada() {
        const id = this._recuperar(this.KEYS.CELULA_SELECIONADA);
        return id ? parseInt(id, 10) : null;
    },    

    getCelulaSelecionada() {
        const estado = this._recuperar(this.KEYS.CELULA_SELECIONADA);
        if (!estado || !estado.id || this._verificarExpiracao(estado.timestamp)) {
            return null;
        }
        return estado.id;
    },

    getEstadoCelulaCompleto() {
        return this._recuperar(this.KEYS.CELULA_SELECIONADA);
    },

    limparCelulaSelecionada() {
        console.log('Limpando célula selecionada');
        localStorage.removeItem(this.KEYS.CELULA_SELECIONADA);
    },
    

    // Função para salvar o estado atual da aplicação
    salvarEstadoAtual(estado) {
        localStorage.removeItem(this.KEYS.CELULA_SELECIONADA);
        this.ESTADO_CELULA = {
            id: null,
            nome: null,
            timestamp: null
        };
    },


    // Função para recuperar o estado atual
    getEstadoAtual() {
        return this._recuperar(this.KEYS.ESTADO_ATUAL);
    },

    // Função para salvar o estado do formulário
    salvarEstadoFormulario(formId, dados) {
        const estadoForm = {
            formId,
            campos: dados,
            timestamp: Date.now()
        };
        return this._salvar(this.KEYS.ESTADO_FORMULARIO, estadoForm);
    },

    // Função para recuperar o estado do formulário
    getEstadoFormulario() {
        return this._recuperar(this.KEYS.ESTADO_FORMULARIO);
    },

    // Função para limpar o estado do formulário
    limparEstadoFormulario() {
        try {
            localStorage.removeItem(this.KEYS.ESTADO_FORMULARIO);
            return true;
        } catch (error) {
            console.error('Erro ao limpar estado do formulário:', error);
            return false;
        }
    },

    // Mantendo as funções auxiliares existentes
    _verificarExpiracao(timestamp) {
        if (!timestamp) return true;
        return Date.now() - timestamp > this.TEMPO_EXPIRACAO;
    },

    _salvar(chave, dados) {
        if (!chave || !dados) return false;
        
        try {
            const dadosComTimestamp = {
                dados,
                timestamp: Date.now()
            };
            localStorage.setItem(chave, JSON.stringify(dadosComTimestamp));
            return true;
        } catch (error) {
            console.error(`Erro ao salvar dados para ${chave}:`, error);
            return false;
        }
    },

    _recuperar(chave, permitirExpirados = false) {
        if (!chave) return null;
        
        try {
            const item = localStorage.getItem(chave);
            if (!item) return null;

            const { dados, timestamp } = JSON.parse(item);
            
            if (!permitirExpirados && this._verificarExpiracao(timestamp)) {
                this.limparDados(chave);
                return null;
            }

            return dados;
        } catch (error) {
            console.error(`Erro ao recuperar dados de ${chave}:`, error);
            return null;
        }
    },

    // Salvar dados do usuário logado
    salvarUsuarioLogado(dados) {
        if (!dados) return false;

        const dadosUsuario = {
            tipoUsuario: dados.tipoUsuario,
            idUsuario: dados.idUsuario,
            idCelula: dados.idCelula,
            ultimoAcesso: new Date().toISOString()
        };

        return this._salvar(this.KEYS.USUARIO_LOGADO, dadosUsuario);
    },

    // Recuperar dados do usuário logado
    getUsuarioLogado() {
        return this._recuperar(this.KEYS.USUARIO_LOGADO);
    },

    // Limpar dados do usuário logado
    limparUsuarioLogado() {
        try {
            localStorage.removeItem(this.KEYS.USUARIO_LOGADO);
            return true;
        } catch (error) {
            console.error('Erro ao limpar dados do usuário:', error);
            return false;
        }
    },

    // Salvar dados de formulário
    salvarDadosFormulario(formId, dados) {
        if (!formId || !dados) return false;
        return this._salvar(formId, dados);
    },

    // Recuperar dados de formulário
    getDadosFormulario(formId) {
        return this._recuperar(formId);
    },

    // Limpar dados de formulário
    limparDadosFormulario(formId) {
        if (!formId) return false;
        try {
            localStorage.removeItem(formId);
            return true;
        } catch (error) {
            console.error('Erro ao limpar dados do formulário:', error);
            return false;
        }
    },

    // Salvar preferências do usuário
    salvarPreferencias(preferencias) {
        return this._salvar(this.KEYS.PREFERENCIAS, preferencias);
    },

    // Recuperar preferências do usuário
    getPreferencias() {
        return this._recuperar(this.KEYS.PREFERENCIAS, true);
    },

    // Atualizar uma preferência específica
    atualizarPreferencia(chave, valor) {
        const preferencias = this.getPreferencias() || {};
        preferencias[chave] = valor;
        return this.salvarPreferencias(preferencias);
    },

    // Salvar última sessão
    salvarUltimaSessao(dados) {
        return this._salvar(this.KEYS.ULTIMA_SESSAO, dados);
    },

    // Recuperar última sessão
    getUltimaSessao() {
        return this._recuperar(this.KEYS.ULTIMA_SESSAO);
    },

    // Verificar se existe uma sessão ativa
    temSessaoAtiva() {
        const usuarioLogado = this.getUsuarioLogado();
        return !!usuarioLogado && !this._verificarExpiracao(usuarioLogado.timestamp);
    },

    // Limpar todos os dados
    limparTodosDados() {
        try {
            Object.values(this.KEYS).forEach(chave => {
                localStorage.removeItem(chave);
            });
            return true;
        } catch (error) {
            console.error('Erro ao limpar todos os dados:', error);
            return false;
        }
    },

    // Verificar e limpar dados expirados
    limparDadosExpirados() {
        try {
            Object.keys(localStorage).forEach(chave => {
                const dados = localStorage.getItem(chave);
                if (dados) {
                    try {
                        const { timestamp } = JSON.parse(dados);
                        if (this._verificarExpiracao(timestamp)) {
                            localStorage.removeItem(chave);
                        }
                    } catch (e) {
                        // Ignora itens que não têm o formato esperado
                    }
                }
            });
            return true;
        } catch (error) {
            console.error('Erro ao limpar dados expirados:', error);
            return false;
        }
    },

    // Verificar espaço disponível
    verificarEspacoDisponivel() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length;
                }
            }
            return {
                usado: total,
                disponivel: 5 * 1024 * 1024 - total, // 5MB é o limite típico
                porcentagemUsada: (total / (5 * 1024 * 1024)) * 100
            };
        } catch (error) {
            console.error('Erro ao verificar espaço disponível:', error);
            return null;
        }
    }
};

// Exportar o storageManager como padrão
export default storageManager;