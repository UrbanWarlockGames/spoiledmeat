/*
Action Card Builder controller.

The builder is mounted inside the existing SRD shell. Rendering, schema
normalisation, compact codes, and PNG reconstruction come from
scripts/action-cards.js.
*/

(function () {
    "use strict";

    const storageKey = "nakama-action-card-builder-card";
    let activeController = null;

    function downloadJson(runtime, action) {
        const payload = runtime.createPayload(action);
        const blob = new Blob(
            [JSON.stringify(payload, null, 4) + "\n"],
            {
                type: "application/json"
            }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = runtime.sanitizeFileName(action.title) + ".json";
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function validateImportedPayload(runtime, payload) {
        if (!payload || typeof payload !== "object") {
            throw new Error("The selected file is not a JSON object.");
        }

        if (
            payload.type === runtime.type &&
            payload.action &&
            typeof payload.action === "object"
        ) {
            return payload.action;
        }

        const containsKnownField = runtime.fields.some(function (field) {
            return Object.prototype.hasOwnProperty.call(payload, field);
        });

        if (containsKnownField) {
            return payload;
        }

        throw new Error(
            "The selected file does not contain an Action Card."
        );
    }

    function copyText(value) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(value);
        }

        const textarea = document.createElement("textarea");

        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.select();

        const copied = document.execCommand("copy");

        textarea.remove();

        return copied
            ? Promise.resolve()
            : Promise.reject(new Error("Clipboard access was denied."));
    }

    function createController(root) {
        const runtime = window.NakamaActionCards;

        if (!runtime) {
            throw new Error(
                "scripts/action-cards.js must load before the builder."
            );
        }

        const elements = {
            form: root.querySelector(".js-card-form"),
            preview: root.querySelector(".js-actioncard-preview"),
            status: root.querySelector(".js-status"),
            library: root.querySelector(".js-card-library"),
            newButton: root.querySelector(".js-new-card"),
            importButton: root.querySelector(".js-import-card"),
            importInput: root.querySelector(".js-import-input"),
            exportButton: root.querySelector(".js-export-card"),
            imageButton: root.querySelector(".js-export-image"),
            shareButton: root.querySelector(".js-share-card"),
            shareDialog: root.querySelector(".js-share-dialog"),
            closeShareButton:
                root.querySelector(".js-close-share"),
            compactCode: root.querySelector(".js-compact-code"),
            loadCodeButton: root.querySelector(".js-load-code"),
            copyCodeButton: root.querySelector(".js-copy-code"),
            copyMarkdownButton:
                root.querySelector(".js-copy-markdown"),
            helpData: root.querySelector(".js-builder-help-data"),
            helpTriggers:
                root.querySelectorAll(".js-builder-help"),
            helpPopover:
                root.querySelector(".js-builder-help-popover"),
            helpTitle:
                root.querySelector(".js-builder-help-title"),
            helpCopy:
                root.querySelector(".js-builder-help-copy"),
            interactionField:
                root.querySelector(".js-interaction-field"),
            skillField: root.querySelector(".js-skill-field"),
            effectField: root.querySelector(".js-effect-field"),
            tierFields: root.querySelector(".js-tier-fields")
        };

        let action = runtime.createAction(
            runtime.blankAction
        );
        let statusTimer = 0;
        let helpShowTimer = 0;
        let helpHideTimer = 0;
        let activeHelpTrigger = null;
        let helpPinned = false;
        const fieldHelp = parseFieldHelp();

        function parseFieldHelp() {
            if (!elements.helpData) {
                return {};
            }

            try {
                return JSON.parse(elements.helpData.textContent);
            } catch (error) {
                console.warn(
                    "Action Card field help could not be parsed.",
                    error
                );
                return {};
            }
        }

        function positionHelpPopover(trigger) {
            const triggerRect = trigger.getBoundingClientRect();
            const popoverRect =
                elements.helpPopover.getBoundingClientRect();
            const viewportPadding = 16;
            const preferredLeft = triggerRect.left;
            const maximumLeft = window.innerWidth -
                popoverRect.width -
                viewportPadding;
            const left = Math.max(
                viewportPadding,
                Math.min(preferredLeft, maximumLeft)
            );
            const preferredTop = triggerRect.bottom + 8;
            const fitsBelow = preferredTop + popoverRect.height <=
                window.innerHeight - viewportPadding;
            const top = fitsBelow
                ? preferredTop
                : triggerRect.top - popoverRect.height - 8;

            elements.helpPopover.style.left = left + "px";
            elements.helpPopover.style.top = Math.max(
                viewportPadding,
                top
            ) + "px";
        }

        function showFieldHelp(trigger, pinned) {
            const key = trigger.dataset.builderHelp;
            const help = fieldHelp[key];

            if (!help) {
                return;
            }

            window.clearTimeout(helpShowTimer);
            window.clearTimeout(helpHideTimer);

            if (
                activeHelpTrigger &&
                activeHelpTrigger !== trigger
            ) {
                activeHelpTrigger.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }

            activeHelpTrigger = trigger;
            helpPinned = Boolean(pinned);
            elements.helpTitle.textContent = help.title;
            elements.helpCopy.textContent = help.copy;
            elements.helpPopover.hidden = false;
            trigger.setAttribute("aria-expanded", "true");
            positionHelpPopover(trigger);
        }

        function scheduleFieldHelp(trigger) {
            window.clearTimeout(helpHideTimer);
            window.clearTimeout(helpShowTimer);

            helpShowTimer = window.setTimeout(function () {
                showFieldHelp(trigger, false);
            }, 500);
        }

        function hideFieldHelp(force) {
            window.clearTimeout(helpShowTimer);
            window.clearTimeout(helpHideTimer);

            if (helpPinned && !force) {
                return;
            }

            if (activeHelpTrigger) {
                activeHelpTrigger.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }

            activeHelpTrigger = null;
            helpPinned = false;
            elements.helpPopover.hidden = true;
        }

        function scheduleFieldHelpHide() {
            window.clearTimeout(helpHideTimer);

            helpHideTimer = window.setTimeout(function () {
                hideFieldHelp(false);
            }, 160);
        }

        function toggleFieldHelp(event) {
            const trigger = event.currentTarget;
            const isOpen =
                activeHelpTrigger === trigger &&
                !elements.helpPopover.hidden &&
                helpPinned;

            event.preventDefault();

            if (isOpen) {
                hideFieldHelp(true);
                return;
            }

            showFieldHelp(trigger, true);
        }

        function setStatus(message) {
            window.clearTimeout(statusTimer);
            elements.status.textContent = message;

            if (!message) {
                return;
            }

            statusTimer = window.setTimeout(function () {
                elements.status.textContent = "";
            }, 3200);
        }

        function updateConditionalFields() {
            elements.interactionField.hidden =
                action.category !== "interaction";
            elements.skillField.hidden = action.roll !== "skill";
            elements.effectField.hidden = Boolean(action.roll);
            elements.tierFields.hidden = !action.roll;
        }

        function populateForm() {
            runtime.fields.forEach(function (field) {
                const control = elements.form.elements.namedItem(field);

                if (control) {
                    control.value = action[field] || "";
                }
            });

            updateConditionalFields();
        }

        function readForm() {
            const nextAction = {};

            runtime.fields.forEach(function (field) {
                const control = elements.form.elements.namedItem(field);

                nextAction[field] = control ? control.value : "";
            });

            action = runtime.createAction(nextAction);
        }

        function saveCard() {
            try {
                localStorage.setItem(
                    storageKey,
                    JSON.stringify(runtime.createPayload(action))
                );
            } catch (error) {
                setStatus(
                    "This browser could not save the current card."
                );
            }
        }

        function render() {
            runtime.render(
                elements.preview,
                action,
                {
                    emptyMessage:
                        "Add content to create an Action Card."
                }
            );
            elements.compactCode.value =
                runtime.encodeCompact(action);
            updateConditionalFields();
            saveCard();
        }

        function clearLibrarySelection() {
            elements.library.value = "custom";
        }

        function loadCard(nextAction, message, libraryValue = "custom") {
            action = runtime.createAction(nextAction);
            populateForm();
            render();
            elements.library.value = libraryValue;

            if (message) {
                setStatus(message);
            }
        }

        function restoreCard() {
            try {
                const value = localStorage.getItem(storageKey);

                if (!value) {
                    return false;
                }

                action = runtime.createAction(
                    validateImportedPayload(
                        runtime,
                        JSON.parse(value)
                    )
                );
                return true;
            } catch (error) {
                return false;
            }
        }

        function buildLibrary() {
            runtime.getLibrary().forEach(function (item) {
                const option = document.createElement("option");
                const prefix = item.group
                    ? item.group + " — "
                    : "";

                option.value = item.id;
                option.textContent = prefix + item.title;
                elements.library.append(option);
            });
        }

        function handleFormInput() {
            readForm();
            clearLibrarySelection();
            render();
        }

        function handleLibraryChange() {
            if (elements.library.value === "blank") {
                createBlankCard();
                return;
            }

            if (elements.library.value === "custom") {
                return;
            }

            const card = runtime.getCard(elements.library.value);

            if (!card) {
                return;
            }

            action = card;
            populateForm();
            render();
            setStatus("Loaded a card from the library.");
        }

        function createBlankCard() {
            loadCard(
                runtime.blankAction,
                "Created a blank Action Card.",
                "blank"
            );
            elements.form.elements.namedItem("title").focus();
        }

        function importCard(file) {
            if (!file) {
                return;
            }

            const reader = new FileReader();

            reader.addEventListener("load", function () {
                try {
                    const payload = JSON.parse(reader.result);
                    const imported = validateImportedPayload(
                        runtime,
                        payload
                    );

                    loadCard(
                        imported,
                        "Imported Action Card JSON."
                    );
                } catch (error) {
                    setStatus(
                        error.message || "Could not import the file."
                    );
                } finally {
                    elements.importInput.value = "";
                }
            });

            reader.addEventListener("error", function () {
                setStatus("Could not read the selected file.");
                elements.importInput.value = "";
            });

            reader.readAsText(file);
        }

        async function exportImage() {
            elements.imageButton.classList.add("is-loading");

            try {
                await runtime.exportPng(
                    action,
                    {
                        theme:
                            document.documentElement.dataset.theme,
                        highContrast:
                            document.documentElement.dataset.contrast ===
                            "high"
                    }
                );
                setStatus(
                    "Exported a 460px-wide PNG."
                );
            } catch (error) {
                setStatus(
                    error.message || "The PNG could not be exported."
                );
            } finally {
                elements.imageButton.classList.remove("is-loading");
            }
        }

        function openShareDialog() {
            elements.compactCode.value =
                runtime.encodeCompact(action);

            if (
                typeof elements.shareDialog.showModal ===
                "function"
            ) {
                elements.shareDialog.showModal();
            } else {
                elements.shareDialog.setAttribute("open", "");
            }

            elements.compactCode.focus();
            elements.compactCode.select();
        }

        function closeShareDialog() {
            if (
                typeof elements.shareDialog.close ===
                "function"
            ) {
                elements.shareDialog.close();
            } else {
                elements.shareDialog.removeAttribute("open");
            }
        }

        function loadCompactCode() {
            try {
                loadCard(
                    runtime.decodeCompact(
                        elements.compactCode.value
                    ),
                    "Opened the card from its share code."
                );
                closeShareDialog();
            } catch (error) {
                setStatus(
                    error.message || "The share code is invalid."
                );
            }
        }

        async function copyCompactCode() {
            const code = runtime.encodeCompact(action);

            elements.compactCode.value = code;

            try {
                await copyText(code);
                setStatus("Copied the share code.");
            } catch (error) {
                setStatus(
                    "Could not copy automatically. Select the share code manually."
                );
                elements.compactCode.focus();
                elements.compactCode.select();
            }
        }

        async function copyMarkdownDirective() {
            const code = runtime.encodeCompact(action);
            const markdown = ':::actioncard code="' +
                code +
                '"\n:::';

            try {
                await copyText(markdown);
                setStatus("Copied Action Card Markdown.");
            } catch (error) {
                setStatus(
                    "Could not copy the Markdown automatically."
                );
            }
        }

        function bindEvents() {
            elements.form.addEventListener(
                "input",
                handleFormInput
            );
            elements.form.addEventListener(
                "change",
                handleFormInput
            );
            elements.library.addEventListener(
                "change",
                handleLibraryChange
            );
            elements.newButton.addEventListener(
                "click",
                createBlankCard
            );
            elements.importButton.addEventListener(
                "click",
                function () {
                    elements.importInput.click();
                }
            );
            elements.importInput.addEventListener(
                "change",
                function () {
                    importCard(elements.importInput.files[0]);
                }
            );
            elements.exportButton.addEventListener(
                "click",
                function () {
                    downloadJson(runtime, action);
                    setStatus("Exported Action Card JSON.");
                }
            );
            elements.imageButton.addEventListener(
                "click",
                exportImage
            );
            elements.shareButton.addEventListener(
                "click",
                openShareDialog
            );
            elements.closeShareButton.addEventListener(
                "click",
                closeShareDialog
            );
            elements.shareDialog.addEventListener(
                "click",
                function (event) {
                    if (event.target === elements.shareDialog) {
                        closeShareDialog();
                    }
                }
            );
            elements.loadCodeButton.addEventListener(
                "click",
                loadCompactCode
            );
            elements.copyCodeButton.addEventListener(
                "click",
                copyCompactCode
            );
            elements.copyMarkdownButton.addEventListener(
                "click",
                copyMarkdownDirective
            );

            elements.helpTriggers.forEach(function (trigger) {
                trigger.setAttribute("aria-expanded", "false");
                trigger.addEventListener(
                    "mouseenter",
                    function () {
                        scheduleFieldHelp(trigger);
                    }
                );
                trigger.addEventListener(
                    "mouseleave",
                    scheduleFieldHelpHide
                );
                trigger.addEventListener(
                    "focus",
                    function () {
                        showFieldHelp(trigger, false);
                    }
                );
                trigger.addEventListener(
                    "blur",
                    scheduleFieldHelpHide
                );
                trigger.addEventListener(
                    "click",
                    toggleFieldHelp
                );
            });

            elements.helpPopover.addEventListener(
                "mouseenter",
                function () {
                    window.clearTimeout(helpHideTimer);
                }
            );
            elements.helpPopover.addEventListener(
                "mouseleave",
                scheduleFieldHelpHide
            );

            root.addEventListener("click", function (event) {
                if (
                    helpPinned &&
                    !event.target.closest(".js-builder-help") &&
                    !event.target.closest(
                        ".js-builder-help-popover"
                    )
                ) {
                    hideFieldHelp(true);
                }
            });

            root.addEventListener("keydown", function (event) {
                if (event.key === "Escape") {
                    hideFieldHelp(true);
                }
            });
        }

        function initialize() {
            buildLibrary();
            elements.library.value = "blank";
            populateForm();
            render();
            bindEvents();
        }

        initialize();

        return {
            getAction: function () {
                return runtime.createAction(action);
            }
        };
    }

    function mount(root) {
        if (!root) {
            throw new Error("The Action Card Builder root is missing.");
        }

        if (root.dataset.actioncardBuilderMounted === "true") {
            return activeController;
        }

        root.dataset.actioncardBuilderMounted = "true";
        activeController = createController(root);

        return activeController;
    }

    window.NakamaActionCardBuilder = {
        mount: mount
    };
}());
