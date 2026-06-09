/**
 * uadialog.js - Dialog manager system.
 * Sovrascrive window.alert/confirm/prompt con dialoghi custom Material-style.
 * Segue BEST_PRACTICES_JS.md: factory pattern, no class/this/new/prototype.
 *
 * @module  uadialog
 * @version 1.0.0
 * @date    2026-06-02
 */
"use strict";

const _escapeHtml = function(unsafe) {
    const escaped = unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    return escaped;
};

const _createDialog = function(type, message, defaultValue) {
    const dialog = document.createElement("div");
    const overlay = document.createElement("div");

    dialog.className = type + "-dialog";
    dialog.classList.add("inv");
    overlay.className = "overlay";

    const safeMessage = _escapeHtml(message);
    const safeDefault = _escapeHtml(defaultValue || "");
    const inputHtml = type === "prompt" ? '<input type="text" class="prompt-input" value="' + safeDefault + '">' : "";
    const cancelBtnHtml = type === "confirm" || type === "prompt" ? '<button class="cancel" aria-label="Annulla">Annulla</button>' : "";

    dialog.innerHTML = '<div role="' + (type === "alert" ? "alertdialog" : "dialog") + '" aria-labelledby="dialog-title" aria-describedby="dialog-message">'
        + '<h4 id="dialog-title">' + safeMessage + '</h4>'
        + inputHtml
        + '<div class="buttons">'
        + '<button class="ok" aria-label="OK" title="Conferma">OK</button>'
        + cancelBtnHtml.replace("Annulla", "Annulla\" title=\"Annulla")
        + '</div></div>';

    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const elements = [dialog, overlay];
    elements.forEach(function(el) {
        el.classList.add("show");
        document.body.appendChild(el);
    });

    return { dialog: dialog, overlay: overlay };
};

const _closeDialog = function(dialog, overlay) {
    const elements = [dialog, overlay];
    elements.forEach(function(el) {
        el.classList.remove("show");
        setTimeout(function() {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 300);
    });
};

const showDialogAsync = function(type, message, defaultValue) {
    const promise = new Promise(function(resolve) {
        var existingOverlay = document.querySelector(".overlay.show");
        if (existingOverlay) {
            var existingDialog = document.querySelector('[class*="-dialog"].show');
            if (existingDialog) {
                _closeDialog(existingDialog, existingOverlay);
            }
        }

        var created = _createDialog(type, message, defaultValue);
        var dialog = created.dialog;
        var overlay = created.overlay;

        var okBtn = dialog.querySelector(".ok");
        var cancelBtn = dialog.querySelector(".cancel");

        var handleClose = function(result) {
            _closeDialog(dialog, overlay);
            resolve(result);
            document.removeEventListener("keydown", handleKeyDown);
            overlay.removeEventListener("click", handleOverlayClick);
        };

        var handleKeyDown = function(e) {
            if (e.key === "Escape") {
                var escResult = type === "confirm" ? false : null;
                handleClose(escResult);
            }
        };

        var handleOverlayClick = function() {
            var clickResult = type === "confirm" ? false : null;
            handleClose(clickResult);
        };

        document.addEventListener("keydown", handleKeyDown);
        overlay.addEventListener("click", handleOverlayClick);

        if (type === "prompt") {
            var input = dialog.querySelector(".prompt-input");
            input.focus();
            input.select();

            okBtn.onclick = function() {
                var val = input.value;
                handleClose(val);
            };

            cancelBtn.onclick = function() {
                handleClose(null);
            };

            input.addEventListener("keydown", function(e) {
                if (e.key === "Enter") {
                    okBtn.click();
                }
            });
        } else if (type === "confirm") {
            okBtn.onclick = function() {
                handleClose(true);
            };

            cancelBtn.onclick = function() {
                handleClose(false);
            };
        } else {
            okBtn.onclick = function() {
                handleClose(undefined);
            };

            var handleOverlayClickAlert = function() {
                handleClose(undefined);
            };
            overlay.onclick = handleOverlayClickAlert;
        }
    });

    return promise;
};

// Sovrascrittura funzioni native
var nativeAlert = window.alert;
var nativeConfirm = window.confirm;
var nativePrompt = window.prompt;

window.alert = async function(message) {
    var msg = message instanceof Error ? message.message : message;
    var result = await showDialogAsync("alert", msg);
    return result;
};

window.confirm = async function(message) {
    var result = await showDialogAsync("confirm", message);
    return result;
};

window.prompt = async function(message, defaultValue) {
    var def = defaultValue || "";
    var result = await showDialogAsync("prompt", message, def);
    return result;
};
