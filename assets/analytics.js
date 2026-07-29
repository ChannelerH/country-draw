(function () {
  "use strict";

  const measurementId = "G-4M4CML1D15";
  const consentKey = "country-draw-analytics-consent";
  let analyticsEnabled = false;
  let tagLoaded = false;

  window.dataLayer = window.dataLayer || [];
  window.countryDrawEventLog = window.countryDrawEventLog || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500
  });
  window.gtag("set", "ads_data_redaction", true);
  window.gtag("set", "url_passthrough", true);

  const savedChoice = readChoice();
  if (savedChoice === "granted") enableAnalytics();
  if (savedChoice === "denied") updateConsent("denied");

  window.countryDrawTrack = function (eventName, parameters) {
    const event = {
      name: eventName,
      parameters: parameters || {}
    };
    window.countryDrawEventLog.push(event);
    if (analyticsEnabled) {
      window.gtag("event", eventName, event.parameters);
    }
  };

  window.countryDrawOpenPrivacyChoices = function () {
    showConsentPanel(true);
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-privacy-choices]").forEach(function (button) {
      button.addEventListener("click", function () {
        showConsentPanel(true);
      });
    });

    if (!savedChoice) showConsentPanel(false);
  });

  function readChoice() {
    try {
      const value = localStorage.getItem(consentKey);
      return value === "granted" || value === "denied" ? value : "";
    } catch (error) {
      return "";
    }
  }

  function saveChoice(value) {
    try {
      localStorage.setItem(consentKey, value);
    } catch (error) {
      // Consent still applies for the current page when storage is unavailable.
    }
  }

  function updateConsent(value) {
    window.gtag("consent", "update", {
      analytics_storage: value
    });
  }

  function enableAnalytics() {
    updateConsent("granted");
    analyticsEnabled = true;
    if (tagLoaded) return;

    tagLoaded = true;
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: true
    });

    const tag = document.createElement("script");
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(tag);
  }

  function showConsentPanel(isSettings) {
    const existing = document.querySelector("[data-consent-panel]");
    if (existing) existing.remove();

    const panel = document.createElement("section");
    panel.className = "consent-panel";
    panel.dataset.consentPanel = "";
    panel.setAttribute("aria-label", "Analytics privacy choices");
    panel.innerHTML = `
      <div>
        <strong>${isSettings ? "Analytics settings" : "A quick privacy choice"}</strong>
        <p>Country Draw uses Google Analytics to understand which game modes are useful. No advertising cookies are enabled.</p>
      </div>
      <div class="consent-actions">
        <button type="button" data-consent="denied">Decline</button>
        <button type="button" class="consent-accept" data-consent="granted">Allow analytics</button>
      </div>
    `;

    panel.querySelectorAll("[data-consent]").forEach(function (button) {
      button.addEventListener("click", function () {
        const value = button.dataset.consent;
        saveChoice(value);
        if (value === "granted") {
          enableAnalytics();
        } else {
          analyticsEnabled = false;
          updateConsent("denied");
        }
        window.countryDrawTrack("consent_updated", { analytics_consent: value });
        panel.remove();
      });
    });

    document.body.appendChild(panel);
  }
})();
