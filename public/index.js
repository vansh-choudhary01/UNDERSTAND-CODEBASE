(() => {
  const repositoryInput = document.querySelector("#repository-url");
  const indexButton = document.querySelector("#index-submit");
  const feedback = document.querySelector("#index-feedback");
  const workspaceLinks = document.querySelectorAll("#top-workspace-link, #workspace-link, #footer-workspace-link");

  if (!(repositoryInput instanceof HTMLInputElement) || !(indexButton instanceof HTMLButtonElement)) {
    return;
  }

  const workspaceStorageKey = "repotalk:last-repository";

  const getRepositoryDetails = (value) => {
    let parsedUrl;

    try {
      parsedUrl = new URL(value.trim());
    } catch {
      throw new Error("Enter a valid GitHub repository URL.");
    }

    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname.toLowerCase() !== "github.com") {
      throw new Error("Only HTTPS GitHub repository URLs are supported.");
    }

    const parts = parsedUrl.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) {
      throw new Error("Use a URL in the format https://github.com/owner/repository.");
    }

    const owner = parts[0];
    const repoName = parts[1].replace(/\.git$/, "");
    if (!owner || !repoName) {
      throw new Error("Use a URL in the format https://github.com/owner/repository.");
    }

    return {
      owner,
      repoName,
      canonicalUrl: `https://github.com/${owner}/${repoName}.git`,
      workspacePath: `/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`,
    };
  };

  const setFeedback = (message, state = "") => {
    if (!(feedback instanceof HTMLElement)) return;
    feedback.textContent = message;
    feedback.dataset.state = state;
  };

  const setLoading = (isLoading) => {
    const label = indexButton.querySelector(".button-label");
    indexButton.disabled = isLoading;
    indexButton.classList.toggle("is-loading", isLoading);
    indexButton.setAttribute("aria-busy", String(isLoading));
    if (label) label.textContent = isLoading ? "Indexing repository…" : "Index repository";
  };

  const setWorkspaceLinks = () => {
    const savedRepository = sessionStorage.getItem(workspaceStorageKey);
    if (!savedRepository) return;

    try {
      const { workspacePath } = getRepositoryDetails(savedRepository);
      const workspaceUrl = workspacePath;
      workspaceLinks.forEach((link) => link.setAttribute("href", workspaceUrl));
    } catch {
      sessionStorage.removeItem(workspaceStorageKey);
    }
  };

  const indexRepository = async () => {
    if (indexButton.disabled) return;

    let repository;
    try {
      repository = getRepositoryDetails(repositoryInput.value);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Enter a valid GitHub repository URL.", "error");
      repositoryInput.focus();
      return;
    }

    setLoading(true);
    setFeedback("Checking the repository and preparing its code…", "loading");

    try {
      const response = await fetch("/api/indexRepo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repository.canonicalUrl }),
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "The repository could not be indexed.");
      }

      const responseRepository = typeof payload.data?.repository === "string" ? payload.data.repository : repository.canonicalUrl;
      const workspacePath = typeof payload.data?.workspacePath === "string" ? payload.data.workspacePath : repository.workspacePath;
      sessionStorage.setItem(workspaceStorageKey, responseRepository);
      setFeedback("Repository ready. Opening its workspace…", "success");
      window.location.assign(workspacePath);
    } catch (error) {
      setLoading(false);
      setFeedback(error instanceof Error ? error.message : "Something went wrong while indexing.", "error");
    }
  };

  indexButton.addEventListener("click", indexRepository);
  repositoryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void indexRepository();
    }
  });

  setWorkspaceLinks();
})();
