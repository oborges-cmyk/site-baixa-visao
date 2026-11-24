// =========================================================
// 1. CONTROLE DE TAMANHO DE FONTE, CONTRASTE E ESPAÇAMENTO
// =========================================================
const htmlElement = document.documentElement;
const bodyElement = document.body;

let currentFontSize = 20;
const MIN_FONT = 16;
const MAX_FONT = 28;

const fontSizeIndicator = document.getElementById("font-size-indicator");
const btnFontDecrease = document.getElementById("btn-font-decrease");
const btnFontReset = document.getElementById("btn-font-reset");
const btnFontIncrease = document.getElementById("btn-font-increase");
const btnContrast = document.getElementById("btn-contrast");
const btnSpacing = document.getElementById("btn-spacing");

function updateFontSize(newSize) {
  currentFontSize = Math.min(MAX_FONT, Math.max(MIN_FONT, newSize));
  htmlElement.style.setProperty("--base-font-size", `${currentFontSize}px`);
  fontSizeIndicator.textContent = `Fonte: ${currentFontSize}px`;
}

btnFontDecrease.addEventListener("click", () => updateFontSize(currentFontSize - 2));
btnFontReset.addEventListener("click", () => updateFontSize(20));
btnFontIncrease.addEventListener("click", () => updateFontSize(currentFontSize + 2));

btnContrast.addEventListener("click", () => {
  const isActive = bodyElement.classList.toggle("high-contrast");
  btnContrast.setAttribute("aria-pressed", String(isActive));
});

btnSpacing.addEventListener("click", () => {
  const isActive = bodyElement.classList.toggle("expanded-spacing");
  btnSpacing.setAttribute("aria-pressed", String(isActive));
});

// =========================================================
// 2. LEITOR DE VOZ COM FILA ESTRUTURADA E PAUSAS REAIS
// =========================================================
const btnReadPage = document.getElementById("btn-read-page");
const btnCadence = document.getElementById("btn-cadence");
const speechStatus = document.getElementById("speech-status");

let speechSessionId = 0;
let activeTimeout = null;
let isReading = false;
let isSlowCadence = false;
let currentHighlightedElement = null;

function clearHighlight() {
  if (currentHighlightedElement) {
    currentHighlightedElement.classList.remove("is-reading");
    currentHighlightedElement = null;
  }
}

function stopSpeech(finalMessage = "Leitura interrompida.") {
  speechSessionId++; // Invalida qualquer fala ou pausa agendada anteriormente

  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  isReading = false;
  btnReadPage.textContent = "Ouvir Página";
  btnReadPage.setAttribute("aria-pressed", "false");
  clearHighlight();
  speechStatus.textContent = finalMessage;
}

// Garante pontuação final para entonação descendente natural
function ensurePunctuation(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return /[.!?:]$/.test(clean) ? clean : `${clean}.`;
}

// Divide parágrafos em frases para inserir micro-pausas naturais
function splitIntoSentences(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  return clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
}

// Constrói a fila de leitura de uma seção ou card com pausas específicas
function buildQueueForElement(containerEl, sectionTitle) {
  const queue = [];

  queue.push({
    text: ensurePunctuation(`Seção: ${sectionTitle}`),
    pauseAfter: 700, // 700ms após anúncio de seção/título
    element: containerEl,
    sectionLabel: sectionTitle
  });

  const readableNodes = containerEl.querySelectorAll("h1, h2, h3, p, li, figcaption");

  readableNodes.forEach((node) => {
    // Ignora elementos ocultos
    if (node.closest("[hidden]")) return;

    const tag = node.tagName.toLowerCase();
    const rawText = node.textContent.trim();
    if (!rawText) return;

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      queue.push({
        text: ensurePunctuation(rawText),
        pauseAfter: 700, // 700ms após títulos e subtítulos
        element: containerEl,
        sectionLabel: sectionTitle
      });
    } else {
      const sentences = splitIntoSentences(rawText);
      sentences.forEach((sentence, idx) => {
        const isLastSentence = idx === sentences.length - 1;
        queue.push({
          text: ensurePunctuation(sentence),
          pauseAfter: isLastSentence ? 450 : 300, // 300ms entre frases, 450ms fim de bloco
          element: containerEl,
          sectionLabel: sectionTitle
        });
      });
    }
  });

  // Pausa de 1 segundo (1000ms) ao finalizar a seção inteira
  if (queue.length > 0) {
    queue[queue.length - 1].pauseAfter = 1000;
  }

  return queue;
}

