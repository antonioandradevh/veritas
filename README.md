# 🛡️ VERITAS - Sistema de Estudos P2P

VERITAS é uma aplicação desktop de alta performance projetada para estudantes e concurseiros que buscam máxima produtividade, consistência e uma pitada de competição saudável. O sistema permite gerenciar editais, cronometrar estudos, analisar métricas de desempenho e conectar-se com amigos em tempo real via P2P.

## 🚀 Principais Funcionalidades

- **🛡️ Painel de Estudos:** Gerencie suas matérias e tópicos do edital. Organize seu ciclo de estudos diário.
- **🌐 Sala de Estudos P2P:** Conecte-se diretamente com outros usuários usando uma chave única. Veja o que seus amigos estão estudando em tempo real sem a necessidade de servidores centrais.
- **🏆 Ranking do Grupo:** Compita com seus amigos em horas totais de estudo e precisão global.
- **📊 Dashboard de Desempenho:** Gráficos de pizza, radar de afinidade e consistência (heatmap) para visualizar sua evolução.
- **📝 Centro de Simulados:** Registre seus resultados em simulados e acompanhe seu gráfico de precisão.
- **🖋️ Oficina de Redação:** Cronometre sua escrita, anexe o PDF do texto e registre correções.
- **🏃 Treinamento TAF:** Acompanhe sua evolução física para testes de aptidão com gráficos de progresso.
- **📖 Biblioteca & Leitor de PDF:** Leia seus materiais diretamente no app com registro automático de tempo gasto por página.
- **🎨 Customização Total:** Temas pré-definidos (incluindo o modo **Caveira 💀**) e editor de temas personalizados.

## 🛠️ Tecnologias e Dependências

A aplicação foi construída utilizando o ecossistema moderno do JavaScript:

- **Frontend:** [React 19](https://react.dev/) com [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Comunicação P2P:** [PeerJS](https://peerjs.com/) (WebRTC)
- **Banco de Dados Local:** [LocalForage](https://localforage.github.io/localForage/) (IndexedDB)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Documentos:** [docx](https://docx.js.org/) para exportação de anotações.
- **Desktop Wrapper:** [Electron](https://www.electronjs.org/) para rodar como app nativo.

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

O arquivo gerado estará na pasta `release/VERITAS.exe`.

## 🌐 Como funciona o P2P?

O VERITAS não armazena seus dados de estudo em nuvem. Tudo fica no seu computador.
Para compartilhar métricas com amigos:
1.  Vá na aba **Sala P2P**.
2.  Copie sua **Chave de Conexão** e envie para seu amigo.
3.  Peça para ele colar sua chave no campo "Conectar a um Amigo" e vice-versa.
4.  Uma vez conectados, o app enviará atualizações de status (matéria estudada, pausas, horas) automaticamente enquanto a conexão estiver ativa.

---
*Desenvolvido com foco na aprovação. Bons estudos, Guerreiro!* ⚔️🛡️
