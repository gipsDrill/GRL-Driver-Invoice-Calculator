(function () {
  "use strict";

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (isStandalone) return;

  let installPrompt = null;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "quick-install-button";
  button.setAttribute("aria-label", "Install calculator on this phone");
  button.innerHTML =
    '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 16v4h14v-4"/></svg><span>Install app</span>';

  const guide = document.createElement("div");
  guide.className = "quick-install-guide";
  guide.hidden = true;
  guide.setAttribute("role", "dialog");
  guide.setAttribute("aria-modal", "true");
  guide.setAttribute("aria-label", "Install instructions");
  guide.innerHTML = isIos
    ? '<strong>Add to your Home Screen</strong><p>Tap <b>Share</b> in Safari, then choose <b>Add to Home Screen</b>.</p><button type="button">Got it</button>'
    : '<strong>Install the calculator</strong><p>Open your browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p><button type="button">Got it</button>';

  document.body.append(button, guide);

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    installPrompt = event;
    button.classList.add("is-ready");
  });

  window.addEventListener("appinstalled", function () {
    button.remove();
    guide.remove();
  });

  function closeGuide() {
    guide.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }

  guide.querySelector("button").addEventListener("click", closeGuide);
  guide.addEventListener("click", function (event) {
    if (event.target === guide) closeGuide();
  });

  button.addEventListener("click", async function () {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }

    guide.hidden = false;
    button.setAttribute("aria-expanded", "true");
    guide.querySelector("button").focus();
  });
})();
