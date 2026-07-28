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
  let activeKey = "details";
  let pointerFrame = null;
  let scrollFrame = null;

  const queryTarget = (item) => document.querySelector(item.selector);

  const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const documentTop = (element) => {
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    return rect.top + window.scrollY;
  };

  const scrollToPosition = (top) => {
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  };

  const scrollToSection = (item) => {
    const target = queryTarget(item);
    if (!target) return;

    const viewport = Math.max(320, window.innerHeight);
    const normalOffset = Math.min(180, Math.max(96, viewport * 0.18));

    if (item.key === "invoice") {
      const totalTarget = queryTarget(SECTIONS[4]);
      if (totalTarget) {
        // Position the Total cards low enough in the viewport to expose the
        // complete sticky invoice toolbar and give Invoice a clear range.
        scrollToPosition(documentTop(totalTarget) - viewport * 0.7);
        return;
      }
    }

    if (item.key === "summary") {
      const totalTarget = queryTarget(SECTIONS[4]);
      if (totalTarget) {
        scrollToPosition(documentTop(totalTarget) - viewport * 0.18);
        return;
      }
    }

    scrollToPosition(documentTop(target) - normalOffset);
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

    button.addEventListener("click", () => {
      setActive(item.key);
      scrollToSection(item);
    });
    return button;
  };

  const setActive = (key) => {
    if (!SECTIONS.some((item) => item.key === key)) return;
    activeKey = key;

    document.querySelectorAll("[data-section]").forEach((button) => {
      const isActive = button.dataset.section === key;
      button.classList.toggle("active", isActive);
      if (isActive) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  };

  const updateProgress = () => {
    const root = document.documentElement;
    const available = Math.max(1, root.scrollHeight - window.innerHeight);
    const value = Math.min(1, Math.max(0, window.scrollY / available));
    root.style.setProperty("--nextgen-scroll", `${(value * 100).toFixed(2)}%`);
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

  const syncActiveFromScroll = () => {
    if (scrollFrame) return;

    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = null;

      const viewport = Math.max(320, window.innerHeight);
      const root = document.documentElement;
      const maxScroll = Math.max(0, root.scrollHeight - viewport);

      const totalTarget = queryTarget(SECTIONS[4]);
      const payTarget = queryTarget(SECTIONS[2]);
      const hoursTarget = queryTarget(SECTIONS[1]);
      const totalRect = totalTarget?.getBoundingClientRect();
      const payRect = payTarget?.getBoundingClientRect();

      // Total wins only near the totals cards or at the absolute page end.
      if (
        totalRect &&
        (window.scrollY >= maxScroll - 10 || totalRect.top <= viewport * 0.22)
      ) {
        setActive("summary");
        return;
      }

      // Keep Pay active while its card still occupies the reading area. The
      // bottom bound is what prevents the nearby Invoice step from skipping it.
      if (
        payRect &&
        payRect.top <= viewport * 0.38 &&
        payRect.bottom > viewport * 0.2
      ) {
        setActive("pay");
        return;
      }

      // Invoice begins once Pay has moved above the reading line and remains
      // active until the totals themselves become the focus.
      if (
        totalRect &&
        totalRect.top <= viewport * 0.72 &&
        (!payRect || payRect.bottom <= viewport * 0.2)
      ) {
        setActive("invoice");
        return;
      }

      if (
        hoursTarget &&
        hoursTarget.getBoundingClientRect().top <= viewport * 0.34
      ) {
        setActive("hours");
        return;
      }

      setActive("details");
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
    brand.addEventListener("click", () => scrollToPosition(0));

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
    syncTotal();
    syncIntro();
    updateProgress();
    setActive(activeKey);
    syncActiveFromScroll();
    enablePointerLight();

    const pageObserver = new MutationObserver(() => {
      syncTotal();
      syncIntro();
      syncActiveFromScroll();
    });

    pageObserver.observe(document.getElementById("root"), {
      subtree: true,
      childList: true,
      characterData: true,
    });

    const handleViewportChange = () => {
      updateProgress();
      syncActiveFromScroll();
    };

    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange, { passive: true });
    window.addEventListener("orientationchange", handleViewportChange, {
      passive: true,
    });
  };

  start();
})();
