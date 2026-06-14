# Roadmap de Evolução — BoiUni

Este documento detalha o planejamento estratégico de desenvolvimento e evolução do **BoiUni**, um sistema inteligente e gratuito de gestão agropecuária com foco offline-first.

---

## 🎯 Visão Geral do Produto
O BoiUni nasceu com o propósito de simplificar a gestão de pequenos e médios pecuaristas, fornecendo ferramentas robustas de pesagem, controle zootécnico, sanidade e finanças diretamente no celular, funcionando mesmo em locais sem internet (offline-first).

---

## 🚀 Linha do Tempo de Desenvolvimento

### 🟢 Fase 1: Fundação e Rebanho (Concluído)
*Foco na estrutura inicial da plataforma e controle básico de animais.*
* **Cadastro Completo de Animais:** Registro individual por número de brinco ou código, raça, categoria, sexo e fotos de evolução.
* **Módulo de Pesagem Trimestral:** Acompanhamento do ganho de peso e cálculo automático do Ganho Médio Diário (GMD) com gráficos individuais.
* **Offline-First com LocalStorage:** Banco de dados local robusto para garantir funcionamento pleno no pasto.
* **Sincronização com Supabase:** Login seguro e sincronização em tempo real com backup em nuvem assim que detectada conexão.

### 🟡 Fase 2: Gestão Integrada (Em Curso / Atual)
*Foco em controle sanitário, compras/vendas em lote, reprodução e financeiro básico.*
* **Controle de Estoque de Insumos:** Registro e controle de vacinas, medicamentos, sal mineral, milho, ração e equipamentos.
* **Períodos de Carência Sanitária:** Alertas de carência para evitar o abate ou venda de animais sob efeito residual de tratamentos veterinários.
* **Lotes de Venda Pré-definidos:** Criação de lotes customizados de animais nas configurações para marcação rápida em vendas coletivas.
* **Precificação Flexível (Unitário vs. Total):** Opção de registrar vendas informando o valor total do lote ou o valor individual por cabeça, com rateio automático.
* **Nascimentos Zootécnicos Simplificados:** Registro de bezerros vinculando a matriz (mãe) e o reprodutor (pai), com aplicação sanitária imediata.
* **Balanço Financeiro DRE:** Demonstrativo estruturado de receitas de vendas, despesas de compras, custos com insumos e lucro por cabeça.

### 🔵 Fase 3: Inteligência e Conectividade (Próximos Passos)
*Foco em automação, IoT, estatísticas preditivas e escala.*
* **Integração com Balanças Eletrônicas:** Coleta automática de peso via bluetooth de balanças eletrônicas compatíveis.
* **Leitura de Brincos RFID / Canetas de Manejo:** Busca e marcação automatizada de animais utilizando leitores RFID.
* **Projeção de Ganho de Arroba (@) por Pastagem:** Cálculo de produtividade de arrobas por hectare com base no manejo rotacionado de piquetes.
* **Alertas Climáticos e Suplementação Preditiva:** Integração com previsões meteorológicas para alertar sobre o início da seca e planejar custos de suplementação no cocho.
* **Aplicativos Nativos Android e iOS:** Empacotamento PWA aprimorado com APIs nativas nas lojas oficiais (Google Play e Apple App Store).

---

## 📈 SEO & Descoberta Orgânica
Para melhorar a indexação e busca do BoiUni no Google de forma orgânica, estruturamos os metadados do projeto utilizando:
1. **Sitemap Dinâmico:** Disponível em `/sitemap.xml`.
2. **Robots.txt:** Configurado em `/robots.txt` para guiar crawlers.
3. **Structured Data (JSON-LD):** Tags HTML semânticas para indexação como `SoftwareApplication`.
4. **Landing Page Otimizada:** Seções detalhadas de recursos, simulador pecuário, roadmap de evolução e FAQ estruturado.
