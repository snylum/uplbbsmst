/* Core site behavior: includes header/footer, mobile nav, dynamic content, accordions */
(function () {
  "use strict";

  async function includePartials() {
    const slots = document.querySelectorAll("[data-include]");
    await Promise.all(
      Array.from(slots).map(async (slot) => {
        const src = slot.getAttribute("data-include");
        try {
          const res = await fetch(src, { cache: "no-store" });
          slot.innerHTML = await res.text();
        } catch (err) {
          console.error("Failed to load partial", src, err);
        }
      })
    );
  }

  function initNavToggle() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Close menu on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  function markCurrentPage() {
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".main-nav a").forEach((a) => {
      const href = a.getAttribute("href").split("/").pop();
      if (href === path) a.setAttribute("aria-current", "page");
    });
  }

  function setFooterYear() {
    const el = document.getElementById("footer-year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function initAccordions() {
    document.querySelectorAll(".accordion-trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = document.getElementById(btn.getAttribute("aria-controls"));
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!isOpen));
        if (panel) panel.classList.toggle("is-open", !isOpen);
      });
    });
  }

  // Fetch editable content (from Worker API in production, falls back to static JSON)
  async function loadContent() {
    let data = null;
    try {
      const res = await fetch("/api/content", { cache: "no-store" });
      if (res.ok) data = await res.json();
    } catch (err) {
      /* API not available (e.g., local static preview) */
    }
    if (!data) {
      try {
        const res = await fetch("/content.json", { cache: "no-store" });
        if (res.ok) data = await res.json();
      } catch (err) {
        console.error("Could not load content.json fallback", err);
      }
    }
    if (!data) return;
    applyContent(data);
  }

  function applyContent(data) {
    document.querySelectorAll("[data-content]").forEach((el) => {
      const key = el.getAttribute("data-content");
      const value = getByPath(data, key);
      if (value === undefined || value === null) return;
      if (el.hasAttribute("data-content-html")) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });
    document.querySelectorAll("[data-content-href]").forEach((el) => {
      const key = el.getAttribute("data-content-href");
      const value = getByPath(data, key);
      if (value) el.setAttribute("href", value);
    });
  }

  function getByPath(obj, path) {
    return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  }

  function initContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("contact-status");
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Request failed");
        status.textContent = "Thank you. Your message has been sent to the program office.";
        status.className = "form-status success";
        status.hidden = false;
        form.reset();
      } catch (err) {
        status.textContent =
          "We could not send your message automatically. Please email bsmst.cas@uplb.edu.ph directly.";
        status.className = "form-status error";
        status.hidden = false;
      } finally {
        btn.disabled = false;
        btn.textContent = "Send Message";
      }
    });
  }

  function initReveal() {
    const targets = document.querySelectorAll(
      ".hero-badge, .hero h1, .hero p, .hero-actions, .hero-stats, " +
      ".section-head-row, .eyebrow, .section-title, .section-lead, " +
      ".grid > *, .news-card, .callout, .accordion-item, table, .table-wrap"
    );
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((el) => el.classList.add("reveal", "is-visible"));
      return;
    }
    targets.forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((el) => io.observe(el));
  }

  // Hides a news card if it has no title, and hides its "Read more" link
  // if no link URL was set by the admin (falls back to a plain text preview).
  function initNewsCards() {
    document.querySelectorAll("[data-news-item]").forEach((card) => {
      const title = card.querySelector("h3");
      const link = card.querySelector(".news-link");
      const checkTitle = () => {
        if (title && !title.textContent.trim()) card.hidden = true;
      };
      const checkLink = () => {
        if (link && !link.getAttribute("href")) link.hidden = true;
      };
      // Content loads async; re-check shortly after content is applied.
      setTimeout(() => {
        checkTitle();
        checkLink();
      }, 0);
      setTimeout(() => {
        checkTitle();
        checkLink();
      }, 400);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await includePartials();
    initNavToggle();
    markCurrentPage();
    setFooterYear();
    initAccordions();
    initContactForm();
    await loadContent();
    initNewsCards();
    initReveal();
  });
})();
