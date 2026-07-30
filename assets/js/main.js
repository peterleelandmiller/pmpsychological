const SELECTORS = {
  preloader: "[data-preloader]",
  menuToggle: "[data-menu-toggle]",
  navLink: ".site-nav a",
  loadingButton: "[data-loading-button]",
  reveal: ".reveal",
  faq: "[data-faq]",
  resourceGrid: "[data-resource-grid]",
  search: "[data-resource-search]",
  tags: "[data-resource-tags]",
  articleRefreshOpen: "[data-article-refresh-open]",
  articleRefreshClose: "[data-article-refresh-close]",
  articleRefreshModal: "[data-article-refresh-modal]",
  articleRefreshForm: "[data-article-refresh-form]",
  articleRefreshPassword: "[data-article-refresh-password]",
  articleRefreshButton: "[data-article-refresh-button]",
  articleRefreshStatus: "[data-article-refresh-status]",
  cmsArticle: "[data-cms-article]",
  bookingWidget: "[data-booking-widget]"
};

const WORDPRESS_POSTS_URL = "/api/wordpress-posts";
const ARTICLE_REFRESH_URL = "/api/refresh-articles";
const JANE_OPENINGS_URL = "/api/jane-openings";

const fallbackArticles = [
];

const therapyTermDefinitions = {
  CBT: "Cognitive-behavioural therapy stresses the role of thinking in how we feel and what we do. It is based on the belief that thoughts, rather than people or events, cause our negative feelings. The therapist assists the client in identifying, testing the reality of, and correcting dysfunctional beliefs underlying his or her thinking. The therapist then helps the client modify those thoughts and the behaviours that flow from them. CBT is a structured collaboration between therapist and client and often calls for homework assignments. CBT has been clinically proven to help clients in a relatively short amount of time with a wide range of disorders, including depression and anxiety.",
  DBT: "Dialectical Behavior Therapy (DBT) is the treatment most closely associated with Borderline Personality Disorder (BPD). Therapists practice DBT in both individual and group sessions. The therapy combines elements of CBT to help with regulating emotion through distress tolerance and mindfulness. The goal of Dialectical Behavior Therapy is to alleviate the intense emotional pain associated with BPD.",
  EMDR: "EMDR (Eye Movement Desensitization and Reprocessing)is an information processing therapy that helps clients cope with trauma, addictions, and phobias. During this treatment, the patient focuses on a specific thought, image, emotion, or sensation while simultaneously watching the therapist's finger or baton move in front of his or her eyes. The client is told to recognize what comes up for him/her when thinking of an image; then the client is told to let it go while doing bilateral stimulation. It's like being on a train; an emotion or a thought may come up and the client lets it pass as though they were looking out the window of the moving train."
};

const minimumDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function initPreloader() {
  const preloader = document.querySelector(SELECTORS.preloader);
  if (!preloader) return;

  const started = performance.now();
  window.addEventListener("load", async () => {
    const elapsed = performance.now() - started;
    await minimumDelay(Math.max(0, 2000 - elapsed));
    preloader.classList.add("is-hidden");
    preloader.setAttribute("aria-hidden", "true");
  });
}

