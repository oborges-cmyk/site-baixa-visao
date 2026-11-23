/* ========================================================================
       SCRIPTS DE ACESSIBILIDADE, LEITURA EM VOZ ALTA E INTERATIVIDADE
       ======================================================================== */

(function () {
    'use strict';

    // ----------------------------------------------------------------------
    // 1. UTILITÁRIOS DE ANÚNCIO ACESSÍVEL E ARMAZENAMENTO SEGURO
    // ----------------------------------------------------------------------
    const announcer = document.getElementById('a11y-announcer');

    function announce(message) {
      if (!announcer) return;
      announcer.textContent = '';
      // Pequeno atraso garante que leitores de tela detectem mudanças repetidas
      setTimeout(() => {
        announcer.textContent = message;
      }, 50);
    }

    function savePref(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        // Ignora falhas caso localStorage esteja bloqueado no navegador
      }
    }

    function loadPref(key, fallback) {
      try {
        const val = localStorage.getItem(key);
        return val !== null ? val : fallback;
      } catch (err) {
        return fallback;
      }
    }

    // ----------------------------------------------------------------------
    // 2. CONTROLE DE TAMANHO DE FONTE (18px até 28px, padrão 20px)
    // ----------------------------------------------------------------------
    const MIN_FONT = 18;
    const DEFAULT_FONT = 20;
    const MAX_FONT = 28;
    const STEP_FONT = 2;

    let currentFontSize = parseInt(loadPref('apeperia_font_size', DEFAULT_FONT), 10);
    if (isNaN(currentFontSize) || currentFontSize < MIN_FONT || currentFontSize > MAX_FONT) {
      currentFontSize = DEFAULT_FONT;
    }

    const fontIndicator = document.getElementById('font-size-indicator');
    const btnFontDecrease = document.getElementById('btn-font-decrease');
    const btnFontReset = document.getElementById('btn-font-reset');
    const btnFontIncrease = document.getElementById('btn-font-increase');

    function applyFontSize(size, shouldAnnounce = false) {
      currentFontSize = Math.min(MAX_FONT, Math.max(MIN_FONT, size));
      document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');
      if (fontIndicator) {
        fontIndicator.textContent = '(' + currentFontSize + 'px)';
      }
      savePref('apeperia_font_size', String(currentFontSize));
      if (shouldAnnounce) {
        announce('Tamanho do texto ajustado para ' + currentFontSize + ' pixels.');
      }
    }

    applyFontSize(currentFontSize, false);

    btnFontDecrease.addEventListener('click', () => {
      if (currentFontSize <= MIN_FONT) {
        announce('Tamanho mínimo de fonte atingido: ' + MIN_FONT + ' pixels.');
        return;
      }
      applyFontSize(currentFontSize - STEP_FONT, true);
    });

    btnFontReset.addEventListener('click', () => {
      applyFontSize(DEFAULT_FONT, true);
    });

    btnFontIncrease.addEventListener('click', () => {
      if (currentFontSize >= MAX_FONT) {
        announce('Tamanho máximo de fonte atingido: ' + MAX_FONT + ' pixels.');
        return;
      }
      applyFontSize(currentFontSize + STEP_FONT, true);
    });

    // ----------------------------------------------------------------------
    // 3. ALTERNADOR DE TEMA DE ALTO CONTRASTE (Claro Creme vs Escuro Amarelo)
    // ----------------------------------------------------------------------
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const themeBtnLabel = document.getElementById('theme-btn-label');

    function applyTheme(theme, shouldAnnounce = false) {
      const isDark = theme === 'dark';
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      btnThemeToggle.setAttribute('aria-pressed', String(isDark));
      themeBtnLabel.textContent = isDark ? 'Modo Claro Confortável' : 'Alto Contraste Escuro';
      savePref('apeperia_theme', isDark ? 'dark' : 'light');

      if (shouldAnnounce) {
        announce(
          isDark
            ? 'Modo Alto Contraste Escuro ativado: fundo preto com texto branco e amarelo vibrante.'
            : 'Modo Claro Confortável ativado: fundo creme suave com texto azul marinho escuro.'
        );
      }
    }

    applyTheme(loadPref('apeperia_theme', 'light'), false);

    btnThemeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark', true);
    });

    // ----------------------------------------------------------------------
    // 4. BOTÃO DE ESPAÇAMENTO AMPLIADO
    // ----------------------------------------------------------------------
    const btnSpacingToggle = document.getElementById('btn-spacing-toggle');
    const spacingBtnLabel = document.getElementById('spacing-btn-label');

    function applySpacing(mode, shouldAnnounce = false) {
      const isExpanded = mode === 'expanded';
      document.documentElement.setAttribute('data-spacing', isExpanded ? 'expanded' : 'normal');
      btnSpacingToggle.setAttribute('aria-pressed', String(isExpanded));
      spacingBtnLabel.textContent = isExpanded ? 'Espaçamento Padrão' : 'Espaçamento Ampliado';
      savePref('apeperia_spacing', isExpanded ? 'expanded' : 'normal');

      if (shouldAnnounce) {
        announce(
          isExpanded
            ? 'Espaçamento ampliado entre letras, palavras e linhas ativado.'
            : 'Espaçamento padrão restaurado.'
        );
      }
    }

    applySpacing(loadPref('apeperia_spacing', 'normal'), false);

    btnSpacingToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-spacing');
      applySpacing(current === 'expanded' ? 'normal' : 'expanded', true);
    });

    // ----------------------------------------------------------------------
    // 5. LEITURA EM VOZ ALTA (WEB SPEECH API - PT-BR)
    // ----------------------------------------------------------------------
    const btnTtsPage = document.getElementById('btn-tts-page');
    const ttsBtnLabel = document.getElementById('tts-btn-label');
    const ttsStatusBar = document.getElementById('tts-status-bar');
    const ttsStatusText = document.getElementById('tts-status-text');
    const btnTtsStopBar = document.getElementById('btn-tts-stop-bar');

    const btnInstitutionalAudio = document.getElementById('btn-institutional-audio');
    const institutionalAudioLabel = document.getElementById('institutional-audio-label');
    const institutionalAudioStatus = document.getElementById('institutional-audio-status');
    const institutionalTranscriptBox = document.getElementById('institutional-transcript-box');

    let isSpeaking = false;
    let activeHighlightEl = null;

    function clearHighlight() {
      if (activeHighlightEl) {
        activeHighlightEl.classList.remove('reading-highlight');
        activeHighlightEl = null;
      }
    }

    function stopSpeech(shouldAnnounce = false) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      isSpeaking = false;
      clearHighlight();

      btnTtsPage.setAttribute('aria-pressed', 'false');
      ttsBtnLabel.textContent = 'Ouvir Página';
      ttsStatusBar.classList.add('hidden');

      btnInstitutionalAudio.setAttribute('aria-pressed', 'false');
      institutionalAudioLabel.textContent = 'Reproduzir Apresentação em Áudio';
      institutionalAudioStatus.textContent = 'Duração estimada: 40 segundos • Áudio em Português (Brasil).';

      if (shouldAnnounce) {
        announce('Leitura em voz alta interrompida.');
      }
    }

    function getBrazilianVoice() {
      if (!('speechSynthesis' in window)) return null;
      const voices = window.speechSynthesis.getVoices();
      return (
        voices.find((v) => v.lang === 'pt-BR') ||
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('pt')) ||
        null
      );
    }

    // Divide textos longos em frases para evitar cortes automáticos de navegadores
    function splitTextIntoChunks(text) {
      const cleaned = text.replace(/\s+/g, ' ').trim();
      const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
      return sentences ? sentences.map((s) => s.trim()).filter(Boolean) : [cleaned];
    }

    function speakText(text, labelDescription, highlightElement = null, isInstitutionalPlayer = false) {
      if (!('speechSynthesis' in window)) {
        ttsStatusBar.classList.remove('hidden');
        ttsStatusText.textContent = 'Seu navegador não suporta leitura em voz alta automática. Use seu leitor de tela do sistema.';
        announce('Leitura em voz alta não suportada neste navegador.');
        return;
      }

      stopSpeech(false);

      const chunks = splitTextIntoChunks(text);
      if (chunks.length === 0) return;

      isSpeaking = true;

      if (highlightElement) {
        activeHighlightEl = highlightElement;
        activeHighlightEl.classList.add('reading-highlight');
      }

      if (isInstitutionalPlayer) {
        btnInstitutionalAudio.setAttribute('aria-pressed', 'true');
        institutionalAudioLabel.textContent = 'Parar Áudio da Apresentação';
        institutionalAudioStatus.textContent = 'Reproduzindo apresentação institucional em áudio...';
      } else {
        btnTtsPage.setAttribute('aria-pressed', 'true');
        ttsBtnLabel.textContent = 'Parar Leitura';
        ttsStatusBar.classList.remove('hidden');
        ttsStatusText.textContent = 'Ouvindo agora: ' + labelDescription;
      }

      const voice = getBrazilianVoice();
      let currentIndex = 0;

      function speakNextChunk() {
        if (!isSpeaking || currentIndex >= chunks.length) {
          stopSpeech(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[currentIndex]);
        utterance.lang = 'pt-BR';
        if (voice) utterance.voice = voice;
        utterance.rate = 0.96; // Ritmo ligeiramente pausado para alta compreensão
        utterance.pitch = 1.0;

        utterance.onend = () => {
          currentIndex++;
          speakNextChunk();
        };

        utterance.onerror = () => {
          stopSpeech(false);
        };

        window.speechSynthesis.speak(utterance);
      }

      speakNextChunk();
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        getBrazilianVoice();
      };
    }

    // Botão principal "Ouvir Página / Parar Leitura"
    btnTtsPage.addEventListener('click', () => {
      if (isSpeaking) {
        stopSpeech(true);
        return;
      }
      const mainEl = document.getElementById('conteudo-principal');
      const fullText = mainEl ? mainEl.innerText : document.body.innerText;
      speakText(fullText, 'Conteúdo completo da página Apeperia', mainEl, false);
    });

    btnTtsStopBar.addEventListener('click', () => {
      stopSpeech(true);
    });

    // Botões "Ouvir detalhes do plano" e "Ouvir artigo"
    document.querySelectorAll('[data-tts-plan]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const textToRead = btn.getAttribute('data-tts-plan');
        const parentCard = btn.closest('article');
        speakText(textToRead, 'Detalhes selecionados', parentCard, false);
      });
    });

    // Botões "Ouvir seção" (ex: Hero)
    document.querySelectorAll('[data-tts-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tts-target');
        const section = document.getElementById(targetId);
        if (section) {
          speakText(section.innerText, 'Apresentação da Apeperia', section, false);
        }
      });
    });

    // Player Institucional com transcrição
    btnInstitutionalAudio.addEventListener('click', () => {
      if (isSpeaking && btnInstitutionalAudio.getAttribute('aria-pressed') === 'true') {
        stopSpeech(true);
        return;
      }
      const transcriptEl = document.getElementById('institutional-transcript-text');
      if (transcriptEl) {
        speakText(
          transcriptEl.textContent,
          'Apresentação Institucional da Apeperia',
          institutionalTranscriptBox,
          true
        );
      }
    });

    // ----------------------------------------------------------------------
    // 6. SELEÇÃO DE PLANO -> PREENCHE FORMULÁRIO E FOCA NO CAMPO NOME
    // ----------------------------------------------------------------------
    const planSelectField = document.getElementById('plano-escolhido');
    const nameInputField = document.getElementById('nome');
    const contactSection = document.getElementById('contato');

    document.querySelectorAll('[data-select-plan]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const selectedPlan = btn.getAttribute('data-select-plan');
        if (planSelectField) {
          planSelectField.value = selectedPlan;
        }

        if (contactSection) {
          contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        setTimeout(() => {
          if (nameInputField) {
            nameInputField.focus();
          }
        }, 300);

        announce(
          selectedPlan +
            ' selecionado no formulário de contratação. O foco foi movido para o campo Nome completo.'
        );
      });
    });

    // ----------------------------------------------------------------------
    // 7. LEITURA EXPANSÍVEL INLINE DOS ARTIGOS DE DESTAQUE
    // ----------------------------------------------------------------------
    document.querySelectorAll('[data-toggle-article]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-toggle-article');
        const contentBox = document.getElementById(targetId);
        if (!contentBox) return;

        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!isExpanded));

        if (isExpanded) {
          contentBox.classList.add('hidden');
          btn.textContent = 'Ler artigo completo';
          announce('Artigo recolhido.');
        } else {
          contentBox.classList.remove('hidden');
          btn.textContent = 'Recolher artigo';
          announce('Artigo completo exibido abaixo.');
        }
      });
    });

    // ----------------------------------------------------------------------
    // 8. VALIDAÇÃO ACESSÍVEL DO FORMULÁRIO DE NEWSLETTER
    // ----------------------------------------------------------------------
    const newsletterForm = document.getElementById('newsletter-form');
    const newsletterEmail = document.getElementById('newsletter-email');
    const newsletterFeedback = document.getElementById('newsletter-feedback');

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    }

    newsletterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const emailVal = newsletterEmail.value.trim();

      newsletterFeedback.classList.remove('hidden', 'status-box-success', 'status-box-error');

      if (!emailVal || !isValidEmail(emailVal)) {
        newsletterEmail.setAttribute('aria-invalid', 'true');
        newsletterFeedback.classList.add('status-box-error');
        newsletterFeedback.innerHTML =
          '<strong>Atenção:</strong> Por favor, digite um endereço de e-mail válido (exemplo: nome@empresa.com.br).';
        newsletterEmail.focus();
        return;
      }

      newsletterEmail.removeAttribute('aria-invalid');
      newsletterFeedback.classList.add('status-box-success');
      newsletterFeedback.innerHTML =
        '<strong>Cadastro confirmado!</strong> O e-mail <strong>' +
        escapeHtml(emailVal) +
        '</strong> foi inscrito para receber novidades da Apeperia.';
      newsletterForm.reset();
    });

    // ----------------------------------------------------------------------
    // 9. VALIDAÇÃO ACESSÍVEL DO FORMULÁRIO DE CONTATO / CONTRATAÇÃO
    // ----------------------------------------------------------------------
    const contactForm = document.getElementById('contact-form');
    const contactFeedback = document.getElementById('contact-form-feedback');

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function setFieldError(inputId, errorId, message) {
      const input = document.getElementById(inputId);
      const errorEl = document.getElementById(errorId);
      if (!input || !errorEl) return;

      if (message) {
        input.setAttribute('aria-invalid', 'true');
        errorEl.textContent = 'Erro: ' + message;
        errorEl.classList.remove('hidden');
      } else {
        input.removeAttribute('aria-invalid');
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
      }
    }

    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const nomeVal = document.getElementById('nome').value.trim();
      const emailVal = document.getElementById('email').value.trim();
      const telVal = document.getElementById('telefone').value.trim();
      const planoVal = document.getElementById('plano-escolhido').value;
      const msgVal = document.getElementById('mensagem').value.trim();

      let firstInvalidField = null;
      const errors = [];

      // Valida Nome
      if (nomeVal.length < 3) {
        setFieldError('nome', 'erro-nome', 'Informe seu nome completo com pelo menos 3 letras.');
        errors.push('Nome completo');
        if (!firstInvalidField) firstInvalidField = document.getElementById('nome');
      } else {
        setFieldError('nome', 'erro-nome', '');
      }

      // Valida E-mail
      if (!isValidEmail(emailVal)) {
        setFieldError('email', 'erro-email', 'Informe um endereço de e-mail válido.');
        errors.push('E-mail para contato');
        if (!firstInvalidField) firstInvalidField = document.getElementById('email');
      } else {
        setFieldError('email', 'erro-email', '');
      }

      // Valida Telefone
      const digitsOnly = telVal.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        setFieldError('telefone', 'erro-telefone', 'Informe um telefone ou WhatsApp com DDD (mínimo 10 dígitos).');
        errors.push('Telefone ou WhatsApp');
        if (!firstInvalidField) firstInvalidField = document.getElementById('telefone');
      } else {
        setFieldError('telefone', 'erro-telefone', '');
      }

      // Valida Mensagem
      if (msgVal.length < 10) {
        setFieldError('mensagem', 'erro-mensagem', 'Descreva brevemente sua ideia ou dúvida (mínimo 10 caracteres).');
        errors.push('Descrição do negócio');
        if (!firstInvalidField) firstInvalidField = document.getElementById('mensagem');
      } else {
        setFieldError('mensagem', 'erro-mensagem', '');
      }

      contactFeedback.classList.remove('hidden', 'status-box-success', 'status-box-error');

      if (errors.length > 0) {
        contactFeedback.classList.add('status-box-error');
        contactFeedback.innerHTML =
          '<strong>Não foi possível enviar o formulário.</strong> Por favor, revise os seguintes campos: ' +
          errors.join(', ') +
          '.';
        if (firstInvalidField) {
          firstInvalidField.focus();
        }
        return;
      }

      // Envio validado com sucesso
      contactFeedback.classList.add('status-box-success');
      contactFeedback.innerHTML =
        '<strong>Solicitação enviada com sucesso, ' +
        escapeHtml(nomeVal) +
        '!</strong> Recebemos seu interesse em <strong>' +
        escapeHtml(planoVal) +
        '</strong>. Nossa equipe entrará em contato pelo e-mail <strong>' +
        escapeHtml(emailVal) +
        '</strong> ou telefone <strong>' +
        escapeHtml(telVal) +
        '</strong> em até 1 dia útil.';

      contactForm.reset();
      contactFeedback.setAttribute('tabindex', '-1');
      contactFeedback.focus();
    });
  })();