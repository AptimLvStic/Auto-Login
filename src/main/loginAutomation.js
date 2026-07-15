export async function autoLogin(document, payload) {
  const EventConstructor = document.defaultView?.Event ?? Event;
  const timeoutMs = Math.max(0, Number(payload.timeoutMs ?? 12000));
  const pollIntervalMs = Math.max(25, Number(payload.pollIntervalMs ?? 120));

  const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

  async function waitForElement(selector, label) {
    const attempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs) + 1);

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          return { element };
        }
      } catch {
        return {
          error: `${label} selector is invalid.`
        };
      }

      if (attempt < attempts - 1) {
        await wait(pollIntervalMs);
      }
    }

    return {
      error: `${label} selector was not found before timeout.`
    };
  }

  function dispatchInputEvents(element) {
    element.dispatchEvent(new EventConstructor("input", { bubbles: true }));
    element.dispatchEvent(new EventConstructor("change", { bubbles: true }));
  }

  function setElementValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    dispatchInputEvents(element);
  }

  const usernameResult = await waitForElement(payload.usernameSelector, "Username");
  if (!usernameResult.element) {
    return {
      status: "selector_not_found",
      message: usernameResult.error
    };
  }

  const passwordResult = await waitForElement(payload.passwordSelector, "Password");
  if (!passwordResult.element) {
    return {
      status: "selector_not_found",
      message: passwordResult.error
    };
  }

  const submitResult = await waitForElement(payload.submitSelector, "Submit");
  if (!submitResult.element) {
    return {
      status: "selector_not_found",
      message: submitResult.error
    };
  }

  const usernameInput = usernameResult.element;
  const passwordInput = passwordResult.element;
  const submitButton = submitResult.element;
  setElementValue(usernameInput, payload.username);
  setElementValue(passwordInput, payload.password);
  submitButton.click();

  await new Promise((resolve) => setTimeout(resolve, payload.submitDelayMs ?? 350));

  return {
    status: "success",
    message: "Credentials filled and submit triggered."
  };
}

export function createLoginScript(payload) {
  return `(${autoLogin.toString()})(document, ${JSON.stringify(payload)})`;
}

export function toLaunchResult(error) {
  if (error?.code === "PAGE_LOAD_TIMEOUT") {
    return {
      status: "page_load_error",
      message: "Login page failed to load within the timeout."
    };
  }

  if (error?.code === "PAGE_LOAD_ERROR") {
    return {
      status: "page_load_error",
      message: error.message
    };
  }

  if (error?.code === "VALIDATION_ERROR") {
    return {
      status: "validation_error",
      message: error.message
    };
  }

  return {
    status: "unknown_error",
    message: error?.message || "Unexpected login error."
  };
}
