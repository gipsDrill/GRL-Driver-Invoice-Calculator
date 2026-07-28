(() => {
  "use strict";

  const SECTIONS = [
    { key: "details", label: "Details", selector: ".invoice-details" },
    { key: "hours", label: "Hours", selector: ".tracker-card" },
    { key: "pay", label: "Pay", selector: ".settings-grid" },
    { key: "invoice", label: "Invoice", selector: ".action-bar" },
    { key: "summary", label: "Total", selector: ".totals-grid" },
  ];

  let rail = null;
  let mobileNav = null;
  let progress = null;
  let grandTotal = null;
  let observedTargets = [];
  let activeKey = "details";
  let pointerFrame = null;

  const queryTarget = (item) => document.querySelector(item.selector);

  const scrollToSection = (item) => {
    const target = queryTarget(item);
    if (!target) return;

    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  const makeSectionButton = (item, index, compact = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.section = item.key;
    button.setAttribute("aria-label", `Go to ${item.label}`);
    button.title = compact ? item.label : `0${index + 1} · ${item.label}`;

    if (compact) {
      button.innerHTML = `<span class="nextgen-nav-dot" aria-hidden="true"></span><b>${item.label}</b>`;
    } else {
      button.innerHTML = `<span>0${index + 1}</span><b>${item.label}</b>`;
    }

    button.addEventListener("click", () => scrollToSection(item));
    return button;
  };

  const setActive = (key) => {
    activeKey = key;
    document
      .querySelectorAll("[data-section]")
      .forEach((button) =>
        button.classList.toggle("active", button.dataset.section === key),
      );
  };

  const updateProgress = () => {
    const root = document.documentElement;
    const available = Math.max(1, root.scrollHeight - window.innerHeight);
    const value = Math.min(1, Math.max(0, window.scrollY / available));
    document.documentElement.style.setProperty(
      "--nextgen-scroll",
      `${(value * 100).toFixed(2)}%`,
    );
    progress?.setAttribute("aria-valuenow", String(Math.round(value * 100)));
  };

  const syncTotal = () => {
    const total =
      document.querySelector(".grand-total strong")?.textContent?.trim() ||
      "£0.00";
    if (grandTotal) grandTotal.textContent = total;
  };

  const syncIntro = () => {
    const intro = document.querySelector(".intro");
    const nextText =
      "Add your hours, check your pay and download a ready-to-send PDF or Excel invoice.";
    if (intro && intro.textContent !== nextText) intro.textContent = nextText;
  };

  const refreshObserver = () => {
    observedTargets.forEach(({ observer }) => observer.disconnect());
    observedTargets = [];

    SECTIONS.forEach((item) => {
      const target = queryTarget(item);
      if (!target) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry?.isIntersecting) setActive(item.key);
        },
        {
          rootMargin: "-22% 0px -62% 0px",
          threshold: 0,
        },
      );

      observer.observe(target);
      observedTargets.push({ observer, target });
    });
  };

  const buildRail = () => {
    rail = document.createElement("aside");
    rail.className = "nextgen-rail";
    rail.setAttribute("aria-label", "Invoice workspace navigation");

    const brand = document.createElement("button");
    brand.type = "button";
    brand.className = "nextgen-rail-brand";
    brand.setAttribute("aria-label", "Back to top");
    brand.innerHTML = "<strong>GRL</strong><small>INVOICE<br>WORKSPACE</small>";
    brand.addEventListener("click", () =>
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      }),
    );

    const nav = document.createElement("nav");
    nav.className = "nextgen-rail-nav";
    SECTIONS.forEach((item, index) =>
      nav.appendChild(makeSectionButton(item, index)),
    );

    const live = document.createElement("div");
    live.className = "nextgen-rail-live";
    live.innerHTML =
      '<span><i aria-hidden="true"></i>Live total</span><strong>£0.00</strong>';
    grandTotal = live.querySelector("strong");

    progress = document.createElement("div");
    progress.className = "nextgen-progress";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Page progress");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", "0");

    rail.append(brand, nav, live, progress);
    document.body.appendChild(rail);
  };

  const buildMobileNav = () => {
    mobileNav = document.createElement("nav");
    mobileNav.className = "nextgen-mobile-nav";
    mobileNav.setAttribute("aria-label", "Invoice workspace navigation");
    SECTIONS.forEach((item, index) =>
      mobileNav.appendChild(makeSectionButton(item, index, true)),
    );
    document.body.appendChild(mobileNav);
  };

  const enablePointerLight = () => {
    window.addEventListener(
      "pointermove",
      (event) => {
        if (pointerFrame || window.innerWidth < 900) return;
        pointerFrame = window.requestAnimationFrame(() => {
          pointerFrame = null;
          document.documentElement.style.setProperty(
            "--nextgen-x",
            `${event.clientX}px`,
          );
          document.documentElement.style.setProperty(
            "--nextgen-y",
            `${event.clientY}px`,
          );
        });
      },
      { passive: true },
    );
  };

  const start = () => {
    if (document.documentElement.dataset.nextgenReady === "true") return;
    if (!document.querySelector(".invoice-details")) {
      window.setTimeout(start, 80);
      return;
    }

    document.documentElement.dataset.nextgenReady = "true";
    buildRail();
    buildMobileNav();
    refreshObserver();
    syncTotal();
    syncIntro();
    updateProgress();
    setActive(activeKey);
    enablePointerLight();

    const pageObserver = new MutationObserver(() => {
      syncTotal();
      syncIntro();
      if (
        observedTargets.some(({ target }) => !target.isConnected) ||
        observedTargets.length !== SECTIONS.length
      ) {
        refreshObserver();
      }
    });

    pageObserver.observe(document.getElementById("root"), {
      subtree: true,
      childList: true,
      characterData: true,
    });

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
  };

  start();
})();