function playSpeechQueue(queue, sessionId, index = 0) {
  if (sessionId !== speechSessionId) return;

  if (index >= queue.length) {
    stopSpeech("Leitura concluída.");
    return;
  }

  const item = queue[index];

  clearHighlight();
  if (item.element) {
    item.element.classList.add("is-reading");
    currentHighlightedElement = item.element;
  }

  speechStatus.textContent = `Lendo agora: ${item.sectionLabel}`;

  const utterance = new SpeechSynthesisUtterance(item.text);
  utterance.lang = "pt-BR";
  utterance.rate = isSlowCadence ? 0.78 : 0.92;

  utterance.onend = () => {
    if (sessionId !== speechSessionId) return;
    const pauseMultiplier = isSlowCadence ? 1.5 : 1.0;
    const delay = Math.round(item.pauseAfter * pauseMultiplier);

    activeTimeout = setTimeout(() => {
      playSpeechQueue(queue, sessionId, index + 1);
    }, delay);
  };

  utterance.onerror = () => {
    if (sessionId === speechSessionId) {
      stopSpeech("Não foi possível continuar a leitura em áudio.");
    }
  };

  window.speechSynthesis.speak(utterance);
}

function startSpeech(queue) {
  if (!("speechSynthesis" in window)) {
    speechStatus.textContent = "Seu navegador não suporta leitura por voz.";
    return;
  }

  stopSpeech("Preparando leitura...");
  const currentSession = ++speechSessionId;
  isReading = true;
  btnReadPage.textContent = "Parar leitura";
  btnReadPage.setAttribute("aria-pressed", "true");

  playSpeechQueue(queue, currentSession, 0);
}

// Botão principal: lê todas as seções da página em ordem
btnReadPage.addEventListener("click", () => {
  if (isReading) {
    stopSpeech("Leitura interrompida.");
    return;
  }

  const sections = document.querySelectorAll("main > section[data-speech-section]");
  let fullQueue = [];

  sections.forEach((sec) => {
    const title = sec.getAttribute("data-speech-section");
    fullQueue = fullQueue.concat(buildQueueForElement(sec, title));
  });

  startSpeech(fullQueue);
});

// Botão de cadência: alterna entre Pausada (0.92) e Mais lenta (0.78)
btnCadence.addEventListener("click", () => {
  isSlowCadence = !isSlowCadence;
  btnCadence.setAttribute("aria-pressed", String(isSlowCadence));
  btnCadence.textContent = isSlowCadence ? "Cadência: Mais lenta" : "Cadência: Pausada";
});

// Botões individuais para ouvir cada plano
document.querySelectorAll(".btn-read-plan").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-target");
    const card = document.getElementById(targetId);
    const title = card.getAttribute("data-speech-section");
    const queue = buildQueueForElement(card, title);
    startSpeech(queue);
  });
});

// =========================================================
// 3. SELEÇÃO DE PLANO, ARTIGOS EXPANSÍVEIS E FORMULÁRIO
// =========================================================
const planSelect = document.getElementById("plano");
const inputNome = document.getElementById("nome");
const formFeedback = document.getElementById("form-feedback");

// Preenche o formulário ao clicar em "Assinar plano" e move o foco para o nome
document.querySelectorAll(".btn-select-plan").forEach((button) => {
  button.addEventListener("click", () => {
    const chosenPlan = button.getAttribute("data-plan");
    planSelect.value = chosenPlan;
    formFeedback.textContent = `Plano ${chosenPlan} selecionado. Preencha seu nome e e-mail abaixo para concluir.`;
    formFeedback.classList.add("is-visible");
    inputNome.scrollIntoView({ behavior: "smooth", block: "center" });
    inputNome.focus();
  });
});

// Expansão inline dos resumos na seção Destaques
document.querySelectorAll(".btn-toggle-article").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.getAttribute("aria-controls");
    const extraContent = document.getElementById(targetId);
    const isExpanded = button.getAttribute("aria-expanded") === "true";

    button.setAttribute("aria-expanded", String(!isExpanded));
    button.textContent = isExpanded ? "Ler resumo completo" : "Ocultar resumo";
    extraContent.hidden = isExpanded;
  });
});

// Validação acessível do formulário sem pop-ups invasivos
const contactForm = document.getElementById("contact-form");

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const nome = inputNome.value.trim();
  const email = document.getElementById("email").value.trim();
  const mensagem = document.getElementById("mensagem").value.trim();

  const erroNome = document.getElementById("erro-nome");
  const erroEmail = document.getElementById("erro-email");
  const erroMensagem = document.getElementById("erro-mensagem");

  erroNome.textContent = "";
  erroEmail.textContent = "";
  erroMensagem.textContent = "";

  let hasError = false;

  if (!nome) {
    erroNome.textContent = "Por favor, informe seu nome completo.";
    hasError = true;
  }

  if (!email || !email.includes("@")) {
    erroEmail.textContent = "Por favor, informe um endereço de e-mail válido.";
    hasError = true;
  }

  if (!mensagem) {
    erroMensagem.textContent = "Por favor, escreva uma breve descrição sobre o seu negócio.";
    hasError = true;
  }

  if (hasError) {
    formFeedback.textContent = "Existem campos obrigatórios não preenchidos. Verifique as mensagens acima.";
    formFeedback.classList.add("is-visible");
    return;
  }

  formFeedback.textContent = `Solicitação enviada com sucesso, ${nome}! Nossa equipe entrará em contato sobre o plano ${planSelect.value}.`;
  formFeedback.classList.add("is-visible");
  contactForm.reset();
});