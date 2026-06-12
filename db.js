// db.js - Banco de Dados Local com Sincronização offline-first Supabase e Autenticação

const DB_KEYS = {
  ANIMAIIS: 'boiuni_animais',
  PESAGENS: 'boiuni_pesagens',
  COMPRAS: 'boiuni_compras',
  VENDAS: 'boiuni_vendas',
  NASCIMENTOS: 'boiuni_nascimentos',
  CLIENTES: 'boiuni_clientes',
  CONFIGURACOES: 'boiuni_configuracoes',
  DESPESAS: 'boiuni_despesas',
  CUSTOS_FAZENDA: 'boiuni_custos_fazenda',
  RACAS: 'boiuni_racas',
  MEDICAMENTOS: 'boiuni_medicamentos'
};

// Configuração Supabase
const SUPABASE_URL = 'https://qwqfbjyvdprtfybxlqdw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWZianl2ZHBydGZ5YnhscWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTI0ODMsImV4cCI6MjA5NjY4ODQ4M30.xYEMINhPjdw2WDpYsyYaInwDS6I3KjNCE6t4JEVG3pM';

let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error("Biblioteca Supabase JS não carregada.");
}

// Dados semente para inicialização de novos usuários
const DEFAULT_RACAS = [
  { id: 1, nome: 'Nelore' },
  { id: 2, nome: 'Angus' },
  { id: 3, nome: 'Brangus' },
  { id: 4, nome: 'Guzerá' },
  { id: 5, nome: 'Senepol' },
  { id: 6, nome: 'Cruzamento Industrial' }
];

const DEFAULT_MEDICAMENTOS = [
  { id: 1, nome: 'Vacina Aftosa', carencia_dias: 0 },
  { id: 2, nome: 'Ivermectina 1%', carencia_dias: 35 },
  { id: 3, nome: 'Vermífugo Oral', carencia_dias: 14 },
  { id: 4, nome: 'Antibiótico Comum', carencia_dias: 28 }
];

const MOCK_CLIENTES = [
  { id: 1, nome: 'João da Silva', telefone: '(17) 99887-7665', cidade: 'São José do Rio Preto', tipo: 'Fornecedor' },
  { id: 2, nome: 'Fazenda Santa Maria', telefone: '(16) 99112-2334', cidade: 'Ribeirão Preto', tipo: 'Fornecedor' },
  { id: 3, nome: 'Frigorífico Boi Gordo', telefone: '(18) 3622-1122', cidade: 'Araçatuba', tipo: 'Comprador' },
  { id: 4, nome: 'Carlos Henrique', telefone: '(34) 99778-8899', cidade: 'Uberaba', tipo: 'Comprador' }
];

const MOCK_ANIMAIS = [
  { id: 1, codigo: 'A001', brinco: '1012', nome: 'Mimosa', sexo: 'F', raca: 'Nelore', categoria: 'Vaca', nascimento: '2022-03-15', peso_atual: 480, origem: 'Comprado', foto: '', status: 'Ativo' },
  { id: 2, codigo: 'A002', brinco: '1013', nome: 'Brangus', sexo: 'M', raca: 'Brangus', categoria: 'Boi', nascimento: '2023-01-10', peso_atual: 520, origem: 'Comprado', status: 'Ativo' },
  { id: 3, codigo: 'A003', brinco: '1014', nome: 'Estrela', sexo: 'F', raca: 'Nelore', categoria: 'Novilha', nascimento: '2024-05-20', peso_atual: 330, origem: 'Nascido', status: 'Ativo' },
  { id: 4, codigo: 'A004', brinco: '1015', nome: 'Pajero', sexo: 'M', raca: 'Nelore', categoria: 'Reprodutor', nascimento: '2021-08-01', peso_atual: 780, origem: 'Comprado', status: 'Ativo' },
  { id: 5, codigo: 'A005', brinco: '1016', nome: 'Mocho', sexo: 'M', raca: 'Nelore', categoria: 'Bezerro', nascimento: '2026-01-05', peso_atual: 150, origem: 'Nascido', status: 'Ativo' },
  { id: 6, codigo: 'A006', brinco: '1017', nome: 'Dourada', sexo: 'F', raca: 'Nelore', categoria: 'Bezerra', nascimento: '2026-02-12', peso_atual: 130, origem: 'Nascido', status: 'Ativo' },
  { id: 7, codigo: 'A007', brinco: '1018', nome: 'Guerreiro', sexo: 'M', raca: 'Nelore', categoria: 'Boi', nascimento: '2023-06-15', peso_atual: 510, origem: 'Comprado', status: 'Vendido' }
];

const MOCK_PESAGENS = [
  { id: 1, animal_id: 1, data: '2026-01-10', peso: 420 },
  { id: 2, animal_id: 1, data: '2026-03-15', peso: 450 },
  { id: 3, animal_id: 1, data: '2026-05-20', peso: 480 },
  { id: 4, animal_id: 2, data: '2026-01-10', peso: 460 },
  { id: 5, animal_id: 2, data: '2026-03-15', peso: 490 },
  { id: 6, animal_id: 2, data: '2026-05-20', peso: 520 },
  { id: 7, animal_id: 3, data: '2026-01-10', peso: 280 },
  { id: 8, animal_id: 3, data: '2026-03-15', peso: 305 },
  { id: 9, animal_id: 3, data: '2026-05-20', peso: 330 },
  { id: 10, animal_id: 5, data: '2026-01-05', peso: 35 },
  { id: 11, animal_id: 5, data: '2026-03-15', peso: 90 },
  { id: 12, animal_id: 5, data: '2026-05-20', peso: 150 },
  { id: 13, animal_id: 7, data: '2026-01-10', peso: 450 },
  { id: 14, animal_id: 7, data: '2026-03-15', peso: 480 },
  { id: 15, animal_id: 7, data: '2026-05-20', peso: 510 }
];

