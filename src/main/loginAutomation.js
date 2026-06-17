export async function autoLogin(document, payload) {
  const EventConstructor = document.defaultView?.Event ?? Event;

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

  const usernameInput = document.querySelector(payload.usernameSelector);
  if (!usernameInput) {
    return {
      status: "selector_not_found",
      message: "Username selector not found."
    };
  }

  const passwordInput = document.querySelector(payload.passwordSelector);
  if (!passwordInput) {
    return {
      status: "selector_not_found",
      message: "Password selector not found."
    };
  }

  const submitButton = document.querySelector(payload.submitSelector);
  if (!submitButton) {
    return {
      status: "selector_not_found",
      message: "Submit selector not found."
    };
  }

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