function initNavigation() {
  const toggle = document.querySelector(SELECTORS.menuToggle);
  const header = document.querySelector(".site-header");
  const links = document.querySelectorAll(SELECTORS.navLink);
  const path = `${window.location.pathname.replace(/\/$/, "") || "/"}`;

  const updateHeaderHeight = () => {
    if (!header) return;
    document.documentElement.style.setProperty("--header-height", `${Math.ceil(header.getBoundingClientRect().height)}px`);
  };
  updateHeaderHeight();
  window.addEventListener("resize", updateHeaderHeight);
  window.addEventListener("scroll", updateHeaderHeight, { passive: true });

  links.forEach((link) => {
    const href = link.getAttribute("href");
    const normalized = href === "/" ? "/" : href.replace(/\/$/, "");
    if (normalized === path || (normalized !== "/" && path.startsWith(normalized))) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
    link.addEventListener("click", () => document.body.classList.remove("nav-open"));
  });

  if (toggle) {
    toggle.addEventListener("click", () => {
      updateHeaderHeight();
      const isOpen = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }
}

function initBranding() {
  document.querySelectorAll(".brand-icon").forEach((mark) => {
    mark.setAttribute("aria-hidden", "true");
  });

  const paymentIcons = `
    <div class="footer-payment-icons" aria-label="Accepted payment methods">
      <span aria-label="Cash"><svg viewBox="0 0 512 512" aria-hidden="true" focusable="false"><path d="M64 32C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h384c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64H80c-8.8 0-16-7.2-16-16s7.2-16 16-16h368c17.7 0 32-14.3 32-32s-14.3-32-32-32H64zm352 256a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg></span>
      <span aria-label="Mastercard"><svg viewBox="0 0 576 512" aria-hidden="true" focusable="false"><path d="M576 81v350c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V81c0-26.5 21.5-48 48-48h480c26.5 0 48 21.5 48 48zM259.5 256c0-50.8-41.2-92-92-92s-92 41.2-92 92 41.2 92 92 92 92-41.2 92-92zm241 0c0-50.8-41.2-92-92-92s-92 41.2-92 92 41.2 92 92 92 92-41.2 92-92zm-120.5 0c0-29.6-13.9-56-35.5-72.9-21.6 16.9-35.5 43.3-35.5 72.9s13.9 56 35.5 72.9c21.6-16.9 35.5-43.3 35.5-72.9z"/></svg></span>
      <span aria-label="Visa"><svg viewBox="0 0 576 512" aria-hidden="true" focusable="false"><path d="M470.1 231.3s7.6 37.2 9.3 45H446c3.3-8.9 16-43.5 16-43.5-.2.3 3.3-9.1 5.3-14.9l2.8 13.4zM576 80v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h480c26.5 0 48 21.5 48 48zM152.5 331.2 215.7 176h-42.5l-39.3 106-4.3-21.5-14-71.4c-2.3-9.9-9.4-12.8-18.2-13.1H32.7l-.7 3.1c15.8 4 30 9.8 42.2 17.1l35.8 135h42.5zm94.4.2L272.1 176h-40.3l-25.1 155.4h40.2zm139.9-50.8c.2-17.7-10.6-31.2-33.7-42.3-14.1-7.1-22.7-11.9-22.7-19.2.2-6.6 7.3-13.4 23.1-13.4 13.1-.3 22.7 2.8 30.1 5.9l3.6 1.7 5.5-33.6c-8-3.1-20.5-6.6-36-6.6-39.7 0-67.6 21.2-67.8 51.4-.3 22.3 19.9 34.7 35.2 42.2 15.6 7.6 20.8 12.6 20.8 19.5-.2 10.6-12.6 15.4-24.3 15.4-16.2 0-24.8-2.5-38.2-8.3l-5.3-2.5-5.6 34.9c9.4 4.3 26.8 8.1 44.8 8.3 42.2.1 69.7-20.8 70.5-53.4zm140.4 50.8L494.6 176h-31.1c-9.6 0-16.9 2.8-21.1 12.8l-59.7 142.6h42.2l8.3-22.9h51.6c1.2 5.4 4.8 22.9 4.8 22.9h37.6z"/></svg></span>
    </div>
  `;

  document.querySelectorAll(".site-footer").forEach((footer) => {
    if (footer.querySelector(".footer-logo")) return;
    const firstColumn = footer.querySelector(".footer-grid > div:first-child") || footer.querySelector(".copyright");
    if (!firstColumn) return;
    const logo = document.createElement("a");
    logo.className = "footer-logo";
    logo.href = "/";
    logo.setAttribute("aria-label", "Peter Miller Psychological Services home");
    logo.innerHTML = `<span><span class="footer-logo-text">Peter<br>Miller<br>Psychological<br>Services</span><span class="footer-logo-tagline">Empowering Minds, Transforming Lives.</span></span>`;
    firstColumn.prepend(logo);
  });

  document.querySelectorAll(".site-footer").forEach((footer) => {
    footer.querySelectorAll(".footer-payment-icons").forEach((icons) => icons.remove());
    const contactColumn = Array.from(footer.querySelectorAll(".footer-grid > div")).find((column) => column.querySelector("h3")?.textContent.trim() === "Contact");
    if (contactColumn) contactColumn.insertAdjacentHTML("beforeend", paymentIcons);
  });
}

function wrapLoadingContent(button) {
  if (button.querySelector(".btn-label")) return;
  const spinner = button.querySelector(".btn-spinner") || document.createElement("span");
  spinner.className = "btn-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "btn-label";
  Array.from(button.childNodes).forEach((node) => {
    if (node !== spinner) label.append(node);
  });
  button.prepend(label);
  if (!button.contains(spinner)) button.append(spinner);
}

function initLoadingButtons() {
  document.querySelectorAll(SELECTORS.loadingButton).forEach((button) => {
    wrapLoadingContent(button);
    if (button.dataset.loadingBound === "true") return;
    button.dataset.loadingBound = "true";

    button.addEventListener("click", (event) => {
      if (button.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        return;
      }

      const href = button.getAttribute("href");
      const width = button.getBoundingClientRect().width;
      button.style.width = `${width}px`;
      button.classList.add("is-loading");
      button.setAttribute("aria-busy", "true");
      if (button.tagName === "BUTTON") button.disabled = true;

      if (href && !href.startsWith("#")) {
        event.preventDefault();
        setTimeout(() => {
          if (button.target === "_blank") {
            window.open(href, "_blank", "noopener");
            button.classList.remove("is-loading");
            button.removeAttribute("aria-busy");
            button.style.width = "";
          } else {
            window.location.href = href;
          }
        }, 1000);
      } else {
        setTimeout(() => {
          button.classList.remove("is-loading");
          button.removeAttribute("aria-busy");
          button.style.width = "";
          if (button.tagName === "BUTTON") button.disabled = false;
        }, 1000);
      }
    });
  });
}

function initReveals() {
  const items = document.querySelectorAll(SELECTORS.reveal);
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });

  items.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 6, 5) * 70}ms`;
    observer.observe(item);
  });
}

function initFaqs() {
  document.querySelectorAll(SELECTORS.faq).forEach((item) => {
    const button = item.querySelector("button");
    const content = item.querySelector(".faq-content");
    if (!button || !content) return;

    button.addEventListener("click", () => {
      const isOpen = item.classList.toggle("open");
      button.setAttribute("aria-expanded", String(isOpen));
      content.style.maxHeight = isOpen ? `${content.scrollHeight}px` : "0";
    });
  });
}

function initTherapyTermPopovers(root = document.body) {
  const pattern = /\b(CBT|DBT|EMDR)\b/g;
  const skipSelector = "script, style, svg, button, a, input, textarea, select, .therapy-term-wrap";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      pattern.lastIndex = 0;
      if (!node.nodeValue || !pattern.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      pattern.lastIndex = 0;
      if (node.parentElement?.closest(skipSelector)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    node.nodeValue.replace(pattern, (match, term, offset) => {
      fragment.append(document.createTextNode(node.nodeValue.slice(lastIndex, offset)));
      const id = `term-${term.toLowerCase()}-${Math.random().toString(36).slice(2, 9)}`;
      const wrap = document.createElement("span");
      wrap.className = "therapy-term-wrap";
      wrap.innerHTML = `
        <button class="therapy-term" type="button" aria-expanded="false" aria-describedby="${id}">${term}</button>
        <span class="therapy-term-popover" id="${id}" role="dialog" aria-label="${term} definition">
          <button class="therapy-term-close" type="button" aria-label="Dismiss ${term} definition">&times;</button>
          <strong>${term}</strong>
          <span>${therapyTermDefinitions[term]}</span>
        </span>
      `;
      fragment.append(wrap);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.append(document.createTextNode(node.nodeValue.slice(lastIndex)));
    node.replaceWith(fragment);
  });

  root.querySelectorAll?.(".therapy-term-wrap").forEach((wrap) => {
    if (wrap.dataset.popoverBound === "true") return;
    wrap.dataset.popoverBound = "true";
    const trigger = wrap.querySelector(".therapy-term");
    const popover = wrap.querySelector(".therapy-term-popover");
    const close = wrap.querySelector(".therapy-term-close");
    let closeTimer = null;

    if (popover && popover.parentElement !== document.body) {
      document.body.append(popover);
    }

    const placePopover = () => {
      if (!trigger || !popover) return;
      const margin = 12;
      const header = document.querySelector(".site-header");
      const headerBottom = header?.getBoundingClientRect().bottom || 0;
      const safeTop = Math.max(margin, headerBottom + margin);
      const triggerRect = trigger.getBoundingClientRect();
      const maxWidth = Math.min(460, window.innerWidth - (margin * 2));

      popover.style.width = `${maxWidth}px`;
      popover.style.maxHeight = `${Math.max(220, window.innerHeight - safeTop - margin)}px`;
      popover.style.left = "0px";
      popover.style.top = "0px";

      const popoverRect = popover.getBoundingClientRect();
      const centeredLeft = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2);
      const left = Math.min(Math.max(margin, centeredLeft), window.innerWidth - popoverRect.width - margin);
      const spaceAbove = triggerRect.top - safeTop - margin;
      const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
      const fitsAbove = spaceAbove >= popoverRect.height;
      const fitsBelow = spaceBelow >= popoverRect.height;
      let top;

      if (fitsAbove || spaceAbove >= spaceBelow) {
        top = Math.max(safeTop, triggerRect.top - popoverRect.height - margin);
      } else if (fitsBelow) {
        top = triggerRect.bottom + margin;
      } else {
        top = safeTop + Math.max(0, (window.innerHeight - safeTop - popoverRect.height - margin) / 2);
      }

      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(top)}px`;
    };

    const openPopover = () => {
      if (wrap.classList.contains("is-dismissed")) return;
      clearTimeout(closeTimer);
      wrap.classList.add("is-hovered");
      popover?.classList.add("is-visible");
      trigger?.setAttribute("aria-expanded", "true");
      requestAnimationFrame(placePopover);
    };
    const closePopover = ({ clearDismissed = true } = {}) => {
      wrap.classList.remove("is-hovered", "is-open");
      popover?.classList.remove("is-visible");
      if (clearDismissed) wrap.classList.remove("is-dismissed");
      trigger?.setAttribute("aria-expanded", "false");
    };
    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (wrap.classList.contains("is-open")) return;
        if (wrap.matches(":hover") || popover?.matches(":hover")) return;
        closePopover();
      }, 120);
    };

    wrap.addEventListener("mouseenter", () => {
      wrap.classList.remove("is-dismissed");
      openPopover();
    });
    wrap.addEventListener("mouseleave", () => {
      scheduleClose();
    });
    wrap.addEventListener("focusin", (event) => {
      if (event.target === close) return;
      openPopover();
    });
    trigger?.addEventListener("click", () => {
      wrap.classList.remove("is-dismissed");
      const isOpen = wrap.classList.toggle("is-open");
      wrap.classList.toggle("is-hovered", isOpen);
      trigger.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) requestAnimationFrame(placePopover);
    });
    popover?.addEventListener("mouseenter", () => {
      clearTimeout(closeTimer);
      if (!wrap.classList.contains("is-dismissed")) popover.classList.add("is-visible");
    });
    popover?.addEventListener("mouseleave", () => {
      scheduleClose();
    });
    close?.addEventListener("click", (event) => {
      event.stopPropagation();
      wrap.classList.add("is-dismissed");
      closePopover({ clearDismissed: false });
      trigger?.focus();
    });
    window.addEventListener("resize", () => {
      if (wrap.classList.contains("is-hovered") || wrap.classList.contains("is-open")) placePopover();
    });
    window.addEventListener("scroll", () => {
      if (wrap.classList.contains("is-hovered") || wrap.classList.contains("is-open")) placePopover();
    }, { passive: true });
  });
}

