document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const queryInput = document.getElementById("searchInput");
  const resultsDiv = document.getElementById("results");
  const emptyState = document.getElementById("emptyState");
  const errorState = document.getElementById("errorState");
  const retryBtn = document.getElementById("retryBtn");

  // Load last search
  chrome.storage.local.get(["lastQuery"], (data) => {
    if (data.lastQuery) queryInput.value = data.lastQuery;
  });

  function runSearch() {
    const query = queryInput.value.trim();
    if (!query) {
      resultsDiv.innerHTML = "<p>Please enter a movie or series name.</p>";
      return;
    }

    chrome.storage.local.set({ lastQuery: query });
    emptyState.classList.add("hidden");
    errorState.classList.add("hidden");
    resultsDiv.innerHTML = "<p>Searching subtitles...</p>";

    chrome.runtime.sendMessage({ action: "searchSubtitles", query }, (response) => {
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

        // Movie title (original)
        const title = fd.title || attrs.release || "Unknown title";
        const year = fd.year ? ` (${fd.year})` : "";

        // NEW: Subtitle filename / release version
        const subtitleName =
          attrs.release ||
          (file && file.file_name) ||
          "Unknown subtitle file";

        const lang = attrs.language || "N/A";

        const item = document.createElement("div");
        item.className = "p-4 bg-slate-800/50 border border-slate-700 rounded-xl";
        item.innerHTML = `
          <p class="font-semibold text-white">${title}${year}</p>

          <!-- Added subtitle file name -->
          <p class="text-slate-300 text-xs mt-1">${subtitleName}</p>

          <p class="text-slate-400 text-sm">Language: ${lang}</p>

          <button class="downloadBtn bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded mt-2 text-sm">
            Download
          </button>
        `;

        item.querySelector(".downloadBtn").addEventListener("click", () => {
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

  searchBtn.addEventListener("click", runSearch);
  retryBtn.addEventListener("click", runSearch);
});
