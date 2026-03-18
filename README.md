# 🛡️ VERITAS - Sistema de Estudos P2P

VERITAS é uma aplicação desktop de alta performance projetada para estudantes e concurseiros que buscam máxima produtividade, consistência e uma pitada de competição saudável. O sistema permite gerenciar editais, cronometrar estudos, analisar métricas de desempenho e sincronizar dados entre múltiplos dispositivos via P2P.

## 🚀 Principais Funcionalidades

- **🛡️ Painel de Estudos:** Gerencie suas matérias e tópicos do edital. Organize seu ciclo de estudos diário.
- **🌐 Sala de Estudos P2P:** Conecte-se com amigos para ver o que estão estudando em tempo real. Sem servidores centrais, privacidade total.
- **🔄 Sincronização Cross-Device:** Transfira todo o seu progresso, PDFs e grifos de um PC para outro instantaneamente usando o **Modo Hospedeiro**.
- **📖 Biblioteca Avançada & Leitor de PDF:** 
    - **Grifos Inteligentes (Highlights):** Marque textos no PDF em diferentes cores/categorias.
    - **Contagem de Grifos:** Veja quantos destaques cada material possui diretamente na biblioteca.
    - **Armazenamento Físico:** PDFs são salvos automaticamente na pasta `veritas_storage` ao lado do executável para acesso offline veloz.
- **🏆 Ranking do Grupo:** Compita com seus amigos em horas totais de estudo e precisão global.
- **📊 Dashboard de Desempenho:** 
    - **Evolução de Precisão:** Gráficos que registram snapshots diários da sua taxa de acerto para uma evolução real.
    - **Análise de PDF:** Métricas de tempo gasto por página e disciplinas mais lidas.
    - **Heatmap:** Visualize sua consistência semanal e mensal.
- **📝 Centro de Simulados:** Registre seus resultados em simulados e acompanhe seu gráfico de precisão acumulada.
- **🖋️ Oficina de Redação:** Cronometre sua escrita, anexe o PDF do texto e registre correções.
- **🏃 Treinamento TAF:** Acompanhe sua evolução física para testes de aptidão com gráficos de progresso.
- **🎨 Customização Total:** Temas pré-definidos (incluindo o modo **Caveira 💀**) e editor de temas personalizados.

## 🛠️ Tecnologias e Dependências

A aplicação foi construída utilizando o ecossistema moderno do JavaScript:

- **Frontend:** [React 19](https://react.dev/) com [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Comunicação P2P:** [PeerJS](https://peerjs.com/) (WebRTC) com sanitização de payloads para segurança.
- **Banco de Dados Local:** [LocalForage](https://localforage.github.io/localForage/) (IndexedDB)
- **Desktop Wrapper:** [Electron](https://www.electronjs.org/) para manipulação de arquivos físicos no disco.

## 📥 Instalação e Desenvolvimento

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.

1.  **Instalar dependências:**
    ```bash
    npm install
    ```

2.  **Rodar em modo Web (Navegador):**
    ```bash
    npm run dev
    ```

3.  **Rodar em modo Desktop (Janela nativa):**
    Abra dois terminais:
    - Terminal 1: `npm run dev`
    - Terminal 2: `npm run electron:dev`

## 📦 Compilação para Windows (.EXE)

Para gerar o executável portátil (`.exe`) que pode ser levado em um pen-drive:

```bash
npm run electron:build
```

O arquivo gerado estará na pasta `release/VERITAS.exe`. Lembre-se que o app criará a pasta `veritas_storage` no mesmo diretório do `.exe` para guardar seus PDFs.

## 🌐 Como funciona o P2P & Sincronização?

O VERITAS não utiliza nuvem. Seus dados pertencem a você.
- **Para Estudos em Grupo:** Vá na aba **Sala P2P**, troque chaves com amigos e veja o status um do outro.
- **Para Sincronizar entre seus PCs:** 
    1. No PC de origem (Hospedeiro), vá na aba **Biblioteca** e clique em **Gerar Chave de Hospedeiro**.
    2. No PC de destino (Cliente), cole a chave no campo **Sincronizar Agora**.
    3. O sistema baixará todos os seus PDFs, grifos e estatísticas automaticamente.

---
*Desenvolvido com foco na aprovação. Bons estudos, Guerreiro!* ⚔️🛡️
