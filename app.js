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
    
    const today = new Date();
    this.currentCalendarYear = today.getFullYear();
    this.currentCalendarMonth = today.getMonth();
  }

  async init() {
    // 1. Inicializa o Tema
    this.applyTheme(this.currentTheme);

    // 2. Vincula Eventos
    this.setupEventListeners();
    this.setupInputMasks();

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
      case 'custos':
        window.ui.renderPropertyCostsView();
        break;
      case 'relatorios':
        window.ui.renderReportsView();
        break;
      case 'configuracoes':
        this.loadConfiguracoesForm();
        break;
      case 'calendario':
        this.renderCalendar();
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
      'sell-data',
      'expense-data',
      'cost-data'
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

    const filterLoteSelect = document.getElementById('animal-filter-lote');
    if (filterLoteSelect) {
      filterLoteSelect.addEventListener('change', () => {
        const catFilter = document.querySelector('#animal-filter-tab .filter-tab.active')?.dataset.filter || 'Todos';
        const q = document.getElementById('animal-search-input')?.value || '';
        window.ui.renderAnimalsList(catFilter, q);
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

    // Alterna exibição do campo de quantidade em lote no cadastro de animais
    const lotCheckbox = document.getElementById('animal-cadastro-lote');
    if (lotCheckbox) {
      lotCheckbox.addEventListener('change', (e) => {
        const qtdGroup = document.getElementById('lote-qtd-group');
        const isLote = e.target.checked;
        if (qtdGroup) {
          if (isLote) qtdGroup.classList.remove('hidden');
          else qtdGroup.classList.add('hidden');
        }
        
        // Altera labels para refletir lote
        const codeLabel = document.querySelector('label[for="animal-codigo"]');
        const brincoLabel = document.querySelector('label[for="animal-brinco"]');
        if (codeLabel) codeLabel.textContent = isLote ? "Prefixo do Código *" : "Código do Animal *";
        if (brincoLabel) brincoLabel.textContent = isLote ? "Brinco Inicial *" : "Número do Brinco *";

        this.updateBatchPurchaseCalculation();
      });
    }

    const lotQtdInput = document.getElementById('animal-lote-qtd');
    if (lotQtdInput) {
      lotQtdInput.addEventListener('input', () => this.updateBatchPurchaseCalculation());
    }
    const valCompraInput = document.getElementById('animal-valor-compra');
    if (valCompraInput) {
      valCompraInput.addEventListener('input', () => this.updateBatchPurchaseCalculation());
    }
    const tipoValSelect = document.getElementById('animal-tipo-valor-compra');
    if (tipoValSelect) {
      tipoValSelect.addEventListener('change', () => this.updateBatchPurchaseCalculation());
    }

    // Busca reativa na lista de animais no modal de vendas
    const saleSearchInput = document.getElementById('sale-search-animals');
    if (saleSearchInput) {
      saleSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('.sale-animal-item');
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          if (text.includes(query)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }

    // Evento de seleção de animal no modal de venda para somar pesos e atualizar sumário
    const saleListContainer = document.getElementById('sale-animals-list');
    if (saleListContainer) {
      saleListContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('sale-animal-checkbox')) {
          this.updateSaleSelectedSummary();
        }
      });
    }

    const saleDateInput = document.getElementById('sale-data');
    if (saleDateInput) {
      saleDateInput.addEventListener('change', () => {
        this.updateSaleSelectedSummary();
      });
    }

    // Submissão de Formulários
    this.bindFormSubmit('form-auth', (data) => this.handleAuthSubmit(data));
    this.bindFormSubmit('form-animal', (data) => this.handleAnimalSubmit(data));
    this.bindFormSubmit('form-weight', (data) => this.handleWeightSubmit(data));
    this.bindFormSubmit('form-birth', (data) => this.handleBirthSubmit(data));
    this.bindFormSubmit('form-sale-modal', (data) => this.handleSaleSubmit(data));
    this.bindFormSubmit('form-expense', (data) => this.handleExpenseSubmit(data));
    this.bindFormSubmit('form-property-cost', (data) => this.handlePropertyCostSubmit(data));
    this.bindFormSubmit('form-client', (data) => this.handleClientSubmit(data));
    this.bindFormSubmit('form-client-modal', (data) => this.handleClientSubmit(data));
    this.bindFormSubmit('form-configuracoes', (data) => this.handleConfiguracoesSubmit(data));
    this.bindFormSubmit('form-change-password', (data) => this.handleChangePasswordSubmit(data));

    // Filtros de Custos da Fazenda
    const costSearch = document.getElementById('cost-filter-search');
    if (costSearch) {
      costSearch.addEventListener('input', () => window.ui.renderPropertyCostsView());
    }
    const costFilterCat = document.getElementById('cost-filter-categoria');
    if (costFilterCat) {
      costFilterCat.addEventListener('change', () => window.ui.renderPropertyCostsView());
    }
    const costFilterPer = document.getElementById('cost-filter-periodo');
    if (costFilterPer) {
      costFilterPer.addEventListener('change', () => window.ui.renderPropertyCostsView());
    }

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

    this.updateBatchPurchaseCalculation();
  }

  // Atualiza cálculo dinâmico de compras em lote
  updateBatchPurchaseCalculation() {
    const isLote = document.getElementById('animal-cadastro-lote')?.checked;
    const origem = document.getElementById('animal-origem')?.value;
    const calcInfo = document.getElementById('lote-compra-calculo-info');
    const tipoValorSelect = document.getElementById('group-animal-tipo-valor');

    if (!isLote || origem !== 'Comprado') {
      if (calcInfo) calcInfo.style.display = 'none';
      if (tipoValorSelect) tipoValorSelect.style.display = 'none';
      return;
    }

    if (calcInfo) calcInfo.style.display = 'block';
    if (tipoValorSelect) tipoValorSelect.style.display = 'block';

    const qty = parseInt(document.getElementById('animal-lote-qtd')?.value) || 10;
    const value = parseFloat(document.getElementById('animal-valor-compra')?.value) || 0;
    const type = document.getElementById('animal-tipo-valor-compra')?.value || 'unitario';

    let unitPrice = 0;
    let totalPrice = 0;

    if (type === 'unitario') {
      unitPrice = value;
      totalPrice = value * qty;
    } else {
      totalPrice = value;
      unitPrice = qty > 0 ? (value / qty) : 0;
    }

    if (calcInfo) {
      calcInfo.innerHTML = `Lote de <strong>${qty}</strong> animais: <strong>${window.ui.formatCurrency(unitPrice)}</strong> unitário | <strong>Total do Lote: ${window.ui.formatCurrency(totalPrice)}</strong>`;
    }
  }

  // --- SUBMIT HANDLERS ---

  // Helper para incrementar códigos e brincos (ex: BOI001 -> BOI002, 1025 -> 1026)
  incrementIdentifier(id, offset) {
    if (!id) return id;
    const match = id.match(/^(.*?)(\d+)$/);
    if (!match) return id + offset;
    const prefix = match[1];
    const numberStr = match[2];
    const nextNumber = parseInt(numberStr) + offset;
    const padded = nextNumber.toString().padStart(numberStr.length, '0');
    return prefix + padded;
  }

  // Cadastro/Edição de Animais
  handleAnimalSubmit(data) {
    const isEdit = !!data.id;
    const isLote = !isEdit && document.getElementById('animal-cadastro-lote')?.checked;
    const loteQtd = isLote ? (parseInt(data.lote_qtd) || 10) : 1;

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

    if (isLote) {
      // Cadastro em Lote
      const compraGrupoId = Date.now() * 100 + Math.floor(Math.random() * 100);
      
      for (let i = 0; i < loteQtd; i++) {
        const animalCode = this.incrementIdentifier(data.codigo, i);
        const animalBrinco = this.incrementIdentifier(data.brinco, i);
        const animalNome = data.nome ? `${data.nome} ${i + 1}` : '';

        const animalData = {
          codigo: animalCode,
          brinco: animalBrinco,
          nome: animalNome,
          sexo: data.sexo,
          raca: data.raca,
          categoria: data.categoria,
          nascimento: data.nascimento,
          origem: data.origem,
          foto: '',
          peso_atual: parseFloat(data.peso_atual) || 0
        };

        const saved = window.db.saveAnimal(animalData);

        if (data.origem === 'Comprado') {
          let valorUnitario = parseFloat(data.valor_compra) || 0;
          if (isLote && data.tipo_valor_compra === 'total') {
            valorUnitario = valorUnitario / loteQtd;
          }

          window.db.addPurchase({
            animal_id: saved.id,
            fornecedor: parseInt(data.fornecedor),
            valor: parseFloat(valorUnitario.toFixed(2)),
            data: data.data_compra || new Date().toISOString().split('T')[0],
            compra_grupo_id: compraGrupoId
          });
        } else if (data.origem === 'Nascido') {
          window.db.addBirth({
            animal_id: saved.id,
            mae_id: parseInt(data.mae_id),
            pai_id: data.pai_id ? parseInt(data.pai_id) : null,
            data: data.nascimento,
            peso_ao_nascer: parseFloat(data.peso_atual) || 0
          });
        }
      }
      
      window.ui.showToast(`${loteQtd} animais cadastrados com sucesso em lote!`);
    } else {
      // Cadastro individual normal
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

      if (!isEdit && data.origem === 'Comprado') {
        window.db.addPurchase({
          animal_id: saved.id,
          fornecedor: parseInt(data.fornecedor),
          valor: parseFloat(data.valor_compra) || 0,
          data: data.data_compra || new Date().toISOString().split('T')[0]
        });
      }

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
    }

    this.closeModal('modal-animal-form');
    document.getElementById('form-animal').reset();
    
    // Oculta campo Qtd se estava ativo
    const qtdGroup = document.getElementById('lote-qtd-group');
    if (qtdGroup) qtdGroup.classList.add('hidden');
    
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
    const checkedBoxes = Array.from(document.querySelectorAll('.sale-animal-checkbox:checked'));
    if (checkedBoxes.length === 0) {
      window.ui.showToast('Selecione pelo menos um animal para a venda.', 'error');
      return;
    }
    if (!data.comprador || !data.valor || !data.peso_venda || !data.data || !data.forma_pagamento) {
      window.ui.showToast('Preencha todos os campos obrigatórios da venda', 'error');
      return;
    }

    const totalValor = parseFloat(data.valor) || 0;
    const totalDesconto = parseFloat(data.desconto) || 0;
    const totalPeso = parseFloat(data.peso_venda) || 0;

    let saleResult = null;

    if (checkedBoxes.length === 1) {
      // Venda única
      saleResult = window.db.addSale({
        animal_id: parseInt(checkedBoxes[0].value),
        comprador: parseInt(data.comprador),
        valor: totalValor,
        peso_venda: totalPeso,
        data: data.data,
        desconto: totalDesconto,
        forma_pagamento: data.forma_pagamento
      });
      window.ui.showToast('Venda registrada com sucesso! Animal removido do estoque.');
    } else {
      // Venda em Lote
      const vendaGrupoId = Date.now() * 100 + Math.floor(Math.random() * 100);
      const count = checkedBoxes.length;
      const valorPerHead = totalValor / count;
      const descontoPerHead = totalDesconto / count;
      const totalOriginalPeso = checkedBoxes.reduce((acc, cb) => acc + (parseFloat(cb.dataset.peso) || 0), 0);

      checkedBoxes.forEach((cb) => {
        const animId = parseInt(cb.value);
        const originalPeso = parseFloat(cb.dataset.peso) || 0;
        
        // Distribui o peso proporcionalmente se o peso total foi alterado, ou usa o peso individual
        let pesoVenda = originalPeso;
        if (totalOriginalPeso > 0 && Math.abs(totalOriginalPeso - totalPeso) > 1) {
          pesoVenda = (originalPeso / totalOriginalPeso) * totalPeso;
        } else if (originalPeso === 0) {
          pesoVenda = totalPeso / count;
        }

        saleResult = window.db.addSale({
          animal_id: animId,
          comprador: parseInt(data.comprador),
          valor: valorPerHead,
          peso_venda: parseFloat(pesoVenda.toFixed(1)),
          data: data.data,
          desconto: descontoPerHead,
          forma_pagamento: data.forma_pagamento,
          venda_grupo_id: vendaGrupoId
        });
      });

      window.ui.showToast(`Venda de lote com ${count} animais registrada com sucesso!`);
    }

    this.closeModal('modal-sale-form');
    document.getElementById('form-sale-modal').reset();
    this.setDefaultDates();

    // Limpa lista de seleção e sumário
    const listContainer = document.getElementById('sale-animals-list');
    if (listContainer) listContainer.innerHTML = '';
    const summary = document.getElementById('sale-selected-summary');
    if (summary) summary.textContent = 'Nenhum animal selecionado.';

    this.refreshTabContent(this.activeTab);

    // Pergunta se deseja emitir o recibo logo após salvar
    if (confirm('Deseja emitir o recibo em PDF desta venda agora?')) {
      this.printReceipt(saleResult.id);
    }
  }

  // Lançamento de despesa / custo de manejo
  handleExpenseSubmit(data) {
    if (!data.animal_id || !data.tipo || !data.valor || !data.data) {
      window.ui.showToast('Preencha todos os campos obrigatórios da despesa', 'error');
      return;
    }

    window.db.addExpense({
      animal_id: parseInt(data.animal_id),
      tipo: data.tipo,
      descricao: data.descricao || '',
      valor: parseFloat(data.valor) || 0,
      data: data.data
    });

    window.ui.showToast('Custo/Despesa adicionado com sucesso!');
    this.closeModal('modal-expense-form');
    document.getElementById('form-expense').reset();

    // Recarrega o perfil do animal para refletir a nova despesa
    if (window.ui && typeof window.ui.showAnimalDetails === 'function') {
      window.ui.showAnimalDetails(data.animal_id);
    }
  }

  // Lançamento de custo geral da fazenda
  handlePropertyCostSubmit(data) {
    if (!data.categoria || !data.valor || !data.data || !data.periodicidade) {
      window.ui.showToast('Preencha todos os campos obrigatórios do custo', 'error');
      return;
    }

    window.db.addPropertyCost({
      categoria: data.categoria,
      descricao: data.descricao || '',
      valor: parseFloat(data.valor) || 0,
      data: data.data,
      periodicidade: data.periodicidade
    });

    window.ui.showToast('Custo geral da fazenda adicionado com sucesso!');
    document.getElementById('form-property-cost').reset();
    this.setDefaultDates();
    
    // Recarrega visualização
    window.ui.renderPropertyCostsView();
  }

  deletePropertyCost(id) {
    if (confirm('Deseja realmente excluir este custo geral da fazenda?')) {
      window.db.deletePropertyCost(id);
      window.ui.showToast('Custo geral excluído.');
      window.ui.renderPropertyCostsView();
    }
  }

  // Abertura do modal de despesa a partir do perfil
  openAddExpenseModal() {
    const animalId = document.getElementById('expense-animal-id').value;
    if (!animalId) return;
    
    const dateInput = document.getElementById('expense-data');
    if (dateInput) dateInput.value = window.ui.todayString();
    
    this.openModal('modal-expense-form');
  }

  // Atualiza peso total e quantidade de animais selecionados no modal de vendas
  updateSaleSelectedSummary() {
    const checkedBoxes = Array.from(document.querySelectorAll('.sale-animal-checkbox:checked'));
    const summary = document.getElementById('sale-selected-summary');
    const pesoInput = document.getElementById('sale-peso-venda');

    if (checkedBoxes.length === 0) {
      if (summary) summary.textContent = 'Nenhum animal selecionado.';
      if (pesoInput) pesoInput.value = '';
      this.checkSalesCarenciaWarnings();
      return;
    }

    const count = checkedBoxes.length;
    const totalPeso = checkedBoxes.reduce((acc, cb) => acc + (parseFloat(cb.dataset.peso) || 0), 0);

    if (summary) {
      summary.innerHTML = `<span style="color: var(--success); font-weight: 700;">${count}</span> animal(is) selecionado(s) - Peso Estimado: <strong>${totalPeso.toFixed(1)} kg</strong>`;
    }

    if (pesoInput) {
      pesoInput.value = totalPeso.toFixed(1);
    }

    this.checkSalesCarenciaWarnings();
  }

  // Verifica carência sanitária dos animais selecionados para venda
  checkSalesCarenciaWarnings() {
    const checkedBoxes = Array.from(document.querySelectorAll('.sale-animal-checkbox:checked'));
    const warningContainer = document.getElementById('sale-carencia-warning');
    const warningList = document.getElementById('sale-carencia-list');
    const saleDateInput = document.getElementById('sale-data');

    if (!warningContainer || !warningList) return;

    if (checkedBoxes.length === 0) {
      warningContainer.classList.add('hidden');
      warningList.innerHTML = '';
      return;
    }

    // Determina a data de venda a ser usada para o cálculo
    const saleDateStr = (saleDateInput && saleDateInput.value) || new Date().toISOString().split('T')[0];
    const [sYear, sMonth, sDay] = saleDateStr.split('-').map(Number);
    const saleDate = new Date(sYear, sMonth - 1, sDay);

    const carenciasAtivas = [];
    const medicamentos = window.db.getMedicamentos();

    checkedBoxes.forEach(cb => {
      const animalId = parseInt(cb.value);
      const animal = window.db.getAnimal(animalId);
      if (!animal) return;

      const expenses = window.db.getAnimalExpenses(animalId) || [];
      const sanitaryExpenses = expenses.filter(e => e.tipo === 'Vacina' || e.tipo === 'Medicamento');

      sanitaryExpenses.forEach(e => {
        const medConfig = medicamentos.find(m => m.nome.trim().toLowerCase() === (e.descricao || '').trim().toLowerCase());
        if (medConfig && medConfig.carencia_dias > 0) {
          const [year, month, day] = e.data.split('-').map(Number);
          const appDate = new Date(year, month - 1, day);
          const endDate = new Date(appDate);
          endDate.setDate(endDate.getDate() + medConfig.carencia_dias);

          if (endDate >= saleDate) {
            // Calcula dias restantes
            const diffTime = endDate - saleDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            carenciasAtivas.push({
              brinco: animal.brinco,
              nome: animal.nome || 'Sem Nome',
              medicamento: e.descricao || e.tipo,
              dataLiberacao: endDate,
              diasRestantes: diffDays
            });
          }
        }
      });
    });

    if (carenciasAtivas.length > 0) {
      warningList.innerHTML = carenciasAtivas.map(c => {
        // Formata data de liberação dd/mm/aaaa
        const dayStr = String(c.dataLiberacao.getDate()).padStart(2, '0');
        const monthStr = String(c.dataLiberacao.getMonth() + 1).padStart(2, '0');
        const yearStr = c.dataLiberacao.getFullYear();
        const formattedDate = `${dayStr}/${monthStr}/${yearStr}`;

        return `<li>
          Animal <strong>Brinco ${c.brinco}</strong> (${c.nome}) está sob carência do medicamento <strong>${c.medicamento}</strong>. 
          Liberação em: <strong>${formattedDate}</strong> (${c.diasRestantes} dia(s) restante(s)).
        </li>`;
      }).join('');
      warningContainer.classList.remove('hidden');
    } else {
      warningList.innerHTML = '';
      warningContainer.classList.add('hidden');
    }
  }

  // Abertura do modal de aplicação de medicamento a partir do perfil
  openApplyMedicamentoModal() {
    const animalId = this.currentAnimalDetailId || (window.ui && window.ui.currentAnimalDetailId);
    if (!animalId) return;

    // Prefill form
    const animalIdInput = document.getElementById('expense-animal-id');
    if (animalIdInput) animalIdInput.value = animalId;

    const tipoSelect = document.getElementById('expense-tipo');
    if (tipoSelect) tipoSelect.value = 'Vacina';

    const descInput = document.getElementById('expense-descricao');
    if (descInput) descInput.value = '';

    const valorInput = document.getElementById('expense-valor');
    if (valorInput) valorInput.value = '';

    const dateInput = document.getElementById('expense-data');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Popula o datalist com medicamentos cadastrados nas configurações
    this.populateMedicamentosDatalist();

    this.openModal('modal-expense-form');
  }

  // Popula datalist de medicamentos para autocomplete
  populateMedicamentosDatalist() {
    const datalist = document.getElementById('medicamentos-datalist');
    if (!datalist) return;
    const medicamentos = window.db.getMedicamentos();
    datalist.innerHTML = medicamentos.map(m => `<option value="${m.nome}"></option>`).join('');
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

  // Visualizar detalhes dos animais em lote de compra
  viewPurchaseLotDetails(groupId) {
    const purchases = window.db.getPurchases();
    const groupPurchases = purchases.filter(p => p.compra_grupo_id === parseInt(groupId));
    if (groupPurchases.length === 0) return;

    const animals = window.db.getAnimals();
    const lotAnimals = groupPurchases.map(p => animals.find(a => a.id === p.animal_id)).filter(Boolean);

    const tbody = document.getElementById('lote-animais-tbody');
    if (tbody) {
      if (lotAnimals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px 0;">Nenhum animal encontrado.</td></tr>';
      } else {
        tbody.innerHTML = lotAnimals.map(a => `
          <tr>
            <td><strong>${a.codigo}</strong></td>
            <td><strong>${a.brinco}</strong></td>
            <td>${a.raca}</td>
            <td><span class="badge badge-neutral">${a.categoria}</span></td>
            <td>${a.peso_atual > 0 ? `${a.peso_atual} kg` : '-'}</td>
            <td>
              <button class="action-btn" title="Ver Perfil" onclick="window.app.closeModal('modal-lote-compras-detalhes'); window.app.viewAnimalProfile(${a.id});">
                <i class="lucide-eye"></i>
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.openModal('modal-lote-compras-detalhes');
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
    const listContainer = document.getElementById('sale-animals-list');
    const compradorSelect = document.getElementById('sale-comprador');
    const pesoVendaInput = document.getElementById('sale-peso-venda');

    // Popula compradores dropdown
    if (compradorSelect) {
      const buyers = window.db.getClients().filter(c => c.tipo === 'Comprador' || c.tipo === 'Ambos');
      compradorSelect.innerHTML = '<option value="">Selecione o Comprador...</option>' +
        buyers.map(b => `<option value="${b.id}">${b.nome} (${b.cidade})</option>`).join('');
    }

    // Popula lista de animais ativos com checkboxes
    if (listContainer) {
      const activeAnimals = window.db.getAnimals().filter(a => a.status === 'Ativo');
      
      let targetAnimal = null;
      if (preselectedAnimalId) {
        targetAnimal = window.db.getAnimal(preselectedAnimalId);
      }

      // Garante que o animal pré-selecionado está na lista
      const listToShow = [...activeAnimals];
      if (targetAnimal && !activeAnimals.some(a => a.id === targetAnimal.id)) {
        listToShow.push(targetAnimal);
      }

      // Ordena por brinco
      listToShow.sort((a, b) => a.brinco.localeCompare(b.brinco));

      listContainer.innerHTML = listToShow.map(a => {
        const isChecked = (targetAnimal && a.id === targetAnimal.id) ? 'checked' : '';
        const isDisabled = (preselectedAnimalId) ? 'disabled' : '';
        return `
          <label class="sale-animal-item" style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px 8px; border-radius: 4px; transition: background-color 0.2s;">
            <input type="checkbox" value="${a.id}" class="sale-animal-checkbox" ${isChecked} ${isDisabled} data-peso="${a.peso_atual || 0}" style="width: 16px; height: 16px; cursor: pointer;">
            <span style="font-size: 13px; color: var(--text-main);">
              Brinco <strong>${a.brinco}</strong> - ${a.nome || 'Sem Nome'} (${a.raca}, ${a.categoria}, ${a.peso_atual || 0} kg)
            </span>
          </label>
        `;
      }).join('');

      // Limpa buscador
      const searchInput = document.getElementById('sale-search-animals');
      if (searchInput) {
        searchInput.value = '';
        searchInput.disabled = !!preselectedAnimalId;
      }

      // Atualiza o peso total e o resumo baseado nas seleções atuais
      this.updateSaleSelectedSummary();
    }
  }

  // Registrar venda de animal específico ou genérico
  openSaleModal(animalId = null) {
    this.prepareSaleModal(animalId);
    
    const dateInput = document.getElementById('sale-data');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Forçar recálculo das carências
    this.updateSaleSelectedSummary();

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
    
    // Reset labels e exibição de lote
    const codeLabel = document.querySelector('label[for="animal-codigo"]');
    const brincoLabel = document.querySelector('label[for="animal-brinco"]');
    if (codeLabel) codeLabel.textContent = "Código do Animal *";
    if (brincoLabel) brincoLabel.textContent = "Número do Brinco *";
    
    const qtdGroup = document.getElementById('lote-qtd-group');
    if (qtdGroup) qtdGroup.classList.add('hidden');
    
    const lotContainer = document.getElementById('lote-checkbox-container');
    if (lotContainer) lotContainer.style.display = 'flex';

    this.setDefaultDates();
    this.toggleAnimalOrigemFields('');
    window.ui.populateRacaDropdown();
    
    // Habilita campo Origem e Peso
    const oSelect = document.getElementById('animal-origem');
    if (oSelect) oSelect.disabled = false;

    const pesoField = document.getElementById('animal-peso-atual');
    if (pesoField) pesoField.disabled = false;

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
    window.ui.populateRacaDropdown(animal.raca);
    document.getElementById('animal-categoria').value = animal.categoria;
    document.getElementById('animal-nascimento').value = animal.nascimento;
    
    // Na edição, bloqueamos a troca de origem e campos relacionados a compra/nascimento 
    // para evitar quebra de integridade
    const oSelect = document.getElementById('animal-origem');
    oSelect.value = animal.origem;
    oSelect.disabled = true;

    // Oculta opção de lote na edição
    const lotContainer = document.getElementById('lote-checkbox-container');
    if (lotContainer) lotContainer.style.display = 'none';

    // Reset labels
    const codeLabel = document.querySelector('label[for="animal-codigo"]');
    const brincoLabel = document.querySelector('label[for="animal-brinco"]');
    if (codeLabel) codeLabel.textContent = "Código do Animal *";
    if (brincoLabel) brincoLabel.textContent = "Número do Brinco *";

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

  // Deletar Despesa de Manejo
  deleteExpense(id) {
    if (confirm('Deseja excluir esta despesa de manejo?')) {
      const expense = window.db.getExpenses().find(e => e.id === parseInt(id));
      const animalId = expense ? expense.animal_id : null;
      
      window.db.deleteExpense(id);
      window.ui.showToast('Despesa de manejo excluída.');
      
      if (animalId && window.ui && typeof window.ui.showAnimalDetails === 'function') {
        window.ui.showAnimalDetails(animalId);
      }
      this.refreshTabContent(this.activeTab);
    }
  }

  // Deletar Venda
  deleteSale(id) {
    if (confirm('Deseja realmente excluir esta venda? O(s) animal(is) voltará(ão) a ficar ativo(s) no estoque.')) {
      window.db.deleteSale(id);
      window.ui.showToast('Venda excluída e animal(is) reativado(s).');
      this.refreshTabContent(this.activeTab);
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
    window.ui.renderRacasConfig();
    window.ui.renderMedicamentosConfig();
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
    
    if (reportType === 'cronograma') {
      const allEvents = window.db.getAgenda() || [];
      
      // Sort chronologically by date
      allEvents.sort((a, b) => new Date(a.data + 'T00:00:00') - new Date(b.data + 'T00:00:00'));

      const parseDateParts = (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return { year: y, month: m - 1, day: d };
      };

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentQuarter = Math.floor(currentMonth / 3) + 1;
      const currentSemester = currentMonth < 6 ? 1 : 2;

      const quarterEvents = allEvents.filter(e => {
        const { year, month } = parseDateParts(e.data);
        const q = Math.floor(month / 3) + 1;
        return year === currentYear && q === currentQuarter;
      });

      const semesterEvents = allEvents.filter(e => {
        const { year, month } = parseDateParts(e.data);
        const s = month < 6 ? 1 : 2;
        return year === currentYear && s === currentSemester;
      });

      const annualEvents = allEvents.filter(e => {
        const { year } = parseDateParts(e.data);
        return year === currentYear;
      });

      const calcStats = (events) => {
        const total = events.length;
        const completed = events.filter(e => e.status === 'Concluído').length;
        const pending = total - completed;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, pending, pct };
      };

      const quarterStats = calcStats(quarterEvents);
      const semesterStats = calcStats(semesterEvents);
      const annualStats = calcStats(annualEvents);
      const totalStats = calcStats(allEvents);

      const tableRowsHtml = allEvents.map(e => {
        let animalText = 'Todo o Rebanho (Geral)';
        if (e.animal_id) {
          const animal = window.db.getAnimal(e.animal_id);
          if (animal) {
            animalText = `Brinco ${window.ui.escapeHTML(animal.brinco)} ${animal.nome ? `- ${window.ui.escapeHTML(animal.nome)}` : ''}`;
          } else {
            animalText = `ID: ${e.animal_id}`;
          }
        } else if (e.compra_grupo_id) {
          const purchases = window.db.getPurchases() || [];
          const clients = window.db.getClients() || [];
          const groupPurchases = purchases.filter(p => p.compra_grupo_id === e.compra_grupo_id);
          const samplePurchase = groupPurchases[0];
          const supplier = samplePurchase ? (clients.find(c => c.id === samplePurchase.fornecedor) || { nome: 'Desconhecido' }) : { nome: 'Desconhecido' };
          
          const activeAnimals = window.db.getAnimals().filter(a => a.status === 'Ativo');
          const groupAnimalIds = groupPurchases.map(p => p.animal_id);
          const activeInGroup = activeAnimals.filter(a => groupAnimalIds.includes(a.id)).length;
          const totalInGroup = groupPurchases.length;
          const countStr = totalInGroup === activeInGroup ? `${totalInGroup} Cab.` : `${activeInGroup} de ${totalInGroup} Cab.`;
          
          animalText = `Lote #${e.compra_grupo_id} (${countStr}) - Forn: ${window.ui.escapeHTML(supplier.nome)}`;
        }
        const statusClass = e.status === 'Concluído' ? 'text-green' : 'text-orange';
        const formattedDate = window.ui.formatDate(e.data);
        return `
          <tr>
            <td>${formattedDate}</td>
            <td><strong>${window.ui.escapeHTML(e.titulo)}</strong></td>
            <td>${window.ui.escapeHTML(e.tipo)}</td>
            <td>${animalText}</td>
            <td class="${statusClass}" style="font-weight: bold;">${e.status}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cronograma de Manejo - BoiUni</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #15803d; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #15803d; font-size: 26px; }
            .header p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
            
            .section-title { font-size: 16px; font-weight: bold; color: #15803d; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; }
            
            .summary-box { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #15803d; }
            .summary-title { font-weight: bold; font-size: 15px; margin-bottom: 10px; color: #0f172a; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .summary-item { display: flex; flex-direction: column; }
            .summary-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .summary-value { font-size: 18px; font-weight: bold; }
            
            .periods-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .period-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .period-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #15803d; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
            .period-info { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; color: #475569; }
            .period-info span.value { font-weight: 600; color: #0f172a; }
            .period-progress { background-color: #e2e8f0; border-radius: 4px; height: 8px; margin-top: 10px; overflow: hidden; }
            .period-progress-bar { background-color: #15803d; height: 100%; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f1f5f9; color: #0f172a; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
            td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
            tr:hover { background-color: #f8fafc; }
            .text-green { color: #166534; }
            .text-orange { color: #d97706; }
            
            .footer { margin-top: 45px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              .no-print { display: none; }
              body { padding: 10px; }
              .periods-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            }
            .btn-print { background-color: #15803d; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>BoiUni - Gestão Agropecuária</h1>
              <p>Cronograma e Planejamento de Manejos</p>
            </div>
            <div class="no-print">
              <button class="btn-print" onclick="window.print()">Imprimir PDF</button>
            </div>
          </div>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 25px;">Relatório de cronograma de manejo gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          
          <div class="summary-box">
            <div class="summary-title">Resumo Operacional Geral (Histórico Completo)</div>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">Manejos Planejados</span>
                <span class="summary-value">${totalStats.total}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Manejos Realizados</span>
                <span class="summary-value text-green">${totalStats.completed}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Manejos Pendentes</span>
                <span class="summary-value text-orange">${totalStats.pending}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Taxa de Conclusão</span>
                <span class="summary-value">${totalStats.pct}%</span>
              </div>
            </div>
          </div>

          <h4 class="section-title">Análise de Metas e Períodos (${currentYear})</h4>
          <div class="periods-grid">
            <div class="period-card">
              <div class="period-title">Trimestre Atual (Q${currentQuarter})</div>
              <div class="period-info"><span>Planejados:</span> <span class="value">${quarterStats.total}</span></div>
              <div class="period-info"><span>Realizados:</span> <span class="value">${quarterStats.completed}</span></div>
              <div class="period-info"><span>Pendentes:</span> <span class="value">${quarterStats.pending}</span></div>
              <div class="period-info"><span>Conclusão:</span> <span class="value">${quarterStats.pct}%</span></div>
              <div class="period-progress">
                <div class="period-progress-bar" style="width: ${quarterStats.pct}%"></div>
              </div>
            </div>

            <div class="period-card">
              <div class="period-title">Semestre Atual (S${currentSemester})</div>
              <div class="period-info"><span>Planejados:</span> <span class="value">${semesterStats.total}</span></div>
              <div class="period-info"><span>Realizados:</span> <span class="value">${semesterStats.completed}</span></div>
              <div class="period-info"><span>Pendentes:</span> <span class="value">${semesterStats.pending}</span></div>
              <div class="period-info"><span>Conclusão:</span> <span class="value">${semesterStats.pct}%</span></div>
              <div class="period-progress">
                <div class="period-progress-bar" style="width: ${semesterStats.pct}%"></div>
              </div>
            </div>

            <div class="period-card">
              <div class="period-title">Balanço Geral do Ano (${currentYear})</div>
              <div class="period-info"><span>Planejados:</span> <span class="value">${annualStats.total}</span></div>
              <div class="period-info"><span>Realizados:</span> <span class="value">${annualStats.completed}</span></div>
              <div class="period-info"><span>Pendentes:</span> <span class="value">${annualStats.pending}</span></div>
              <div class="period-info"><span>Conclusão:</span> <span class="value">${annualStats.pct}%</span></div>
              <div class="period-progress">
                <div class="period-progress-bar" style="width: ${annualStats.pct}%"></div>
              </div>
            </div>
          </div>

          <h4 class="section-title">Lista Geral de Atividades Planejadas</h4>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Manejo</th>
                <th>Tipo</th>
                <th>Animal Vinculado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml || '<tr><td colspan="5" style="text-align: center; color: #64748b;">Nenhum manejo agendado no calendário.</td></tr>'}
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
      return;
    }

    if (reportType === 'financeiro') {
      const costs = window.db.getPropertyCosts();
      const fatBruto = sales.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
      const descontos = sales.reduce((sum, s) => sum + (parseFloat(s.desconto) || 0), 0);
      const recLiquida = fatBruto - descontos;

      let cav = 0;
      sales.forEach(s => {
        const p = purchases.find(pur => pur.animal_id === s.animal_id);
        if (p) cav += (parseFloat(p.valor) || 0);
      });

      const lucroBruto = recLiquida - cav;

      const categoriesSum = {
        'Funcionários': 0,
        'Alimentação Geral': 0,
        'Manutenção': 0,
        'Combustível': 0,
        'Energia/Água': 0,
        'Impostos/Taxas': 0,
        'Vacinas/Medicamentos Geral': 0,
        'Outros': 0
      };

      costs.forEach(c => {
        const cat = c.categoria;
        if (categoriesSum[cat] !== undefined) {
          categoriesSum[cat] += (parseFloat(c.valor) || 0);
        } else {
          categoriesSum['Outros'] += (parseFloat(c.valor) || 0);
        }
      });

      const despesasTotal = Object.values(categoriesSum).reduce((sum, val) => sum + val, 0);
      const resultadoLiquido = lucroBruto - despesasTotal;

      // Zootecnia
      const compCount = purchases.length;
      let sumWeightCompra = 0;
      let weightCompraCount = 0;
      let sumValCompra = 0;

      purchases.forEach(p => {
        sumValCompra += p.valor;
        const weights = window.db.getAnimalWeights(p.animal_id);
        if (weights.length > 0) {
          const sorted = [...weights].sort((a, b) => new Date(a.data) - new Date(b.data));
          sumWeightCompra += sorted[0].peso;
          weightCompraCount++;
        }
      });

      const avgWeightCompra = weightCompraCount > 0 ? (sumWeightCompra / weightCompraCount) : 0;
      const avgPriceCompraCabeca = compCount > 0 ? (sumValCompra / compCount) : 0;
      const avgPriceCompraKg = sumWeightCompra > 0 ? (sumValCompra / sumWeightCompra) : 0;

      const vendCount = sales.length;
      let sumWeightVenda = 0;
      let sumValVenda = 0;
      let sumWeightGain = 0;
      let sumDays = 0;
      let validPerformanceCount = 0;

      sales.forEach(s => {
        sumValVenda += s.valor;
        sumWeightVenda += s.peso_venda;

        const p = purchases.find(pur => pur.animal_id === s.animal_id);
        const weights = window.db.getAnimalWeights(s.animal_id);
        if (weights.length > 0) {
          const sorted = [...weights].sort((a, b) => new Date(a.data) - new Date(b.data));
          const purchaseWeight = sorted[0].peso;
          const gain = s.peso_venda - purchaseWeight;
          sumWeightGain += gain;

          if (p) {
            const dateCompra = new Date(p.data + 'T00:00:00');
            const dateVenda = new Date(s.data + 'T00:00:00');
            const diffTime = Math.abs(dateVenda - dateCompra);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            sumDays += diffDays;
            validPerformanceCount++;
          }
        }
      });

      const avgWeightVenda = vendCount > 0 ? (sumWeightVenda / vendCount) : 0;
      const avgPriceVendaCabeca = vendCount > 0 ? (sumValVenda / vendCount) : 0;
      const avgPriceVendaKg = sumWeightVenda > 0 ? (sumValVenda / sumWeightVenda) : 0;

      const avgGain = validPerformanceCount > 0 ? (sumWeightGain / validPerformanceCount) : 0;
      const avgDays = validPerformanceCount > 0 ? (sumDays / validPerformanceCount) : 0;
      const avgGMD = avgDays > 0 ? (avgGain / avgDays) : 0;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>DRE & Balanço Financeiro - BoiUni</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #15803d; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #15803d; font-size: 26px; }
            .header p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
            
            .financial-container { display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; margin-top: 20px; }
            
            .section-title { font-size: 16px; font-weight: bold; color: #15803d; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
            
            .row-bold { font-weight: bold; background-color: #f8fafc; }
            .row-indent { padding-left: 24px; color: #475569; }
            .text-right { text-align: right; }
            .text-green { color: #166534; font-weight: 600; }
            .text-red { color: #991b1b; font-weight: 600; }
            
            .summary-box { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #15803d; }
            .summary-title { font-weight: bold; font-size: 15px; margin-bottom: 10px; color: #0f172a; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .summary-item { display: flex; flex-direction: column; }
            .summary-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .summary-value { font-size: 16px; font-weight: bold; }
            
            .footer { margin-top: 45px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              .no-print { display: none; }
              body { padding: 10px; }
              .financial-container { display: block; }
              .financial-container > div { margin-bottom: 40px; page-break-inside: avoid; }
            }
            .btn-print { background-color: #15803d; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>BoiUni - Gestão Agropecuária</h1>
              <p>DRE & Balanço Financeiro da Fazenda</p>
            </div>
            <div class="no-print">
              <button class="btn-print" onclick="window.print()">Imprimir PDF</button>
            </div>
          </div>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 25px;">Relatório consolidado gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          
          <div class="summary-box">
            <div class="summary-title">Resumo do Período</div>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">Faturamento</span>
                <span class="summary-value">${window.ui.formatCurrency(fatBruto)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Custo Animais (CAV)</span>
                <span class="summary-value">${window.ui.formatCurrency(cav)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Despesas Gerais</span>
                <span class="summary-value">${window.ui.formatCurrency(despesasTotal)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Resultado Líquido</span>
                <span class="summary-value ${resultadoLiquido >= 0 ? 'text-green' : 'text-red'}">${window.ui.formatCurrency(resultadoLiquido)}</span>
              </div>
            </div>
          </div>

          <div class="financial-container">
            <!-- Coluna DRE -->
            <div>
              <h4 class="section-title">Demonstrativo de Resultados (DRE)</h4>
              <table>
                <tbody>
                  <tr class="row-bold">
                    <td>(+) FATURAMENTO BRUTO (Vendas)</td>
                    <td class="text-right text-green">${window.ui.formatCurrency(fatBruto)}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">(-) Descontos Concedidos</td>
                    <td class="text-right text-red">-${window.ui.formatCurrency(descontos)}</td>
                  </tr>
                  <tr style="font-weight: 600;">
                    <td>(=) RECEITA LÍQUIDA</td>
                    <td class="text-right">${window.ui.formatCurrency(recLiquida)}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">(-) Custo de Aquisição dos Animais Vendidos (CAV)</td>
                    <td class="text-right text-red">-${window.ui.formatCurrency(cav)}</td>
                  </tr>
                  <tr class="row-bold">
                    <td>(=) LUCRO BRUTO OPERACIONAL</td>
                    <td class="text-right text-green">${window.ui.formatCurrency(lucroBruto)}</td>
                  </tr>
                  <tr style="font-weight: 600;">
                    <td>(-) DESPESAS OPERACIONAIS (Custos Fazenda)</td>
                    <td class="text-right text-red">-${window.ui.formatCurrency(despesasTotal)}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">Funcionários</td>
                    <td class="text-right">${window.ui.formatCurrency(categoriesSum['Funcionários'])}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">Alimentação Geral</td>
                    <td class="text-right">${window.ui.formatCurrency(categoriesSum['Alimentação Geral'])}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">Manutenção</td>
                    <td class="text-right">${window.ui.formatCurrency(categoriesSum['Manutenção'])}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">Combustível</td>
                    <td class="text-right">${window.ui.formatCurrency(categoriesSum['Combustível'])}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">Energia / Água</td>
                    <td class="text-right">${window.ui.formatCurrency(categoriesSum['Energia/Água'])}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">Impostos / Taxas</td>
                    <td class="text-right">${window.ui.formatCurrency(categoriesSum['Impostos/Taxas'])}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">Vacinas / Medicamentos Geral</td>
                    <td class="text-right">${window.ui.formatCurrency(categoriesSum['Vacinas/Medicamentos Geral'])}</td>
                  </tr>
                  <tr>
                    <td class="row-indent">Outros Custos</td>
                    <td class="text-right">${window.ui.formatCurrency(categoriesSum['Outros'])}</td>
                  </tr>
                  <tr class="row-bold" style="font-size: 15px; border-top: 2px solid #0f172a;">
                    <td>(=) RESULTADO LÍQUIDO DO PERÍODO</td>
                    <td class="text-right ${resultadoLiquido >= 0 ? 'text-green' : 'text-red'}">${window.ui.formatCurrency(resultadoLiquido)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Coluna Métricas -->
            <div>
              <h4 class="section-title">Métricas de Pesos & Operações</h4>
              <table>
                <tbody>
                  <tr class="row-bold"><td colspan="2">Métricas de Compra / Entrada</td></tr>
                  <tr>
                    <td>Animais Comprados (Qtd)</td>
                    <td class="text-right" style="font-weight: 600;">${compCount}</td>
                  </tr>
                  <tr>
                    <td>Peso Médio de Entrada</td>
                    <td class="text-right" style="font-weight: 600;">${avgWeightCompra > 0 ? `${avgWeightCompra.toFixed(1)} kg` : '-'}</td>
                  </tr>
                  <tr>
                    <td>Preço Médio Pago por Cabeça</td>
                    <td class="text-right" style="font-weight: 600;">${window.ui.formatCurrency(avgPriceCompraCabeca)}</td>
                  </tr>
                  <tr>
                    <td>Preço Médio por kg (Compra)</td>
                    <td class="text-right" style="font-weight: 600;">${avgPriceCompraKg > 0 ? `${window.ui.formatCurrency(avgPriceCompraKg)}/kg` : '-'}</td>
                  </tr>

                  <tr class="row-bold"><td colspan="2">Métricas de Venda / Saída</td></tr>
                  <tr>
                    <td>Animais Vendidos (Qtd)</td>
                    <td class="text-right" style="font-weight: 600;">${vendCount}</td>
                  </tr>
                  <tr>
                    <td>Peso Médio de Saída</td>
                    <td class="text-right" style="font-weight: 600;">${avgWeightVenda > 0 ? `${avgWeightVenda.toFixed(1)} kg` : '-'}</td>
                  </tr>
                  <tr>
                    <td>Preço Médio Recebido por Cabeça</td>
                    <td class="text-right" style="font-weight: 600;">${window.ui.formatCurrency(avgPriceVendaCabeca)}</td>
                  </tr>
                  <tr>
                    <td>Preço Médio por kg (Venda)</td>
                    <td class="text-right" style="font-weight: 600;">${avgPriceVendaKg > 0 ? `${window.ui.formatCurrency(avgPriceVendaKg)}/kg` : '-'}</td>
                  </tr>

                  <tr class="row-bold"><td colspan="2">Desempenho Comercial & Ganho</td></tr>
                  <tr>
                    <td>Ganho Médio de Peso Vendido</td>
                    <td class="text-right text-green">${avgGain !== 0 ? `${avgGain.toFixed(1)} kg` : '-'}</td>
                  </tr>
                  <tr>
                    <td>Período Médio de Cocho/Pasto</td>
                    <td class="text-right" style="font-weight: 600;">${avgDays > 0 ? `${Math.round(avgDays)} dias` : '-'}</td>
                  </tr>
                  <tr>
                    <td>GMD Médio dos Vendidos</td>
                    <td class="text-right text-green">${avgGMD > 0 ? `${avgGMD.toFixed(2)} kg/dia` : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer">
            <p>© 2026 BoiUni - Sistema de Controle de Rebanho Bovino.</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    }

    let title = '';
    let tableHeaders = '';
    let tableRows = '';
    
    if (reportType === 'rebanho') {
      title = 'Relatório de Rebanho Atual';
      tableHeaders = `<th>Código</th><th>Brinco</th><th>Nome</th><th>Sexo</th><th>Raça</th><th>Categoria</th><th>Peso Atual</th><th>Data Nasc.</th><th>Origem</th>`;
      
      const active = animals.filter(a => a.status === 'Ativo');
      tableRows = active.map(a => `
        <tr>
          <td>${window.ui.escapeHTML(a.codigo)}</td>
          <td>${window.ui.escapeHTML(a.brinco)}</td>
          <td>${window.ui.escapeHTML(a.nome || '-')}</td>
          <td>${a.sexo === 'M' ? 'Macho' : 'Fêmea'}</td>
          <td>${window.ui.escapeHTML(a.raca)}</td>
          <td>${window.ui.escapeHTML(a.categoria)}</td>
          <td>${a.peso_atual} kg</td>
          <td>${window.ui.formatDate(a.nascimento)}</td>
          <td>${window.ui.escapeHTML(a.origem)}</td>
        </tr>
      `).join('');
    } else if (reportType === 'vendidos') {
      title = 'Relatório de Animais Vendidos';
      tableHeaders = `<th>Data Venda</th><th>Código</th><th>Brinco</th><th>Comprador</th><th>Peso Venda</th><th>Custo Compra</th><th>Valor Venda</th><th>Lucro Estimado</th>`;
      
      tableRows = sales.map(s => {
        const animal = animals.find(a => a.id === s.animal_id) || { brinco: '-', codigo: '-' };
        const buyer = clients.find(c => c.id === s.comprador) || { nome: '-' };
        const p = purchases.find(pur => pur.animal_id === s.animal_id);
        const purchaseVal = p ? p.valor : 0;
        const discountVal = s.desconto ? parseFloat(s.desconto) : 0;
        const lucro = (s.valor - discountVal) - purchaseVal;
        
        return `
          <tr>
            <td>${window.ui.formatDate(s.data)}</td>
            <td>${window.ui.escapeHTML(animal.codigo)}</td>
            <td>${window.ui.escapeHTML(animal.brinco)}</td>
            <td>${window.ui.escapeHTML(buyer.nome)}</td>
            <td>${s.peso_venda} kg</td>
            <td>${window.ui.formatCurrency(purchaseVal)}</td>
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
            <td>${window.ui.escapeHTML(animal.codigo)}</td>
            <td>${window.ui.escapeHTML(animal.brinco)}</td>
            <td>${window.ui.escapeHTML(supplier.nome)}</td>
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
            <td>${window.ui.escapeHTML(calf.codigo)}</td>
            <td>${window.ui.escapeHTML(calf.brinco)}</td>
            <td>${calf.sexo === 'M' ? 'Macho' : 'Fêmea'}</td>
            <td>Brinco ${window.ui.escapeHTML(mae.brinco)} ${mae.nome ? `(${window.ui.escapeHTML(mae.nome)})` : ''}</td>
            <td>${pai ? `Brinco ${window.ui.escapeHTML(pai.brinco)} ${pai.nome ? `(${window.ui.escapeHTML(pai.nome)})` : ''}` : 'Não Informado'}</td>
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
            <td>${window.ui.escapeHTML(a.codigo)}</td>
            <td>${window.ui.escapeHTML(a.brinco)}</td>
            <td>${window.ui.escapeHTML(a.nome || '-')}</td>
            <td>${window.ui.escapeHTML(a.categoria)}</td>
            <td>${pesoInicial} kg</td>
            <td>${a.peso_atual} kg</td>
            <td style="font-weight: bold; color: ${ganho >= 0 ? '#166534' : '#991b1b'};">
              ${ganho >= 0 ? '+' : ''}${ganho.toFixed(1)} kg
            </td>
          </tr>
        `;
      }).join('');
    } else if (reportType === 'carencia') {
      title = 'Relatório de Carência Sanitária e Controle de Abate';
      tableHeaders = `<th>Código</th><th>Brinco</th><th>Categoria</th><th>Peso Atual</th><th>Medicamento</th><th>Data Aplicação</th><th>Carência (Dias)</th><th>Liberação Planejada</th><th>Status / Restante</th>`;
      
      const expenses = window.db.getExpenses() || [];
      const medicamentos = window.db.getMedicamentos() || [];
      const active = animals.filter(a => a.status === 'Ativo');
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const carenciasList = [];
      active.forEach(a => {
        const animalExpenses = expenses.filter(e => e.animal_id === a.id && (e.tipo === 'Vacina' || e.tipo === 'Medicamento'));
        
        animalExpenses.forEach(e => {
          const medConfig = medicamentos.find(m => m.nome.trim().toLowerCase() === (e.descricao || '').trim().toLowerCase());
          if (medConfig && medConfig.carencia_dias > 0) {
            const [year, month, day] = e.data.split('-').map(Number);
            const appDate = new Date(year, month - 1, day);
            const endDate = new Date(appDate);
            endDate.setDate(endDate.getDate() + medConfig.carencia_dias);
            
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            carenciasList.push({
              animal: a,
              medNome: e.descricao,
              dataAplicacao: e.data,
              diasCarencia: medConfig.carencia_dias,
              liberacao: endDate.toISOString().split('T')[0],
              diasRestantes: diffDays >= 0 ? diffDays : 0,
              isActive: endDate >= today
            });
          }
        });
      });
      
      // Ordena: carências ativas primeiro (por dias restantes decrescente), depois as inativas pela data de liberação decrescente
      carenciasList.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        if (a.isActive && b.isActive) return b.diasRestantes - a.diasRestantes;
        return new Date(b.liberacao) - new Date(a.liberacao);
      });
      
      if (carenciasList.length === 0) {
        tableRows = `
          <tr>
            <td colspan="9" style="text-align: center; color: #166534; font-weight: bold; padding: 25px 0;">
              ✓ Nenhum registro sanitário sob período de carência. Todo o rebanho está liberado para abate/comercialização.
            </td>
          </tr>
        `;
      } else {
        tableRows = carenciasList.map(item => {
          const statusText = item.isActive ? `⚠️ Carência (${item.diasRestantes} dias)` : `✓ Liberado`;
          const statusStyle = item.isActive ? 'color: #b45309; font-weight: bold;' : 'color: #166534; font-weight: bold;';
          
          return `
            <tr>
              <td>${window.ui.escapeHTML(item.animal.codigo)}</td>
              <td><strong>${window.ui.escapeHTML(item.animal.brinco)}</strong></td>
              <td>${window.ui.escapeHTML(item.animal.categoria)}</td>
              <td>${item.animal.peso_atual} kg</td>
              <td>${window.ui.escapeHTML(item.medNome)}</td>
              <td>${window.ui.formatDate(item.dataAplicacao)}</td>
              <td>${item.diasCarencia} dias</td>
              <td>${window.ui.formatDate(item.liberacao)}</td>
              <td style="${statusStyle}">${statusText}</td>
            </tr>
          `;
        }).join('');
      }
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

  printWeightReport() {
    const periodType = document.getElementById('report-peso-periodo') ? document.getElementById('report-peso-periodo').value : 'Mensal';
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    let p1Start = '';
    let p1End = '';
    let p0Start = '';
    let p0End = '';
    let labelPeriodo = '';
    
    const formatDateObj = (dateObj) => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    if (periodType === 'Mensal') {
      // P1: This month (1st of month to today)
      const firstDayP1 = new Date(currentYear, currentMonth, 1);
      p1Start = formatDateObj(firstDayP1);
      p1End = formatDateObj(now);
      
      // P0: Previous month (1st of prev month to last day of prev month)
      const firstDayP0 = new Date(currentYear, currentMonth - 1, 1);
      const lastDayP0 = new Date(currentYear, currentMonth, 0); // 0th day is last day of prev month
      p0Start = formatDateObj(firstDayP0);
      p0End = formatDateObj(lastDayP0);
      
      const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const currentMonthLabel = meses[currentMonth];
      const prevMonthLabel = meses[(currentMonth - 1 + 12) % 12];
      labelPeriodo = `Período Mensal: ${currentMonthLabel}/${currentYear} vs ${prevMonthLabel}/${currentMonth === 0 ? currentYear - 1 : currentYear}`;
      
    } else if (periodType === 'Trimestral') {
      const currentQuarter = Math.floor(currentMonth / 3) + 1;
      
      // P1: Current quarter
      const firstDayP1 = new Date(currentYear, (currentQuarter - 1) * 3, 1);
      p1Start = formatDateObj(firstDayP1);
      p1End = formatDateObj(now);
      
      // P0: Previous quarter
      const firstDayP0 = new Date(currentYear, (currentQuarter - 2) * 3, 1);
      const lastDayP0 = new Date(currentYear, (currentQuarter - 1) * 3, 0);
      p0Start = formatDateObj(firstDayP0);
      p0End = formatDateObj(lastDayP0);
      
      labelPeriodo = `Período Trimestral: Q${currentQuarter}/${currentYear} vs Q${currentQuarter === 1 ? 4 : currentQuarter - 1}/${currentQuarter === 1 ? currentYear - 1 : currentYear}`;
      
    } else if (periodType === 'Semestral') {
      const currentSemester = currentMonth < 6 ? 1 : 2;
      
      // P1: Current semester
      const firstDayP1 = new Date(currentYear, currentSemester === 1 ? 0 : 6, 1);
      p1Start = formatDateObj(firstDayP1);
      p1End = formatDateObj(now);
      
      // P0: Previous semester
      const firstDayP0 = new Date(currentYear, currentSemester === 1 ? -6 : 0, 1);
      const lastDayP0 = new Date(currentYear, currentSemester === 1 ? 0 : 6, 0);
      p0Start = formatDateObj(firstDayP0);
      p0End = formatDateObj(lastDayP0);
      
      labelPeriodo = `Período Semestral: S${currentSemester}/${currentYear} vs S${currentSemester === 1 ? 2 : 1}/${currentSemester === 1 ? currentYear - 1 : currentYear}`;
      
    } else if (periodType === 'Anual') {
      // P1: Current year (Jan 1st to today)
      p1Start = `${currentYear}-01-01`;
      p1End = formatDateObj(now);
      
      // P0: Previous year (Jan 1st to Dec 31st)
      p0Start = `${currentYear - 1}-01-01`;
      p0End = `${currentYear - 1}-12-31`;
      
      labelPeriodo = `Período Anual: Ano ${currentYear} vs Ano ${currentYear - 1}`;
    }

    const activeAnimals = window.db.getAnimals().filter(a => a.status === 'Ativo');
    
    // Process weights for each animal
    const reportData = activeAnimals.map(a => {
      const weights = window.db.getAnimalWeights(a.id) || [];
      
      // W1: latest weight in P1
      const w1Events = weights.filter(w => w.data >= p1Start && w.data <= p1End);
      let w1 = null;
      let w1Date = null;
      if (w1Events.length > 0) {
        w1 = w1Events[w1Events.length - 1].peso;
        w1Date = w1Events[w1Events.length - 1].data;
      } else {
        w1 = a.peso_atual;
        w1Date = formatDateObj(now);
      }

      // W0: latest weight in P0
      const w0Events = weights.filter(w => w.data >= p0Start && w.data <= p0End);
      let w0 = null;
      let w0Date = null;
      if (w0Events.length > 0) {
        w0 = w0Events[w0Events.length - 1].peso;
        w0Date = w0Events[w0Events.length - 1].data;
      } else {
        // Look for latest before p1Start
        const beforeEvents = weights.filter(w => w.data < p1Start);
        if (beforeEvents.length > 0) {
          w0 = beforeEvents[beforeEvents.length - 1].peso;
          w0Date = beforeEvents[beforeEvents.length - 1].data;
        } else if (weights.length > 0) {
          w0 = weights[0].peso;
          w0Date = weights[0].data;
        } else {
          w0 = w1;
          w0Date = w1Date;
        }
      }

      const diff = w1 - w0;
      let days = 0;
      let gmd = 0;
      if (w1Date && w0Date && w1Date !== w0Date) {
        const d1 = new Date(w1Date + 'T00:00:00');
        const d0 = new Date(w0Date + 'T00:00:00');
        const diffTime = Math.abs(d1 - d0);
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 0;
        if (days > 0) {
          gmd = diff / days;
        }
      }

      return {
        id: a.id,
        brinco: a.brinco,
        codigo: a.codigo,
        nome: a.nome,
        categoria: a.categoria,
        raca: a.raca,
        w0,
        w0Date,
        w1,
        w1Date,
        diff,
        days,
        gmd
      };
    });

    // Sort reportData by brinco ascending
    reportData.sort((a, b) => {
      const brincoA = parseInt(a.brinco) || 0;
      const brincoB = parseInt(b.brinco) || 0;
      return brincoA - brincoB;
    });

    const totalAnimals = reportData.length;
    const totalGain = reportData.reduce((sum, item) => sum + item.diff, 0);
    const avgGain = totalAnimals > 0 ? (totalGain / totalAnimals) : 0;
    
    const gmdItems = reportData.filter(item => item.days > 0);
    const avgGmd = gmdItems.length > 0 
      ? (gmdItems.reduce((sum, item) => sum + item.gmd, 0) / gmdItems.length) 
      : 0;

    const positiveGainCount = reportData.filter(item => item.diff > 0).length;
    const positivePct = totalAnimals > 0 ? Math.round((positiveGainCount / totalAnimals) * 100) : 0;

    const tableRows = reportData.map(r => {
      const formattedW0Date = r.w0Date !== r.w1Date ? window.ui.formatDate(r.w0Date) : '-';
      const formattedW1Date = window.ui.formatDate(r.w1Date);
      const diffClass = r.diff > 0 ? 'text-green' : (r.diff < 0 ? 'text-red' : '');
      const diffSign = r.diff > 0 ? '+' : '';
      const formattedGmd = r.days > 0 ? `${r.gmd.toFixed(2)} kg/dia` : '-';
      
      return `
        <tr>
          <td><strong>${window.ui.escapeHTML(r.brinco)}</strong></td>
          <td>${window.ui.escapeHTML(r.codigo)}</td>
          <td>${window.ui.escapeHTML(r.categoria)}</td>
          <td>${window.ui.escapeHTML(r.raca)}</td>
          <td>${r.w0.toFixed(1)} kg <span style="font-size: 11px; color: #64748b;">(${formattedW0Date})</span></td>
          <td>${r.w1.toFixed(1)} kg <span style="font-size: 11px; color: #64748b;">(${formattedW1Date})</span></td>
          <td style="font-weight: 600;">${r.days} d</td>
          <td class="${diffClass}" style="font-weight: bold;">${diffSign}${r.diff.toFixed(1)} kg</td>
          <td class="${diffClass}" style="font-weight: bold;">${formattedGmd}</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Controle Comparativo de Pesagem - BoiUni</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #15803d; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #15803d; font-size: 26px; }
          .header p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
          
          .section-title { font-size: 16px; font-weight: bold; color: #15803d; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; }
          
          .summary-box { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #15803d; }
          .summary-title { font-weight: bold; font-size: 15px; margin-bottom: 10px; color: #0f172a; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .summary-item { display: flex; flex-direction: column; }
          .summary-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .summary-value { font-size: 18px; font-weight: bold; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #f1f5f9; color: #0f172a; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
          td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
          tr:hover { background-color: #f8fafc; }
          .text-green { color: #166534; }
          .text-red { color: #991b1b; }
          
          .footer { margin-top: 45px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print {
            .no-print { display: none; }
            body { padding: 10px; }
          }
          .btn-print { background-color: #15803d; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>BoiUni - Gestão Agropecuária</h1>
            <p>Relatório de Controle e Evolução de Pesagem</p>
          </div>
          <div class="no-print">
            <button class="btn-print" onclick="window.print()">Imprimir PDF</button>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <span style="font-size: 14px; font-weight: bold; color: #0f172a; background-color: #e2e8f0; padding: 6px 12px; border-radius: 6px;">${labelPeriodo}</span>
          <span style="font-size: 13px; color: #64748b;">Relatório gerado em: ${new Date().toLocaleString('pt-BR')}</span>
        </div>
        
        <div class="summary-box">
          <div class="summary-title">Resumo do Desempenho do Rebanho</div>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Animais Analisados</span>
              <span class="summary-value">${totalAnimals}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Ganho Médio Acumulado</span>
              <span class="summary-value ${avgGain >= 0 ? 'text-green' : 'text-red'}">${avgGain >= 0 ? '+' : ''}${avgGain.toFixed(1)} kg</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">GMD Médio Geral</span>
              <span class="summary-value ${avgGmd >= 0 ? 'text-green' : 'text-red'}">${avgGmd.toFixed(2)} kg/dia</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Desempenho Positivo</span>
              <span class="summary-value text-green">${positiveGainCount} anim. (${positivePct}%)</span>
            </div>
          </div>
        </div>

        <h4 class="section-title">Detalhamento Individual da Evolução de Pesos</h4>
        <table>
          <thead>
            <tr>
              <th>Brinco</th>
              <th>Código</th>
              <th>Categoria</th>
              <th>Raça</th>
              <th>Peso Anterior</th>
              <th>Peso Período</th>
              <th>Intervalo</th>
              <th>Diferença</th>
              <th>GMD</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="9" style="text-align: center; color: #64748b;">Nenhum animal ativo cadastrado no rebanho.</td></tr>'}
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

    // Busca todas as vendas do mesmo grupo (se houver) ou apenas esta venda
    const groupSales = sale.venda_grupo_id 
      ? window.db.getSales().filter(s => s.venda_grupo_id === sale.venda_grupo_id) 
      : [sale];

    const buyer = window.db.getClients().find(c => c.id === sale.comprador) || { nome: 'Não cadastrado', telefone: '-', cidade: '-' };
    const config = window.db.getConfiguracoes();

    // Default values if settings are not set
    const farmName = config.nome_fazenda || 'Fazenda não configurada';
    const ownerName = config.proprietario || 'Proprietário não configurado';
    const cpfCnpj = config.cnpj ? `CNPJ: ${config.cnpj}` : (config.cpf ? `CPF: ${config.cpf}` : 'Sem CPF/CNPJ cadastrado');
    const farmPhone = config.telefone || '-';
    const farmEmail = config.email || '-';
    const farmLocation = (config.municipio && config.estado) ? `${config.municipio} - ${config.estado}` : 'Localização não cadastrada';

    const grossValue = groupSales.reduce((acc, s) => acc + s.valor, 0);
    const discount = groupSales.reduce((acc, s) => acc + (s.desconto || 0), 0);
    const finalValue = grossValue - discount;

    const receiptNo = String(sale.venda_grupo_id || sale.id).substring(0, 8);
    const dateFormatted = window.ui.formatDate(sale.data);

    const rowsHtml = groupSales.map(s => {
      const anim = window.db.getAnimals().find(a => a.id === s.animal_id) || { brinco: '-', codigo: '-', nome: '-', raca: '-', categoria: '-' };
      return `
        <tr>
          <td>${window.ui.escapeHTML(anim.codigo)}</td>
          <td><strong>${window.ui.escapeHTML(anim.brinco)}</strong></td>
          <td>${window.ui.escapeHTML(anim.nome || '-')}</td>
          <td>${window.ui.escapeHTML(anim.raca)}</td>
          <td>${window.ui.escapeHTML(anim.categoria)}</td>
          <td>${s.peso_venda} kg</td>
          <td>${window.ui.formatCurrency(s.valor)}</td>
        </tr>
      `;
    }).join('');

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
              <p><strong>Fazenda:</strong> ${window.ui.escapeHTML(farmName)}</p>
              <p><strong>Proprietário:</strong> ${window.ui.escapeHTML(ownerName)}</p>
              <p><strong>Documento:</strong> ${window.ui.escapeHTML(cpfCnpj)}</p>
              <p><strong>Telefone:</strong> ${window.ui.escapeHTML(farmPhone)}</p>
              <p><strong>E-mail:</strong> ${window.ui.escapeHTML(farmEmail)}</p>
              <p><strong>Cidade/UF:</strong> ${window.ui.escapeHTML(farmLocation)}</p>
            </div>
            
            <div class="info-block">
              <div class="section-title">Comprador (Cliente)</div>
              <p><strong>Nome:</strong> ${window.ui.escapeHTML(buyer.nome)}</p>
              <p><strong>Telefone:</strong> ${window.ui.escapeHTML(buyer.telefone)}</p>
              <p><strong>Cidade:</strong> ${window.ui.escapeHTML(buyer.cidade)}</p>
              <p><strong>Forma de Pagamento:</strong> ${window.ui.escapeHTML(sale.forma_pagamento || '-')}</p>
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
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
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
            <strong>${window.ui.formatCurrency(finalValue)}</strong> referente à venda do(s) animal(is) descrito(s) neste recibo, 
            dando-lhe por este instrumento plena e irrevogável quitação.
          </div>
          
          <div class="signature-area">
            <div>
              <div class="signature-line">${window.ui.escapeHTML(ownerName)}</div>
              <span>Assinatura do Vendedor</span>
            </div>
            <div>
              <div class="signature-line">${window.ui.escapeHTML(buyer.nome)}</div>
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

  handleAddRaca() {
    const input = document.getElementById('config-raca-nome');
    if (!input) return;

    const nome = input.value.trim();
    if (!nome) {
      window.ui.showToast('Digite um nome para a raça.', 'error');
      return;
    }

    const added = window.db.addRaca(nome);
    if (!added) {
      window.ui.showToast('Esta raça já está cadastrada.', 'error');
      return;
    }

    input.value = '';
    window.ui.renderRacasConfig();
    window.ui.showToast('Raça adicionada com sucesso!');
  }

  handleDeleteRaca(id) {
    if (confirm('Tem certeza de que deseja excluir esta raça? Isso não alterará os animais já cadastrados, mas removerá a opção do cadastro de novos animais.')) {
      window.db.deleteRaca(id);
      window.ui.renderRacasConfig();
      window.ui.showToast('Raça excluída.');
    }
  }

  handleAddMedicamento() {
    const nomeInput = document.getElementById('config-medicamento-nome');
    const carenciaInput = document.getElementById('config-medicamento-carencia');
    if (!nomeInput || !carenciaInput) return;

    const nome = nomeInput.value.trim();
    const carencia_dias = parseInt(carenciaInput.value) || 0;

    if (!nome) {
      window.ui.showToast('Digite o nome do medicamento/vacina.', 'error');
      return;
    }

    if (carencia_dias < 0) {
      window.ui.showToast('Os dias de carência não podem ser negativos.', 'error');
      return;
    }

    const added = window.db.addMedicamento({ nome, carencia_dias });
    if (!added) {
      window.ui.showToast('Este medicamento já está cadastrado.', 'error');
      return;
    }

    nomeInput.value = '';
    carenciaInput.value = '';
    window.ui.renderMedicamentosConfig();
    window.ui.showToast('Medicamento adicionado com sucesso!');
  }

  handleDeleteMedicamento(id) {
    if (confirm('Tem certeza de que deseja excluir este medicamento? Isso não apagará os históricos de aplicação já salvos.')) {
      window.db.deleteMedicamento(id);
      window.ui.renderMedicamentosConfig();
      window.ui.showToast('Medicamento excluído.');
    }
  }

  // Alterna entre as abas do painel de configurações
  switchSettingsTab(tabId, buttonElement) {
    // Esconde todos os painéis
    const panes = document.querySelectorAll('.settings-tab-pane');
    panes.forEach(pane => pane.classList.add('hidden'));

    // Exibe o painel selecionado
    const activePane = document.getElementById(tabId);
    if (activePane) activePane.classList.remove('hidden');

    // Remove classe ativa de todos os botões de navegação lateral
    const buttons = document.querySelectorAll('.settings-nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Adiciona classe ativa no botão clicado
    if (buttonElement) buttonElement.classList.add('active');
  }

  // --- MÉTODOS DO CALENDÁRIO ---
  renderCalendar() {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    
    const titleEl = document.getElementById('calendar-month-title');
    if (titleEl) {
      titleEl.textContent = `${monthNames[this.currentCalendarMonth]} de ${this.currentCalendarYear}`;
    }
    
    window.ui.renderCalendarView(this.currentCalendarYear, this.currentCalendarMonth);
    window.ui.renderCalendarChecklist(this.currentCalendarYear, this.currentCalendarMonth);
  }

  navigateCalendar(dir) {
    this.currentCalendarMonth += dir;
    if (this.currentCalendarMonth < 0) {
      this.currentCalendarMonth = 11;
      this.currentCalendarYear--;
    } else if (this.currentCalendarMonth > 11) {
      this.currentCalendarMonth = 0;
      this.currentCalendarYear++;
    }
    this.renderCalendar();
  }

  populateAgendaAnimalSelect(selectedAnimalId = null, selectedCompraGrupoId = null) {
    const animalSelect = document.getElementById('agenda-animal-id');
    if (!animalSelect) return;

    let activeAnimals = window.db.getAnimals().filter(a => a.status === 'Ativo');
    // Garante que o animal atualmente selecionado esteja listado
    if (selectedAnimalId) {
      const selAnimalIdNum = parseInt(selectedAnimalId);
      if (!activeAnimals.some(a => a.id === selAnimalIdNum)) {
        const selAnimal = window.db.getAnimal(selAnimalIdNum);
        if (selAnimal) {
          activeAnimals.push(selAnimal);
        }
      }
    }

    const purchases = window.db.getPurchases() || [];
    const clients = window.db.getClients() || [];

    const purchaseByAnimalId = {};
    purchases.forEach(p => {
      purchaseByAnimalId[p.animal_id] = p;
    });

    const lotesMap = {};
    activeAnimals.forEach(a => {
      const p = purchaseByAnimalId[a.id];
      if (p && p.compra_grupo_id) {
        const groupId = p.compra_grupo_id;
        if (!lotesMap[groupId]) {
          const supplier = clients.find(c => c.id === p.fornecedor) || { nome: 'Desconhecido' };
          lotesMap[groupId] = {
            id: groupId,
            count: 0,
            fornecedorNome: supplier.nome,
            date: p.data || ''
          };
        }
        lotesMap[groupId].count++;
      }
    });

    // Garante que o lote atualmente selecionado esteja listado, mesmo sem animais ativos
    if (selectedCompraGrupoId) {
      const selGroupIdNum = parseInt(selectedCompraGrupoId);
      if (!lotesMap[selGroupIdNum]) {
        const samplePurchase = purchases.find(p => p.compra_grupo_id === selGroupIdNum);
        if (samplePurchase) {
          const supplier = clients.find(c => c.id === samplePurchase.fornecedor) || { nome: 'Desconhecido' };
          lotesMap[selGroupIdNum] = {
            id: selGroupIdNum,
            count: 0,
            fornecedorNome: supplier.nome,
            date: samplePurchase.data || ''
          };
        }
      }
    }

    const totalInLote = {};
    purchases.forEach(p => {
      if (p.compra_grupo_id) {
        totalInLote[p.compra_grupo_id] = (totalInLote[p.compra_grupo_id] || 0) + 1;
      }
    });

    const activeLotes = Object.values(lotesMap);

    let lotesHtml = '';
    if (activeLotes.length > 0) {
      lotesHtml = `<optgroup label="Lotes de Compra">` +
        activeLotes.map(lote => {
          const total = totalInLote[lote.id] || lote.count;
          const countStr = total === lote.count ? `${total} Cab.` : `${lote.count} de ${total} Cab.`;
          const dateStr = lote.date ? ` - ${window.ui.formatDate(lote.date)}` : '';
          return `<option value="lote_${lote.id}">Lote #${lote.id} (${countStr}) - Forn: ${window.ui.escapeHTML(lote.fornecedorNome)}${dateStr}</option>`;
        }).join('') +
        `</optgroup>`;
    }

    let animalsHtml = `<optgroup label="Animais Individuais">` +
      activeAnimals.map(a => `<option value="${a.id}">Brinco ${window.ui.escapeHTML(a.brinco)} - ${window.ui.escapeHTML(a.nome || 'Sem Nome')}</option>`).join('') +
      `</optgroup>`;

    animalSelect.innerHTML = `<option value="">Todo o Rebanho (Geral)</option>` + lotesHtml + animalsHtml;

    if (selectedCompraGrupoId) {
      animalSelect.value = `lote_${selectedCompraGrupoId}`;
    } else if (selectedAnimalId) {
      animalSelect.value = selectedAnimalId;
    } else {
      animalSelect.value = '';
    }
  }

  openAgendaModal(dateStr = '') {
    const form = document.getElementById('form-agenda');
    if (form) form.reset();
    
    const agendaIdInput = document.getElementById('agenda-id');
    if (agendaIdInput) agendaIdInput.value = '';
    
    const modalTitle = document.getElementById('modal-agenda-title');
    if (modalTitle) {
      modalTitle.innerHTML = '<i class="lucide-calendar-plus"></i> Agendar Manejo';
    }
    
    const dateInput = document.getElementById('agenda-data');
    if (dateInput) {
      dateInput.value = dateStr || window.ui.todayString();
    }
    
    this.populateAgendaAnimalSelect(null, null);
    
    const recorrenciaSelect = document.getElementById('agenda-recorrencia');
    if (recorrenciaSelect) {
      recorrenciaSelect.value = 'Nenhuma';
      recorrenciaSelect.disabled = false;
    }

    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
    
    this.openModal('modal-agenda-form');
  }

  handleAgendaSubmit() {
    const idVal = document.getElementById('agenda-id').value;
    const titulo = document.getElementById('agenda-titulo').value;
    const data = document.getElementById('agenda-data').value;
    const tipo = document.getElementById('agenda-tipo').value;
    
    const animalSelectVal = document.getElementById('agenda-animal-id').value || '';
    let animalId = null;
    let compraGrupoId = null;
    if (animalSelectVal) {
      if (animalSelectVal.startsWith('lote_')) {
        compraGrupoId = parseInt(animalSelectVal.replace('lote_', ''));
      } else {
        animalId = parseInt(animalSelectVal);
      }
    }
    const descricao = document.getElementById('agenda-descricao').value || '';
    const recorrencia = document.getElementById('agenda-recorrencia') ? document.getElementById('agenda-recorrencia').value : 'Nenhuma';
    
    if (!titulo || !data || !tipo) {
      window.ui.showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }

    if (idVal) {
      // Editing existing item (we update only this specific item)
      const existing = window.db.getAgenda().find(e => e.id === parseInt(idVal));
      const recorrenciaGrupoId = existing ? existing.recorrencia_grupo_id : null;
      const originalRecorrencia = existing ? existing.recorrencia : 'Nenhuma';

      window.db.updateAgendaItem({
        id: parseInt(idVal),
        titulo,
        data,
        tipo,
        animal_id: animalId,
        compra_grupo_id: compraGrupoId,
        descricao,
        recorrencia: originalRecorrencia,
        recorrencia_grupo_id: recorrenciaGrupoId
      });
      window.ui.showToast("Manejo atualizado com sucesso!");
    } else {
      // Creating new items
      if (recorrencia !== 'Nenhuma') {
        const recorrenciaGrupoId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        const getRecurrenceDates = (startDateStr, freq) => {
          const [year, month, day] = startDateStr.split('-').map(Number);
          const dates = [startDateStr];
          let step = 0;
          let count = 0;
          
          if (freq === 'Mensal') { step = 1; count = 11; }
          else if (freq === 'Trimestral') { step = 3; count = 3; }
          else if (freq === 'Semestral') { step = 6; count = 1; }
          else if (freq === 'Anual') { step = 12; count = 2; }
          
          for (let i = 1; i <= count; i++) {
            const nextDate = new Date(year, month - 1, day);
            nextDate.setMonth(nextDate.getMonth() + (i * step));
            const y = nextDate.getFullYear();
            const m = String(nextDate.getMonth() + 1).padStart(2, '0');
            const d = String(nextDate.getDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${d}`);
          }
          return dates;
        };

        const dates = getRecurrenceDates(data, recorrencia);
        dates.forEach(d => {
          window.db.addAgendaItem({
            titulo,
            data: d,
            tipo,
            animal_id: animalId,
            compra_grupo_id: compraGrupoId,
            descricao,
            recorrencia,
            recorrencia_grupo_id: recorrenciaGrupoId
          });
        });
        window.ui.showToast("Série de manejos recorrentes agendada com sucesso!");
      } else {
        window.db.addAgendaItem({
          titulo,
          data,
          tipo,
          animal_id: animalId,
          compra_grupo_id: compraGrupoId,
          descricao,
          recorrencia: 'Nenhuma',
          recorrencia_grupo_id: null
        });
        window.ui.showToast("Manejo agendado com sucesso!");
      }
    }

    this.closeModal('modal-agenda-form');
    
    if (this.activeTab === 'calendario') {
      this.renderCalendar();
    }
  }

  showAgendaDetail(id) {
    const allEvents = window.db.getAgenda() || [];
    const event = allEvents.find(e => e.id === parseInt(id));
    if (!event) return;
    
    document.getElementById('agenda-detail-id').value = event.id;
    document.getElementById('agenda-detail-title').textContent = event.titulo;
    document.getElementById('agenda-detail-data').textContent = window.ui.formatDate(event.data);
    document.getElementById('agenda-detail-tipo').textContent = event.tipo;
    
    const statusEl = document.getElementById('agenda-detail-status');
    if (statusEl) {
      statusEl.textContent = event.status;
      statusEl.className = `badge ${event.status === 'Concluído' ? 'badge-success' : 'badge-warning'}`;
    }
    
    const animalRow = document.getElementById('agenda-detail-animal-row');
    const animalEl = document.getElementById('agenda-detail-animal');
    if (event.animal_id) {
      const animal = window.db.getAnimal(event.animal_id);
      if (animal) {
        animalEl.innerHTML = `<a href="#" onclick="window.app.closeModal('modal-agenda-details'); window.app.showAnimalDetails(${animal.id}); return false;" style="color: var(--primary); text-decoration: underline;">Brinco ${window.ui.escapeHTML(animal.brinco)} - ${window.ui.escapeHTML(animal.nome || 'Sem Nome')}</a>`;
        if (animalRow) animalRow.style.display = 'flex';
      } else {
        if (animalRow) animalRow.style.display = 'none';
      }
    } else if (event.compra_grupo_id) {
      const purchases = window.db.getPurchases() || [];
      const clients = window.db.getClients() || [];
      const groupPurchases = purchases.filter(p => p.compra_grupo_id === event.compra_grupo_id);
      const samplePurchase = groupPurchases[0];
      const supplier = samplePurchase ? (clients.find(c => c.id === samplePurchase.fornecedor) || { nome: 'Desconhecido' }) : { nome: 'Desconhecido' };
      
      const activeAnimals = window.db.getAnimals().filter(a => a.status === 'Ativo');
      const groupAnimalIds = groupPurchases.map(p => p.animal_id);
      const activeInGroup = activeAnimals.filter(a => groupAnimalIds.includes(a.id)).length;
      const totalInGroup = groupPurchases.length;
      const countStr = totalInGroup === activeInGroup ? `${totalInGroup} Cab.` : `${activeInGroup} de ${totalInGroup} Cab.`;
      
      if (animalEl) {
        animalEl.textContent = `Lote #${event.compra_grupo_id} (${countStr}) - Forn: ${supplier.nome}`;
      }
      if (animalRow) animalRow.style.display = 'flex';
    } else {
      if (animalEl) animalEl.textContent = 'Todo o Rebanho (Geral)';
      if (animalRow) animalRow.style.display = 'flex';
    }
    
    const descEl = document.getElementById('agenda-detail-descricao');
    if (descEl) {
      descEl.textContent = event.descricao || 'Sem observações.';
    }
    
    const completeBtn = document.getElementById('btn-agenda-complete');
    if (completeBtn) {
      completeBtn.textContent = event.status === 'Concluído' ? 'Marcar Pendente' : 'Marcar Concluído';
    }
    
    this.openModal('modal-agenda-details');
  }

  deleteAgendaItemFromDetails() {
    const idVal = document.getElementById('agenda-detail-id').value;
    if (!idVal) return;
    
    const allEvents = window.db.getAgenda() || [];
    const event = allEvents.find(e => e.id === parseInt(idVal));
    if (!event) return;

    if (event.recorrencia_grupo_id) {
      if (confirm("Este manejo faz parte de uma série recorrente. Deseja excluir TODOS os manejos futuros desta série? (Ok = Sim, Cancelar = Apenas este)")) {
        window.db.deleteAgendaSeries(event.recorrencia_grupo_id, event.data);
        window.ui.showToast("Série de manejos excluída!");
        this.closeModal('modal-agenda-details');
        if (this.activeTab === 'calendario') {
          this.renderCalendar();
        }
      } else {
        if (confirm("Deseja excluir APENAS este compromisso individual?")) {
          window.db.deleteAgendaItem(idVal);
          window.ui.showToast("Manejo individual excluído!");
          this.closeModal('agenda-detail-id'); // Wait, closeModal takes modal ID string, so modal-agenda-details
          this.closeModal('modal-agenda-details');
          if (this.activeTab === 'calendario') {
            this.renderCalendar();
          }
        }
      }
    } else {
      if (confirm("Deseja realmente excluir este agendamento?")) {
        window.db.deleteAgendaItem(idVal);
        window.ui.showToast("Manejo excluído!");
        this.closeModal('modal-agenda-details');
        if (this.activeTab === 'calendario') {
          this.renderCalendar();
        }
      }
    }
  }

  editAgendaItemFromDetails() {
    const idVal = document.getElementById('agenda-detail-id').value;
    if (!idVal) return;
    
    const allEvents = window.db.getAgenda() || [];
    const event = allEvents.find(e => e.id === parseInt(idVal));
    if (!event) return;
    
    this.closeModal('modal-agenda-details');
    
    // Setup modal form for editing
    const form = document.getElementById('form-agenda');
    if (form) form.reset();
    
    const modalTitle = document.getElementById('modal-agenda-title');
    if (modalTitle) {
      modalTitle.innerHTML = '<i class="lucide-edit"></i> Editar Manejo';
    }
    
    document.getElementById('agenda-id').value = event.id;
    document.getElementById('agenda-titulo').value = event.titulo;
    document.getElementById('agenda-data').value = event.data;
    document.getElementById('agenda-tipo').value = event.tipo;
    document.getElementById('agenda-descricao').value = event.descricao || '';
    
    this.populateAgendaAnimalSelect(event.animal_id, event.compra_grupo_id);
    
    const recorrenciaSelect = document.getElementById('agenda-recorrencia');
    if (recorrenciaSelect) {
      recorrenciaSelect.value = event.recorrencia || 'Nenhuma';
      recorrenciaSelect.disabled = true; // Bloqueia alterações de recorrência na edição
    }

    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
    
    this.openModal('modal-agenda-form');
  }

  toggleAgendaStatusFromDetails() {
    const idVal = document.getElementById('agenda-detail-id').value;
    if (!idVal) return;
    
    const allEvents = window.db.getAgenda() || [];
    const event = allEvents.find(e => e.id === parseInt(idVal));
    if (!event) return;
    
    const newStatus = event.status === 'Concluído' ? 'Pendente' : 'Concluído';
    window.db.updateAgendaItemStatus(idVal, newStatus);
    window.ui.showToast(`Status atualizado para: ${newStatus}`);
    
    this.closeModal('modal-agenda-details');
    
    if (this.activeTab === 'calendario') {
      this.renderCalendar();
    }
  }

  toggleAgendaStatus(id, checked) {
    const newStatus = checked ? 'Concluído' : 'Pendente';
    window.db.updateAgendaItemStatus(id, newStatus);
    window.ui.showToast(`Status atualizado para: ${newStatus}`);
    
    if (this.activeTab === 'calendario') {
      this.renderCalendar();
    }
  }

  // --- MÉTODOS DA GALERIA DE EVOLUÇÃO VISUAL & ZOOM ---
  zoomImage(photoBase64) {
    const img = document.getElementById('zoomed-image');
    if (img) img.src = photoBase64;
    this.openModal('modal-image-zoom');
  }

  handleDeletePhoto(photoId, animalId) {
    if (confirm("Deseja realmente excluir esta foto?")) {
      window.db.deleteAnimalPhoto(photoId);
      window.ui.showToast("Foto excluída!");
      window.ui.renderAnimalPhotoGallery(animalId);
    }
  }

  handlePhotoUpload(event, stage, animalId) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 800;
        
        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        
        const today = window.ui.todayString();
        window.db.addAnimalPhoto({
          animal_id: animalId,
          etapa: stage,
          foto: compressedBase64,
          data: today
        });
        
        window.ui.showToast("Foto adicionada com sucesso!");
        window.ui.renderAnimalPhotoGallery(animalId);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- CHECK-UP SANITÁRIO DE ENTRADA ---
  quickApplyVaccine(vaccineName, animalId) {
    if (!animalId) return;

    const animalIdInput = document.getElementById('expense-animal-id');
    if (animalIdInput) animalIdInput.value = animalId;

    const tipoSelect = document.getElementById('expense-tipo');
    if (tipoSelect) tipoSelect.value = 'Vacina';

    const descInput = document.getElementById('expense-descricao');
    if (descInput) descInput.value = vaccineName;

    const valorInput = document.getElementById('expense-valor');
    if (valorInput) valorInput.value = '0,00';

    const dateInput = document.getElementById('expense-data');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    this.populateMedicamentosDatalist();
    this.openModal('modal-expense-form');
  }

  // Configura máscaras de digitação em tempo real (CPF, CNPJ, Telefone)
  setupInputMasks() {
    const cpfInput = document.getElementById('config-cpf');
    const cnpjInput = document.getElementById('config-cnpj');
    const phoneInput = document.getElementById('config-telefone');

    if (cpfInput) {
      cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        e.target.value = value;
      });
    }

    if (cnpjInput) {
      cnpjInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 14) value = value.slice(0, 14);
        value = value.replace(/^(\d{2})(\d)/, "$1.$2");
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
        value = value.replace(/(\d{4})(\d)/, "$1-$2");
        e.target.value = value;
      });
    }

    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 10) {
          // (99) 99999-9999
          value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
        } else if (value.length > 5) {
          // (99) 9999-9999
          value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
        } else if (value.length > 2) {
          // (99) 9999
          value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
        } else if (value.length > 0) {
          // (99
          value = value.replace(/^(\d*)$/, "($1");
        }
        e.target.value = value;
      });
    }
  }
}

// Cria instância global
window.app = new AppController();

// Inicializa no DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
