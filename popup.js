document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const queryInput = document.getElementById("searchInput");
  const resultsDiv = document.getElementById("results");
  const emptyState = document.getElementById("emptyState");
  const errorState = document.getElementById("errorState");
  const retryBtn = document.getElementById("retryBtn");
  const searchText = searchBtn.querySelector(".search-text");
  const spinner = searchBtn.querySelector(".spinner");

  // Load last search
  chrome.storage.local.get(["lastQuery"], (data) => {
    if (data.lastQuery) queryInput.value = data.lastQuery;
  });

  async function runSearch() {
    const query = queryInput.value.trim();
    if (!query) {
      resultsDiv.innerHTML = "<p>Please enter a movie or series name.</p>";
      return;
    }

    // Show loading
    spinner.classList.remove("hidden");
    searchText.classList.add("hidden");

    chrome.storage.local.set({ lastQuery: query });
    emptyState.classList.add("hidden");
    errorState.classList.add("hidden");
    resultsDiv.innerHTML = "";

    chrome.runtime.sendMessage({ action: "searchSubtitles", query }, (response) => {
      spinner.classList.add("hidden");
      searchText.classList.remove("hidden");

      if (!response) {
        resultsDiv.innerHTML = "<p style='color:red'>No response from background.</p>";
        return;
      }
      if (response.error) {
        console.error("Search error:", response.error);
        resultsDiv.innerHTML = "";
        errorState.classList.remove("hidden");
        return;
      }

      const subtitles = response.subtitles || [];
      if (!subtitles.length) {
        resultsDiv.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
      }

      resultsDiv.innerHTML = "";
      subtitles.forEach((sub) => {
        const attrs = sub.attributes || {};
        const file = (attrs.files || [])[0];
        const fileId = file && file.file_id;
        const fd = attrs.feature_details || {};
        const title = fd.title || attrs.release || "Unknown title";
        const year = fd.year ? ` (${fd.year})` : "";
        const subtitleName = attrs.release || (file && file.file_name) || "Unknown subtitle file";
        const lang = attrs.language || "N/A";

        const item = document.createElement("div");
        item.className = "subtitle-card p-4 bg-slate-800/50 border border-slate-700 rounded-xl transition-transform duration-200 relative";

          item.innerHTML = `
          <p class="font-semibold text-white">${title}${year}</p>
          <p class="text-slate-300 text-xs mt-1">${subtitleName}</p>
          <p class="text-slate-400 text-sm">Language: ${lang}</p>
          <button class="downloadBtn">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Download
            </button>
        `;

        const downloadBtn = item.querySelector(".downloadBtn");
        downloadBtn.addEventListener("click", () => {
          if (fileId) {
            chrome.runtime.sendMessage({ action: "downloadSubtitle", fileId });
          } else {
            alert("No subtitle file available to download");
          }
        });

        resultsDiv.appendChild(item);
      });
    });
  }

  // Button click
  searchBtn.addEventListener("click", runSearch);

  // Retry button click
  retryBtn.addEventListener("click", runSearch);

  // Enter key triggers search
  queryInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") runSearch();
  });
});
