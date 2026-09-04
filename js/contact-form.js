/**
 * Website forms — POST /api/contact and /api/newsletter (Cloudflare Email Routing).
 */
(function () {
  "use strict";

  function msg(key, fallback) {
    if (window.MartinsI18n && typeof window.MartinsI18n.t === "function") {
      return window.MartinsI18n.t(key);
    }
    return fallback;
  }

  function toast(text) {
    if (typeof window.toast === "function") {
      window.toast(text);
      return;
    }
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    setTimeout(function () {
      el.classList.remove("show");
    }, 3000);
  }

  function ensureHidden(form, name, value) {
    var input = form.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  }

  function parseError(res, json) {
    if (json && json.error) return json.error;
    if (res.status === 503) {
      return msg(
        "form.error",
        "Could not send — please call (508) 232-3003 or email Jeanie@MartinsGlobalTravels.com."
      );
    }
    return "Could not send right now.";
  }

  var form = document.getElementById("enquiry-form");
  if (form) {
    ensureHidden(form, "_subject", "New enquiry — Martins Global Travels website");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var first = form.querySelector('[name="firstName"]');
      var last = form.querySelector('[name="lastName"]');
      if (first && last) {
        ensureHidden(
          form,
          "name",
          [first.value, last.value]
            .map(function (v) {
              return String(v || "").trim();
            })
            .filter(Boolean)
            .join(" ")
        );
      }

      var btn = form.querySelector(".fsub");
      if (btn) {
        btn.disabled = true;
        btn.textContent = msg("form.sending", "Sending…");
      }

      fetch("/api/contact", {
        method: "POST",
        body: new FormData(form),
      })
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (json) {
            if (!res.ok) throw new Error(parseError(res, json));
            return json;
          });
        })
        .then(function () {
          toast(
            msg(
              "form.success",
              "Enquiry sent! Jeanie will be in touch within 24 hours."
            )
          );
          form.reset();
          if (typeof window.go === "function") {
            setTimeout(function () {
              window.go("home");
            }, 1500);
          }
        })
        .catch(function (err) {
          toast(
            (err && err.message) ||
              msg(
                "form.error",
                "Could not send — please call (508) 232-3003 or email Jeanie@MartinsGlobalTravels.com."
              )
          );
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = msg("form.sendEnquiry", "Send Enquiry");
          }
        });
    });

    document.addEventListener("martins:langchange", function () {
      var btn = form.querySelector(".fsub");
      if (btn && !btn.disabled) {
        btn.textContent = msg("form.sendEnquiry", "Send Enquiry");
      }
    });
  }

  var newsletter = document.getElementById("newsletter-form");
  if (newsletter) {
    newsletter.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = newsletter.querySelector(".nl-btn");
      var emailInput = newsletter.querySelector('[name="email"]');
      if (btn) btn.disabled = true;

      fetch("/api/newsletter", {
        method: "POST",
        body: new FormData(newsletter),
      })
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (json) {
            if (!res.ok) throw new Error(parseError(res, json));
            return json;
          });
        })
        .then(function () {
          toast(msg("toast.subscribed", "Subscribed! Welcome aboard."));
          if (emailInput) emailInput.value = "";
        })
        .catch(function (err) {
          toast(
            (err && err.message) ||
              msg(
                "form.error",
                "Could not send — please call (508) 232-3003 or email Jeanie@MartinsGlobalTravels.com."
              )
          );
        })
        .finally(function () {
          if (btn) btn.disabled = false;
        });
    });
  }
})();
