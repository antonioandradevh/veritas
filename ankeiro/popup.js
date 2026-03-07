async function getTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

document.getElementById("start").addEventListener("click", async () => {

    const deck = document.getElementById("deck").value.trim();
    if (!deck) return alert("Digite o nome do baralho.");

    const tab = await getTab();

    chrome.tabs.sendMessage(tab.id, { action: "start" }, res => {

        if (chrome.runtime.lastError) {
            alert("Abra uma questão do TecConcursos primeiro.");
            return;
        }

        chrome.storage.local.set({ deckName: deck });
        document.getElementById("info").innerText = "Gravando...";
    });
});

document.getElementById("stop").addEventListener("click", async () => {

    const tab = await getTab();

    chrome.tabs.sendMessage(tab.id, { action: "stop" });

    chrome.storage.local.get(["questoes", "deckName"], res => {

        const questoes = res.questoes || [];
        const deck = res.deckName || "Ankeiro";

        if (questoes.length === 0)
            return alert("Nenhuma questão capturada.");

        let conteudo =
            "#separator:tab\n" +
            "#html:true\n" +
            "#notetype:Basic\n" +
            "#deck:" + deck + "\n\n";

        questoes.forEach(q => {

            let frente = q.frente
                .replace(/\t/g, " ")
                .trim();

            let verso = q.verso
                .replace(/\t/g, " ")
                .trim();

            conteudo += `${frente}\t${verso}\n`;
        });

        const blob = new Blob(
            ["\uFEFF" + conteudo],
            { type: "text/plain;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = deck + ".txt";
        a.click();

        URL.revokeObjectURL(url);

        document.getElementById("info").innerText = "Arquivo gerado!";
    });
});
