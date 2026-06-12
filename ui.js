// ui.js - Camada de Interface e Renderização do BoiUni

// Armazena as instâncias dos gráficos Chart.js para evitar vazamentos e conflitos
const uiCharts = {
  dashCategory: null,
  dashFinancial: null,
  animalWeight: null,
  propertyCostsCategory: null
};

class UserInterface {
  constructor() {
    this.currentAnimalDetailId = null;
  }

  // --- MÉTODOS AUXILIARES ---
  
  // Formatador de Moeda
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  // Formatador de Data
  formatDate(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  // Toast Notification
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    
    const icon = type === 'success' ? 'check-circle' : 'alert-triangle';
    toast.innerHTML = `
      <i class="lucide-${icon}" style="color: ${type === 'success' ? 'var(--primary)' : 'var(--danger)'}"></i>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    
    // Substitui ícones lucide se necessário
    if (window.lucide) {
      window.lucide.createIcons();
    }

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Utilitário para formatar datas em inputs
  todayString() {
    return new Date().toISOString().split('T')[0];
  }

  // --- DASHBOARD RENDER ---
  renderDashboard() {
    const animals = window.db.getAnimals();
    const weights = window.db.getWeights();
    const purchases = window.db.getPurchases();
    const sales = window.db.getSales();

    const activeAnimals = animals.filter(a => a.status === 'Ativo');

    // 1. Cálculos de Estatísticas
    const totalAnimals = activeAnimals.length;
    const totalMales = activeAnimals.filter(a => a.sexo === 'M').length;
    const totalFemales = activeAnimals.filter(a => a.sexo === 'F').length;
    
    // Bezerros (Categoria Bezerro/Bezerra)
    const totalCalves = activeAnimals.filter(a => a.categoria === 'Bezerro' || a.categoria === 'Bezerra').length;

    // Peso Médio do Rebanho
    const activeWithWeight = activeAnimals.filter(a => a.peso_atual > 0);
    const avgWeight = activeWithWeight.length > 0
      ? activeWithWeight.reduce((sum, a) => sum + a.peso_atual, 0) / activeWithWeight.length
      : 0;

    // Transações no mês atual
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    
    const monthlyPurchases = purchases.filter(p => p.data.startsWith(currentYearMonth)).length;
    const monthlySales = sales.filter(s => s.data.startsWith(currentYearMonth)).length;

    // Lucro Estimado Real: (Vendas - Descontos) - Compras dos animais vendidos
    let totalLucro = 0;
    sales.forEach(sale => {
      const p = purchases.find(pur => pur.animal_id === sale.animal_id);
      const purchaseVal = p ? p.valor : 0;
      const discountVal = sale.desconto ? parseFloat(sale.desconto) : 0;
      totalLucro += (sale.valor - discountVal) - purchaseVal;
    });

    // Atualizar UI dos cards
    document.getElementById('dash-total-animais').textContent = totalAnimals;
    document.getElementById('dash-total-machos').textContent = totalMales;
    document.getElementById('dash-total-femeas').textContent = totalFemales;
    document.getElementById('dash-total-bezerros').textContent = totalCalves;
    document.getElementById('dash-peso-medio').textContent = `${avgWeight.toFixed(1)} kg`;
    document.getElementById('dash-comprados-mes').textContent = monthlyPurchases;
    document.getElementById('dash-vendidos-mes').textContent = monthlySales;
    document.getElementById('dash-lucro-estimado').textContent = this.formatCurrency(totalLucro);

    // 2. Gráfico de Distribuição por Categoria
    this.renderCategoryChart(activeAnimals);

    // 3. Gráfico Financeiro (Últimos 6 meses)
    this.renderFinancialChart(purchases, sales);
    
    // 4. Preenche tabelas rápidas de atividade recente no Dashboard
    this.renderRecentActivity(activeAnimals, sales);
  }

  renderCategoryChart(activeAnimals) {
    const categories = ['Bezerro', 'Bezerra', 'Garrote', 'Novilha', 'Boi', 'Vaca', 'Reprodutor', 'Matriz'];
    const counts = categories.map(cat => activeAnimals.filter(a => a.categoria === cat).length);

    const ctx = document.getElementById('chartCategoryDistribution');
    if (!ctx) return;

    if (uiCharts.dashCategory) {
      uiCharts.dashCategory.destroy();
    }

    uiCharts.dashCategory = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: counts,
          backgroundColor: [
            '#fbbf24', '#f472b6', '#3b82f6', '#ec4899',
            '#15803d', '#10b981', '#1d4ed8', '#be185d'
          ],
          borderWidth: 2,
          borderColor: 'var(--bg-surface)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'var(--text-main)',
              font: { family: 'Outfit' }
            }
          }
        }
      }
    });
  }

  renderFinancialChart(purchases, sales) {
    const months = [];
    const purchaseValues = [];
    const saleValues = [];
    
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
      
      const pSum = purchases.filter(p => p.data.startsWith(yearMonth)).reduce((sum, p) => sum + p.valor, 0);
      const sSum = sales.filter(s => s.data.startsWith(yearMonth)).reduce((sum, s) => sum + s.valor, 0);
      
      purchaseValues.push(pSum);
      saleValues.push(sSum);
    }

    const ctx = document.getElementById('chartFinancialFlow');
    if (!ctx) return;

    if (uiCharts.dashFinancial) {
      uiCharts.dashFinancial.destroy();
    }

    uiCharts.dashFinancial = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Compras (Entradas)',
            data: purchaseValues,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: 'var(--danger)',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Vendas (Saídas)',
            data: saleValues,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: 'var(--primary)',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'var(--text-main)',
              font: { family: 'Outfit' }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: 'var(--text-muted)', font: { family: 'Outfit' } },
            grid: { color: 'var(--border-color)' }
          },
          y: {
            ticks: {
              color: 'var(--text-muted)',
              font: { family: 'Outfit' },
              callback: (value) => this.formatCurrency(value).replace(',00', '')
            },
            grid: { color: 'var(--border-color)' }
          }
        }
      }
    });
  }

  renderRecentActivity(activeAnimals, sales) {
    // Lista de últimos 5 animais cadastrados
    const recentAnimals = [...activeAnimals].sort((a, b) => b.id - a.id).slice(0, 4);
    const listBody = document.getElementById('dash-recent-animals-list');
    if (listBody) {
      if (recentAnimals.length === 0) {
        listBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhum animal cadastrado</td></tr>`;
      } else {
        listBody.innerHTML = recentAnimals.map(a => `
          <tr>
            <td>
              <div class="animal-meta">
                <div class="animal-avatar">${a.codigo.substring(0,2)}</div>
                <div class="animal-details">
                  <span class="animal-code">${a.codigo}</span>
                  <span class="animal-name">${a.nome || 'Sem Nome'}</span>
                </div>
              </div>
            </td>
            <td>${a.brinco}</td>
            <td><span class="badge ${a.sexo === 'M' ? 'badge-info' : 'badge-female'}">${a.sexo === 'M' ? 'Macho' : 'Fêmea'}</span></td>
            <td><span class="badge badge-success">${a.categoria}</span></td>
          </tr>
        `).join('');
      }
    }

    // Lista de últimas 4 vendas
    const recentSales = [...sales].sort((a, b) => b.id - a.id).slice(0, 4);
    const salesBody = document.getElementById('dash-recent-sales-list');
    const clients = window.db.getClients();
    const animals = window.db.getAnimals();

    if (salesBody) {
      if (recentSales.length === 0) {
        salesBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhuma venda registrada</td></tr>`;
      } else {
        salesBody.innerHTML = recentSales.map(s => {
          const animal = animals.find(a => a.id === s.animal_id) || { brinco: '-', codigo: '-' };
          const buyer = clients.find(c => c.id === s.comprador) || { nome: '-' };
          return `
            <tr>
              <td><strong>Brinco ${animal.brinco}</strong> (${animal.codigo})</td>
              <td>${buyer.nome}</td>
              <td>${this.formatDate(s.data)}</td>
              <td style="color: var(--primary); font-weight: 700;">${this.formatCurrency(s.valor)}</td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // --- LISTA DE ANIMAIS (COM FILTRO E BUSCA) ---
  renderAnimalsList(filterCategory = 'Todos', searchQuery = '') {
    const listBody = document.getElementById('animals-list-tbody');
    if (!listBody) return;

    let list = window.db.getAnimals();

    // Filtros de Categoria
    if (filterCategory !== 'Todos') {
      if (filterCategory === 'Bezerros') {
        list = list.filter(a => a.categoria === 'Bezerro' || a.categoria === 'Bezerra');
      } else if (filterCategory === 'Novilhas') {
        list = list.filter(a => a.categoria === 'Novilha');
      } else if (filterCategory === 'Bois') {
        list = list.filter(a => a.categoria === 'Boi' || a.categoria === 'Reprodutor');
      } else if (filterCategory === 'Vacas') {
        list = list.filter(a => a.categoria === 'Vaca' || a.categoria === 'Matriz');
      } else if (filterCategory === 'Vendidos') {
        list = list.filter(a => a.status === 'Vendido');
      }
    } else {
      // Por padrão na aba 'Todos', esconde os vendidos para focar no rebanho ativo
      list = list.filter(a => a.status === 'Ativo');
    }

    // Busca Textual
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => 
        a.brinco.toLowerCase().includes(q) || 
        a.raca.toLowerCase().includes(q) || 
        a.categoria.toLowerCase().includes(q) ||
        (a.codigo && a.codigo.toLowerCase().includes(q)) ||
        (a.nome && a.nome.toLowerCase().includes(q))
      );
    }

    const purchases = window.db.getPurchases();
    const lotAnimalIds = new Set(purchases.filter(p => p.compra_grupo_id).map(p => p.animal_id));

    // Filtro de Lote vs Individual
    const filterLote = document.getElementById('animal-filter-lote')?.value || 'Todos';
    if (filterLote !== 'Todos') {
      if (filterLote === 'Lote') {
        list = list.filter(a => lotAnimalIds.has(a.id));
      } else if (filterLote === 'Individual') {
        list = list.filter(a => !lotAnimalIds.has(a.id));
      }
    }

    if (list.length === 0) {
      listBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px 0;">Nenhum animal encontrado com as especificações atuais.</td></tr>`;
      return;
    }

    listBody.innerHTML = list.map(a => {
      const isSold = a.status === 'Vendido';
      const isLot = lotAnimalIds.has(a.id);
      const lotBadge = isLot 
        ? `<span class="badge badge-info" style="font-size: 10px; margin-left: 6px; padding: 2px 6px;">Lote</span>` 
        : `<span class="badge badge-neutral" style="font-size: 10px; margin-left: 6px; padding: 2px 6px;">Individual</span>`;
      return `
        <tr>
          <td>
            <div class="animal-meta">
              <div class="animal-avatar">${a.codigo.substring(0, 2)}</div>
              <div class="animal-details">
                <span class="animal-code" style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">${a.codigo}${lotBadge}</span>
                <span class="animal-name">${a.nome || 'Sem Nome'}</span>
              </div>
            </div>
          </td>
          <td><strong>${a.brinco}</strong></td>
          <td><span class="badge ${a.sexo === 'M' ? 'badge-info' : 'badge-female'}">${a.sexo === 'M' ? 'Macho' : 'Fêmea'}</span></td>
          <td>${a.raca}</td>
          <td><span class="badge badge-neutral">${a.categoria}</span></td>
          <td>${a.peso_atual > 0 ? `${a.peso_atual} kg` : '-'}</td>
          <td>${this.formatDate(a.nascimento)}</td>
          <td>
            <span class="badge ${isSold ? 'badge-danger' : 'badge-success'}">${isSold ? 'Vendido' : 'Ativo'}</span>
          </td>
          <td>
            <div class="table-actions">
              <button class="action-btn" title="Ver Detalhes/Perfil" onclick="window.app.viewAnimalProfile(${a.id})">
                <i class="lucide-eye"></i>
              </button>
              ${!isSold ? `
                <button class="action-btn" title="Adicionar Pesagem" onclick="window.app.openWeightModal(${a.id})">
                  <i class="lucide-scale"></i>
                </button>
                <button class="action-btn" title="Registrar Venda" onclick="window.app.openSaleModal(${a.id})">
                  <i class="lucide-trending-up"></i>
                </button>
                <button class="action-btn" title="Editar Cadastro" onclick="window.app.editAnimal(${a.id})">
                  <i class="lucide-edit"></i>
                </button>
              ` : ''}
              <button class="action-btn btn-delete" title="Excluir Animal" onclick="window.app.deleteAnimal(${a.id})">
                <i class="lucide-trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- CONTROLE DE PESAGENS ---
  renderWeightsView() {
    const select = document.getElementById('weight-animal-id');
    const tableBody = document.getElementById('weight-history-tbody');
    const animals = window.db.getAnimals().filter(a => a.status === 'Ativo');

    // Popula dropdown de animais ativos
    if (select) {
      select.innerHTML = '<option value="">Selecione o Animal...</option>' + 
        animals.map(a => `<option value="${a.id}">Brinco ${a.brinco} - ${a.nome || 'Sem nome'} (${a.codigo})</option>`).join('');
    }

    this.updateWeightHistoryTable();
  }

  updateWeightHistoryTable() {
    const select = document.getElementById('weight-animal-id');
    const tableBody = document.getElementById('weight-history-tbody');
    const statsContainer = document.getElementById('weight-stats-container');
    const chartContainer = document.getElementById('weight-chart-wrapper');

    if (!tableBody) return;

    const animalId = select ? select.value : '';

    if (!animalId) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px 0;">Selecione um animal acima para carregar o histórico de pesagens.</td></tr>`;
      if (statsContainer) statsContainer.classList.add('hidden');
      if (chartContainer) chartContainer.classList.add('hidden');
      return;
    }

    const animal = window.db.getAnimal(animalId);
    const weights = window.db.getAnimalWeights(animalId);

    if (weights.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px 0;">Nenhuma pesagem cadastrada para este animal.</td></tr>`;
      if (statsContainer) statsContainer.classList.add('hidden');
      if (chartContainer) chartContainer.classList.add('hidden');
      return;
    }

    // Mostrar histórico na tabela
    tableBody.innerHTML = weights.map((w, index) => {
      let ganho = '-';
      if (index > 0) {
        const diff = w.peso - weights[index - 1].peso;
        const diffClass = diff >= 0 ? 'gmd-positive' : 'gmd-negative';
        const diffSign = diff >= 0 ? '+' : '';
        ganho = `<span class="${diffClass}">${diffSign}${diff.toFixed(1)} kg</span>`;
      }
      return `
        <tr>
          <td>${this.formatDate(w.data)}</td>
          <td><strong>${w.peso} kg</strong></td>
          <td>${ganho}</td>
          <td>
            <button class="action-btn btn-delete btn-sm" onclick="window.app.deleteWeight(${w.id}, ${animalId})">
              <i class="lucide-trash-2"></i>
            </button>
          </td>
        </tr>
      `;
    }).reverse().join(''); // Mais recentes no topo

    if (window.lucide) window.lucide.createIcons();

    // Calcular estatísticas GMD
    if (statsContainer && animal) {
      statsContainer.classList.remove('hidden');
      
      const pesoAtual = animal.peso_atual;
      const pesoPrimeiro = weights[0].peso;
      const ganhoTotal = pesoAtual - pesoPrimeiro;

      let gmd = 0;
      if (weights.length > 1) {
        const dataInicial = new Date(weights[0].data);
        const dataFinal = new Date(weights[weights.length - 1].data);
        const diffTime = Math.abs(dataFinal - dataInicial);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          gmd = ganhoTotal / diffDays;
        }
      }

      document.getElementById('w-stat-atual').textContent = `${pesoAtual} kg`;
      document.getElementById('w-stat-ganho').textContent = `${ganhoTotal >= 0 ? '+' : ''}${ganhoTotal.toFixed(1)} kg`;
      document.getElementById('w-stat-gmd').textContent = `${gmd.toFixed(2)} kg/dia`;
    }

    // Renderizar gráfico de peso
    if (chartContainer) {
      chartContainer.classList.remove('hidden');
      this.renderAnimalWeightChart(weights);
    }
  }

  renderAnimalWeightChart(weights) {
    const ctx = document.getElementById('chartIndividualWeight');
    if (!ctx) return;

    if (uiCharts.animalWeight) {
      uiCharts.animalWeight.destroy();
    }

    const labels = weights.map(w => this.formatDate(w.data));
    const values = weights.map(w => w.peso);

    uiCharts.animalWeight = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Evolução de Peso (kg)',
          data: values,
          borderColor: 'var(--primary)',
          backgroundColor: 'var(--primary-light)',
          borderWidth: 3,
          pointBackgroundColor: 'var(--accent)',
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: 'var(--text-muted)', font: { family: 'Outfit' } }, grid: { display: false } },
          y: { ticks: { color: 'var(--text-muted)', font: { family: 'Outfit' } }, grid: { color: 'var(--border-color)' } }
        }
      }
    });
  }

  // --- CONTROLE DE REPRODUÇÃO (NASCIMENTOS) ---
  renderReproductionView() {
    const birthBody = document.getElementById('reproduction-tbody');
    const births = window.db.getBirths();
    const animals = window.db.getAnimals();

    const maeSelect = document.getElementById('birth-mae-id');
    const paiSelect = document.getElementById('birth-pai-id');

    // Popula select de mães (Vacas ou Matrizes ativas)
    const vacas = animals.filter(a => a.sexo === 'F' && (a.categoria === 'Vaca' || a.categoria === 'Matriz') && a.status === 'Ativo');
    if (maeSelect) {
      maeSelect.innerHTML = '<option value="">Selecione a Mãe...</option>' +
        vacas.map(v => `<option value="${v.id}">Brinco ${v.brinco} - ${v.nome || 'Vaca'} (${v.codigo})</option>`).join('');
    }

    // Popula select de pais (Bois ou Reprodutores ativos)
    const touros = animals.filter(a => a.sexo === 'M' && (a.categoria === 'Boi' || a.categoria === 'Reprodutor') && a.status === 'Ativo');
    if (paiSelect) {
      paiSelect.innerHTML = '<option value=""><option value="">Selecione o Pai (Opcional)...</option>' +
        touros.map(t => `<option value="${t.id}">Brinco ${t.brinco} - ${t.nome || 'Boi'} (${t.codigo})</option>`).join('');
    }

    if (!birthBody) return;

    if (births.length === 0) {
      birthBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px 0;">Nenhum nascimento registrado.</td></tr>`;
      return;
    }

    birthBody.innerHTML = births.map(b => {
      const calf = animals.find(a => a.id === b.animal_id) || { brinco: '-', codigo: '-', peso_atual: 0, sexo: 'F' };
      const mae = animals.find(a => a.id === b.mae_id) || { brinco: '-', nome: '-' };
      const pai = b.pai_id ? (animals.find(a => a.id === b.pai_id) || { brinco: '-', nome: '-' }) : null;

      return `
        <tr>
          <td>${this.formatDate(b.data)}</td>
          <td><strong>Brinco ${calf.brinco}</strong> (${calf.codigo})</td>
          <td><span class="badge ${calf.sexo === 'M' ? 'badge-info' : 'badge-female'}">${calf.sexo === 'M' ? 'Macho' : 'Fêmea'}</span></td>
          <td>Brinco ${mae.brinco} ${mae.nome ? `(${mae.nome})` : ''}</td>
          <td>${pai ? `Brinco ${pai.brinco} ${pai.nome ? `(${pai.nome})` : ''}` : 'Não Informado'}</td>
          <td>${b.peso_ao_nascer ? `${b.peso_ao_nascer} kg` : '-'}</td>
          <td>
            <button class="action-btn" title="Ver Animal" onclick="window.app.viewAnimalProfile(${calf.id})">
              <i class="lucide-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).reverse().join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // --- COMPRAS E VENDAS ---
  renderTransactionsView() {
    const buyBody = document.getElementById('purchases-tbody');
    const sellBody = document.getElementById('sales-tbody');
    const purchases = window.db.getPurchases();
    const sales = window.db.getSales();
    const animals = window.db.getAnimals();
    const clients = window.db.getClients();

    // Popula select de compradores e fornecedores nos forms
    const buyFornecedor = document.getElementById('buy-fornecedor');
    const sellComprador = document.getElementById('sell-comprador');
    const sellAnimal = document.getElementById('sell-animal-id');

    if (buyFornecedor) {
      const suppliers = clients.filter(c => c.tipo === 'Fornecedor' || c.tipo === 'Ambos');
      buyFornecedor.innerHTML = '<option value="">Selecione o Fornecedor...</option>' +
        suppliers.map(s => `<option value="${s.id}">${s.nome} (${s.cidade})</option>`).join('');
    }

    if (sellComprador) {
      const buyers = clients.filter(c => c.tipo === 'Comprador' || c.tipo === 'Ambos');
      sellComprador.innerHTML = '<option value="">Selecione o Comprador...</option>' +
        buyers.map(b => `<option value="${b.id}">${b.nome} (${b.cidade})</option>`).join('');
    }

    if (sellAnimal) {
      const activeAnimals = animals.filter(a => a.status === 'Ativo');
      sellAnimal.innerHTML = '<option value="">Selecione o Animal...</option>' +
        activeAnimals.map(a => `<option value="${a.id}">Brinco ${a.brinco} - ${a.nome || 'Sem nome'} (${a.codigo})</option>`).join('');
    }

    // Render Compras
    const groupedPurchases = [];
    const purchaseGroups = {};

    purchases.forEach(p => {
      if (p.compra_grupo_id) {
        if (!purchaseGroups[p.compra_grupo_id]) {
          purchaseGroups[p.compra_grupo_id] = [];
        }
        purchaseGroups[p.compra_grupo_id].push(p);
      } else {
        groupedPurchases.push({
          isGroup: false,
          id: p.id,
          data: p.data,
          valor: p.valor,
          fornecedor: p.fornecedor,
          animal_id: p.animal_id,
          rawRecord: p
        });
      }
    });

    Object.keys(purchaseGroups).forEach(groupId => {
      const groupItems = purchaseGroups[groupId];
      const firstItem = groupItems[0];
      const totalValue = groupItems.reduce((sum, item) => sum + item.valor, 0);
      const animalIds = groupItems.map(item => item.animal_id);
      
      groupedPurchases.push({
        isGroup: true,
        groupId: groupId,
        id: parseInt(groupId),
        data: firstItem.data,
        valor: totalValue,
        fornecedor: firstItem.fornecedor,
        animalIds: animalIds,
        itemsCount: groupItems.length,
        rawRecords: groupItems
      });
    });

    groupedPurchases.sort((a, b) => {
      const dateA = new Date(a.data);
      const dateB = new Date(b.data);
      if (dateB - dateA !== 0) return dateB - dateA;
      return b.id - a.id;
    });

    if (buyBody) {
      if (groupedPurchases.length === 0) {
        buyBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px 0;">Nenhuma compra registrada.</td></tr>`;
      } else {
        buyBody.innerHTML = groupedPurchases.map(p => {
          const supplier = clients.find(c => c.id === p.fornecedor) || { nome: '-' };
          
          if (!p.isGroup) {
            const animal = animals.find(a => a.id === p.animal_id) || { brinco: '-', codigo: '-' };
            return `
              <tr>
                <td>${this.formatDate(p.data)}</td>
                <td><strong>Brinco ${animal.brinco}</strong> (${animal.codigo})</td>
                <td>${supplier.nome}</td>
                <td style="font-weight: 600;">${this.formatCurrency(p.valor)}</td>
                <td>
                  <button class="action-btn" title="Ver Perfil" onclick="window.app.viewAnimalProfile(${p.animal_id})">
                    <i class="lucide-eye"></i>
                  </button>
                </td>
              </tr>
            `;
          } else {
            const animalList = p.animalIds.map(id => animals.find(a => a.id === id)).filter(Boolean);
            const earringsText = animalList.map(a => `<span style="cursor: pointer; text-decoration: underline;" onclick="window.app.viewAnimalProfile(${a.id})">Brinco ${a.brinco}</span>`).join(', ');

            return `
              <tr>
                <td>${this.formatDate(p.data)}</td>
                <td>
                  <strong>Lote de ${p.itemsCount} Animais</strong>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    ${earringsText}
                  </div>
                </td>
                <td>${supplier.nome}</td>
                <td style="font-weight: 600;">${this.formatCurrency(p.valor)}</td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn" title="Ver Animais do Lote" onclick="window.app.viewPurchaseLotDetails(${p.groupId})">
                      <i class="lucide-eye"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }
        }).join('');
      }
    }

    // Render Vendas
    const groupedSales = [];
    const saleGroups = {};

    sales.forEach(s => {
      if (s.venda_grupo_id) {
        if (!saleGroups[s.venda_grupo_id]) {
          saleGroups[s.venda_grupo_id] = [];
        }
        saleGroups[s.venda_grupo_id].push(s);
      } else {
        groupedSales.push({
          isGroup: false,
          id: s.id,
          data: s.data,
          valor: s.valor,
          desconto: s.desconto,
          peso_venda: s.peso_venda,
          forma_pagamento: s.forma_pagamento,
          comprador: s.comprador,
          animal_id: s.animal_id,
          rawRecord: s
        });
      }
    });

    Object.keys(saleGroups).forEach(groupId => {
      const groupItems = saleGroups[groupId];
      const firstItem = groupItems[0];
      const totalValue = groupItems.reduce((sum, item) => sum + item.valor, 0);
      const totalDiscount = groupItems.reduce((sum, item) => sum + (parseFloat(item.desconto) || 0), 0);
      const totalPeso = groupItems.reduce((sum, item) => sum + (parseFloat(item.peso_venda) || 0), 0);
      const animalIds = groupItems.map(item => item.animal_id);
      
      groupedSales.push({
        isGroup: true,
        groupId: groupId,
        id: parseInt(groupId),
        data: firstItem.data,
        valor: totalValue,
        desconto: totalDiscount,
        peso_venda: totalPeso,
        forma_pagamento: firstItem.forma_pagamento,
        comprador: firstItem.comprador,
        animalIds: animalIds,
        itemsCount: groupItems.length,
        rawRecords: groupItems
      });
    });

    groupedSales.sort((a, b) => {
      const dateA = new Date(a.data);
      const dateB = new Date(b.data);
      if (dateB - dateA !== 0) return dateB - dateA;
      return b.id - a.id;
    });

    if (sellBody) {
      if (groupedSales.length === 0) {
        sellBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px 0;">Nenhuma venda registrada.</td></tr>`;
      } else {
        sellBody.innerHTML = groupedSales.map(s => {
          const buyer = clients.find(c => c.id === s.comprador) || { nome: '-' };
          
          if (!s.isGroup) {
            const animal = animals.find(a => a.id === s.animal_id) || { brinco: '-', codigo: '-' };
            const p = purchases.find(pur => pur.animal_id === s.animal_id);
            const purchaseVal = p ? p.valor : 0;
            const discountVal = s.desconto ? parseFloat(s.desconto) : 0;
            
            const lucro = (s.valor - discountVal) - purchaseVal;
            const lucroClass = lucro >= 0 ? 'gmd-positive' : 'gmd-negative';

            return `
              <tr>
                <td>${this.formatDate(s.data)}</td>
                <td><strong>Brinco ${animal.brinco}</strong> (${animal.codigo})</td>
                <td>${buyer.nome}</td>
                <td>${s.peso_venda} kg</td>
                <td style="color: var(--text-muted);">${this.formatCurrency(purchaseVal)}</td>
                <td style="font-weight: 600; color: var(--primary);">${this.formatCurrency(s.valor)}</td>
                <td>${discountVal > 0 ? this.formatCurrency(discountVal) : '-'}</td>
                <td><span class="badge badge-neutral">${s.forma_pagamento || '-'}</span></td>
                <td class="${lucroClass}" style="font-weight: 700;">${this.formatCurrency(lucro)}</td>
                <td>
                   <div class="table-actions">
                    <button class="action-btn" title="Emitir Recibo (PDF)" onclick="window.app.printReceipt(${s.id})">
                      <i class="lucide-file-text"></i>
                    </button>
                    <button class="action-btn btn-delete" title="Excluir Venda (Estornar Animal)" onclick="window.app.deleteSale(${s.id})">
                      <i class="lucide-trash-2"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          } else {
            let totalLucro = 0;
            let totalPurchaseVal = 0;
            s.rawRecords.forEach(sr => {
              const p = purchases.find(pur => pur.animal_id === sr.animal_id);
              const purchaseVal = p ? p.valor : 0;
              const discountVal = sr.desconto ? parseFloat(sr.desconto) : 0;
              totalLucro += (sr.valor - discountVal) - purchaseVal;
              totalPurchaseVal += purchaseVal;
            });
            const lucroClass = totalLucro >= 0 ? 'gmd-positive' : 'gmd-negative';

            const animalList = s.animalIds.map(id => animals.find(a => a.id === id)).filter(Boolean);
            const earringsText = animalList.map(a => `<span style="cursor: pointer; text-decoration: underline;" onclick="window.app.viewAnimalProfile(${a.id})">Brinco ${a.brinco}</span>`).join(', ');

            return `
              <tr>
                <td>${this.formatDate(s.data)}</td>
                <td>
                  <strong>Lote de ${s.itemsCount} Animais</strong>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    ${earringsText}
                  </div>
                </td>
                <td>${buyer.nome}</td>
                <td>${s.peso_venda.toFixed(1)} kg</td>
                <td style="color: var(--text-muted);">${this.formatCurrency(totalPurchaseVal)}</td>
                <td style="font-weight: 600; color: var(--primary);">${this.formatCurrency(s.valor)}</td>
                <td>${s.desconto > 0 ? this.formatCurrency(s.desconto) : '-'}</td>
                <td><span class="badge badge-neutral">${s.forma_pagamento || '-'}</span></td>
                <td class="${lucroClass}" style="font-weight: 700;">${this.formatCurrency(totalLucro)}</td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn" title="Emitir Recibo Consolidado (PDF)" onclick="window.app.printReceipt(${s.rawRecords[0].id})">
                      <i class="lucide-file-text"></i>
                    </button>
                    <button class="action-btn btn-delete" title="Excluir Lote de Vendas (Estornar Animais)" onclick="window.app.deleteSale(${s.rawRecords[0].id})">
                      <i class="lucide-trash-2"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }
        }).join('');
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // --- CLIENTES ---
  renderClientsView() {
    const supplierBody = document.getElementById('suppliers-tbody');
    const buyerBody = document.getElementById('buyers-tbody');
    const clients = window.db.getClients();

    const suppliers = clients.filter(c => c.tipo === 'Fornecedor' || c.tipo === 'Ambos');
    const buyers = clients.filter(c => c.tipo === 'Comprador' || c.tipo === 'Ambos');

    if (supplierBody) {
      if (suppliers.length === 0) {
        supplierBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px 0;">Nenhum fornecedor cadastrado.</td></tr>`;
      } else {
        supplierBody.innerHTML = suppliers.map(s => `
          <tr>
            <td><strong>${s.nome}</strong></td>
            <td>${s.telefone}</td>
            <td>${s.cidade}</td>
            <td>
              <div class="table-actions">
                <button class="action-btn" title="Editar" onclick="window.app.editClient(${s.id})">
                  <i class="lucide-edit"></i>
                </button>
                <button class="action-btn btn-delete" title="Deletar" onclick="window.app.deleteClient(${s.id})">
                  <i class="lucide-trash-2"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    if (buyerBody) {
      if (buyers.length === 0) {
        buyerBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px 0;">Nenhum comprador cadastrado.</td></tr>`;
      } else {
        buyerBody.innerHTML = buyers.map(b => `
          <tr>
            <td><strong>${b.nome}</strong></td>
            <td>${b.telefone}</td>
            <td>${b.cidade}</td>
            <td>
              <div class="table-actions">
                <button class="action-btn" title="Editar" onclick="window.app.editClient(${b.id})">
                  <i class="lucide-edit"></i>
                </button>
                <button class="action-btn btn-delete" title="Deletar" onclick="window.app.deleteClient(${b.id})">
                  <i class="lucide-trash-2"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // --- DETALHES COMPLETOS DO ANIMAL (MODAL DE PERFIL) ---
  showAnimalDetails(animalId) {
    this.currentAnimalDetailId = parseInt(animalId);
    const animal = window.db.getAnimal(animalId);
    if (!animal) return;

    const weights = window.db.getAnimalWeights(animalId);
    const isSold = animal.status === 'Vendido';

    // Preenche cabeçalho do Perfil
    document.getElementById('profile-code-title').textContent = `${animal.codigo} - ${animal.nome || 'Sem Nome'}`;
    document.getElementById('profile-avatar-letters').textContent = animal.codigo.substring(0,2);
    
    // Status e Categoria Badges
    document.getElementById('profile-badges-container').innerHTML = `
      <span class="badge ${animal.sexo === 'M' ? 'badge-info' : 'badge-female'}">${animal.sexo === 'M' ? 'Macho' : 'Fêmea'}</span>
      <span class="badge badge-neutral">${animal.categoria}</span>
      <span class="badge ${isSold ? 'badge-danger' : 'badge-success'}">${isSold ? 'Vendido' : 'Ativo'}</span>
    `;

    // Estatísticas Básicas
    const pesoAtual = animal.peso_atual;
    const pesoPrimeiro = weights.length > 0 ? weights[0].peso : 0;
    const ganhoTotal = weights.length > 0 ? (pesoAtual - pesoPrimeiro) : 0;

    let gmd = 0;
    if (weights.length > 1) {
      const dataInicial = new Date(weights[0].data);
      const dataFinal = new Date(weights[weights.length - 1].data);
      const diffTime = Math.abs(dataFinal - dataInicial);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        gmd = ganhoTotal / diffDays;
      }
    }

    document.getElementById('prof-stat-peso').textContent = `${pesoAtual} kg`;
    document.getElementById('prof-stat-ganho').textContent = `${ganhoTotal >= 0 ? '+' : ''}${ganhoTotal.toFixed(1)} kg`;
    document.getElementById('prof-stat-gmd').textContent = `${gmd.toFixed(2)} kg/dia`;

    // Lista de Informações Gerais
    const pRecord = window.db.getPurchases().find(p => p.animal_id === animal.id);
    const sRecord = isSold ? window.db.getSales().find(s => s.animal_id === animal.id) : null;
    const nRecord = window.db.getBirths().find(b => b.animal_id === animal.id);
    const clients = window.db.getClients();

    let infoHtml = `
      <div class="info-row"><span>Brinco</span><span>${animal.brinco}</span></div>
      <div class="info-row"><span>Raça</span><span>${animal.raca}</span></div>
      <div class="info-row"><span>Data de Nascimento</span><span>${this.formatDate(animal.nascimento)}</span></div>
      <div class="info-row"><span>Origem</span><span>${animal.origem}</span></div>
    `;

    if (animal.origem === 'Comprado' && pRecord) {
      const supplier = clients.find(c => c.id === pRecord.fornecedor) || { nome: 'Não informado' };
      infoHtml += `
        <div class="info-row"><span>Fornecedor</span><span>${supplier.nome}</span></div>
        <div class="info-row"><span>Data de Compra</span><span>${this.formatDate(pRecord.data)}</span></div>
        <div class="info-row"><span>Valor de Compra</span><span>${this.formatCurrency(pRecord.valor)}</span></div>
      `;
    } else if (animal.origem === 'Nascido' && nRecord) {
      const mae = window.db.getAnimal(nRecord.mae_id) || { brinco: 'Não encontrado' };
      const pai = nRecord.pai_id ? (window.db.getAnimal(nRecord.pai_id) || { brinco: 'Não encontrado' }) : null;
      infoHtml += `
        <div class="info-row"><span>Mãe (Matriz)</span><span>Brinco ${mae.brinco}</span></div>
        <div class="info-row"><span>Pai (Reprodutor)</span><span>${pai ? `Brinco ${pai.brinco}` : 'Não Informado'}</span></div>
        <div class="info-row"><span>Peso ao Nascer</span><span>${nRecord.peso_ao_nascer ? `${nRecord.peso_ao_nascer} kg` : 'Não informado'}</span></div>
      `;
    }

    if (isSold && sRecord) {
      const buyer = clients.find(c => c.id === sRecord.comprador) || { nome: 'Não informado' };
      infoHtml += `
        <div class="info-row"><span>Comprador</span><span>${buyer.nome}</span></div>
        <div class="info-row"><span>Data de Venda</span><span>${this.formatDate(sRecord.data)}</span></div>
        <div class="info-row"><span>Valor de Venda</span><span>${this.formatCurrency(sRecord.valor)}</span></div>
      `;
    }

    document.getElementById('profile-info-details').innerHTML = infoHtml;

    // Tabela de histórico de pesagem do perfil
    const tableBody = document.getElementById('profile-weights-tbody');
    if (weights.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 15px 0;">Sem pesagens.</td></tr>`;
    } else {
      tableBody.innerHTML = weights.map((w, index) => {
        let diff = '-';
        if (index > 0) {
          const d = w.peso - weights[index - 1].peso;
          diff = `${d >= 0 ? '+' : ''}${d.toFixed(1)} kg`;
        }
        return `
          <tr>
            <td>${this.formatDate(w.data)}</td>
            <td><strong>${w.peso} kg</strong></td>
            <td>${diff}</td>
          </tr>
        `;
      }).reverse().join('');
    }

    // Renderiza o gráfico do perfil do animal
    const chartDiv = document.getElementById('profile-chart-container');
    if (weights.length > 0) {
      chartDiv.classList.remove('hidden');
      this.renderProfileWeightChart(weights);
    } else {
      chartDiv.classList.add('hidden');
    }

    // Renderiza o histórico sanitário e carência
    this.renderAnimalSanitaryHistory(animal.id);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Abre o Modal
    document.getElementById('modal-animal-profile').classList.add('active');
  }

  renderProfileWeightChart(weights) {
    const ctx = document.getElementById('chartProfileWeight');
    if (!ctx) return;

    if (uiCharts.animalWeight) {
      uiCharts.animalWeight.destroy();
    }

    const labels = weights.map(w => this.formatDate(w.data));
    const values = weights.map(w => w.peso);

    uiCharts.animalWeight = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Evolução de Peso (kg)',
          data: values,
          borderColor: 'var(--primary)',
          backgroundColor: 'var(--primary-light)',
          borderWidth: 2,
          pointBackgroundColor: 'var(--accent)',
          pointRadius: 4,
          fill: true,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: 'var(--text-muted)', font: { family: 'Outfit', size: 10 } }, grid: { display: false } },
          y: { ticks: { color: 'var(--text-muted)', font: { family: 'Outfit', size: 10 } }, grid: { color: 'var(--border-color)' } }
        }
      }
    });
  }

  // --- RENDERIZADOR DE RELATÓRIOS ---
  renderReportsView() {
    const purchases = window.db.getPurchases();
    const sales = window.db.getSales();
    const costs = window.db.getPropertyCosts();
    const animals = window.db.getAnimals();

    const setElText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    // 1. Cálculos DRE
    const fatBruto = sales.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
    const descontos = sales.reduce((sum, s) => sum + (parseFloat(s.desconto) || 0), 0);
    const recLiquida = fatBruto - descontos;

    let cav = 0;
    sales.forEach(s => {
      const p = purchases.find(pur => pur.animal_id === s.animal_id);
      if (p) cav += (parseFloat(p.valor) || 0);
    });

    const lucroBruto = recLiquida - cav;

    // Despesas operacionais por categoria
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

    // Atualiza cards financeiros
    setElText('rep-faturamento', this.formatCurrency(fatBruto));
    setElText('rep-custo-animais', this.formatCurrency(cav));
    setElText('rep-despesas-gerais', this.formatCurrency(despesasTotal));
    setElText('rep-resultado-liquido', this.formatCurrency(resultadoLiquido));

    // Cor do card de resultado líquido
    const rCard = document.getElementById('rep-lucro-card');
    const rIcon = document.getElementById('rep-lucro-icon');
    if (rCard && rIcon) {
      if (resultadoLiquido >= 0) {
        rCard.className = 'stat-card';
        rCard.style.borderLeft = '4px solid var(--success)';
        rIcon.style.backgroundColor = 'var(--success-light)';
        rIcon.style.color = 'var(--success)';
      } else {
        rCard.className = 'stat-card';
        rCard.style.borderLeft = '4px solid var(--danger)';
        rIcon.style.backgroundColor = 'var(--danger-light)';
        rIcon.style.color = 'var(--danger)';
      }
    }

    // Preenche DRE na tabela
    setElText('dre-fat-bruto', this.formatCurrency(fatBruto));
    setElText('dre-descontos', descontos > 0 ? `-${this.formatCurrency(descontos)}` : 'R$ 0,00');
    setElText('dre-rec-liquida', this.formatCurrency(recLiquida));
    setElText('dre-cav', cav > 0 ? `-${this.formatCurrency(cav)}` : 'R$ 0,00');
    setElText('dre-lucro-bruto', this.formatCurrency(lucroBruto));
    setElText('dre-despesas-total', despesasTotal > 0 ? `-${this.formatCurrency(despesasTotal)}` : 'R$ 0,00');

    setElText('dre-cat-funcionarios', this.formatCurrency(categoriesSum['Funcionários']));
    setElText('dre-cat-alimentacao', this.formatCurrency(categoriesSum['Alimentação Geral']));
    setElText('dre-cat-manutencao', this.formatCurrency(categoriesSum['Manutenção']));
    setElText('dre-cat-combustivel', this.formatCurrency(categoriesSum['Combustível']));
    setElText('dre-cat-energia', this.formatCurrency(categoriesSum['Energia/Água']));
    setElText('dre-cat-impostos', this.formatCurrency(categoriesSum['Impostos/Taxas']));
    setElText('dre-cat-medicamentos', this.formatCurrency(categoriesSum['Vacinas/Medicamentos Geral']));
    setElText('dre-cat-outros', this.formatCurrency(categoriesSum['Outros']));

    const resFinalCell = document.getElementById('dre-resultado-final');
    if (resFinalCell) {
      resFinalCell.textContent = this.formatCurrency(resultadoLiquido);
      resFinalCell.style.color = resultadoLiquido >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    // 2. Cálculos Zootécnicos (Métricas de Compra)
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

    setElText('met-compra-qtd', compCount);
    setElText('met-compra-peso', avgWeightCompra > 0 ? `${avgWeightCompra.toFixed(1)} kg` : '-');
    setElText('met-compra-preco-cabeca', this.formatCurrency(avgPriceCompraCabeca));
    setElText('met-compra-preco-kg', avgPriceCompraKg > 0 ? `${this.formatCurrency(avgPriceCompraKg)}/kg` : '-');

    // Métricas de Venda
    const vendCount = sales.length;
    let sumWeightVenda = 0;
    let sumValVenda = 0;
    let sumWeightGain = 0;
    let sumDays = 0;
    let validPerformanceCount = 0;

    sales.forEach(s => {
      sumValVenda += s.valor;
      sumWeightVenda += s.peso_venda;

      // Desempenho comercial
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

    setElText('met-venda-qtd', vendCount);
    setElText('met-venda-peso', avgWeightVenda > 0 ? `${avgWeightVenda.toFixed(1)} kg` : '-');
    setElText('met-venda-preco-cabeca', this.formatCurrency(avgPriceVendaCabeca));
    setElText('met-venda-preco-kg', avgPriceVendaKg > 0 ? `${this.formatCurrency(avgPriceVendaKg)}/kg` : '-');

    setElText('met-ganho-peso-medio', avgGain !== 0 ? `${avgGain.toFixed(1)} kg` : '-');
    setElText('met-permanencia-media', avgDays > 0 ? `${Math.round(avgDays)} dias` : '-');
    setElText('met-gmd-medio', avgGMD > 0 ? `${avgGMD.toFixed(2)} kg/dia` : '-');
  }

  // --- CUSTOS DA FAZENDA ---
  renderPropertyCostsView() {
    const tableBody = document.getElementById('property-costs-tbody');
    if (!tableBody) return;

    const costs = window.db.getPropertyCosts();
    
    const searchVal = document.getElementById('cost-filter-search')?.value.toLowerCase() || '';
    const catFilter = document.getElementById('cost-filter-categoria')?.value || 'Todos';
    const periodFilter = document.getElementById('cost-filter-periodo')?.value || 'Todos';

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let filteredCosts = costs.filter(c => {
      if (searchVal && !c.descricao.toLowerCase().includes(searchVal)) {
        return false;
      }
      
      if (catFilter !== 'Todos' && c.categoria !== catFilter) {
        return false;
      }

      if (periodFilter !== 'Todos') {
        const costDate = new Date(c.data + 'T00:00:00');
        if (periodFilter === 'Mes') {
          if (costDate.getFullYear() !== currentYear || costDate.getMonth() !== currentMonth) {
            return false;
          }
        } else if (periodFilter === 'Ano') {
          if (costDate.getFullYear() !== currentYear) {
            return false;
          }
        }
      }
      return true;
    });

    filteredCosts.sort((a, b) => {
      const dateA = new Date(a.data);
      const dateB = new Date(b.data);
      if (dateB - dateA !== 0) return dateB - dateA;
      return b.id - a.id;
    });

    if (filteredCosts.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px 0;">Nenhum custo registrado para o filtro selecionado.</td></tr>`;
    } else {
      tableBody.innerHTML = filteredCosts.map(c => `
        <tr>
          <td>${this.formatDate(c.data)}</td>
          <td><span class="badge badge-neutral">${c.categoria}</span></td>
          <td>${c.descricao || '-'}</td>
          <td style="font-weight: 600; color: var(--danger);">${this.formatCurrency(c.valor)}</td>
          <td>${c.periodicidade}</td>
          <td>
            <button class="action-btn btn-delete btn-sm" title="Excluir Custo" onclick="window.app.deletePropertyCost(${c.id})">
              <i class="lucide-trash-2"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    let totalAcumulado = 0;
    let totalMes = 0;
    let totalAno = 0;

    costs.forEach(c => {
      const val = parseFloat(c.valor) || 0;
      totalAcumulado += val;
      
      const costDate = new Date(c.data + 'T00:00:00');
      if (costDate.getFullYear() === currentYear) {
        totalAno += val;
        if (costDate.getMonth() === currentMonth) {
          totalMes += val;
        }
      }
    });

    document.getElementById('cost-summary-month').textContent = this.formatCurrency(totalMes);
    document.getElementById('cost-summary-year').textContent = this.formatCurrency(totalAno);
    document.getElementById('cost-summary-total').textContent = this.formatCurrency(totalAcumulado);

    this.renderPropertyCostsChart(costs);
  }

  renderPropertyCostsChart(costs) {
    const categories = [
      'Funcionários',
      'Alimentação Geral',
      'Manutenção',
      'Combustível',
      'Impostos/Taxas',
      'Energia/Água',
      'Vacinas/Medicamentos Geral',
      'Outros'
    ];

    const sums = categories.map(cat => 
      costs.filter(c => c.categoria === cat).reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0)
    );

    const ctx = document.getElementById('chartPropertyCostsByCategory');
    if (!ctx) return;

    if (uiCharts.propertyCostsCategory) {
      uiCharts.propertyCostsCategory.destroy();
    }

    uiCharts.propertyCostsCategory = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories.map(cat => cat.split('/')[0].trim()),
        datasets: [{
          data: sums,
          backgroundColor: [
            '#fbbf24', '#f472b6', '#3b82f6', '#ec4899',
            '#ef4444', '#10b981', '#a855f7', '#64748b'
          ],
          borderWidth: 2,
          borderColor: 'var(--bg-surface)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              color: 'var(--text-main)',
              font: { family: 'Outfit', size: 10 },
              boxWidth: 8,
              padding: 5
            }
          }
        }
      }
    });
  }

  populateRacaDropdown(selectedBreed = '') {
    const select = document.getElementById('animal-raca');
    if (!select) return;

    let racas = window.db.getRacas();

    // Se a raça selecionada não estiver na lista de cadastradas, insere temporariamente
    if (selectedBreed && !racas.some(r => r.nome.toLowerCase() === selectedBreed.toLowerCase().trim())) {
      racas = [...racas, { id: 'temp', nome: selectedBreed }];
    }

    select.innerHTML = racas.map(r => `<option value="${r.nome}">${r.nome}</option>`).join('');

    if (selectedBreed) {
      select.value = selectedBreed;
    }
  }

  renderRacasConfig() {
    const listContainer = document.getElementById('config-racas-list');
    if (!listContainer) return;

    const racas = window.db.getRacas();

    if (racas.length === 0) {
      listContainer.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); text-align: center; margin: 10px 0;">Nenhuma raça cadastrada.</p>`;
      return;
    }

    listContainer.innerHTML = racas.map(r => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background-color: var(--bg-surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <span style="font-size: 13px; font-weight: 600; color: var(--text-main);">${r.nome}</span>
        <button class="action-btn btn-delete btn-sm" onclick="window.app.handleDeleteRaca(${r.id})" title="Excluir Raça" style="padding: 2px;">
          <i class="lucide-trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  renderAnimalSanitaryHistory(animalId) {
    const tbody = document.getElementById('profile-sanitary-tbody');
    if (!tbody) return;

    const expenses = window.db.getAnimalExpenses(animalId) || [];
    // Filtra apenas despesas do tipo Vacina ou Medicamento
    const sanitaryExpenses = expenses.filter(e => e.tipo === 'Vacina' || e.tipo === 'Medicamento');

    if (sanitaryExpenses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 15px 0;">Nenhum registro sanitário.</td></tr>`;
      return;
    }

    const medicamentos = window.db.getMedicamentos();
    const today = new Date();
    today.setHours(0,0,0,0);

    tbody.innerHTML = sanitaryExpenses.map(e => {
      const medConfig = medicamentos.find(m => m.nome.trim().toLowerCase() === (e.descricao || '').trim().toLowerCase());
      
      let statusHtml = '<span class="badge badge-success">✓ Liberado</span>';
      
      if (medConfig && medConfig.carencia_dias > 0) {
        const [year, month, day] = e.data.split('-').map(Number);
        const appDate = new Date(year, month - 1, day);
        const endDate = new Date(appDate);
        endDate.setDate(endDate.getDate() + medConfig.carencia_dias);
        
        if (endDate >= today) {
          const diffTime = endDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const dateStr = endDate.toISOString().split('T')[0];
          statusHtml = `<span class="badge badge-warning" title="Carência até ${this.formatDate(dateStr)}">⚠️ Carência (${diffDays}d)</span>`;
        }
      }

      return `
        <tr>
          <td>${this.formatDate(e.data)}</td>
          <td>
            <strong>${e.descricao || e.tipo}</strong>
            ${medConfig ? `<br><small style="color: var(--text-muted);">${medConfig.carencia_dias} dias de carência</small>` : ''}
          </td>
          <td>${statusHtml}</td>
        </tr>
      `;
    }).reverse().join('');
  }

  renderMedicamentosConfig() {
    const listContainer = document.getElementById('config-medicamentos-list');
    if (!listContainer) return;

    const medicamentos = window.db.getMedicamentos();

    if (medicamentos.length === 0) {
      listContainer.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); text-align: center; margin: 10px 0;">Nenhum medicamento cadastrado.</p>`;
      return;
    }

    listContainer.innerHTML = medicamentos.map(m => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background-color: var(--bg-surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-main);">${m.nome}</span>
          <span style="font-size: 11px; color: var(--text-muted);">${m.carencia_dias} ${m.carencia_dias === 1 ? 'dia' : 'dias'} de carência</span>
        </div>
        <button class="action-btn btn-delete btn-sm" onclick="window.app.handleDeleteMedicamento(${m.id})" title="Excluir Medicamento" style="padding: 2px;">
          <i class="lucide-trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}

// Cria instância global
window.ui = new UserInterface();