async function loadWordPressArticles() {
  try {
    const response = await fetch(WORDPRESS_POSTS_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) return fallbackArticles;
    const data = await response.json();
    return Array.isArray(data.items) ? data.items : fallbackArticles;
  } catch (error) {
    // Fall back to bundled article summaries if the WordPress backend is unavailable.
  }
  return fallbackArticles;
}

async function refreshWordPressArticles(password) {
  const response = await fetch(ARTICLE_REFRESH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Article refresh failed");
  }
  return Array.isArray(data.items) ? data.items : fallbackArticles;
}

function enhanceArticleTables(root) {
  const body = root.querySelector(".cms-body");
  if (!body) return;

  body.querySelectorAll("table").forEach((table) => {
    const columnCount = Math.max(
      ...Array.from(table.rows).map((row) => row.cells.length),
      1
    );
    table.style.setProperty("--table-columns", String(columnCount));
    table.classList.toggle("is-wide-table", columnCount > 4);
    table.classList.toggle("is-extra-wide-table", columnCount > 6);

    const existingWrapper = table.closest(".cms-table-scroll, .wp-block-table");
    if (existingWrapper) {
      existingWrapper.classList.add("cms-table-scroll");
      existingWrapper.setAttribute("tabindex", "0");
      existingWrapper.setAttribute("role", "region");
      existingWrapper.setAttribute("aria-label", "Article table");
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "cms-table-scroll";
    wrapper.setAttribute("tabindex", "0");
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Article table");
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function articleCard(article) {
  const tags = article.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const image = article.image ? `<img src="${escapeAttribute(article.image)}" alt="" loading="lazy">` : "";
  return `
    <article class="article-card reveal" data-title="${escapeAttribute(article.title.toLowerCase())}" data-tags="${escapeAttribute(article.tags.join("|").toLowerCase())}">
      ${image}
      <div class="meta">${new Date(article.date).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })} · ${escapeHtml(article.author)}</div>
      <div class="article-tags">${tags}</div>
      <h3>${escapeHtml(article.title)}</h3>
      <p>${escapeHtml(article.excerpt)}</p>
      <a href="${escapeAttribute(article.url)}" data-loading-button>Read More <span class="btn-spinner" aria-hidden="true"></span></a>
    </article>
  `;
}

function initArticleRefreshModalShell() {
  const open = document.querySelector(SELECTORS.articleRefreshOpen);
  const close = document.querySelector(SELECTORS.articleRefreshClose);
  const modal = document.querySelector(SELECTORS.articleRefreshModal);
  const password = document.querySelector(SELECTORS.articleRefreshPassword);
  const refreshButton = document.querySelector(SELECTORS.articleRefreshButton);
  const status = document.querySelector(SELECTORS.articleRefreshStatus);
  if (!open || !modal || modal.dataset.modalBound === "true") return;
  modal.dataset.modalBound = "true";

  const openModal = () => {
    modal.hidden = false;
    document.body.classList.add("modal-open");
    if (status) {
      status.textContent = "";
      status.dataset.status = "";
    }
    requestAnimationFrame(() => password?.focus());
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    refreshButton?.classList.remove("is-loading");
    refreshButton?.removeAttribute("aria-busy");
    if (refreshButton) refreshButton.disabled = false;
    open.focus();
  };

  let openingModal = false;
  const startOpenModal = async () => {
    if (!modal.hidden || open.classList.contains("is-loading")) return;
    openingModal = true;
    open.classList.add("is-loading");
    open.setAttribute("aria-busy", "true");
    open.disabled = true;
    await minimumDelay(1000);
    open.classList.remove("is-loading");
    open.removeAttribute("aria-busy");
    open.disabled = false;
    openingModal = false;
    openModal();
  };

  open.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    startOpenModal();
  });
  open.addEventListener("click", (event) => {
    event.preventDefault();
    if (!openingModal) startOpenModal();
  });
  close?.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}

async function initResources() {
  const grid = document.querySelector(SELECTORS.resourceGrid);
  const search = document.querySelector(SELECTORS.search);
  const tagsWrap = document.querySelector(SELECTORS.tags);
  const refreshForm = document.querySelector(SELECTORS.articleRefreshForm);
  const refreshOpen = document.querySelector(SELECTORS.articleRefreshOpen);
  const refreshClose = document.querySelector(SELECTORS.articleRefreshClose);
  const refreshModal = document.querySelector(SELECTORS.articleRefreshModal);
  const refreshPassword = document.querySelector(SELECTORS.articleRefreshPassword);
  const refreshButton = document.querySelector(SELECTORS.articleRefreshButton);
  const refreshStatus = document.querySelector(SELECTORS.articleRefreshStatus);
  if (!grid || !search || !tagsWrap) return;

  const filterButton = (label, type, active = false) => `<button class="tag${active ? " active" : ""}" type="button" data-filter-type="${type}" data-filter-value="${escapeAttribute(label)}">${escapeHtml(label)}</button>`;
  let activeTag = "All";
  let activeCategory = "All";

  let articles = await loadWordPressArticles();

  function normalizeArticles(nextArticles) {
    return nextArticles.map((article) => ({
      ...article,
      tags: Array.isArray(article.tags) ? article.tags : [],
      categories: Array.isArray(article.categories) ? article.categories : [],
      postTags: Array.isArray(article.postTags) ? article.postTags : article.tags || []
    }));
  }

  function renderFilters() {
    const allCategories = ["All", ...new Set(articles.flatMap((article) => article.categories))];
    const allTags = ["All", ...new Set(articles.flatMap((article) => article.postTags))];
    if (!allCategories.includes(activeCategory)) activeCategory = "All";
    if (!allTags.includes(activeTag)) activeTag = "All";

    tagsWrap.innerHTML = `
      <div class="filter-group">
        <span class="filter-label">Categories</span>
        <div class="filter-options">${allCategories.map((category) => filterButton(category, "category", category === activeCategory)).join("")}</div>
      </div>
      <div class="filter-group">
        <span class="filter-label">Tags</span>
        <div class="filter-options">${allTags.map((tag) => filterButton(tag, "tag", tag === activeTag)).join("")}</div>
      </div>
    `;
  }

  articles = normalizeArticles(articles);

  function render() {
    const query = search.value.trim().toLowerCase();
    const filtered = articles.filter((article) => {
      const matchesQuery = [article.title, article.excerpt, article.searchTags?.join(" ") || article.tags.join(" ")].join(" ").toLowerCase().includes(query);
      const matchesCategory = activeCategory === "All" || article.categories.includes(activeCategory);
      const matchesTag = activeTag === "All" || article.postTags.includes(activeTag);
      return matchesQuery && matchesCategory && matchesTag;
    });
    grid.innerHTML = filtered.length ? filtered.map(articleCard).join("") : "<p>No resources match your search.</p>";
    initTherapyTermPopovers(grid);
    initLoadingButtons();
    initReveals();
  }

  function setRefreshStatus(message = "", type = "") {
    if (!refreshStatus) return;
    refreshStatus.textContent = message;
    refreshStatus.dataset.status = type;
  }

  function openRefreshModal() {
    if (!refreshModal) return;
    refreshModal.hidden = false;
    document.body.classList.add("modal-open");
    setRefreshStatus("", "");
    requestAnimationFrame(() => refreshPassword?.focus());
  }

  function closeRefreshModal() {
    if (!refreshModal) return;
    refreshModal.hidden = true;
    document.body.classList.remove("modal-open");
    refreshButton?.classList.remove("is-loading");
    refreshButton?.removeAttribute("aria-busy");
    if (refreshButton) refreshButton.disabled = false;
    refreshOpen?.focus();
  }

  tagsWrap.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-value]");
    if (!button) return;
    const type = button.dataset.filterType;
    if (type === "category") activeCategory = button.dataset.filterValue;
    if (type === "tag") activeTag = button.dataset.filterValue;
    tagsWrap.querySelectorAll(`[data-filter-type="${type}"]`).forEach((tag) => tag.classList.toggle("active", tag === button));
    render();
  });

  search.addEventListener("input", render);
  refreshForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = refreshPassword?.value || "";
    if (!password) {
      setRefreshStatus("Enter the admin password to refresh articles.", "error");
      refreshPassword?.focus();
      return;
    }

    refreshButton?.classList.add("is-loading");
    refreshButton?.setAttribute("aria-busy", "true");
    if (refreshButton) refreshButton.disabled = true;
    setRefreshStatus("Refreshing articles from WordPress...", "loading");
    const spinnerDelay = minimumDelay(1000);

    try {
      const refreshedArticles = await refreshWordPressArticles(password);
      await spinnerDelay;
      articles = normalizeArticles(refreshedArticles);
      if (refreshPassword) refreshPassword.value = "";
      activeCategory = "All";
      activeTag = "All";
      renderFilters();
      render();
      setRefreshStatus(`Articles refreshed successfully. ${articles.length} posts loaded.`, "success");
    } catch (error) {
      await spinnerDelay;
      setRefreshStatus("Refresh failed. Check the password and try again.", "error");
    } finally {
      refreshButton?.classList.remove("is-loading");
      refreshButton?.removeAttribute("aria-busy");
      if (refreshButton) refreshButton.disabled = false;
    }
  });

  renderFilters();
  render();
}

