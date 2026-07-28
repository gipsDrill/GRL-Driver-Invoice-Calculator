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
  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const documentTop = (element) => {
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    return rect.top + window.scrollY;
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getScrollThresholds = () => {
    const viewport = Math.max(320, window.innerHeight);
    const root = document.documentElement;
    const maxScroll = Math.max(0, root.scrollHeight - viewport);

    const hours = queryTarget(SECTIONS[1]);
    const pay = queryTarget(SECTIONS[2]);
    const totals = queryTarget(SECTIONS[4]);

    const hoursTop = documentTop(hours);
    const payTop = documentTop(pay);
    const payBottom = payTop + (pay?.getBoundingClientRect().height || 0);
    const totalsTop = documentTop(totals);

    const entryLine = clamp(viewport * 0.35, 120, 340);
    const payExitLine = clamp(viewport * 0.55, 190, 520);
    const totalsLine = clamp(viewport * 0.6, 220, 560);

    const minHoursSpan = viewport <= 760 ? 220 : 140;
    const minPaySpan = viewport <= 760 ? 180 : 100;
    const minInvoiceSpan = viewport <= 760 ? 130 : 70;

    const rawHours = Math.max(0, hoursTop - entryLine);
    const rawPay = Math.max(0, payTop - entryLine);
    const rawInvoice = Math.max(0, payBottom - payExitLine);
    const rawTotal = Math.max(0, totalsTop - totalsLine);

    const totalStart = clamp(rawTotal, 0, Math.max(0, maxScroll - 2));
    const invoiceStart = clamp(
      Math.min(rawInvoice, totalStart - minInvoiceSpan),
      0,
      totalStart,
    );
    const payStart = clamp(
      Math.min(rawPay, invoiceStart - minPaySpan),
      0,
      invoiceStart,
    );
    const hoursStart = clamp(
      Math.min(rawHours, payStart - minHoursSpan),
      0,
      payStart,
    );

    return {
      maxScroll,
      hoursStart,
      payStart,
      invoiceStart,
      totalStart,
    };
  };

  const scrollToPosition = (top) => {
    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const scrollToSection = (item) => {
    const thresholds = getScrollThresholds();

    if (item.key === "details") {
      scrollToPosition(0);
      return;
    }

    if (item.key === "hours") {
      scrollToPosition(thresholds.hoursStart + 8);
      return;
    }

    if (item.key === "pay") {
      scrollToPosition(thresholds.payStart + 8);
      return;
    }

    if (item.key === "invoice") {
      scrollToPosition(thresholds.invoiceStart + 8);
      return;
    }

    if (item.key === "summary") {
      const totals = queryTarget(item);
      const preferredTop = totals
        ? documentTop(totals) - Math.min(120, window.innerHeight * 0.16)
        : thresholds.totalStart + 8;
      scrollToPosition(Math.min(thresholds.maxScroll, preferredTop));
    }
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
    if (activeKey === key && document.querySelector(`[data-section="${key}"].active`)) {
      return;
    }

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

  const syncActiveFromScroll = () => {
    if (scrollFrame) return;

    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = null;
      const thresholds = getScrollThresholds();
      const y = Math.min(thresholds.maxScroll, Math.max(0, window.scrollY));

      if (y >= thresholds.totalStart) setActive("summary");
      else if (y >= thresholds.invoiceStart) setActive("invoice");
      else if (y >= thresholds.payStart) setActive("pay");
      else if (y >= thresholds.hoursStart) setActive("hours");
      else setActive("details");
    });
  };

  const syncTotal = () => {
    const total =
      document.querySelector(".grand-total strong")?.textContent?.trim() ||
      "£0.00";
    if (grandTotal && grandTotal.textContent !== total) grandTotal.textContent = total;
  };

  const syncIntro = () => {
    const intro = document.querySelector(".intro");
    const nextText =
      "Add your hours, check your pay and download a ready-to-send PDF or Excel invoice.";
    if (intro && intro.textContent !== nextText) intro.textContent = nextText;
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

  const handleViewportChange = () => {
    updateProgress();
    syncActiveFromScroll();
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

    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange, { passive: true });
    window.addEventListener("orientationchange", handleViewportChange, {
      passive: true,
    });
    window.addEventListener("pageshow", handleViewportChange, { passive: true });
  };

  start();
})();
