// Keep this script's constants and state out of the page's global scope.
(() => {
  console.log("[LeetCode Click Cooldown] content script loaded");
  // Minimum time between Run/Submit clicks.
  const COOLDOWN_MS = 5000;
  const EXTRA_DELAY_INCREMENT_MS = 3000;
  const MAX_EXTRA_DELAY_MS = 10000;
  const EXTRA_DELAY_RESET_MS = 30000;
  globalThis.extra_delay = 0;
  // Marks controls that this script has temporarily disabled.
  const LOCKED_ATTRIBUTE = "data-lc-cooldown-locked";
  // Stores each control's original accessibility and style values.
  const buttonStates = new WeakMap();
  // Timestamp at which the current cooldown expires.
  let unlockAt = 0;
  globalThis.last_clicked_time = 0;

  // Checks visible text and accessible labels for Run or Submit actions.
  function isRunOrSubmit(button) {
    const label = [
      button.innerText,
      button.getAttribute("aria-label"),
      button.getAttribute("title")
    ].filter(Boolean).join(" ");

    // Match whole words so unrelated labels are not treated as actions.
    return /\b(run|submit)\b/i.test(label);
  }

  // Temporarily disables a control while preserving its previous state.
  function lockButton(button) {
    if (button.hasAttribute(LOCKED_ATTRIBUTE)) {
      return;
    }

    buttonStates.set(button, {
      ariaDisabled: button.getAttribute("aria-disabled"),
      opacity: button.style.getPropertyValue("opacity"),
      opacityPriority: button.style.getPropertyPriority("opacity"),
      cursor: button.style.getPropertyValue("cursor"),
      cursorPriority: button.style.getPropertyPriority("cursor")
    });
    // Disable the control for assistive technology and clearly mark it visually.
    button.setAttribute(LOCKED_ATTRIBUTE, "");
    button.setAttribute("aria-disabled", "true");
    button.style.setProperty("opacity", "0.55");
    button.style.setProperty("cursor", "not-allowed");
  }

  // Restores a control's original accessibility and inline styles.
  function unlockButton(button) {
    const state = buttonStates.get(button);
    if (!state) {
      return;
    }

    button.removeAttribute(LOCKED_ATTRIBUTE);
    if (state.ariaDisabled === null) {
      button.removeAttribute("aria-disabled");
    } else {
      button.setAttribute("aria-disabled", state.ariaDisabled);
    }

    // Restore opacity and cursor, including their original priority.
    if (state.opacity) {
      button.style.setProperty("opacity", state.opacity, state.opacityPriority);
    } else {
      button.style.removeProperty("opacity");
    }
    if (state.cursor) {
      button.style.setProperty("cursor", state.cursor, state.cursorPriority);
    } else {
      button.style.removeProperty("cursor");
    }
    buttonStates.delete(button);
  }

  // Applies or removes the locked state across matching controls.
  function refreshButtons() {
    const locked = Date.now() < unlockAt;
    document.querySelectorAll(`button, [role="button"], [${LOCKED_ATTRIBUTE}]`)
      .forEach((button) => {
        if (locked && isRunOrSubmit(button)) {
          lockButton(button);
        } else {
          unlockButton(button);
        }
      });
  }

  // Capture clicks in the capture phase, before page click handlers run.
  document.addEventListener("click", (event) => {
    const target = event.target;
    const button = target instanceof Element
      ? target.closest("button, [role='button']")
      : null;

    // Ignore clicks outside Run/Submit controls.
    if (!button || !isRunOrSubmit(button)) {
      return;
    }
    
    // Prevent repeated submissions while the cooldown is active.
    if (Date.now() < unlockAt) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    // Increase the delay for repeated accepted clicks, resetting after inactivity.
    const now = Date.now();
    if (
      globalThis.last_clicked_time > 0 &&
      now - globalThis.last_clicked_time <= EXTRA_DELAY_RESET_MS
    ) {
      if (globalThis.extra_delay < MAX_EXTRA_DELAY_MS) {

        globalThis.extra_delay =  globalThis.extra_delay + EXTRA_DELAY_INCREMENT_MS;}
        else{
          globalThis.extra_delay = MAX_EXTRA_DELAY_MS;
        }
    } else {
      globalThis.extra_delay = 0;
    }

    globalThis.last_clicked_time = now;
    const cooldownDuration = COOLDOWN_MS + globalThis.extra_delay;
    console.log("[LeetCode Click Cooldown] accepted action", {
      last_clicked_time: globalThis.last_clicked_time,
      extra_delay: globalThis.extra_delay,
      cooldownDuration
    });
    unlockAt = now + cooldownDuration;
    refreshButtons();
    // End the cooldown and restore matching controls after the delay.
    window.setTimeout(() => {
      unlockAt = 0;
      refreshButtons();
    }, cooldownDuration);
  }, true);

  // Reapply the cooldown when LeetCode updates controls in the DOM.
  new MutationObserver(() => {
    if (Date.now() < unlockAt) {
      refreshButtons();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