async function initCmsArticle() {
  const mount = document.querySelector(SELECTORS.cmsArticle);
  if (!mount) return;
  const slug = window.location.pathname.split("/").filter(Boolean).pop();
  const articles = await loadWordPressArticles();
  const article = articles.find((item) => item.slug === slug);

  if (!article) {
    mount.innerHTML = `<p class="article-meta">Article not found.</p><h1>Resource unavailable</h1><p>This article may still be a draft, scheduled for future publication, or unpublished in WordPress.</p><p><a class="btn btn-secondary" href="/mental-health-resources/" data-loading-button>Back to Resources <span class="btn-spinner"></span></a></p>`;
    initLoadingButtons();
    return;
  }

  document.title = article.title;
  const tags = article.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const image = article.image ? `<img class="cms-featured-image" src="${escapeAttribute(article.image)}" alt="" loading="lazy">` : "";
  mount.innerHTML = `
    <p class="article-meta">${new Date(article.date).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })} · Written By ${escapeHtml(article.author)}</p>
    <div class="article-tags">${tags}</div>
    <h1>${escapeHtml(article.title)}</h1>
    ${image}
    <div class="cms-body">${article.body}</div>
    <p><a class="btn btn-secondary" href="/mental-health-resources/" data-loading-button>Back to Resources <span class="btn-spinner"></span></a></p>
  `;
  enhanceArticleTables(mount);
  initTherapyTermPopovers(mount);
  initLoadingButtons();
  initReveals();
}

function formatAppointmentTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatCalendarDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { weekday: "", date: "" };
  return {
    weekday: date.toLocaleDateString("en-CA", { weekday: "short" }),
    date: date.toLocaleDateString("en-CA", { month: "short", day: "numeric" })
  };
}

function groupOpeningsByDay(options) {
  const days = new Map();
  options.forEach((option) => {
    const openings = Array.isArray(option.openings) ? option.openings : [];
    openings.forEach((opening) => {
      if (!opening.startAt) return;
      const key = opening.startAt.slice(0, 10);
      if (!days.has(key)) days.set(key, []);
      days.get(key).push({
        ...opening,
        optionName: option.name,
        bookingUrl: option.bookingUrl
      });
    });
  });
  const sorted = [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, openings]) => ({
      date,
      openings: openings.sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
    }));
  if (!sorted.length) return [];

  const calendarStart = new Date(`${sorted[0].date}T12:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      openings: days.get(key) || []
    };
  });
}

async function loadJaneOpenings() {
  const response = await fetch(JANE_OPENINGS_URL, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error("Jane openings unavailable");
  return response.json();
}

async function initBookingWidget() {
  const widget = document.querySelector(SELECTORS.bookingWidget);
  if (!widget) return;

  const tabs = widget.querySelector("[data-booking-tabs]");
  const optionTabs = widget.querySelector("[data-booking-options]");
  const status = widget.querySelector("[data-booking-status]");
  const slots = widget.querySelector("[data-booking-slots]");
  const bookingLink = widget.querySelector("[data-booking-link]");
  const selection = widget.querySelector("[data-booking-selection]");
  if (!tabs || !optionTabs || !status || !slots || !bookingLink || !selection) return;

  try {
    const data = await loadJaneOpenings();
    const durations = Array.isArray(data.durations) ? data.durations : [];
    if (!durations.length) throw new Error("No appointment durations configured");

    let activeIndex = 0;
    let activeOptionIndex = 0;
    let selectedOpening = null;

    function janeCalendarUrl(opening) {
      const date = opening.startAt.slice(0, 10);
      return `${data.bookingUrl}#/staff_member/1/treatment/${opening.treatmentId}/${date}`;
    }

    function updateSelectedOpening(opening) {
      selectedOpening = opening;
      slots.querySelectorAll(".booking-slot").forEach((slot) => {
        slot.classList.toggle("selected", slot.dataset.startAt === opening.startAt && slot.dataset.treatmentId === String(opening.treatmentId));
        slot.setAttribute("aria-pressed", String(slot.classList.contains("selected")));
      });
      selection.textContent = `${opening.optionName} selected for ${formatCalendarDay(opening.startAt).weekday}, ${formatCalendarDay(opening.startAt).date} at ${formatAppointmentTime(opening.startAt)}. Jane Booking Tool will open to this appointment type and date so you can choose the time there to reserve it.`;
      bookingLink.href = janeCalendarUrl(opening);
      bookingLink.classList.remove("disabled");
      bookingLink.setAttribute("aria-disabled", "false");
    }

    function resetSelectedOpening() {
      selectedOpening = null;
      selection.textContent = "Select a time to open the matching Jane Booking Tool calendar day.";
      bookingLink.href = data.bookingUrl;
      bookingLink.classList.add("disabled");
      bookingLink.setAttribute("aria-disabled", "true");
    }

    function render() {
      const active = durations[activeIndex];
      const options = Array.isArray(active.options) ? active.options : [];
      if (activeOptionIndex >= options.length) activeOptionIndex = 0;
      const activeOption = options[activeOptionIndex];
      const activeOptions = activeOption ? [activeOption] : [];
      const openingCount = activeOption?.openings?.length || 0;
      const days = groupOpeningsByDay(activeOptions);
      resetSelectedOpening();
      tabs.innerHTML = durations.map((duration, index) => `
        <button class="booking-tab${index === activeIndex ? " active" : ""}" type="button" role="tab" aria-selected="${index === activeIndex}" data-duration-index="${index}">
          <span>${duration.label || `${duration.minutes} min`}</span>
          <small>${duration.description || "Appointment"}</small>
        </button>
      `).join("");
      optionTabs.innerHTML = options.map((option, index) => `
        <button class="booking-option-tab${index === activeOptionIndex ? " active" : ""}" type="button" role="tab" aria-selected="${index === activeOptionIndex}" data-option-index="${index}">
          <span>${option.shortName || option.name}</span>
          <small>${option.price || ""}</small>
        </button>
      `).join("");
      status.textContent = openingCount
        ? `${openingCount} live openings found for ${activeOption.shortName || activeOption.name}.`
        : `No online openings are listed for ${activeOption?.shortName || activeOption?.name || "this appointment type"} right now.`;
      slots.innerHTML = days.length
        ? days.map((day) => {
          const label = formatCalendarDay(`${day.date}T12:00:00`);
          return `
            <section class="booking-day" aria-label="${label.weekday} ${label.date}">
              <div class="booking-day-header">
                <span>${label.weekday}</span>
                <strong>${label.date}</strong>
              </div>
              <div class="booking-day-times">
                ${day.openings.length ? day.openings.map((opening) => `
                  <button class="booking-slot" type="button" aria-pressed="false" data-start-at="${opening.startAt}" data-treatment-id="${opening.treatmentId}" data-option-name="${opening.optionName}">
                    <span>${formatAppointmentTime(opening.startAt)}</span>
                    <small>${opening.optionName.replace(/\s+\u2013\s+\d+\s+Minutes?$/i, "")}</small>
                  </button>
                `).join("") : `<span class="booking-no-times">No times</span>`}
              </div>
            </section>
          `;
        }).join("")
        : `<div class="booking-empty"><p>No times are currently listed for this appointment type.</p><a class="booking-slot" href="${options[0]?.bookingUrl || data.bookingUrl}" data-loading-button>Open Jane Booking Tool calendar<span class="btn-spinner" aria-hidden="true"></span></a></div>`;
      initLoadingButtons();
    }

    tabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-duration-index]");
      if (!button) return;
      activeIndex = Number(button.dataset.durationIndex);
      activeOptionIndex = 0;
      render();
    });

    optionTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-option-index]");
      if (!button) return;
      activeOptionIndex = Number(button.dataset.optionIndex);
      render();
    });

    slots.addEventListener("click", (event) => {
      const button = event.target.closest(".booking-slot[data-start-at]");
      if (!button) return;
      updateSelectedOpening({
        startAt: button.dataset.startAt,
        treatmentId: button.dataset.treatmentId,
        optionName: button.dataset.optionName
      });
    });

    bookingLink.addEventListener("click", (event) => {
      if (!selectedOpening) {
        event.preventDefault();
        selection.textContent = "Please select a time before opening Jane Booking Tool.";
      }
    });

    render();
  } catch (error) {
    status.textContent = "Current Jane Booking Tool options are temporarily unavailable.";
    slots.innerHTML = `<a class="booking-slot" href="https://petermillerpsychologicalservices.janeapp.com/" data-loading-button>Open Jane Booking Tool<span class="btn-spinner" aria-hidden="true"></span></a>`;
    bookingLink.href = "https://petermillerpsychologicalservices.janeapp.com/";
    initLoadingButtons();
  }
}

initPreloader();
initBranding();
initNavigation();
initLoadingButtons();
initReveals();
initFaqs();
initTherapyTermPopovers();
initArticleRefreshModalShell();
initResources();
initCmsArticle();
initBookingWidget();
