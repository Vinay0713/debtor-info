// Blocks a page's main content until a prerequisite step has been submitted.
// Usage: Gate.enforce("personalSubmitted", "#pageContent", "Please submit Personal Info first.", "index.html")
window.Gate = {
  async enforce(requiredFlag, contentSelector, message, backHref) {
    let status = { personalSubmitted: false, employmentSubmitted: false };
    try {
      const res = await fetch("/api/status");
      status = await res.json();
    } catch (err) {
      // Treat an unreachable API the same as "not submitted yet".
    }

    if (status[requiredFlag]) return true;

    document.querySelectorAll(contentSelector).forEach((el) => {
      el.style.display = "none";
    });

    const notice = document.createElement("div");
    notice.className = "gate-notice";
    notice.innerHTML = `<h2>Not available yet</h2><p>${message}</p><a href="${backHref}">Go there now</a>`;
    document.body.appendChild(notice);
    return false;
  },
};