const MOCK_COMPRAS = [
  { id: 1, animal_id: 1, fornecedor: 1, valor: 2500, data: '2024-03-15' },
  { id: 2, animal_id: 2, fornecedor: 2, valor: 2800, data: '2024-04-10' },
  { id: 3, animal_id: 4, fornecedor: 2, valor: 8500, data: '2023-08-01' },
  { id: 4, animal_id: 7, fornecedor: 1, valor: 2300, data: '2024-06-15' }
];

const MOCK_VENDAS = [
  { id: 1, animal_id: 7, comprador: 3, valor: 4500, peso_venda: 510, data: '2026-05-30', desconto: 0, forma_pagamento: 'Pix' }
];

const MOCK_NASCIMENTOS = [
  { id: 1, animal_id: 3, mae_id: 1, pai_id: 4, data: '2024-05-20', peso_ao_nascer: 32 },
  { id: 2, animal_id: 5, mae_id: 1, pai_id: 4, data: '2026-01-05', peso_ao_nascer: 35 },
  { id: 3, animal_id: 6, mae_id: 3, pai_id: 4, data: '2026-02-12', peso_ao_nascer: 30 }
];

class LocalDB {
  constructor() {
    this.init();
  }

  init() {
    // Inicializa localStorage com dados semente apenas se estiver vazio
    if (!localStorage.getItem(DB_KEYS.CLIENTES)) {
      localStorage.setItem(DB_KEYS.CLIENTES, JSON.stringify(MOCK_CLIENTES));
    }
    if (!localStorage.getItem(DB_KEYS.ANIMAIIS)) {
      localStorage.setItem(DB_KEYS.ANIMAIIS, JSON.stringify(MOCK_ANIMAIS));
    }
    if (!localStorage.getItem(DB_KEYS.PESAGENS)) {
      localStorage.setItem(DB_KEYS.PESAGENS, JSON.stringify(MOCK_PESAGENS));
    }
    if (!localStorage.getItem(DB_KEYS.COMPRAS)) {
      localStorage.setItem(DB_KEYS.COMPRAS, JSON.stringify(MOCK_COMPRAS));
    }
    if (!localStorage.getItem(DB_KEYS.VENDAS)) {
      localStorage.setItem(DB_KEYS.VENDAS, JSON.stringify(MOCK_VENDAS));
    }
    if (!localStorage.getItem(DB_KEYS.NASCIMENTOS)) {
      localStorage.setItem(DB_KEYS.NASCIMENTOS, JSON.stringify(MOCK_NASCIMENTOS));
    }
    if (!localStorage.getItem(DB_KEYS.CONFIGURACOES)) {
      localStorage.setItem(DB_KEYS.CONFIGURACOES, JSON.stringify({}));
    }
    if (!localStorage.getItem(DB_KEYS.DESPESAS)) {
      localStorage.setItem(DB_KEYS.DESPESAS, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.CUSTOS_FAZENDA)) {
      localStorage.setItem(DB_KEYS.CUSTOS_FAZENDA, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.RACAS)) {
      localStorage.setItem(DB_KEYS.RACAS, JSON.stringify(DEFAULT_RACAS));
    }
    if (!localStorage.getItem(DB_KEYS.MEDICAMENTOS)) {
      localStorage.setItem(DB_KEYS.MEDICAMENTOS, JSON.stringify(DEFAULT_MEDICAMENTOS));
    }

    // Sincroniza em segundo plano se o usuário já estiver logado
    this.getCurrentSession().then(session => {
      if (session) {
        this.syncFromCloud();
      }
    });
  }

  // --- MÉTODOS DE AUTENTICAÇÃO (SUPABASE AUTH) ---
  async login(email, password) {
    if (!supabaseClient) return { error: { message: "Supabase não carregado" } };
    
    const res = await supabaseClient.auth.signInWithPassword({ email, password });
    if (!res.error) {
      // Limpa dados locais anteriores de outros usuários antes de sincronizar
      this.clearLocalCache();
      await this.syncFromCloud();
    }
    return res;
  }

  async signUp(email, password, nome) {
    if (!supabaseClient) return { error: { message: "Supabase não carregado" } };
    
    const res = await supabaseClient.auth.signUp({ 
      email, 
      password,
      options: {
        data: { nome }
      }
    });
    if (!res.error && res.data.user) {
      // Limpa dados locais anteriores de outros usuários antes de sincronizar
      this.clearLocalCache();
      await this.syncFromCloud();
    }
    return res;
  }

  async resetPassword(email) {
    if (!supabaseClient) return { error: { message: "Supabase não carregado" } };
    return await supabaseClient.auth.resetPasswordForEmail(email, { 
      redirectTo: window.location.origin + window.location.pathname 
    });
  }

