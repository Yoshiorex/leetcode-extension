(() => {
  const COOLDOWN_MS = 6000;
  const LOCKED_ATTRIBUTE = "data-lc-cooldown-locked";
  const buttonStates = new WeakMap();
  let unlockAt = 0;

  function isRunOrSubmit(button) {
    const label = [
      button.innerText,
      button.getAttribute("aria-label"),
      button.getAttribute("title")
    ].filter(Boolean).join(" ");

    return /\b(run|submit)\b/i.test(label);
  }

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
    button.setAttribute(LOCKED_ATTRIBUTE, "");
    button.setAttribute("aria-disabled", "true");
    button.style.setProperty("opacity", "0.55");
    button.style.setProperty("cursor", "not-allowed");
  }

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

  document.addEventListener("click", (event) => {
    const target = event.target;
    const button = target instanceof Element
      ? target.closest("button, [role='button']")
      : null;

    if (!button || !isRunOrSubmit(button)) {
      return;
    }

    if (Date.now() < unlockAt) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    unlockAt = Date.now() + COOLDOWN_MS;
    refreshButtons();
    window.setTimeout(() => {
      unlockAt = 0;
      refreshButtons();
    }, COOLDOWN_MS);
  }, true);

  new MutationObserver(() => {
    if (Date.now() < unlockAt) {
      refreshButtons();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
