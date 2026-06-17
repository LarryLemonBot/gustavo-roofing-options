(() => {
  "use strict";

  // Handoff edit point: update these values if Vera's Roofing changes contact info.
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
})();