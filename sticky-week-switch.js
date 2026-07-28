(() => {
  "use strict";

  const LABEL = "Select displayed work week";
  let source = null;
  let floating = null;
  let sourceObserver = null;
  let frameRequested = false;

  const findSource = () => document.querySelector(".week-switch");

  const syncButtons = () => {
    if (!source || !floating) return;

    const originals = [...source.querySelectorAll("button")];
    const proxies = [...floating.querySelectorAll("button")];

    proxies.forEach((proxy, index) => {
      const original = originals[index];
      if (!original) return;

      proxy.textContent = original.textContent.trim();
      proxy.classList.toggle("active", original.classList.contains("active"));
      proxy.setAttribute(
        "aria-pressed",
        original.classList.contains("active") ? "true" : "false",
      );
    });
  };

  const updateVisibility = () => {
    frameRequested = false;
    if (!source || !floating || !source.isConnected) return;

    const topOffset = window.innerWidth <= 760 ? 8 : 10;
    const sourceRect = source.getBoundingClientRect();
    const shouldFloat = sourceRect.bottom <= topOffset;

    floating.classList.toggle("is-visible", shouldFloat);
    floating.setAttribute("aria-hidden", shouldFloat ? "false" : "true");
  };

  const requestVisibilityUpdate = () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(updateVisibility);
  };

  const connect = () => {
    const nextSource = findSource();
    if (!nextSource || nextSource === source) return Boolean(source);

    source = nextSource;
    sourceObserver?.disconnect();

    if (!floating) {
      floating = document.createElement("nav");
      floating.className = "floating-week-nav";
      floating.setAttribute("aria-label", LABEL);
      floating.setAttribute("aria-hidden", "true");

      const inner = document.createElement("div");
      inner.className = "floating-week-nav-inner";

      for (let index = 0; index < 3; index += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.addEventListener("click", () => {
          const currentSource = findSource();
          const original = currentSource?.querySelectorAll("button")[index];
          original?.click();
          window.requestAnimationFrame(() => {
            source = findSource();
            syncButtons();
            requestVisibilityUpdate();
          });
        });
        inner.appendChild(button);
      }

      floating.appendChild(inner);
      document.body.appendChild(floating);
    }

    sourceObserver = new MutationObserver(syncButtons);
    sourceObserver.observe(source, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-pressed"],
      childList: true,
      characterData: true,
    });

    syncButtons();
    requestVisibilityUpdate();
    return true;
  };

  const pageObserver = new MutationObserver(() => {
    connect();
    requestVisibilityUpdate();
  });

  pageObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
  });

  window.addEventListener("scroll", requestVisibilityUpdate, { passive: true });
  window.addEventListener("resize", requestVisibilityUpdate, { passive: true });
  window.addEventListener("orientationchange", requestVisibilityUpdate, {
    passive: true,
  });

  connect();
})();
