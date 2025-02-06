export function mostrarToast(mensagem, tipo = 'success') {
    if (typeof toastr === 'undefined') {
        console.error('Biblioteca Toastr não está carregada.');
        return;
    }

    if (tipo === 'success') {
        toastr.success(mensagem, 'Sucesso');
    } else if (tipo === 'error') {
        toastr.error(mensagem, 'Erro');
    } else {
        toastr.info(mensagem, 'Informação');
    }
}

export function mostrarElemento(elemento) {
    if (!elemento) return;
    elemento.classList.remove('hidden');
}

export function ocultarElemento(elemento) {
    if (!elemento) return;
    elemento.classList.add('hidden');
}

// Funções auxiliares para gerenciar o estado do formulário
export function salvarEstadoFormulario(formularioAtivo) {
    try {
        localStorage.setItem('formularioAtivo', formularioAtivo);
    } catch (error) {
        console.error('Erro ao salvar estado do formulário:', error);
    }
}

export function getEstadoFormulario() {
    try {
        return localStorage.getItem('formularioAtivo');
    } catch (error) {
        console.error('Erro ao recuperar estado do formulário:', error);
        return null;
    }
}