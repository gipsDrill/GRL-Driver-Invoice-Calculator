(() => {
  "use strict";

  const LABEL = "Select displayed work week";
  let source = null;
  let floating = null;
  let sourceObserver = null;
  let resizeObserver = null;
  let frameRequested = false;

  const findSource = () => document.querySelector(".week-switch");

  const syncButtons = () => {
    if (!source || !floating) return;

    const originals = [...source.querySelectorAll("button")];
    const proxies = [...floating.querySelectorAll("button")];

    proxies.forEach((proxy, index) => {
      const original = originals[index];
      if (!original) return;

      const isActive = original.classList.contains("active");
      proxy.textContent = original.textContent.trim();
      proxy.disabled = original.disabled;
      proxy.classList.toggle("active", isActive);
      proxy.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const updateVisibility = () => {
    frameRequested = false;

    if (!floating) return;
    if (!source || !source.isConnected) {
      floating.classList.remove("is-visible");
      floating.setAttribute("aria-hidden", "true");
      return;
    }

    const topOffset = window.innerWidth <= 760 ? 7 : 10;
    const sourceRect = source.getBoundingClientRect();

    // Show the fixed selector as soon as the original selector reaches the
    // top edge. It then follows the user for the rest of the document.
    const shouldFloat = sourceRect.top <= topOffset;

    floating.classList.toggle("is-visible", shouldFloat);
    floating.setAttribute("aria-hidden", shouldFloat ? "false" : "true");
  };

  const requestVisibilityUpdate = () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(updateVisibility);
  };

  const createFloating = () => {
    if (floating) return;

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
  };

  const connect = () => {
    createFloating();

    const nextSource = findSource();
    if (!nextSource) {
      requestVisibilityUpdate();
      return false;
    }

    if (nextSource !== source) {
      source = nextSource;
      sourceObserver?.disconnect();
      resizeObserver?.disconnect();

      sourceObserver = new MutationObserver(() => {
        syncButtons();
        requestVisibilityUpdate();
      });
      sourceObserver.observe(source, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "aria-pressed", "disabled"],
        childList: true,
        characterData: true,
      });

      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(requestVisibilityUpdate);
        resizeObserver.observe(source);
      }
    }

    syncButtons();
    requestVisibilityUpdate();
    return true;
  };

  const pageObserver = new MutationObserver(() => connect());
  pageObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
  });

  window.addEventListener("scroll", requestVisibilityUpdate, { passive: true });
  window.addEventListener("resize", requestVisibilityUpdate, { passive: true });
  window.addEventListener("orientationchange", requestVisibilityUpdate, {
    passive: true,
  });
  window.addEventListener("pageshow", () => {
    connect();
    requestVisibilityUpdate();
  });

  connect();
})();
