(() => {
  "use strict";

  // Central contact values used by visible phone, text, and email links.
  const site = {
    phoneDisplay: "910.228.8034",
    phoneHref: "tel:+19102288034",
    smsHref: "sms:+19102288034",
    email: "verasroofing@gmail.com",
    mailtoHref: "mailto:verasroofing@gmail.com"
  };

  window.VERA_SITE_CONFIG = Object.freeze({ ...site });

  document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
    link.href = site.phoneHref;
  });

  document.querySelectorAll('a[href^="sms:"]').forEach((link) => {
    link.href = site.smsHref;
  });

  document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
    link.href = site.mailtoHref;
  });

  const replacements = new Map([
    ["910.228.8034", site.phoneDisplay],
    ["verasroofing@gmail.com", site.email]
  ]);

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    let text = node.nodeValue;
    replacements.forEach((value, key) => {
      text = text.split(key).join(value);
    });
    node.nodeValue = text;
  });

  const anchorOffset = () => {
    const topbar = document.querySelector(".topbar");
    const height = topbar ? topbar.getBoundingClientRect().height : 0;
    return Math.min(132, Math.max(18, height + 22));
  };

  const scrollToCurrentHash = () => {
    if (!window.location.hash) return;
    const id = window.decodeURIComponent(window.location.hash.slice(1));
    const target = document.getElementById(id);
    if (!target) return;

    const targetTop = target.getBoundingClientRect().top + window.scrollY - anchorOffset();
    window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: "auto" });
  };

  const scheduleHashScroll = () => {
    window.requestAnimationFrame(scrollToCurrentHash);
    [180, 520, 1100, 2100, 3600, 5200].forEach((delay) => {
      window.setTimeout(scrollToCurrentHash, delay);
    });
  };

  window.addEventListener("DOMContentLoaded", scheduleHashScroll, { once: true });
  window.addEventListener("load", scheduleHashScroll);
  window.addEventListener("pageshow", scheduleHashScroll);
  window.addEventListener("hashchange", scheduleHashScroll);

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleHashScroll).catch(() => {});
  }

  document.querySelectorAll("img").forEach((img) => {
    if (img.complete) return;
    img.addEventListener("load", scheduleHashScroll, { once: true });
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const link = target?.closest('a[href*="#"]');
    if (!link) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname !== window.location.pathname) return;
    if (!url.hash) return;

    window.setTimeout(scheduleHashScroll, 0);
  });

  scheduleHashScroll();
})();