  async updatePassword(newPassword) {
    if (!supabaseClient) return { error: { message: "Supabase não carregado" } };
    return await supabaseClient.auth.updateUser({ password: newPassword });
  }

  async logout() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    this.clearLocalCache();
    window.location.reload();
  }

  async wipeSupabaseData() {
    if (!supabaseClient) return;
    const user = await this.getCurrentUser();
    if (!user) return;
    
    const uId = user.id;
    // Exclui primeiro as tabelas filhas (transações, pesagens, nascimentos, despesas, custos_fazenda)
    await supabaseClient.from('custos_fazenda').delete().eq('user_id', uId);
    await supabaseClient.from('despesas').delete().eq('user_id', uId);
    await supabaseClient.from('nascimentos').delete().eq('user_id', uId);
    await supabaseClient.from('vendas').delete().eq('user_id', uId);
    await supabaseClient.from('compras').delete().eq('user_id', uId);
    await supabaseClient.from('pesagens').delete().eq('user_id', uId);
    // Depois as tabelas principais
    await supabaseClient.from('medicamentos').delete().eq('user_id', uId);
    await supabaseClient.from('racas').delete().eq('user_id', uId);
    await supabaseClient.from('animais').delete().eq('user_id', uId);
    await supabaseClient.from('clientes').delete().eq('user_id', uId);
  }

  async getCurrentUser() {
    if (!supabaseClient) return null;
    const { data } = await supabaseClient.auth.getUser();
    return data.user;
  }

  async getCurrentSession() {
    if (!supabaseClient) return null;
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  }

  clearLocalCache() {
    Object.values(DB_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // --- SINCRONIZAÇÃO NUVEM (SUPABASE -> LOCAL) ---
  async syncFromCloud() {
    if (!supabaseClient) return;

    const user = await this.getCurrentUser();
    if (!user) return; // Só sincroniza se logado
    
    console.log("Sincronizando rebanho do Supabase...");
    try {
      // Busca tabelas do usuário autenticado (RLS garante o isolamento)
      const [rClientes, rAnimais, rPesagens, rCompras, rVendas, rNascimentos, rConfig, rDespesas, rCustosFazenda, rRacas, rMedicamentos] = await Promise.all([
        supabaseClient.from('clientes').select('*'),
        supabaseClient.from('animais').select('*').order('id', { ascending: true }),
        supabaseClient.from('pesagens').select('*'),
        supabaseClient.from('compras').select('*'),
        supabaseClient.from('vendas').select('*'),
        supabaseClient.from('nascimentos').select('*'),
        supabaseClient.from('configuracoes').select('*').maybeSingle(),
        supabaseClient.from('despesas').select('*'),
        supabaseClient.from('custos_fazenda').select('*'),
        supabaseClient.from('racas').select('*'),
        supabaseClient.from('medicamentos').select('*')
      ]);

      if (rClientes.error) throw rClientes.error;
      if (rAnimais.error) throw rAnimais.error;
      if (rPesagens.error) throw rPesagens.error;
      if (rCompras.error) throw rCompras.error;
      if (rVendas.error) throw rVendas.error;
      if (rNascimentos.error) throw rNascimentos.error;
      if (rConfig.error) throw rConfig.error;
      if (rDespesas.error) throw rDespesas.error;
      if (rCustosFazenda.error) throw rCustosFazenda.error;
      if (rRacas.error) throw rRacas.error;
      if (rMedicamentos.error) throw rMedicamentos.error;

      // Salva no localStorage local
      this._set(DB_KEYS.CLIENTES, rClientes.data);
      this._set(DB_KEYS.ANIMAIIS, rAnimais.data);
      this._set(DB_KEYS.PESAGENS, rPesagens.data);
      this._set(DB_KEYS.COMPRAS, rCompras.data);
      this._set(DB_KEYS.VENDAS, rVendas.data);
      this._set(DB_KEYS.NASCIMENTOS, rNascimentos.data);
      this._set(DB_KEYS.CONFIGURACOES, rConfig.data || {});
      this._set(DB_KEYS.DESPESAS, rDespesas.data);
      this._set(DB_KEYS.CUSTOS_FAZENDA, rCustosFazenda.data);
      this._set(DB_KEYS.RACAS, rRacas.data);
      this._set(DB_KEYS.MEDICAMENTOS, rMedicamentos.data);

      // Se todas as tabelas vieram vazias, apenas registra no console
      if (rAnimais.data.length === 0 && rClientes.data.length === 0) {
        console.log("Conta limpa ou nova conta. Iniciando sistema vazio.");
      }

      console.log("Sincronização offline-first concluída.");
      
      if (window.app && typeof window.app.refreshTabContent === 'function') {
        window.app.refreshTabContent(window.app.activeTab);
      }
    } catch (err) {
      console.error("Falha ao obter rebanho do Supabase (Offline):", err);
      if (window.ui && typeof window.ui.showToast === 'function') {
        window.ui.showToast('Visualizando dados offline.', 'error');
      }
    }
  }

  // Métodos genéricos auxiliares
  _get(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
  }

  _set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _nextId(key) {
    // Retorna um ID único baseado no timestamp atual (em milissegundos) * 100 + 2 dígitos aleatórios.
    // Isso cabe no tipo BIGINT do PostgreSQL e evita conflitos de chaves primárias em ambientes multiusuário.
    return Date.now() * 100 + Math.floor(Math.random() * 100);
  }

  // --- ANIMAIS ---
  getAnimals() {
    return this._get(DB_KEYS.ANIMAIIS);
  }

  getAnimal(id) {
    return this.getAnimals().find(a => a.id === parseInt(id));
  }

  saveAnimal(animal) {
    const data = this.getAnimals();
    let saved = null;
    const isEdit = !!animal.id;

    if (isEdit) {
      const index = data.findIndex(a => a.id === parseInt(animal.id));
      if (index !== -1) {
        data[index] = { ...data[index], ...animal, id: parseInt(animal.id) };
        this._set(DB_KEYS.ANIMAIIS, data);
        saved = data[index];
      }
    } else {
      const newAnimal = {
        ...animal,
        id: this._nextId(DB_KEYS.ANIMAIIS),
        status: animal.status || 'Ativo',
        peso_atual: parseFloat(animal.peso_atual) || 0
      };
      data.push(newAnimal);
      this._set(DB_KEYS.ANIMAIIS, data);
      saved = newAnimal;

      if (newAnimal.peso_atual > 0) {
        this.addWeight({
          animal_id: newAnimal.id,
          data: animal.nascimento || new Date().toISOString().split('T')[0],
          peso: newAnimal.peso_atual
        });
      }
    }

    // Sincroniza em background
    if (supabaseClient && saved) {
      const dbObject = {
        id: saved.id,
        codigo: saved.codigo,
        brinco: saved.brinco,
        nome: saved.nome,
        sexo: saved.sexo,
        raca: saved.raca,
        categoria: saved.categoria,
        nascimento: saved.nascimento,
        peso_atual: saved.peso_atual,
        origem: saved.origem,
        foto: saved.foto || '',
        status: saved.status
      };

      supabaseClient.from('animais').upsert(dbObject)
        .then(({ error }) => {
          if (error) console.error("Erro ao salvar animal no Supabase:", error);
        });
    }

    return saved;
  }

  deleteAnimal(id) {
    let data = this.getAnimals();
    data = data.filter(a => a.id !== parseInt(id));
    this._set(DB_KEYS.ANIMAIIS, data);

    let weights = this.getWeights();
    weights = weights.filter(w => w.animal_id !== parseInt(id));
    this._set(DB_KEYS.PESAGENS, weights);

    let purchases = this.getPurchases();
    purchases = purchases.filter(p => p.animal_id !== parseInt(id));
    this._set(DB_KEYS.COMPRAS, purchases);

    let sales = this.getSales();
    sales = sales.filter(s => s.animal_id !== parseInt(id));
    this._set(DB_KEYS.VENDAS, sales);

    let births = this.getBirths();
    births = births.filter(b => b.animal_id !== parseInt(id) && b.mae_id !== parseInt(id) && b.pai_id !== parseInt(id));
    this._set(DB_KEYS.NASCIMENTOS, births);

    if (supabaseClient) {
      supabaseClient.from('animais').delete().eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) console.error("Erro ao deletar animal no Supabase:", error);
        });
    }
  }

  updateAnimalWeight(animalId, newWeight) {
    const animals = this.getAnimals();
    const index = animals.findIndex(a => a.id === parseInt(animalId));
    if (index !== -1) {
      animals[index].peso_atual = parseFloat(newWeight);
      this._set(DB_KEYS.ANIMAIIS, animals);

      if (supabaseClient) {
        supabaseClient.from('animais').update({ peso_atual: parseFloat(newWeight) }).eq('id', parseInt(animalId))
          .then(({ error }) => {
            if (error) console.error("Erro ao atualizar peso do animal no Supabase:", error);
          });
      }
    }
  }

  // --- PESAGENS ---
  getWeights() {
    return this._get(DB_KEYS.PESAGENS);
  }

  getAnimalWeights(animalId) {
    return this.getWeights()
      .filter(w => w.animal_id === parseInt(animalId))
      .sort((a, b) => new Date(a.data) - new Date(b.data));
  }

  addWeight(weight) {
    const data = this.getWeights();
    const newWeight = {
      ...weight,
      id: this._nextId(DB_KEYS.PESAGENS),
      animal_id: parseInt(weight.animal_id),
      peso: parseFloat(weight.peso)
    };
    data.push(newWeight);
    this._set(DB_KEYS.PESAGENS, data);

    const animalWeights = this.getAnimalWeights(weight.animal_id);
    if (animalWeights.length > 0) {
      const latestWeight = animalWeights[animalWeights.length - 1];
      this.updateAnimalWeight(weight.animal_id, latestWeight.peso);
    }

    if (supabaseClient) {
      supabaseClient.from('pesagens').insert({
        id: newWeight.id,
        animal_id: newWeight.animal_id,
        data: newWeight.data,
        peso: newWeight.peso
      }).then(({ error }) => {
        if (error) console.error("Erro ao salvar pesagem no Supabase:", error);
      });
    }

    return newWeight;
  }

  deleteWeight(id) {
    let data = this.getWeights();
    const weightToDelete = data.find(w => w.id === parseInt(id));
    if (!weightToDelete) return;

    data = data.filter(w => w.id !== parseInt(id));
    this._set(DB_KEYS.PESAGENS, data);

    const animalId = weightToDelete.animal_id;
    const remainingWeights = this.getAnimalWeights(animalId);
    if (remainingWeights.length > 0) {
      const latestWeight = remainingWeights[remainingWeights.length - 1];
      this.updateAnimalWeight(animalId, latestWeight.peso);
    } else {
      this.updateAnimalWeight(animalId, 0);
    }

    if (supabaseClient) {
      supabaseClient.from('pesagens').delete().eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) console.error("Erro ao deletar pesagem no Supabase:", error);
        });
    }
  }

  // --- COMPRAS ---
  getPurchases() {
    return this._get(DB_KEYS.COMPRAS);
  }

  addPurchase(purchase) {
    const data = this.getPurchases();
    const newPurchase = {
      ...purchase,
      id: this._nextId(DB_KEYS.COMPRAS),
      animal_id: parseInt(purchase.animal_id),
      fornecedor: purchase.fornecedor && !isNaN(parseInt(purchase.fornecedor)) ? parseInt(purchase.fornecedor) : null,
      valor: parseFloat(purchase.valor) || 0,
      compra_grupo_id: purchase.compra_grupo_id ? parseInt(purchase.compra_grupo_id) : null
    };
    data.push(newPurchase);
    this._set(DB_KEYS.COMPRAS, data);

    if (supabaseClient) {
      supabaseClient.from('compras').insert({
        id: newPurchase.id,
        animal_id: newPurchase.animal_id,
        fornecedor: newPurchase.fornecedor,
        valor: newPurchase.valor,
        data: newPurchase.data,
        compra_grupo_id: newPurchase.compra_grupo_id
      }).then(({ error }) => {
        if (error) console.error("Erro ao salvar compra no Supabase:", error);
      });
    }

    return newPurchase;
  }

  // --- VENDAS ---
  getSales() {
    return this._get(DB_KEYS.VENDAS);
  }

  addSale(sale) {
    const data = this.getSales();
    const newSale = {
      ...sale,
      id: this._nextId(DB_KEYS.VENDAS),
      animal_id: parseInt(sale.animal_id),
      comprador: sale.comprador && !isNaN(parseInt(sale.comprador)) ? parseInt(sale.comprador) : null,
      valor: parseFloat(sale.valor) || 0,
      peso_venda: parseFloat(sale.peso_venda) || 0,
      desconto: parseFloat(sale.desconto) || 0,
      forma_pagamento: sale.forma_pagamento || 'Outro',
      venda_grupo_id: sale.venda_grupo_id ? parseInt(sale.venda_grupo_id) : null
    };
    data.push(newSale);
    this._set(DB_KEYS.VENDAS, data);

    const animals = this.getAnimals();
    const index = animals.findIndex(a => a.id === newSale.animal_id);
    if (index !== -1) {
      animals[index].status = 'Vendido';
      animals[index].peso_atual = newSale.peso_venda;
      this._set(DB_KEYS.ANIMAIIS, animals);
    }

    this.addWeight({
      animal_id: newSale.animal_id,
      data: newSale.data,
      peso: newSale.peso_venda
    });

    if (supabaseClient) {
      supabaseClient.from('vendas').insert({
        id: newSale.id,
        animal_id: newSale.animal_id,
        comprador: newSale.comprador,
        valor: newSale.valor,
        peso_venda: newSale.peso_venda,
        data: newSale.data,
        desconto: newSale.desconto,
        forma_pagamento: newSale.forma_pagamento,
        venda_grupo_id: newSale.venda_grupo_id
      }).then(({ error }) => {
        if (error) console.error("Erro ao salvar venda no Supabase:", error);
      });

      supabaseClient.from('animais').update({
        status: 'Vendido',
        peso_atual: newSale.peso_venda
      }).eq('id', newSale.animal_id).then(({ error }) => {
        if (error) console.error("Erro ao atualizar status do animal no Supabase:", error);
      });
    }

    return newSale;
  }

  deleteSale(id) {
    const sale = this.getSales().find(s => s.id === parseInt(id));
    if (!sale) return;

    const salesToDelete = sale.venda_grupo_id
      ? this.getSales().filter(s => s.venda_grupo_id === sale.venda_grupo_id)
      : [sale];

    const animalIds = salesToDelete.map(s => s.animal_id);
    const saleIds = salesToDelete.map(s => s.id);

    let sales = this.getSales();
    sales = sales.filter(s => !saleIds.includes(s.id));
    this._set(DB_KEYS.VENDAS, sales);

    let weights = this.getWeights();
    salesToDelete.forEach(s => {
      const wIdx = weights.findIndex(w => w.animal_id === s.animal_id && w.data === s.data && w.peso === s.peso_venda);
      if (wIdx !== -1) {
        const weightId = weights[wIdx].id;
        weights.splice(wIdx, 1);
        if (supabaseClient) {
          supabaseClient.from('pesagens').delete().eq('id', weightId)
            .then(({ error }) => {
              if (error) console.error("Erro ao deletar pesagem da venda no Supabase:", error);
            });
        }
      }
    });
    this._set(DB_KEYS.PESAGENS, weights);

    let animals = this.getAnimals();
    animals = animals.map(a => {
      if (animalIds.includes(a.id)) {
        a.status = 'Ativo';
        const animalWeights = weights.filter(w => w.animal_id === a.id);
        if (animalWeights.length > 0) {
          const sortedW = [...animalWeights].sort((x, y) => new Date(y.data) - new Date(x.data) || y.id - x.id);
          a.peso_atual = sortedW[0].peso;
        } else {
          a.peso_atual = 0;
        }

        if (supabaseClient) {
          supabaseClient.from('animais').update({
            status: 'Ativo',
            peso_atual: a.peso_atual
          }).eq('id', a.id).then(({ error }) => {
            if (error) console.error("Erro ao atualizar status/peso do animal no Supabase:", error);
          });
        }
      }
      return a;
    });
    this._set(DB_KEYS.ANIMAIIS, animals);

    if (supabaseClient) {
      salesToDelete.forEach(s => {
        supabaseClient.from('vendas').delete().eq('id', s.id)
          .then(({ error }) => {
            if (error) console.error("Erro ao deletar venda no Supabase:", error);
          });
      });
    }
  }

  // --- NASCIMENTOS ---
  getBirths() {
    return this._get(DB_KEYS.NASCIMENTOS);
  }

  addBirth(birth) {
    const data = this.getBirths();
    const newBirth = {
      ...birth,
      id: this._nextId(DB_KEYS.NASCIMENTOS),
      animal_id: parseInt(birth.animal_id),
      mae_id: parseInt(birth.mae_id),
      pai_id: birth.pai_id && !isNaN(parseInt(birth.pai_id)) ? parseInt(birth.pai_id) : null
    };
    data.push(newBirth);
    this._set(DB_KEYS.NASCIMENTOS, data);

    if (supabaseClient) {
      supabaseClient.from('nascimentos').insert({
        id: newBirth.id,
        animal_id: newBirth.animal_id,
        mae_id: newBirth.mae_id,
        pai_id: newBirth.pai_id,
        data: newBirth.data,
        peso_ao_nascer: birth.peso_ao_nascer ? parseFloat(birth.peso_ao_nascer) : null
      }).then(({ error }) => {
        if (error) console.error("Erro ao salvar nascimento no Supabase:", error);
      });
    }

    return newBirth;
  }

  // --- CLIENTES ---
  getClients() {
    return this._get(DB_KEYS.CLIENTES);
  }

  saveClient(client) {
    const data = this.getClients();
    let saved = null;
    const isEdit = !!client.id;

    if (isEdit) {
      const index = data.findIndex(c => c.id === parseInt(client.id));
      if (index !== -1) {
        data[index] = { ...data[index], ...client, id: parseInt(client.id) };
        this._set(DB_KEYS.CLIENTES, data);
        saved = data[index];
      }
    } else {
      const newClient = {
        ...client,
        id: this._nextId(DB_KEYS.CLIENTES)
      };
      data.push(newClient);
      this._set(DB_KEYS.CLIENTES, data);
      saved = newClient;
    }

    if (supabaseClient && saved) {
      supabaseClient.from('clientes').upsert({
        id: saved.id,
        nome: saved.nome,
        telefone: saved.telefone,
        cidade: saved.cidade,
        tipo: saved.tipo
      }).then(({ error }) => {
        if (error) console.error("Erro ao salvar cliente no Supabase:", error);
      });
    }

    return saved;
  }

  deleteClient(id) {
    let data = this.getClients();
    data = data.filter(c => c.id !== parseInt(id));
    this._set(DB_KEYS.CLIENTES, data);

    if (supabaseClient) {
      supabaseClient.from('clientes').delete().eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) console.error("Erro ao deletar cliente no Supabase:", error);
        });
    }
  }

  // --- DESPESAS / MANEJO ---
  getExpenses() {
    return this._get(DB_KEYS.DESPESAS) || [];
  }

  getAnimalExpenses(animalId) {
    return this.getExpenses().filter(e => e.animal_id === parseInt(animalId));
  }

  addExpense(expense) {
    const data = this.getExpenses();
    const newExpense = {
      ...expense,
      id: this._nextId(DB_KEYS.DESPESAS),
      animal_id: parseInt(expense.animal_id),
      valor: parseFloat(expense.valor) || 0
    };
    data.push(newExpense);
    this._set(DB_KEYS.DESPESAS, data);

    if (supabaseClient) {
      supabaseClient.from('despesas').insert({
        id: newExpense.id,
        animal_id: newExpense.animal_id,
        tipo: newExpense.tipo,
        descricao: newExpense.descricao,
        valor: newExpense.valor,
        data: newExpense.data
      }).then(({ error }) => {
        if (error) console.error("Erro ao salvar despesa no Supabase:", error);
      });
    }

    return newExpense;
  }

  deleteExpense(id) {
    let data = this.getExpenses();
    data = data.filter(e => e.id !== parseInt(id));
    this._set(DB_KEYS.DESPESAS, data);

    if (supabaseClient) {
      supabaseClient.from('despesas').delete().eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) console.error("Erro ao deletar despesa no Supabase:", error);
        });
    }
  }

  // --- CUSTOS DA FAZENDA ---
  getPropertyCosts() {
    return this._get(DB_KEYS.CUSTOS_FAZENDA) || [];
  }

  addPropertyCost(cost) {
    const data = this.getPropertyCosts();
    const newCost = {
      ...cost,
      id: this._nextId(DB_KEYS.CUSTOS_FAZENDA),
      valor: parseFloat(cost.valor) || 0
    };
    data.push(newCost);
    this._set(DB_KEYS.CUSTOS_FAZENDA, data);

    if (supabaseClient) {
      supabaseClient.from('custos_fazenda').insert({
        id: newCost.id,
        categoria: newCost.categoria,
        descricao: newCost.descricao,
        valor: newCost.valor,
        data: newCost.data,
        periodicidade: newCost.periodicidade
      }).then(({ error }) => {
        if (error) console.error("Erro ao salvar custo da fazenda no Supabase:", error);
      });
    }

    return newCost;
  }

  deletePropertyCost(id) {
    let data = this.getPropertyCosts();
    data = data.filter(c => c.id !== parseInt(id));
    this._set(DB_KEYS.CUSTOS_FAZENDA, data);

    if (supabaseClient) {
      supabaseClient.from('custos_fazenda').delete().eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) console.error("Erro ao deletar custo da fazenda no Supabase:", error);
        });
    }
  }

  // --- CONFIGURACOES ---
  getConfiguracoes() {
    const data = localStorage.getItem(DB_KEYS.CONFIGURACOES);
    return data ? JSON.parse(data) : {};
  }

  async saveConfiguracoes(config) {
    this._set(DB_KEYS.CONFIGURACOES, config);

    if (supabaseClient) {
      const user = await this.getCurrentUser();
      if (user) {
        const dbObject = {
          user_id: user.id,
          nome_fazenda: config.nome_fazenda || '',
          proprietario: config.proprietario || '',
          cpf: config.cpf || '',
          cnpj: config.cnpj || '',
          telefone: config.telefone || '',
          email: config.email || '',
          municipio: config.municipio || '',
          estado: config.estado || '',
          updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient.from('configuracoes').upsert(dbObject);
        if (error) console.error("Erro ao salvar configurações no Supabase:", error);
      }
    }
    return config;
  }

  // --- RACAS ---
  getRacas() {
    return this._get(DB_KEYS.RACAS) || [];
  }

  addRaca(nome) {
    const data = this.getRacas();
    const cleanNome = nome.trim();
    if (!cleanNome) return null;

    const exists = data.some(r => r.nome.toLowerCase() === cleanNome.toLowerCase());
    if (exists) return null;

    const newRaca = {
      id: this._nextId(DB_KEYS.RACAS),
      nome: cleanNome
    };
    data.push(newRaca);
    this._set(DB_KEYS.RACAS, data);

    if (supabaseClient) {
      supabaseClient.from('racas').insert({
        id: newRaca.id,
        nome: newRaca.nome
      }).then(({ error }) => {
        if (error) console.error("Erro ao salvar raça no Supabase:", error);
      });
    }

    return newRaca;
  }

  deleteRaca(id) {
    let data = this.getRacas();
    data = data.filter(r => r.id !== parseInt(id));
    this._set(DB_KEYS.RACAS, data);

    if (supabaseClient) {
      supabaseClient.from('racas').delete().eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) console.error("Erro ao deletar raça no Supabase:", error);
        });
    }
  }

  // --- MEDICAMENTOS ---
  getMedicamentos() {
    return this._get(DB_KEYS.MEDICAMENTOS) || [];
  }

  addMedicamento(med) {
    const data = this.getMedicamentos();
    const cleanNome = med.nome.trim();
    if (!cleanNome) return null;

    const exists = data.some(r => r.nome.toLowerCase() === cleanNome.toLowerCase());
    if (exists) return null;

    const newMed = {
      id: this._nextId(DB_KEYS.MEDICAMENTOS),
      nome: cleanNome,
      carencia_dias: parseInt(med.carencia_dias) || 0
    };
    data.push(newMed);
    this._set(DB_KEYS.MEDICAMENTOS, data);

    if (supabaseClient) {
      supabaseClient.from('medicamentos').insert({
        id: newMed.id,
        nome: newMed.nome,
        carencia_dias: newMed.carencia_dias
      }).then(({ error }) => {
        if (error) console.error("Erro ao salvar medicamento no Supabase:", error);
      });
    }

    return newMed;
  }

  deleteMedicamento(id) {
    let data = this.getMedicamentos();
    data = data.filter(m => m.id !== parseInt(id));
    this._set(DB_KEYS.MEDICAMENTOS, data);

    if (supabaseClient) {
      supabaseClient.from('medicamentos').delete().eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) console.error("Erro ao deletar medicamento no Supabase:", error);
        });
    }
  }

  // --- EXPORTAR / IMPORTAR BACKUP ---
  exportData() {
    const backup = {
      animais: this.getAnimals(),
      pesagens: this.getWeights(),
      compras: this.getPurchases(),
      vendas: this.getSales(),
      nascimentos: this.getBirths(),
      clientes: this.getClients(),
      configuracoes: this.getConfiguracoes(),
      despesas: this.getExpenses(),
      custos_fazenda: this.getPropertyCosts(),
      racas: this.getRacas(),
      medicamentos: this.getMedicamentos()
    };
    return JSON.stringify(backup, null, 2);
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.animais && Array.isArray(data.animais)) this._set(DB_KEYS.ANIMAIIS, data.animais);
      if (data.pesagens && Array.isArray(data.pesagens)) this._set(DB_KEYS.PESAGENS, data.pesagens);
      if (data.compras && Array.isArray(data.compras)) this._set(DB_KEYS.COMPRAS, data.compras);
      if (data.vendas && Array.isArray(data.vendas)) this._set(DB_KEYS.VENDAS, data.vendas);
      if (data.nascimentos && Array.isArray(data.nascimentos)) this._set(DB_KEYS.NASCIMENTOS, data.nascimentos);
      if (data.clientes && Array.isArray(data.clientes)) this._set(DB_KEYS.CLIENTES, data.clientes);
      if (data.configuracoes) this._set(DB_KEYS.CONFIGURACOES, data.configuracoes);
      if (data.despesas && Array.isArray(data.despesas)) this._set(DB_KEYS.DESPESAS, data.despesas);
      if (data.custos_fazenda && Array.isArray(data.custos_fazenda)) this._set(DB_KEYS.CUSTOS_FAZENDA, data.custos_fazenda);
      if (data.racas && Array.isArray(data.racas)) this._set(DB_KEYS.RACAS, data.racas);
      if (data.medicamentos && Array.isArray(data.medicamentos)) this._set(DB_KEYS.MEDICAMENTOS, data.medicamentos);
      
      if (supabaseClient) {
        this.pushAllToSupabase(data);
      }
      return true;
    } catch (e) {
      console.error("Erro ao importar dados:", e);
      return false;
    }
  }

  async pushAllToSupabase(data) {
    if (!supabaseClient) return;
    try {
      console.log("Enviando backup importado/seeding para o Supabase...");
      
      const user = await this.getCurrentUser();
      if (!user) return;

      // Limpa dados anteriores do usuário antes de enviar
      await Promise.all([
        supabaseClient.from('despesas').delete().neq('id', 0),
        supabaseClient.from('nascimentos').delete().neq('id', 0),
        supabaseClient.from('vendas').delete().neq('id', 0),
        supabaseClient.from('compras').delete().neq('id', 0),
        supabaseClient.from('pesagens').delete().neq('id', 0),
        supabaseClient.from('animais').delete().neq('id', 0),
        supabaseClient.from('clientes').delete().neq('id', 0),
        supabaseClient.from('custos_fazenda').delete().neq('id', 0),
        supabaseClient.from('racas').delete().neq('id', 0),
        supabaseClient.from('medicamentos').delete().neq('id', 0)
      ]);

      // Insere na ordem certa com user_id explícito se necessário (ou defaults)
      const uId = user.id;
      
      if (data.configuracoes) {
        await supabaseClient.from('configuracoes').upsert({
          user_id: uId,
          nome_fazenda: data.configuracoes.nome_fazenda || '',
          proprietario: data.configuracoes.proprietario || '',
          cpf: data.configuracoes.cpf || '',
          cnpj: data.configuracoes.cnpj || '',
          telefone: data.configuracoes.telefone || '',
          email: data.configuracoes.email || '',
          municipio: data.configuracoes.municipio || '',
          estado: data.configuracoes.estado || '',
          updated_at: new Date().toISOString()
        });
      }
      if (data.clientes && data.clientes.length > 0) {
        await supabaseClient.from('clientes').insert(data.clientes.map(c => ({ ...c, user_id: uId })));
      }
      if (data.animais && data.animais.length > 0) {
        await supabaseClient.from('animais').insert(data.animais.map(a => ({ ...a, user_id: uId, foto: a.foto || '' })));
      }
      if (data.pesagens && data.pesagens.length > 0) {
        await supabaseClient.from('pesagens').insert(data.pesagens.map(w => ({ ...w, user_id: uId })));
      }
      if (data.compras && data.compras.length > 0) {
        await supabaseClient.from('compras').insert(data.compras.map(p => ({ ...p, user_id: uId })));
      }
      if (data.vendas && data.vendas.length > 0) {
        await supabaseClient.from('vendas').insert(data.vendas.map(s => ({ ...s, user_id: uId })));
      }
      if (data.nascimentos && data.nascimentos.length > 0) {
        await supabaseClient.from('nascimentos').insert(data.nascimentos.map(b => ({ ...b, user_id: uId })));
      }
      if (data.despesas && data.despesas.length > 0) {
        await supabaseClient.from('despesas').insert(data.despesas.map(d => ({ ...d, user_id: uId })));
      }
      if (data.custos_fazenda && data.custos_fazenda.length > 0) {
        await supabaseClient.from('custos_fazenda').insert(data.custos_fazenda.map(cf => ({ ...cf, user_id: uId })));
      }
      if (data.racas && data.racas.length > 0) {
        await supabaseClient.from('racas').insert(data.racas.map(r => ({ ...r, user_id: uId })));
      }
      if (data.medicamentos && data.medicamentos.length > 0) {
        await supabaseClient.from('medicamentos').insert(data.medicamentos.map(m => ({ ...m, user_id: uId })));
      }

      console.log("Semente de dados gravada com sucesso no Supabase.");
      if (window.ui && typeof window.ui.showToast === 'function') {
        window.ui.showToast('Dados de simulação criados para sua conta!');
      }
    } catch (err) {
      console.error("Falha ao enviar dados semente para o Supabase:", err);
    }
  }
}

// Exporta como instância global no browser
window.db = new LocalDB();
