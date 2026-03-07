let gravando = false;
let ultimaCaptura = "";
let capturandoAgora = false;

const XPATH_ENUNCIADO = '/html/body/div[2]/div/div[4]/div[2]/div/div[2]/div/div/div/article/div[1]';
const XPATH_ALTERNATIVAS = '/html/body/div[2]/div/div[4]/div[2]/div/div[2]/div/div/div/article/ul';
const XPATH_COMENTARIO = '/html/body/div[2]/div/div[4]/div[2]/div/div[2]/div/div/div/section[2]/article/div/div/div';
const XPATH_BOTAO_COMENTARIO = '/html/body/div[2]/div/div[4]/div[2]/div/div[2]/div/div/div/section[1]/div[3]/button[1]';
const XPATH_BOTAO_RESPONDER = '/html/body/div[2]/div/div[4]/div[2]/div/div[2]/div/div/div/article/div[2]/button';

function getByXPath(xpath) {
    return document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
}

function botaoResponderExiste() {
    return !!getByXPath(XPATH_BOTAO_RESPONDER);
}

function limparTexto(node) {
    if (!node) return "";
    return node.innerText.trim();
}

function limparComentarioFormatado(node) {

    if (!node) return "";

    const clone = node.cloneNode(true);

    // Remove elementos indesejados
    clone.querySelectorAll("button, svg, script, style, iframe").forEach(el => el.remove());

    // Remove atributos desnecessários
    clone.querySelectorAll("*").forEach(el => {
        [...el.attributes].forEach(attr => {
            if (
                attr.name !== "src" &&
                attr.name !== "href"
            ) {
                el.removeAttribute(attr.name);
            }
        });
    });

    return clone.innerHTML.trim();
}

function extrairAlternativasFormatadas() {

    const ul = getByXPath(XPATH_ALTERNATIVAS);
    if (!ul) return "";

    const lis = ul.querySelectorAll("li");

    let html = "<div style='text-align:left;'>";

    lis.forEach(li => {

        const texto = li.innerText.trim();
        let estilo = "margin:6px 0;";

        const classe = li.className.toLowerCase();

        if (classe.includes("correta")) {
            estilo += "color:green;font-weight:bold;";
        }

        if (classe.includes("errada") || classe.includes("marcada")) {
            estilo += "color:red;";
        }

        html += `<div style="${estilo}">${texto}</div>`;
    });

    html += "</div>";

    return html;
}

async function esperarComentario(timeout = 5000) {

    const inicio = Date.now();

    return new Promise(resolve => {

        const interval = setInterval(() => {

            const el = getByXPath(XPATH_COMENTARIO);

            if (el) {
                clearInterval(interval);
                resolve(el);
            }

            if (Date.now() - inicio > timeout) {
                clearInterval(interval);
                resolve(null);
            }

        }, 200);

    });
}

async function capturarSeRespondeu() {

    if (!gravando || capturandoAgora) return;

    const enunciadoNode = getByXPath(XPATH_ENUNCIADO);
    if (!enunciadoNode) return;

    const enunciado = limparTexto(enunciadoNode);

    if (!enunciado || enunciado === ultimaCaptura) return;

    // Se botão responder ainda existe, não respondeu ainda
    if (botaoResponderExiste()) return;

    capturandoAgora = true;

    // Clica em comentário
    const botaoComentario = getByXPath(XPATH_BOTAO_COMENTARIO);
    if (botaoComentario) {
        botaoComentario.click();
    }

    const comentarioNode = await esperarComentario();
    const comentario = limparComentarioFormatado(comentarioNode);

    const alternativas = extrairAlternativasFormatadas();

    const frente = `
        <div style="text-align:left;font-family:Arial,sans-serif;">
            <div style="margin-bottom:12px;font-weight:bold;">
                ${enunciado}
            </div>
            ${alternativas}
        </div>
    `.replace(/\r?\n|\r/g, " ");

    const verso = `
        <div style="text-align:left;font-family:Arial,sans-serif;">
            ${comentario || ""}
        </div>
    `.replace(/\r?\n|\r/g, " ");

    ultimaCaptura = enunciado;

    chrome.storage.local.get(["questoes"], res => {

        const lista = res.questoes || [];
        lista.push({ frente, verso });

        chrome.storage.local.set({ questoes: lista });
        console.log("Ankeiro: questão capturada corretamente.");
    });

    capturandoAgora = false;
}

const observer = new MutationObserver(() => {
    capturarSeRespondeu();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {

    if (req.action === "start") {
        gravando = true;
        ultimaCaptura = "";
        chrome.storage.local.set({ questoes: [] });
        sendResponse({ status: "ok" });
    }

    if (req.action === "stop") {
        gravando = false;
        sendResponse({ status: "ok" });
    }

    return true;
});
