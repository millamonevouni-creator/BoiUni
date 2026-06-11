// app.js - Lógica de Negócios e Controlador Principal da SPA BoiUni

// Patch Lucide createIcons to support class-based definitions (class="lucide-xxx")
if (window.lucide && window.lucide.createIcons) {
  const originalCreateIcons = window.lucide.createIcons;
  window.lucide.createIcons = function(options) {
    document.querySelectorAll('i').forEach(el => {
      const classes = Array.from(el.classList);
      const lucideClass = classes.find(c => c.startsWith('lucide-'));
      if (lucideClass && !el.hasAttribute('data-lucide')) {
        const iconName = lucideClass.replace('lucide-', '');
        el.setAttribute('data-lucide', iconName);
      }
    });
    return originalCreateIcons.call(window.lucide, options);
  };
}

class AppController {
  constructor() {
    this.currentTheme = localStorage.getItem('boiuni_theme') || 'light';
    this.activeTab = 'dashboard';
    this.editingAnimalId = null;
    this.editingClientId = null;
    this.authMode = 'login'; // 'login' ou 'signup'
  }

  async init() {
    // 1. Inicializa o Tema
    this.applyTheme(this.currentTheme);

    // 2. Vincula Eventos
    this.setupEventListeners();

    // 3. Captura sessão do Supabase
    const session = await window.db.getCurrentSession();
    const authOverlay = document.getElementById('auth-overlay');
    const landingPage = document.getElementById('landing-page');
    const appContainer = document.getElementById('app-container');
    
    // Verifica se estamos em um fluxo de recuperação de senha
    const isRecovery = window.location.hash.includes('type=recovery') || window.location.href.includes('type=recovery');
    
    if (session) {
      if (isRecovery) {
        if (landingPage) landingPage.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        if (authOverlay) authOverlay.classList.remove('hidden');
        this.setAuthMode('update-password');
      } else {
        if (landingPage) landingPage.classList.add('hidden');
        if (authOverlay) authOverlay.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        
        // Define saudação do usuário na sidebar
        const name = session.user?.user_metadata?.nome || session.user?.email?.split('@')[0] || '';
        const greetingEl = document.getElementById('user-greeting-sidebar');
        if (greetingEl) {
          greetingEl.textContent = `Olá, ${name}!`;
        }
        
        // Carrega o Dashboard por Padrão
        this.switchTab('dashboard');
      }
    } else {
      if (landingPage) landingPage.classList.remove('hidden');
      if (appContainer) appContainer.classList.add('hidden');
      if (authOverlay) authOverlay.classList.add('hidden');
      this.setAuthMode('login');
    }

    // 4. Configura valores padrão de data nos formulários para Hoje
    this.setDefaultDates();

    // 5. Inicializa ícones Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // 6. Configura Listeners de Instalação PWA
    this.setupPwaInstallListeners();

    // 7. Configura Interatividade da Landing Page (Simulador, FAQ, Mockup)
    this.setupLandingPageInteractivity();
  }

  // --- CONTROLE DE TEMA ---
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('boiuni_theme', theme);
    
    const icon = document.querySelector('.btn-theme-toggle i');
    if (icon) {
      icon.className = theme === 'dark' ? 'lucide-sun' : 'lucide-moon';
    }
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
    
