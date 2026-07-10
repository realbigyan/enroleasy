/**
 * EnrolEasy lead-form connector.
 *
 * Drop this on any page and mark an existing form with the org's webhook
 * URL — no other markup or JS required:
 *
 *   <script src="https://enroleasy.com/embed/lead-form.js" async></script>
 *   <form data-enroleasy-lead="https://enroleasy.com/api/public/leads/webhook/<token>">
 *     <input name="fullName" required>
 *     <input name="email" type="email">
 *     <input name="phone">
 *     <button type="submit">Send</button>
 *   </form>
 *
 * Field names are flexible — fullName/full_name/name, email, phone/phone_number,
 * interestedCountry/country, targetIntake/intake are all recognized.
 *
 * Optional, purely progressive-enhancement hooks:
 *   - An element with [data-enroleasy-success] inside the form is shown on
 *     success (and the rest of the form hidden).
 *   - An element with [data-enroleasy-error] inside the form is shown (with
 *     its text set to the error message) if the submission fails.
 *   - Listen for "enroleasy:lead-submitted" / "enroleasy:lead-error" custom
 *     events on the form element for full custom handling instead.
 *
 * Do NOT add a hidden "redirect" field when using this script — that's only
 * for plain HTML forms submitted without JavaScript (see the Integrations
 * page setup notes). This script keeps the visitor on the page.
 */
(function () {
  "use strict";

  function toPlainObject(formData) {
    var obj = {};
    formData.forEach(function (value, key) {
      if (typeof value === "string") obj[key] = value;
    });
    return obj;
  }

  function setLoading(form, loading) {
    form.classList.toggle("enroleasy-loading", loading);
    var submitEls = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    for (var i = 0; i < submitEls.length; i++) {
      submitEls[i].disabled = loading;
    }
  }

  function showHook(form, selector, message) {
    var el = form.querySelector(selector);
    if (!el) return false;
    el.hidden = false;
    if (message !== undefined) el.textContent = message;
    return true;
  }

  function hideHook(form, selector) {
    var el = form.querySelector(selector);
    if (el) el.hidden = true;
  }

  function handleSubmit(form, webhookUrl, evt) {
    evt.preventDefault();
    setLoading(form, true);
    hideHook(form, "[data-enroleasy-error]");

    var payload = toPlainObject(new FormData(form));

    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error(data.error || "Could not submit the form");
          return data;
        });
      })
      .then(function (data) {
        setLoading(form, false);
        var shown = showHook(form, "[data-enroleasy-success]");
        if (shown) {
          var fields = form.querySelectorAll("input, textarea, select");
          for (var i = 0; i < fields.length; i++) fields[i].hidden = true;
          var submitEls = form.querySelectorAll('button[type="submit"], input[type="submit"]');
          for (var j = 0; j < submitEls.length; j++) submitEls[j].hidden = true;
        } else {
          form.reset();
        }
        form.dispatchEvent(new CustomEvent("enroleasy:lead-submitted", { detail: data, bubbles: true }));
      })
      .catch(function (err) {
        setLoading(form, false);
        var message = err && err.message ? err.message : "Something went wrong — please try again.";
        showHook(form, "[data-enroleasy-error]", message);
        form.dispatchEvent(new CustomEvent("enroleasy:lead-error", { detail: { message: message }, bubbles: true }));
      });
  }

  function init() {
    var forms = document.querySelectorAll("[data-enroleasy-lead]");
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        var webhookUrl = form.getAttribute("data-enroleasy-lead");
        if (!webhookUrl) return;
        form.addEventListener("submit", function (evt) {
          handleSubmit(form, webhookUrl, evt);
        });
      })(forms[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
