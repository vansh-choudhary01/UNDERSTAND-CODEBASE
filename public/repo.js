(() => {
  const questionForm = document.querySelector("#question-form");
  const questionInput = document.querySelector("#question-input");
  const sendButton = document.querySelector("#send-button");
  const messages = document.querySelector(".messages");
  const askFeedback = document.querySelector("#ask-feedback");
  const repositoryLink = document.querySelector("#repository-link");
  const workspaceLink = document.querySelector("#repo-workspace-link");
  const promptButtons = document.querySelectorAll("[data-question]");
  const workspaceStorageKey = "repotalk:last-repository";

  if (!(questionForm instanceof HTMLFormElement) || !(questionInput instanceof HTMLInputElement) || !(sendButton instanceof HTMLButtonElement) || !(messages instanceof HTMLElement)) {
    return;
  }

  const pathParts = window.location.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  const pathRepoName = pathParts.at(-1) || "repository";
  const pathOwner = pathParts.length > 1 ? pathParts.at(-2) : undefined;
  const pathRepository = pathOwner ? `https://github.com/${pathOwner}/${pathRepoName}.git` : null;
  const queryRepository = new URLSearchParams(window.location.search).get("repo");
  const repository = queryRepository || pathRepository || sessionStorage.getItem(workspaceStorageKey);
  let isLoading = false;

  document.title = `${pathRepoName} · RepoTalk`;
  document.querySelectorAll(".repo-title h1, .breadcrumb strong, .repo-footer-name").forEach((element) => {
    element.textContent = pathRepoName;
  });

  if (repositoryLink instanceof HTMLAnchorElement && pathOwner) {
    repositoryLink.href = `https://github.com/${pathOwner}/${pathRepoName}`;
    repositoryLink.textContent = `github.com/${pathOwner}/${pathRepoName}`;
  }

  if (workspaceLink instanceof HTMLAnchorElement && pathOwner) {
    workspaceLink.href = `/${encodeURIComponent(pathOwner)}/${encodeURIComponent(pathRepoName)}`;
  }

  if (repository) {
    sessionStorage.setItem(workspaceStorageKey, repository);
  } else {
    questionInput.disabled = true;
    sendButton.disabled = true;
    promptButtons.forEach((button) => {
      if (button instanceof HTMLButtonElement) button.disabled = true;
    });
    if (askFeedback instanceof HTMLElement) {
      askFeedback.textContent = "Index a repository from the home page before asking a question.";
      askFeedback.dataset.state = "error";
    }
  }

  const setLoading = (loading) => {
    isLoading = loading;
    questionInput.disabled = loading || !repository;
    sendButton.disabled = loading || !repository;
    sendButton.classList.toggle("is-loading", loading);
    sendButton.setAttribute("aria-busy", String(loading));
    promptButtons.forEach((button) => {
      if (button instanceof HTMLButtonElement) button.disabled = loading || !repository;
    });
    if (askFeedback instanceof HTMLElement && loading) {
      askFeedback.textContent = "Searching the indexed code and drafting an answer…";
      askFeedback.dataset.state = "loading";
    }
  };

  const createAvatar = (role) => {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = role === "user" ? "↗" : "✦";
    return avatar;
  };

  const addMessage = (role, text, state = "") => {
    const message = document.createElement("article");
    message.className = `message ${role} ${state}`.trim();

    const body = document.createElement("div");
    body.className = "message-body";

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = role === "user" ? "You" : "RepoTalk";

    const copy = document.createElement("p");
    copy.className = "message-copy";
    copy.textContent = text;

    body.append(label, copy);
    message.append(createAvatar(role), body);
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;

    return { message, body, copy };
  };

  const normaliseAnswer = (rawResponse) => {
    if (typeof rawResponse === "string") {
      try {
        const parsedResponse = JSON.parse(rawResponse);
        if (parsedResponse && typeof parsedResponse === "object") {
          return normaliseAnswer(parsedResponse);
        }
      } catch {
        return {
          answer: rawResponse,
          confidence: null,
          relevantChunks: [],
        };
      }

      return {
        answer: rawResponse,
        confidence: null,
        relevantChunks: [],
      };
    }

    if (!rawResponse || typeof rawResponse !== "object") {
      return {
        answer: "No answer was returned.",
        confidence: null,
        relevantChunks: [],
      };
    }

    return {
      answer: typeof rawResponse.answer === "string" && rawResponse.answer.trim() ? rawResponse.answer : "No answer was returned.",
      confidence: rawResponse.confidence,
      relevantChunks: Array.isArray(rawResponse.relevant_chunks) ? rawResponse.relevant_chunks : [],
    };
  };

  const getConfidencePercent = (confidence) => {
    if (typeof confidence !== "number" || !Number.isFinite(confidence)) return null;
    const percentage = confidence <= 1 ? confidence * 100 : confidence;
    return Math.round(Math.max(0, Math.min(100, percentage)));
  };

  const getChunkSnippet = (chunk) => {
    return typeof chunk.code === "string" ? chunk.code.trim() : "";
  };

  const createResponseDetails = ({ confidence, relevantChunks }) => {
    const details = document.createElement("div");
    details.className = "response-details";

    const confidencePercent = getConfidencePercent(confidence);
    if (confidencePercent !== null) {
      const confidenceRow = document.createElement("div");
      const confidenceTone = confidencePercent >= 80 ? "high" : confidencePercent >= 50 ? "medium" : "low";
      confidenceRow.className = `confidence-row confidence-${confidenceTone}`;

      const confidenceBadge = document.createElement("span");
      confidenceBadge.className = "confidence-badge";
      confidenceBadge.textContent = `${confidencePercent}% confidence`;

      const confidenceMeter = document.createElement("span");
      confidenceMeter.className = "confidence-meter";
      confidenceMeter.setAttribute("role", "progressbar");
      confidenceMeter.setAttribute("aria-label", `Answer confidence ${confidencePercent}%`);
      confidenceMeter.setAttribute("aria-valuemin", "0");
      confidenceMeter.setAttribute("aria-valuemax", "100");
      confidenceMeter.setAttribute("aria-valuenow", String(confidencePercent));

      const confidenceFill = document.createElement("span");
      confidenceFill.style.width = `${confidencePercent}%`;
      confidenceMeter.append(confidenceFill);
      confidenceRow.append(confidenceBadge, confidenceMeter);
      details.append(confidenceRow);
    }

    if (relevantChunks.length > 0) {
      const sourceDetails = document.createElement("details");
      sourceDetails.className = "source-details";
      sourceDetails.open = true;

      const sourceSummary = document.createElement("summary");
      sourceSummary.className = "source-summary";

      const sourceTitle = document.createElement("span");
      sourceTitle.textContent = "Relevant context";
      const sourceCount = document.createElement("span");
      sourceCount.className = "source-count";
      sourceCount.textContent = `${relevantChunks.length} ${relevantChunks.length === 1 ? "source" : "sources"}`;
      sourceSummary.append(sourceTitle, sourceCount);

      const sourceList = document.createElement("div");
      sourceList.className = "source-list";

      relevantChunks.forEach((chunk) => {
        if (!chunk || typeof chunk !== "object") return;

        const sourceItem = document.createElement("div");
        sourceItem.className = "source-item";

        const sourceHead = document.createElement("div");
        sourceHead.className = "source-item-head";

        const filePath = document.createElement("code");
        filePath.className = "source-file";
        filePath.textContent = typeof chunk.file_path === "string" && chunk.file_path ? chunk.file_path : "Unknown file";

        const lines = document.createElement("span");
        lines.className = "source-lines";
        lines.textContent = typeof chunk.lines === "string" || typeof chunk.lines === "number" ? `Lines ${chunk.lines}` : "Lines unavailable";
        sourceHead.append(filePath, lines);

        const symbol = document.createElement("span");
        symbol.className = "source-symbol";
        symbol.textContent = typeof chunk.symbol_name === "string" && chunk.symbol_name ? chunk.symbol_name : "Repository context";

        sourceItem.append(sourceHead, symbol);

        const snippet = getChunkSnippet(chunk);
        if (snippet) {
          const snippetPreview = document.createElement("pre");
          snippetPreview.className = "source-snippet";
          const snippetCode = document.createElement("code");
          snippetCode.textContent = snippet;
          snippetPreview.append(snippetCode);
          sourceItem.append(snippetPreview);
        }

        sourceList.append(sourceItem);
      });

      sourceDetails.append(sourceSummary, sourceList);
      details.append(sourceDetails);
    }

    return details.childElementCount > 0 ? details : null;
  };

  const readPayload = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const askQuestion = async (question) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading || !repository) return;

    addMessage("user", trimmedQuestion);
    questionInput.value = "";
    const pendingMessage = addMessage("assistant", "Working through the indexed repository…", "pending");
    setLoading(true);

    try {
      const params = new URLSearchParams({ question: trimmedQuestion, repo: repository });
      const response = await fetch(`/api/ask?${params.toString()}`);
      const payload = await readPayload(response);

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "The question could not be answered.");
      }

      const structuredResponse = normaliseAnswer(payload.data);
      pendingMessage.copy.textContent = structuredResponse.answer;
      const responseDetails = createResponseDetails(structuredResponse);
      if (responseDetails) pendingMessage.body.append(responseDetails);
      pendingMessage.message.classList.remove("pending");
      if (askFeedback instanceof HTMLElement) {
        const confidencePercent = getConfidencePercent(structuredResponse.confidence);
        const sourceCount = structuredResponse.relevantChunks.length;
        const confidenceText = confidencePercent === null ? "" : ` · ${confidencePercent}% confidence`;
        const sourceText = sourceCount === 0 ? "" : ` · ${sourceCount} relevant ${sourceCount === 1 ? "source" : "sources"}`;
        askFeedback.textContent = `Answer generated from the indexed repository context${confidenceText}${sourceText}.`;
        askFeedback.dataset.state = "success";
      }
    } catch (error) {
      pendingMessage.copy.textContent = error instanceof Error ? error.message : "Something went wrong while answering.";
      pendingMessage.message.classList.remove("pending");
      pendingMessage.message.classList.add("message-error");
      if (askFeedback instanceof HTMLElement) {
        askFeedback.textContent = "The answer failed. You can try the question again.";
        askFeedback.dataset.state = "error";
      }
    } finally {
      setLoading(false);
      questionInput.focus();
    }
  };

  questionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void askQuestion(questionInput.value);
  });

  promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const question = button.getAttribute("data-question") || "";
      void askQuestion(question);
    });
  });
})();