    // Atualiza gráficos para refletir cores de texto do novo tema se necessário
    if (this.activeTab === 'dashboard') {
      window.ui.renderDashboard();
    } else if (this.activeTab === 'pesagens') {
      window.ui.updateWeightHistoryTable();
    }
  }

  // --- NAVEGAÇÃO DE ABAS ---
  switchTab(tabId) {
    this.activeTab = tabId;
    
    // Altera classe active no menu sidebar
    document.querySelectorAll('.menu-item').forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Mostra/Esconde os painéis de conteúdo
    document.querySelectorAll('.content-panel').forEach(panel => {
      if (panel.id === `panel-${tabId}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Renderiza dados da aba selecionada
    this.refreshTabContent(tabId);
  }

  refreshTabContent(tabId) {
    switch(tabId) {
      case 'dashboard':
        window.ui.renderDashboard();
        break;
      case 'animais':
        const catFilter = document.getElementById('animal-filter-tab')?.querySelector('.active')?.dataset.filter || 'Todos';
        const searchVal = document.getElementById('animal-search-input')?.value || '';
        window.ui.renderAnimalsList(catFilter, searchVal);
        break;
      case 'pesagens':
        window.ui.renderWeightsView();
        break;
      case 'reproducao':
        window.ui.renderReproductionView();
        break;
      case 'transacoes':
        window.ui.renderTransactionsView();
        break;
      case 'clientes':
        window.ui.renderClientsView();
        break;
      case 'relatorios':
        window.ui.renderReportsView();
        break;
      case 'configuracoes':
        this.loadConfiguracoesForm();
        break;
    }
  }

  // --- DATAS PADRÃO ---
  setDefaultDates() {
    const today = window.ui.todayString();
    
    const fields = [
      'animal-nascimento',
      'animal-compra-data',
      'weight-data',
      'birth-data',
      'buy-data',
      'sell-data'
    ];

    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = today;
    });
  }

  // --- GERENCIAMENTO DE EVENTOS ---
  setupEventListeners() {
    // Menu de navegação sidebar
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Botão de troca de tema
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Formulário de Cadastro de Animais: Origem Condicional
    const animalOrigem = document.getElementById('animal-origem');
    if (animalOrigem) {
      animalOrigem.addEventListener('change', (e) => {
        this.toggleAnimalOrigemFields(e.target.value);
      });
    }

    // Busca e Filtros de Animais
    const searchInput = document.getElementById('animal-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const catFilter = document.querySelector('#animal-filter-tab .filter-tab.active')?.dataset.filter || 'Todos';
        window.ui.renderAnimalsList(catFilter, e.target.value);
      });
    }

    const filterTabs = document.querySelectorAll('#animal-filter-tab .filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const q = document.getElementById('animal-search-input')?.value || '';
        window.ui.renderAnimalsList(tab.dataset.filter, q);
      });
    });

    // Evento de seleção de animal na tela de pesagem para carregar histórico
    const weightAnimalSelect = document.getElementById('weight-animal-id');
    if (weightAnimalSelect) {
      weightAnimalSelect.addEventListener('change', () => {
        window.ui.updateWeightHistoryTable();
      });
    }

    // Evento de seleção de animal no modal de venda para preencher o peso automaticamente
    const saleAnimalSelect = document.getElementById('sale-animal-select');
    if (saleAnimalSelect) {
      saleAnimalSelect.addEventListener('change', (e) => {
        const animalId = e.target.value;
        const pesoVendaInput = document.getElementById('sale-peso-venda');
        if (pesoVendaInput) {
          if (animalId) {
            const animal = window.db.getAnimal(animalId);
            pesoVendaInput.value = animal ? (animal.peso_atual || '') : '';
          } else {
            pesoVendaInput.value = '';
          }
        }
      });
    }

    // Habilita temporariamente o select de animal desativado durante a submissão para que a FormData o capture
    const saleForm = document.getElementById('form-sale-modal');
    if (saleForm) {
      saleForm.addEventListener('submit', () => {
        const animalSelect = document.getElementById('sale-animal-select');
        if (animalSelect && animalSelect.disabled) {
          animalSelect.disabled = false;
          setTimeout(() => {
            animalSelect.disabled = true;
          }, 0);
        }
      });
    }

    // Submissão de Formulários
    this.bindFormSubmit('form-auth', (data) => this.handleAuthSubmit(data));
    this.bindFormSubmit('form-animal', (data) => this.handleAnimalSubmit(data));
    this.bindFormSubmit('form-weight', (data) => this.handleWeightSubmit(data));
    this.bindFormSubmit('form-birth', (data) => this.handleBirthSubmit(data));
    this.bindFormSubmit('form-sale-modal', (data) => this.handleSaleSubmit(data));
    this.bindFormSubmit('form-client', (data) => this.handleClientSubmit(data));
    this.bindFormSubmit('form-client-modal', (data) => this.handleClientSubmit(data));
    this.bindFormSubmit('form-configuracoes', (data) => this.handleConfiguracoesSubmit(data));
    this.bindFormSubmit('form-change-password', (data) => this.handleChangePasswordSubmit(data));

    // Fechar modais ao clicar no overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay.id);
        }
      });
    });
  }

  bindFormSubmit(formId, handler) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
      handler(data);
    });
  }

  // --- ACTIONS DE MODAIS ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Alterna campos do form de animais com base na origem
  toggleAnimalOrigemFields(origem) {
    const compFields = document.getElementById('comprado-fields');
    const nascFields = document.getElementById('nascido-fields');

    if (origem === 'Comprado') {
      if (compFields) compFields.classList.remove('hidden');
      if (nascFields) nascFields.classList.add('hidden');
      
      // Carrega fornecedores dinamicamente no cadastro
      const clientSelect = document.getElementById('animal-fornecedor');
      if (clientSelect) {
        const suppliers = window.db.getClients().filter(c => c.tipo === 'Fornecedor' || c.tipo === 'Ambos');
        clientSelect.innerHTML = '<option value="">Selecione o Fornecedor...</option>' +
          suppliers.map(s => `<option value="${s.id}">${s.nome} (${s.cidade})</option>`).join('');
      }
    } else if (origem === 'Nascido') {
      if (compFields) compFields.classList.add('hidden');
      if (nascFields) nascFields.classList.remove('hidden');

      // Popula mães e pais no cadastro de animais
      const maeSelect = document.getElementById('animal-mae');
      const paiSelect = document.getElementById('animal-pai');
      const animals = window.db.getAnimals();

      if (maeSelect) {
        const vacas = animals.filter(a => a.sexo === 'F' && (a.categoria === 'Vaca' || a.categoria === 'Matriz') && a.status === 'Ativo');
        maeSelect.innerHTML = '<option value="">Selecione a Mãe...</option>' +
          vacas.map(v => `<option value="${v.id}">Brinco ${v.brinco} - ${v.nome || 'Vaca'}</option>`).join('');
      }

      if (paiSelect) {
        const touros = animals.filter(a => a.sexo === 'M' && (a.categoria === 'Boi' || a.categoria === 'Reprodutor') && a.status === 'Ativo');
        paiSelect.innerHTML = '<option value="">Selecione o Pai (Opcional)...</option>' +
          touros.map(t => `<option value="${t.id}">Brinco ${t.brinco} - ${t.nome || 'Touro'}</option>`).join('');
      }
    } else {
      if (compFields) compFields.classList.add('hidden');
      if (nascFields) nascFields.classList.add('hidden');
    }
  }

  // --- SUBMIT HANDLERS ---

  // Cadastro/Edição de Animais
  handleAnimalSubmit(data) {
    const isEdit = !!data.id;

    // Validações antes de cadastrar
    if (!isEdit) {
      if (data.origem === 'Comprado') {
        if (!data.fornecedor) {
          window.ui.showToast('Selecione um Fornecedor.', 'error');
          return;
        }
        if (!data.valor_compra || parseFloat(data.valor_compra) <= 0) {
          window.ui.showToast('Informe o Valor de Compra.', 'error');
          return;
        }
        if (!data.data_compra) {
          window.ui.showToast('Informe a Data de Compra.', 'error');
          return;
        }
      } else if (data.origem === 'Nascido') {
        if (!data.mae_id) {
          window.ui.showToast('Selecione a Mãe (Matriz).', 'error');
          return;
        }
      } else if (!data.origem) {
        window.ui.showToast('Selecione a Origem do Animal.', 'error');
        return;
      }
    }
    
    // Objeto base do animal
    const animalData = {
      codigo: data.codigo,
      brinco: data.brinco,
      nome: data.nome,
      sexo: data.sexo,
      raca: data.raca,
      categoria: data.categoria,
      nascimento: data.nascimento,
      origem: data.origem,
      foto: '',
      peso_atual: parseFloat(data.peso_atual) || 0
    };

    if (isEdit) {
      animalData.id = parseInt(data.id);
      animalData.status = data.status || 'Ativo';
    }

    const saved = window.db.saveAnimal(animalData);

    // Se for inserção e Comprado, cria registro de compra
    if (!isEdit && data.origem === 'Comprado') {
      window.db.addPurchase({
        animal_id: saved.id,
        fornecedor: parseInt(data.fornecedor),
        valor: parseFloat(data.valor_compra) || 0,
        data: data.data_compra || new Date().toISOString().split('T')[0]
      });
    }

    // Se for inserção e Nascido, cria registro de nascimento
    if (!isEdit && data.origem === 'Nascido') {
      window.db.addBirth({
        animal_id: saved.id,
        mae_id: parseInt(data.mae_id),
        pai_id: data.pai_id ? parseInt(data.pai_id) : null,
        data: data.nascimento,
        peso_ao_nascer: parseFloat(data.peso_atual) || 0
      });
    }

    window.ui.showToast(isEdit ? 'Cadastro de animal atualizado com sucesso!' : 'Animal cadastrado com sucesso!');
    this.closeModal('modal-animal-form');
    document.getElementById('form-animal').reset();
    this.toggleAnimalOrigemFields('');
    
    this.refreshTabContent(this.activeTab);
  }

  // Pesagem
  handleWeightSubmit(data) {
    if (!data.animal_id || !data.peso || !data.data) {
      window.ui.showToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    window.db.addWeight({
      animal_id: parseInt(data.animal_id),
      data: data.data,
      peso: parseFloat(data.peso)
    });

    window.ui.showToast('Pesagem registrada com sucesso!');
    
    // Limpa campos específicos mantendo o animal
    document.getElementById('weight-peso').value = '';
    
    window.ui.updateWeightHistoryTable();
    
    // Se estiver com o modal do perfil aberto, atualiza-o também
    if (window.ui.currentAnimalDetailId === parseInt(data.animal_id)) {
      window.ui.showAnimalDetails(data.animal_id);
    }
  }

  // Nascimento (Controle de Reprodução)
  handleBirthSubmit(data) {
    if (!data.mae_id || !data.brinco || !data.sexo || !data.nascimento) {
      window.ui.showToast('Preencha os campos obrigatórios para o bezerro', 'error');
      return;
    }

    // 1. Cadastra primeiro o animal bezerro
    const calfCategory = data.sexo === 'M' ? 'Bezerro' : 'Bezerra';
    const animalsCount = window.db.getAnimals().length + 1;
    const autoCode = `B${String(animalsCount).padStart(3, '0')}`;

    const calf = window.db.saveAnimal({
      codigo: autoCode,
      brinco: data.brinco,
      nome: data.nome || `Filho da ${data.mae_id}`,
      sexo: data.sexo,
      raca: data.raca || 'Nelore',
      categoria: calfCategory,
      nascimento: data.nascimento,
      origem: 'Nascido',
      peso_atual: parseFloat(data.peso_ao_nascer) || 0,
      status: 'Ativo'
    });

    // 2. Cria o registro na tabela Nascimentos
    window.db.addBirth({
      animal_id: calf.id,
      mae_id: parseInt(data.mae_id),
      pai_id: data.pai_id ? parseInt(data.pai_id) : null,
      data: data.nascimento,
      peso_ao_nascer: parseFloat(data.peso_ao_nascer) || 0
    });

    window.ui.showToast('Nascimento registrado com sucesso e bezerro adicionado ao estoque!');
    document.getElementById('form-birth').reset();
    this.setDefaultDates();
    this.refreshTabContent('reproducao');
  }

  // Venda (Modal de Venda)
  handleSaleSubmit(data) {
    if (!data.animal_id || !data.comprador || !data.valor || !data.peso_venda || !data.data || !data.forma_pagamento) {
      window.ui.showToast('Preencha todos os campos obrigatórios da venda', 'error');
      return;
    }

    const sale = window.db.addSale({
      animal_id: parseInt(data.animal_id),
      comprador: parseInt(data.comprador),
      valor: parseFloat(data.valor),
      peso_venda: parseFloat(data.peso_venda),
      data: data.data,
      desconto: parseFloat(data.desconto) || 0,
      forma_pagamento: data.forma_pagamento
    });

    window.ui.showToast('Venda registrada com sucesso! Animal removido do estoque ativo.');
    this.closeModal('modal-sale-form');
    document.getElementById('form-sale-modal').reset();
    this.setDefaultDates();

    this.refreshTabContent(this.activeTab);

    // Pergunta se deseja emitir o recibo logo após salvar
    if (confirm('Deseja emitir o recibo em PDF desta venda agora?')) {
      this.printReceipt(sale.id);
    }
  }

  // Cadastro de Clientes (Comprador/Fornecedor)
  handleClientSubmit(data) {
    const isEdit = !!data.id;
    
    const clientData = {
      nome: data.nome,
      telefone: data.telefone,
      cidade: data.cidade,
      tipo: data.tipo
    };

    if (isEdit) {
      clientData.id = parseInt(data.id);
    }

    window.db.saveClient(clientData);
    window.ui.showToast(isEdit ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
    this.closeModal('modal-client-form');
    
    // Reset e remoção de IDs ocultos em ambos os formulários para evitar IDs "presos"
    const sidebarForm = document.getElementById('form-client');
    if (sidebarForm) {
      sidebarForm.reset();
      const idInput = sidebarForm.querySelector('input[name="id"]');
      if (idInput) idInput.remove();
    }

    const modalForm = document.getElementById('form-client-modal');
    if (modalForm) {
      modalForm.reset();
      const idInput = modalForm.querySelector('input[name="id"]');
      if (idInput) idInput.remove();
    }
    
    this.refreshTabContent('clientes');
  }

  // --- OPERAÇÕES ACIONADAS PELOS BOTÕES ---

  // Visualizar perfil detalhado
  viewAnimalProfile(id) {
    window.ui.showAnimalDetails(id);
  }

  // Adicionar nova pesagem para animal específico via tabela
  openWeightModal(animalId) {
    this.switchTab('pesagens');
    const select = document.getElementById('weight-animal-id');
    if (select) {
      select.value = animalId;
      window.ui.updateWeightHistoryTable();
    }
  }

  prepareSaleModal(preselectedAnimalId = null) {
    const animalSelect = document.getElementById('sale-animal-select');
    const compradorSelect = document.getElementById('sale-comprador');
    const pesoVendaInput = document.getElementById('sale-peso-venda');

    // Popula compradores dropdown
    if (compradorSelect) {
      const buyers = window.db.getClients().filter(c => c.tipo === 'Comprador' || c.tipo === 'Ambos');
      compradorSelect.innerHTML = '<option value="">Selecione o Comprador...</option>' +
        buyers.map(b => `<option value="${b.id}">${b.nome} (${b.cidade})</option>`).join('');
    }

    // Popula animais dropdown
    if (animalSelect) {
      const activeAnimals = window.db.getAnimals().filter(a => a.status === 'Ativo');
      
      let targetAnimal = null;
      if (preselectedAnimalId) {
        targetAnimal = window.db.getAnimal(preselectedAnimalId);
      }

      // Garante que o animal selecionado está na lista mesmo se não estiver ativo
      const listToShow = [...activeAnimals];
      if (targetAnimal && !activeAnimals.some(a => a.id === targetAnimal.id)) {
        listToShow.push(targetAnimal);
      }

      // Ordena por brinco
      listToShow.sort((a, b) => a.brinco.localeCompare(b.brinco));

      if (preselectedAnimalId) {
        animalSelect.innerHTML = listToShow.map(a => 
          `<option value="${a.id}">Brinco ${a.brinco} - ${a.nome || 'Sem Nome'} (${a.categoria})</option>`
        ).join('');
        animalSelect.value = preselectedAnimalId;
        animalSelect.disabled = true;

        if (pesoVendaInput && targetAnimal) {
          pesoVendaInput.value = targetAnimal.peso_atual || '';
        }
      } else {
        animalSelect.innerHTML = '<option value="">Selecione o Animal...</option>' +
          listToShow.map(a => 
            `<option value="${a.id}">Brinco ${a.brinco} - ${a.nome || 'Sem Nome'} (${a.categoria})</option>`
          ).join('');
        animalSelect.value = '';
        animalSelect.disabled = false;
        
        if (pesoVendaInput) {
          pesoVendaInput.value = '';
        }
      }
    }
  }

  // Registrar venda de animal específico ou genérico
  openSaleModal(animalId = null) {
    this.prepareSaleModal(animalId);
    this.openModal('modal-sale-form');
  }

  // Abre form de animal em branco
  openNewAnimalModal() {
    this.editingAnimalId = null;
    document.getElementById('modal-animal-title').innerHTML = '<i class="lucide-cow"></i> Cadastrar Novo Animal';
    const form = document.getElementById('form-animal');
    if (form) {
      form.reset();
      const idInput = form.querySelector('input[name="id"]');
      if (idInput) idInput.remove();
    }
    this.setDefaultDates();
    this.toggleAnimalOrigemFields('');
    
    // Habilita campo Origem
    const oSelect = document.getElementById('animal-origem');
    if (oSelect) oSelect.disabled = false;

    this.openModal('modal-animal-form');
  }

  // Editar dados básicos do animal
  editAnimal(id) {
    const animal = window.db.getAnimal(id);
    if (!animal) return;

    this.editingAnimalId = animal.id;
    document.getElementById('modal-animal-title').innerHTML = '<i class="lucide-edit"></i> Editar Animal';
    
    const form = document.getElementById('form-animal');
    form.reset();

    // Cria input hidden para ID se não existir
    let idInput = form.querySelector('input[name="id"]');
    if (!idInput) {
      idInput = document.createElement('input');
      idInput.type = 'hidden';
      idInput.name = 'id';
      form.appendChild(idInput);
    }
    idInput.value = animal.id;

    // Preenche campos
    document.getElementById('animal-codigo').value = animal.codigo;
    document.getElementById('animal-brinco').value = animal.brinco;
    document.getElementById('animal-nome').value = animal.nome || '';
    document.getElementById('animal-sexo').value = animal.sexo;
    document.getElementById('animal-raca').value = animal.raca;
    document.getElementById('animal-categoria').value = animal.categoria;
    document.getElementById('animal-nascimento').value = animal.nascimento;
    
    // Na edição, bloqueamos a troca de origem e campos relacionados a compra/nascimento 
    // para evitar quebra de integridade
    const oSelect = document.getElementById('animal-origem');
    oSelect.value = animal.origem;
    oSelect.disabled = true;

    this.toggleAnimalOrigemFields(''); // Esconde ambos

    // Peso atual (somente leitura para alterar via histórico de pesagens)
    const pesoField = document.getElementById('animal-peso-atual');
    if (pesoField) {
      pesoField.value = animal.peso_atual;
      pesoField.disabled = true;
    }

    this.openModal('modal-animal-form');
  }

  // Deletar animal
  deleteAnimal(id) {
    const animal = window.db.getAnimal(id);
    if (!animal) return;

    if (confirm(`Tem certeza de que deseja excluir permanentemente o Animal Brinco ${animal.brinco} (${animal.codigo})?\nEsta ação deletará todo o histórico de pesagens, compras e vendas associado a ele.`)) {
      window.db.deleteAnimal(id);
      window.ui.showToast('Animal e seus registros associados foram excluídos.');
      this.refreshTabContent(this.activeTab);
      
      // Fecha perfil se estivesse aberto
      if (window.ui.currentAnimalDetailId === parseInt(id)) {
        this.closeModal('modal-animal-profile');
      }
    }
  }

  // Deletar Pesagem
  deleteWeight(id, animalId) {
    if (confirm('Deseja excluir este registro de pesagem?')) {
      window.db.deleteWeight(id);
      window.ui.showToast('Pesagem excluída.');
      window.ui.updateWeightHistoryTable();
      this.refreshTabContent('dashboard');
    }
  }

  // Cadastrar / Editar Cliente
  openNewClientModal() {
    this.editingClientId = null;
    document.getElementById('modal-client-title').textContent = 'Cadastrar Cliente / Fornecedor';
    const form = document.getElementById('form-client-modal');
    form.reset();
    const idInput = form.querySelector('input[name="id"]');
    if (idInput) idInput.remove();
    
    this.openModal('modal-client-form');
  }

  editClient(id) {
    const clients = window.db.getClients();
    const client = clients.find(c => c.id === parseInt(id));
    if (!client) return;

    this.editingClientId = client.id;
    document.getElementById('modal-client-title').textContent = 'Editar Cliente / Fornecedor';
    
    const form = document.getElementById('form-client-modal');
    form.reset();

    let idInput = form.querySelector('input[name="id"]');
    if (!idInput) {
      idInput = document.createElement('input');
      idInput.type = 'hidden';
      idInput.name = 'id';
      form.appendChild(idInput);
    }
    idInput.value = client.id;

    document.getElementById('client-modal-nome').value = client.nome;
    document.getElementById('client-modal-telefone').value = client.telefone;
    document.getElementById('client-modal-cidade').value = client.cidade;
    document.getElementById('client-modal-tipo').value = client.tipo;

    this.openModal('modal-client-form');
  }

  deleteClient(id) {
    if (confirm('Deseja excluir este cliente?')) {
      window.db.deleteClient(id);
      window.ui.showToast('Cliente excluído.');
      
      // Limpa os formulários para garantir que nenhum ID excluído permaneça pendente
      const sidebarForm = document.getElementById('form-client');
      if (sidebarForm) {
        sidebarForm.reset();
        const idInput = sidebarForm.querySelector('input[name="id"]');
        if (idInput) idInput.remove();
      }
      const modalForm = document.getElementById('form-client-modal');
      if (modalForm) {
        modalForm.reset();
        const idInput = modalForm.querySelector('input[name="id"]');
        if (idInput) idInput.remove();
      }

      this.refreshTabContent('clientes');
    }
  }

  // --- BACKUP SISTEMA ---
  exportBackup() {
    const dataStr = window.db.exportData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `boiuni_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    window.ui.showToast('Backup exportado com sucesso!');
  }

  importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target.result;
      const success = window.db.importData(contents);
      if (success) {
        window.ui.showToast('Backup restaurado com sucesso! Recarregando dados...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        window.ui.showToast('Falha ao importar o arquivo. Verifique se o formato está correto.', 'error');
      }
    };
    reader.readAsText(file);
  }

  async clearAllUserData() {
    if (confirm("ATENÇÃO: Isso apagará permanentemente todos os animais, pesagens, compras, vendas, nascimentos e clientes do seu rebanho.\n\nEsta ação NÃO pode ser desfeita e afetará também o banco de dados na nuvem.\n\nTem certeza de que deseja limpar todo o sistema?")) {
      const confirmation = prompt("Digite 'APAGAR' em letras maiúsculas para confirmar a exclusão definitiva:");
      if (confirmation !== 'APAGAR') {
        window.ui.showToast('Operação cancelada.', 'info');
        return;
      }
      
      window.ui.showToast('Limpando dados do sistema...', 'info');
      
      try {
        // Limpa cache local
        window.db.clearLocalCache();
        
        // Se estiver autenticado, apaga os dados do Supabase
        const user = await window.db.getCurrentUser();
        if (user) {
          await window.db.wipeSupabaseData();
        }
        
        window.ui.showToast('Banco de dados redefinido! Recarregando...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        console.error("Falha ao redefinir banco de dados:", err);
        window.ui.showToast('Ocorreu um erro ao limpar os dados do servidor.', 'error');
      }
    }
  }

  async loadConfiguracoesForm() {
    const config = window.db.getConfiguracoes();
    
    let defaultProprietario = config.proprietario || '';
    let defaultEmail = config.email || '';
    
    if (!defaultProprietario || !defaultEmail) {
      try {
        const user = await window.db.getCurrentUser();
        if (user) {
          if (!defaultProprietario) {
            defaultProprietario = user.user_metadata?.nome || user.email?.split('@')[0] || '';
          }
          if (!defaultEmail) {
            defaultEmail = user.email || '';
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do usuário autenticado:", err);
      }
    }

    const fields = {
      'config-nome-fazenda': config.nome_fazenda || '',
      'config-proprietario': defaultProprietario,
      'config-cpf': config.cpf || '',
      'config-cnpj': config.cnpj || '',
      'config-telefone': config.telefone || '',
      'config-email': defaultEmail,
      'config-municipio': config.municipio || '',
      'config-estado': config.estado || ''
    };

    for (const [id, val] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (el) el.value = val;
    }
  }

  async handleConfiguracoesSubmit(data) {
    try {
      window.ui.showToast('Salvando configurações...', 'info');
      await window.db.saveConfiguracoes(data);
      window.ui.showToast('Configurações salvas com sucesso!');
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      window.ui.showToast('Erro ao salvar configurações.', 'error');
    }
  }

  async handleChangePasswordSubmit(data) {
    const password = data.new_password;
    const confirmPassword = data.confirm_password;

    if (!password || !confirmPassword) {
      window.ui.showToast('Preencha todos os campos.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      window.ui.showToast('As senhas não coincidem!', 'error');
      return;
    }

    const submitBtn = document.querySelector('#form-change-password button[type="submit"]');
    const originalInnerHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Salvando...';

    try {
      const res = await window.db.updatePassword(password);
      if (res.error) {
        window.ui.showToast(res.error.message || 'Erro ao alterar a senha.', 'error');
      } else {
        window.ui.showToast('Senha alterada com sucesso!');
        document.getElementById('form-change-password').reset();
      }
    } catch (err) {
      console.error(err);
      window.ui.showToast('Ocorreu um erro ao alterar a senha.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalInnerHTML;
    }
  }

  // --- RELATÓRIOS ---
  printReport(reportType) {
    const animals = window.db.getAnimals();
    const clients = window.db.getClients();
    const purchases = window.db.getPurchases();
    const sales = window.db.getSales();
    const births = window.db.getBirths();

    // Cria uma nova janela de visualização e impressão
    const printWindow = window.open('', '_blank');
    
    let title = '';
    let tableHeaders = '';
    let tableRows = '';
    
    if (reportType === 'rebanho') {
      title = 'Relatório de Rebanho Atual';
      tableHeaders = `<th>Código</th><th>Brinco</th><th>Nome</th><th>Sexo</th><th>Raça</th><th>Categoria</th><th>Peso Atual</th><th>Data Nasc.</th><th>Origem</th>`;
      
      const active = animals.filter(a => a.status === 'Ativo');
      tableRows = active.map(a => `
        <tr>
          <td>${a.codigo}</td>
          <td>${a.brinco}</td>
          <td>${a.nome || '-'}</td>
          <td>${a.sexo === 'M' ? 'Macho' : 'Fêmea'}</td>
          <td>${a.raca}</td>
          <td>${a.categoria}</td>
          <td>${a.peso_atual} kg</td>
          <td>${window.ui.formatDate(a.nascimento)}</td>
          <td>${a.origem}</td>
        </tr>
      `).join('');
    } else if (reportType === 'vendidos') {
      title = 'Relatório de Animais Vendidos';
      tableHeaders = `<th>Data Venda</th><th>Código</th><th>Brinco</th><th>Comprador</th><th>Peso Venda</th><th>Valor Venda</th><th>Lucro Estimado</th>`;
      
      tableRows = sales.map(s => {
        const animal = animals.find(a => a.id === s.animal_id) || { brinco: '-', codigo: '-' };
        const buyer = clients.find(c => c.id === s.comprador) || { nome: '-' };
        const p = purchases.find(pur => pur.animal_id === s.animal_id);
        const purchaseVal = p ? p.valor : 0;
        const lucro = s.valor - purchaseVal;
        
        return `
          <tr>
            <td>${window.ui.formatDate(s.data)}</td>
            <td>${animal.codigo}</td>
            <td>${animal.brinco}</td>
            <td>${buyer.nome}</td>
            <td>${s.peso_venda} kg</td>
            <td>${window.ui.formatCurrency(s.valor)}</td>
            <td>${window.ui.formatCurrency(lucro)}</td>
          </tr>
        `;
      }).join('');
    } else if (reportType === 'compras') {
      title = 'Relatório de Compras de Animais';
      tableHeaders = `<th>Data Compra</th><th>Código</th><th>Brinco</th><th>Fornecedor</th><th>Valor Compra</th>`;
      
      tableRows = purchases.map(p => {
        const animal = animals.find(a => a.id === p.animal_id) || { brinco: '-', codigo: '-' };
        const supplier = clients.find(c => c.id === p.fornecedor) || { nome: '-' };
        
        return `
          <tr>
            <td>${window.ui.formatDate(p.data)}</td>
            <td>${animal.codigo}</td>
            <td>${animal.brinco}</td>
            <td>${supplier.nome}</td>
            <td>${window.ui.formatCurrency(p.valor)}</td>
          </tr>
        `;
      }).join('');
    } else if (reportType === 'nascimentos') {
      title = 'Relatório de Nascimentos (Reprodução)';
      tableHeaders = `<th>Data Nasc.</th><th>Código</th><th>Brinco</th><th>Sexo</th><th>Mãe (Matriz)</th><th>Pai (Reprodutor)</th><th>Peso ao Nascer</th>`;
      
      tableRows = births.map(b => {
        const calf = animals.find(a => a.id === b.animal_id) || { brinco: '-', codigo: '-', sexo: 'F' };
        const mae = animals.find(a => a.id === b.mae_id) || { brinco: '-', nome: '-' };
        const pai = b.pai_id ? (animals.find(a => a.id === b.pai_id) || { brinco: '-', nome: '-' }) : null;
        
        return `
          <tr>
            <td>${window.ui.formatDate(b.data)}</td>
            <td>${calf.codigo}</td>
            <td>${calf.brinco}</td>
            <td>${calf.sexo === 'M' ? 'Macho' : 'Fêmea'}</td>
            <td>Brinco ${mae.brinco} ${mae.nome ? `(${mae.nome})` : ''}</td>
            <td>${pai ? `Brinco ${pai.brinco} ${pai.nome ? `(${pai.nome})` : ''}` : 'Não Informado'}</td>
            <td>${b.peso_ao_nascer ? `${b.peso_ao_nascer} kg` : '-'}</td>
          </tr>
        `;
      }).join('');
    } else if (reportType === 'pesagem') {
      title = 'Relatório de Evolução de Peso do Rebanho';
      tableHeaders = `<th>Código</th><th>Brinco</th><th>Nome</th><th>Categoria</th><th>Peso Inicial</th><th>Peso Atual</th><th>Ganho de Peso</th>`;
      
      const active = animals.filter(a => a.status === 'Ativo');
      tableRows = active.map(a => {
        const aWeights = window.db.getAnimalWeights(a.id);
        const pesoInicial = aWeights.length > 0 ? aWeights[0].peso : 0;
        const ganho = a.peso_atual - pesoInicial;
        
        return `
          <tr>
            <td>${a.codigo}</td>
            <td>${a.brinco}</td>
            <td>${a.nome || '-'}</td>
            <td>${a.categoria}</td>
            <td>${pesoInicial} kg</td>
            <td>${a.peso_atual} kg</td>
            <td style="font-weight: bold; color: ${ganho >= 0 ? '#166534' : '#991b1b'};">
              ${ganho >= 0 ? '+' : ''}${ganho.toFixed(1)} kg
            </td>
          </tr>
        `;
      }).join('');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - BoiUni</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #15803d; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #15803d; font-size: 26px; }
          .header p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f1f5f9; color: #0f1c15; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
          td { padding: 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
          tr:hover { background-color: #f8fafc; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print {
            .no-print { display: none; }
          }
          .btn-print { background-color: #15803d; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>BoiUni - Gestão Agropecuária</h1>
            <p>${title}</p>
          </div>
          <div class="no-print">
            <button class="btn-print" onclick="window.print()">Imprimir PDF</button>
          </div>
        </div>
        <p style="font-size: 13px; color: #64748b;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          <p>© 2026 BoiUni - Sistema de Controle de Rebanho Bovino.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  printReceipt(saleId) {
    const sale = window.db.getSales().find(s => s.id === parseInt(saleId));
    if (!sale) {
      window.ui.showToast('Venda não encontrada.', 'error');
      return;
    }

    const animal = window.db.getAnimals().find(a => a.id === sale.animal_id) || { brinco: '-', codigo: '-', nome: '-', raca: '-', categoria: '-' };
    const buyer = window.db.getClients().find(c => c.id === sale.comprador) || { nome: 'Não cadastrado', telefone: '-', cidade: '-' };
    const config = window.db.getConfiguracoes();

    // Default values if settings are not set
    const farmName = config.nome_fazenda || 'Fazenda não configurada';
    const ownerName = config.proprietario || 'Proprietário não configurado';
    const cpfCnpj = config.cnpj ? `CNPJ: ${config.cnpj}` : (config.cpf ? `CPF: ${config.cpf}` : 'Sem CPF/CNPJ cadastrado');
    const farmPhone = config.telefone || '-';
    const farmEmail = config.email || '-';
    const farmLocation = (config.municipio && config.estado) ? `${config.municipio} - ${config.estado}` : 'Localização não cadastrada';

    const grossValue = sale.valor;
    const discount = sale.desconto || 0;
    const finalValue = grossValue - discount;

    const receiptNo = String(sale.id).padStart(6, '0');
    const dateFormatted = window.ui.formatDate(sale.data);

    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Recibo BoiUni #${receiptNo}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
            font-size: 14px;
            line-height: 1.5;
          }
          .invoice-card {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            padding: 30px;
            border-radius: 8px;
          }
          .header-grid {
            display: grid;
            grid-template-columns: 1fr auto;
            border-bottom: 2px solid #15803d;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo-area h1 {
            color: #15803d;
            margin: 0;
            font-size: 28px;
            font-weight: bold;
          }
          .logo-area p {
            color: #64748b;
            margin: 5px 0 0 0;
            font-size: 14px;
          }
          .receipt-details {
            text-align: right;
          }
          .receipt-details h2 {
            margin: 0;
            color: #1e293b;
            font-size: 20px;
          }
          .receipt-details p {
            margin: 5px 0 0 0;
            color: #64748b;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            color: #15803d;
            margin-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .info-block p {
            margin: 6px 0;
          }
          .info-block strong {
            color: #0f172a;
          }
          .table-receipt {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .table-receipt th {
            background-color: #f1f5f9;
            color: #0f172a;
            text-align: left;
            padding: 12px;
            border-bottom: 2px solid #cbd5e1;
            font-weight: bold;
          }
          .table-receipt td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .financial-summary {
            float: right;
            width: 300px;
            margin-bottom: 40px;
          }
          .financial-summary .row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .financial-summary .row.total {
            font-size: 16px;
            font-weight: bold;
            color: #15803d;
            border-bottom: 2px solid #15803d;
            padding-top: 12px;
          }
          .clear {
            clear: both;
          }
          .declaration {
            margin-top: 20px;
            padding: 15px;
            background-color: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid #15803d;
            font-style: italic;
            margin-bottom: 50px;
          }
          .signature-area {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            text-align: center;
            margin-top: 60px;
          }
          .signature-line {
            border-top: 1px solid #94a3b8;
            padding-top: 10px;
            font-weight: bold;
            color: #334155;
          }
          .signature-area span {
            font-size: 12px;
            color: #64748b;
            display: block;
            margin-top: 4px;
          }
          .btn-print-box {
            text-align: center;
            margin-bottom: 20px;
          }
          .btn-print {
            background-color: #15803d;
            color: #ffffff;
            border: none;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          @media print {
            .no-print {
              display: none;
            }
            body {
              padding: 0;
            }
            .invoice-card {
              border: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="btn-print-box no-print">
          <button class="btn-print" onclick="window.print()">Imprimir Recibo / Salvar PDF</button>
        </div>
        
        <div class="invoice-card">
          <div class="header-grid">
            <div class="logo-area">
              <h1>BoiUni</h1>
              <p>Gestão Pecuária Inteligente</p>
            </div>
            <div class="receipt-details">
              <h2>RECIBO DE VENDA</h2>
              <p><strong>Nº:</strong> #${receiptNo}</p>
              <p><strong>Data:</strong> ${dateFormatted}</p>
            </div>
          </div>
          
          <div class="grid-2">
            <div class="info-block">
              <div class="section-title">Vendedor (Emitente)</div>
              <p><strong>Fazenda:</strong> ${farmName}</p>
              <p><strong>Proprietário:</strong> ${ownerName}</p>
              <p><strong>Documento:</strong> ${cpfCnpj}</p>
              <p><strong>Telefone:</strong> ${farmPhone}</p>
              <p><strong>E-mail:</strong> ${farmEmail}</p>
              <p><strong>Cidade/UF:</strong> ${farmLocation}</p>
            </div>
            
            <div class="info-block">
              <div class="section-title">Comprador (Cliente)</div>
              <p><strong>Nome:</strong> ${buyer.nome}</p>
              <p><strong>Telefone:</strong> ${buyer.telefone}</p>
              <p><strong>Cidade:</strong> ${buyer.cidade}</p>
              <p><strong>Forma de Pagamento:</strong> ${sale.forma_pagamento || '-'}</p>
            </div>
          </div>
          
          <div class="section-title">Descrição do Produto Vendido</div>
          <table class="table-receipt">
            <thead>
              <tr>
                <th>Código</th>
                <th>Brinco</th>
                <th>Nome do Animal</th>
                <th>Raça</th>
                <th>Categoria</th>
                <th>Peso Final</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${animal.codigo}</td>
                <td><strong>${animal.brinco}</strong></td>
                <td>${animal.nome || '-'}</td>
                <td>${animal.raca}</td>
                <td>${animal.categoria}</td>
                <td>${sale.peso_venda} kg</td>
              </tr>
            </tbody>
          </table>
          
          <div class="financial-summary">
            <div class="row">
              <span>Valor Bruto:</span>
              <span>${window.ui.formatCurrency(grossValue)}</span>
            </div>
            <div class="row">
              <span>Desconto:</span>
              <span>${discount > 0 ? `-${window.ui.formatCurrency(discount)}` : 'R$ 0,00'}</span>
            </div>
            <div class="row total">
              <span>Total Pago:</span>
              <span>${window.ui.formatCurrency(finalValue)}</span>
            </div>
          </div>
          
          <div class="clear"></div>
          
          <div class="declaration">
            Declaramos para os devidos fins que recebemos do Comprador acima identificado a importância líquida de 
            <strong>${window.ui.formatCurrency(finalValue)}</strong> referente à venda do animal descrito neste recibo, 
            dando-lhe por este instrumento plena e irrevogável quitação.
          </div>
          
          <div class="signature-area">
            <div>
              <div class="signature-line">${ownerName}</div>
              <span>Assinatura do Vendedor</span>
            </div>
            <div>
              <div class="signature-line">${buyer.nome}</div>
              <span>Assinatura do Comprador</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  // --- CONTROLE DE AUTENTICAÇÃO (UI & CONTROL) ---
  setAuthMode(mode, event) {
    if (event) event.preventDefault();
    this.authMode = mode; // 'login', 'signup', 'forgot' ou 'update-password'
    
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const nameGroup = document.getElementById('auth-name-group');
    const nameInput = document.getElementById('auth-name');
    const emailGroup = document.getElementById('auth-email-group');
    const emailInput = document.getElementById('auth-email');
    const passwordGroup = document.getElementById('auth-password-group');
    const passwordInput = document.getElementById('auth-password');
    const passwordLabel = passwordGroup ? passwordGroup.querySelector('label') : null;
    const confirmGroup = document.getElementById('auth-confirm-password-group');
    const confirmInput = document.getElementById('auth-confirm-password');
    const forgotContainer = document.getElementById('auth-forgot-container');
    const submitBtn = document.getElementById('btn-auth-submit');
    const msg = document.getElementById('auth-toggle-msg');
    const link = document.getElementById('auth-toggle-link');
    
    // Reset values and input types to password
    if (nameInput) nameInput.value = '';
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.type = 'password';
    }
    if (confirmInput) {
      confirmInput.value = '';
      confirmInput.type = 'password';
    }
    
    // Reset eye icons
    document.querySelectorAll('.password-toggle-btn i').forEach(icon => {
      icon.className = 'lucide-eye';
    });
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    if (mode === 'signup') {
      if (title) title.textContent = 'BoiUni - Criar Conta';
      if (subtitle) subtitle.textContent = 'Gerencie seu rebanho de qualquer lugar';
      if (nameGroup) nameGroup.classList.remove('hidden');
      if (nameInput) nameInput.required = true;
      if (emailGroup) emailGroup.classList.remove('hidden');
      if (emailInput) emailInput.required = true;
      if (passwordGroup) passwordGroup.classList.remove('hidden');
      if (passwordInput) {
        passwordInput.required = true;
        passwordInput.placeholder = 'Crie uma senha de acesso';
      }
      if (passwordLabel) passwordLabel.textContent = 'Senha *';
      if (confirmGroup) confirmGroup.classList.remove('hidden');
      if (confirmInput) confirmInput.required = true;
      if (forgotContainer) forgotContainer.classList.add('hidden');
      if (submitBtn) submitBtn.textContent = 'Cadastrar e Entrar';
      if (msg) msg.textContent = 'Já tem uma conta?';
      if (link) link.textContent = 'Acessar Conta';
    } else if (mode === 'forgot') {
      if (title) title.textContent = 'Recuperar Senha';
      if (subtitle) subtitle.textContent = 'Enviaremos um link para alterar sua senha';
      if (nameGroup) nameGroup.classList.add('hidden');
      if (nameInput) nameInput.required = false;
      if (emailGroup) emailGroup.classList.remove('hidden');
      if (emailInput) emailInput.required = true;
      if (passwordGroup) passwordGroup.classList.add('hidden');
      if (passwordInput) passwordInput.required = false;
      if (confirmGroup) confirmGroup.classList.add('hidden');
      if (confirmInput) confirmInput.required = false;
      if (forgotContainer) forgotContainer.classList.add('hidden');
      if (submitBtn) submitBtn.textContent = 'Enviar Link de Recuperação';
      if (msg) msg.textContent = 'Lembrou a senha?';
      if (link) link.textContent = 'Voltar para o Login';
    } else if (mode === 'update-password') {
      if (title) title.textContent = 'Nova Senha';
      if (subtitle) subtitle.textContent = 'Digite sua nova senha de acesso';
      if (nameGroup) nameGroup.classList.add('hidden');
      if (nameInput) nameInput.required = false;
      if (emailGroup) emailGroup.classList.add('hidden');
      if (emailInput) emailInput.required = false;
      if (passwordGroup) passwordGroup.classList.remove('hidden');
      if (passwordInput) {
        passwordInput.required = true;
        passwordInput.placeholder = 'Digite a nova senha';
      }
      if (passwordLabel) passwordLabel.textContent = 'Nova Senha *';
      if (confirmGroup) confirmGroup.classList.remove('hidden');
      if (confirmInput) confirmInput.required = true;
      if (forgotContainer) forgotContainer.classList.add('hidden');
      if (submitBtn) submitBtn.textContent = 'Salvar Nova Senha';
      if (msg) msg.textContent = 'Deseja cancelar?';
      if (link) link.textContent = 'Sair';
    } else { // 'login'
      if (title) title.textContent = 'BoiUni';
      if (subtitle) subtitle.textContent = 'Acesse o controle do seu rebanho';
      if (nameGroup) nameGroup.classList.add('hidden');
      if (nameInput) nameInput.required = false;
      if (emailGroup) emailGroup.classList.remove('hidden');
      if (emailInput) emailInput.required = true;
      if (passwordGroup) passwordGroup.classList.remove('hidden');
      if (passwordInput) {
        passwordInput.required = true;
        passwordInput.placeholder = 'Digite sua senha';
      }
      if (passwordLabel) passwordLabel.textContent = 'Senha *';
      if (confirmGroup) confirmGroup.classList.add('hidden');
      if (confirmInput) confirmInput.required = false;
      if (forgotContainer) forgotContainer.classList.remove('hidden');
      if (submitBtn) submitBtn.textContent = 'Entrar';
      if (msg) msg.textContent = 'Não tem uma conta?';
      if (link) link.textContent = 'Cadastre-se';
    }
  }

  toggleAuthMode(event) {
    if (event) event.preventDefault();
    if (this.authMode === 'login') {
      this.setAuthMode('signup');
    } else if (this.authMode === 'update-password') {
      window.db.logout();
    } else {
      this.setAuthMode('login');
    }
  }

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i class="lucide-eye-off"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i class="lucide-eye"></i>';
    }
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  openAuthModal(mode, event) {
    if (event) event.preventDefault();
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay) {
      authOverlay.classList.remove('hidden');
    }
    this.setAuthMode(mode);
  }

  closeAuthModal() {
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay) {
      authOverlay.classList.add('hidden');
    }
  }

  async handleAuthSubmit(data) {
    const email = document.getElementById('auth-email').value;
    const submitBtn = document.getElementById('btn-auth-submit');
    
    if (this.authMode !== 'update-password' && !email) return;
    
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Carregando...';
    
    try {
      let res;
      if (this.authMode === 'forgot') {
        res = await window.db.resetPassword(email);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
        if (res.error) {
          window.ui.showToast(res.error.message || 'Erro ao enviar e-mail de recuperação.', 'error');
        } else {
          window.ui.showToast('E-mail de recuperação enviado com sucesso!');
          this.setAuthMode('login');
        }
        return;
      }
      
      if (this.authMode === 'update-password') {
        const password = document.getElementById('auth-password').value;
        const confirmPassword = document.getElementById('auth-confirm-password').value;
        if (!password || !confirmPassword) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          return;
        }
        if (password !== confirmPassword) {
          window.ui.showToast('As senhas não coincidem!', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          return;
        }
        res = await window.db.updatePassword(password);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
        if (res.error) {
          window.ui.showToast(res.error.message || 'Erro ao alterar a senha.', 'error');
        } else {
          // Limpa hash de recovery do URL
          if (history.replaceState) {
            history.replaceState(null, null, window.location.pathname);
          } else {
            window.location.hash = '';
          }
          
          window.ui.showToast('Senha alterada com sucesso!');
          const authOverlay = document.getElementById('auth-overlay');
          const landingPage = document.getElementById('landing-page');
          const appContainer = document.getElementById('app-container');
          
          if (authOverlay) authOverlay.classList.add('hidden');
          if (landingPage) landingPage.classList.add('hidden');
          if (appContainer) appContainer.classList.remove('hidden');
          
          const session = await window.db.getCurrentSession();
          const user = session?.user || res.data?.user;
          const name = user?.user_metadata?.nome || user?.email?.split('@')[0] || '';
          const greetingEl = document.getElementById('user-greeting-sidebar');
          if (greetingEl) {
            greetingEl.textContent = `Olá, ${name}!`;
          }
          
          this.switchTab('dashboard');
        }
        return;
      }
      
      const password = document.getElementById('auth-password').value;
      if (!password) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      
      if (this.authMode === 'signup') {
        const confirmPassword = document.getElementById('auth-confirm-password').value;
        if (password !== confirmPassword) {
          window.ui.showToast('As senhas não coincidem!', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          return;
        }
        const nome = document.getElementById('auth-name').value;
        if (!nome) {
          window.ui.showToast('Nome é obrigatório para cadastro.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          return;
        }
        res = await window.db.signUp(email, password, nome);
        
        // Se o cadastro foi bem-sucedido mas a sessão retornou nula, faz o login automático
        // pois o trigger tr_auto_confirm_email no Supabase já confirmou o e-mail.
        if (!res.error && !res.data.session) {
          res = await window.db.login(email, password);
        }
      } else {
        res = await window.db.login(email, password);
      }
      
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      
      if (res.error) {
        window.ui.showToast(res.error.message || 'Erro na autenticação.', 'error');
      } else {
        // Sucesso! Esconde o Overlay, Landing Page e inicializa
        const authOverlay = document.getElementById('auth-overlay');
        const landingPage = document.getElementById('landing-page');
        const appContainer = document.getElementById('app-container');
        
        if (authOverlay) authOverlay.classList.add('hidden');
        if (landingPage) landingPage.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        
        // Atualiza saudação na barra lateral
        const user = res.data.user;
        const name = user?.user_metadata?.nome || user?.email?.split('@')[0] || '';
        const greetingEl = document.getElementById('user-greeting-sidebar');
        if (greetingEl) {
          greetingEl.textContent = `Olá, ${name}!`;
        }
        
        window.ui.showToast(this.authMode === 'signup' ? 'Conta criada! Dados semeados com sucesso.' : 'Bem-vindo de volta!');
        this.switchTab('dashboard');
      }
    } catch (err) {
      console.error(err);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      window.ui.showToast('Ocorreu um erro ao conectar ao Supabase.', 'error');
    }
  }

  // --- CONTROLE DE INSTALAÇÃO PWA ---
  setupPwaInstallListeners() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Impede que o prompt automático apareça no Chrome antigo
      e.preventDefault();
      // Armazena o evento
      window.deferredPrompt = e;
      
      // Mostra o botão de instalação na barra lateral
      const installBtn = document.getElementById('menu-item-install');
      if (installBtn) installBtn.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', (evt) => {
      console.log('App instalado com sucesso.');
      const installBtn = document.getElementById('menu-item-install');
      if (installBtn) installBtn.classList.add('hidden');
      window.ui.showToast('BoiUni instalado como aplicativo!');
    });
  }

  triggerPwaInstall(event) {
    if (event) event.preventDefault();
    
    const installBtn = document.getElementById('menu-item-install');
    
    if (window.deferredPrompt) {
      // Esconde o botão temporariamente
      if (installBtn) installBtn.classList.add('hidden');
      
      window.deferredPrompt.prompt();
      
      window.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Usuário aceitou instalar o PWA.');
          window.deferredPrompt = null;
        } else {
          console.log('Usuário recusou instalar o PWA.');
          // Mostra o botão novamente se recusado
          if (installBtn) installBtn.classList.remove('hidden');
        }
      });
    } else {
      // Caso não tenha suporte nativo ao Prompt ou já esteja instalado (Safari iOS, etc.)
      window.ui.showToast('Para instalar, clique nas configurações do seu navegador e selecione "Instalar" ou "Adicionar à Tela de Início".', 'info');
    }
  }

  // --- INTERATIVIDADE DA LANDING PAGE ---
  setupLandingPageInteractivity() {
    // 1. Mockup Dinâmico
    const features = document.querySelectorAll('.feature-card');
    features.forEach(card => {
      card.addEventListener('mouseenter', () => {
        const feature = card.dataset.feature;
        this.previewMockupScreen(feature);
        
        features.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    const featuresGrid = document.querySelector('.features-grid');
    if (featuresGrid) {
      featuresGrid.addEventListener('mouseleave', () => {
        this.previewMockupScreen('dashboard');
        features.forEach(c => c.classList.remove('active'));
      });
    }

    // 2. Simulador Pecuário
    const simAnimalsInput = document.getElementById('sim-animals');
    const simGmdInput = document.getElementById('sim-gmd');
    const simDaysInput = document.getElementById('sim-days');
    const simArrobaInput = document.getElementById('sim-arroba');

    if (simAnimalsInput && simGmdInput && simDaysInput && simArrobaInput) {
      const updateSim = () => this.updateSimulator();
      
      simAnimalsInput.addEventListener('input', updateSim);
      simGmdInput.addEventListener('input', updateSim);
      simDaysInput.addEventListener('input', updateSim);
      simArrobaInput.addEventListener('input', updateSim);
      
      // Inicializa valores
      this.updateSimulator();
    }

    // 3. FAQ Accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isActive = item.classList.contains('active');
        
        // Fecha todos
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        
        // Abre o atual se não estava ativo
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  }

  previewMockupScreen(viewId) {
    const mockupScreen = document.getElementById('hero-mockup-screen');
    if (!mockupScreen) return;
    
    mockupScreen.setAttribute('data-active-view', viewId);
    
    // Atualiza abas da sidebar do mockup
    mockupScreen.querySelectorAll('.mockup-sidebar .mockup-menu-item').forEach(item => {
      if (item.getAttribute('data-mock-tab') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Atualiza visualização ativa
    mockupScreen.querySelectorAll('.mockup-view').forEach(view => {
      if (view.id === `mockup-view-${viewId}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });
  }

  updateSimulator() {
    const animals = parseInt(document.getElementById('sim-animals').value) || 0;
    const gmd = parseFloat(document.getElementById('sim-gmd').value) || 0;
    const days = parseInt(document.getElementById('sim-days').value) || 0;
    const arrobaPrice = parseFloat(document.getElementById('sim-arroba').value) || 0;

    // Elementos do DOM
    const valAnimals = document.getElementById('sim-val-animals');
    const valGmd = document.getElementById('sim-val-gmd');
    const valDays = document.getElementById('sim-val-days');
    const valArroba = document.getElementById('sim-val-arroba');

    const resWeightAnimal = document.getElementById('sim-res-weight-animal');
    const resArrobaAnimal = document.getElementById('sim-res-arroba-animal');
    const resWeightTotal = document.getElementById('sim-res-weight-total');
    const resRevenue = document.getElementById('sim-res-revenue');

    if (valAnimals) valAnimals.textContent = `${animals} cabeças`;
    if (valGmd) valGmd.textContent = `${gmd.toFixed(1)} kg/dia`;
    if (valDays) valDays.textContent = `${days} dias`;
    if (valArroba) valArroba.textContent = `R$ ${arrobaPrice.toFixed(0)}`;

    // Contas
    const weightGainedPerAnimal = gmd * days; // kg
    // 50% de rendimento de carcaça, 15 kg por arroba (@)
    const arrobasGained = (weightGainedPerAnimal * 0.5) / 15;
    
    const totalWeightGained = weightGainedPerAnimal * animals; // kg
    const totalWeightFormatted = totalWeightGained >= 1000 
      ? `${(totalWeightGained / 1000).toFixed(1)} toneladas` 
      : `${totalWeightGained.toFixed(0)} kg`;

    const totalRevenue = animals * arrobasGained * arrobaPrice;

    // Formata moeda em BRL
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    });

    // Atualiza elementos no DOM
    if (resWeightAnimal) resWeightAnimal.textContent = `${weightGainedPerAnimal.toFixed(1)} kg`;
    if (resArrobaAnimal) resArrobaAnimal.textContent = `~ ${arrobasGained.toFixed(1)} @ (carcaça)`;
    if (resWeightTotal) resWeightTotal.textContent = totalWeightFormatted;
    if (resRevenue) resRevenue.textContent = formatter.format(totalRevenue);
  }
}

// Cria instância global
window.app = new AppController();

// Inicializa no DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
