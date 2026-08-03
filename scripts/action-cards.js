/*
Shared Action Card schema, renderer, compact codec, and image exporter.

Both the SRD Markdown renderer and the Action Card Builder use this file.
*/

(function () {
    "use strict";

    const fields = [
        "title",
        "phase",
        "category",
        "interactionName",
        "cost",
        "flavour",
        "usage",
        "actionCost",
        "keywords",
        "trigger",
        "duration",
        "area",
        "range",
        "requirement",
        "roll",
        "rollIcon",
        "skill",
        "target",
        "effect",
        "weak",
        "hit",
        "strong"
    ];

    const blankAction = fields.reduce(function (action, field) {
        action[field] = "";
        return action;
    }, {});

    const labels = {
        phase: {
            narrative: "Narrative",
            tactical: "Tactical",
            downtime: "Downtime"
        },
        category: {
            attack: "Attack",
            control: "Control",
            protect: "Protect",
            utility: "Utility",
            alteration: "Alteration"
        },
        usage: {
            atwill: "At-Will",
            scene: "Scene",
            episode: "Episode",
            passive: "Passive"
        },
        actionCost: {
            minor: {
                glyph: "\u2b16\ufe0e",
                label: "Minor action"
            },
            standard: {
                glyph: "\u25c6\ufe0e",
                label: "Standard action"
            },
            reaction: {
                glyph: "\u21a9\ufe0e",
                label: "Reaction"
            },
            free: {
                glyph: "\u25c7\ufe0e",
                label: "Free action"
            }
        },
        roll: {
            power: "Power Roll",
            attack: "Attack Roll",
            skill: "Skill Roll"
        }
    };

    const rollIcons = {
        melee: {
            character: "\u2694\ufe0e",
            label: "Melee"
        },
        ranged: {
            character: "\u27b6\ufe0e",
            label: "Ranged"
        }
    };

    const library = new Map();

    function normalizeText(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value).trim();
    }

    function normalizeCardCopy(value) {
        return normalizeText(value)
            .replace(/\r\n?/g, "\n")
            .replace(/\n{2,}/g, "\n");
    }

    function hasText(value) {
        return normalizeText(value) !== "";
    }

    function createAction(source) {
        const action = {
            ...blankAction
        };

        if (!source || typeof source !== "object") {
            return action;
        }

        fields.forEach(function (field) {
            if (Object.prototype.hasOwnProperty.call(source, field)) {
                action[field] = source[field] === null ||
                    source[field] === undefined
                    ? ""
                    : String(source[field]);
            }
        });

        if (action.roll === "instant") {
            action.roll = "";
        }

        return action;
    }

    function createTextElement(tagName, className, text) {
        const element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        element.textContent = text;
        return element;
    }

    function formatCategory(action) {
        if (action.category === "interaction") {
            const powerName = normalizeText(action.interactionName);

            return powerName ? powerName + " Interaction" : "";
        }

        return labels.category[action.category] || "";
    }

    function createRollValue(action) {
        const wrapper = document.createElement("span");
        const icon = rollIcons[action.rollIcon];
        let rollText = labels.roll[action.roll] || "";

        wrapper.className = "actioncard-rollcontent";

        if (icon) {
            const iconElement = createTextElement(
                "span",
                "actioncard-rollicon",
                icon.character
            );

            iconElement.setAttribute("role", "img");
            iconElement.setAttribute("aria-label", icon.label);
            iconElement.title = icon.label;
            wrapper.append(iconElement);
        }

        if (action.roll === "skill" && hasText(action.skill)) {
            rollText = normalizeText(action.skill);
        }

        wrapper.append(createTextElement("span", "", rollText));
        return wrapper;
    }

    function renderHeader(action) {
        const title = normalizeText(action.title);
        const metaValues = [
            labels.phase[action.phase] || "",
            formatCategory(action),
            normalizeText(action.cost)
        ].filter(hasText);

        if (!title && metaValues.length === 0) {
            return null;
        }

        const header = document.createElement("header");
        header.className = "actioncard-header";

        if (title) {
            header.append(
                createTextElement("h3", "actioncard-title", title)
            );
        } else {
            header.append(document.createElement("span"));
        }

        if (metaValues.length > 0) {
            const meta = document.createElement("div");

            meta.className = "actioncard-meta";
            meta.setAttribute("aria-label", "Action metadata");

            metaValues.forEach(function (value) {
                meta.append(createTextElement("span", "", value));
            });

            header.append(meta);
        }

        return header;
    }

    function renderFlavour(action) {
        if (!hasText(action.flavour)) {
            return null;
        }

        return createTextElement(
            "p",
            "actioncard-flavour",
            normalizeText(action.flavour)
        );
    }

    function renderUsage(action) {
        const nodes = [];
        const usageLabel = labels.usage[action.usage] || "";
        const actionCost = labels.actionCost[action.actionCost];

        if (usageLabel) {
            nodes.push(createTextElement("span", "", usageLabel));
        }

        if (actionCost) {
            const glyph = createTextElement(
                "span",
                "actioncard-glyph",
                actionCost.glyph
            );

            glyph.setAttribute("role", "img");
            glyph.setAttribute("aria-label", actionCost.label);
            glyph.title = actionCost.label;
            nodes.push(glyph);
        }

        if (hasText(action.keywords)) {
            nodes.push(
                createTextElement(
                    "span",
                    "",
                    normalizeText(action.keywords)
                )
            );
        }

        if (nodes.length === 0) {
            return null;
        }

        const row = document.createElement("div");
        row.className = "actioncard-usage";
        row.append(...nodes);

        return row;
    }

    function renderProperty(label, value) {
        if (!hasText(value)) {
            return null;
        }

        const property = document.createElement("p");
        property.className = "actioncard-property";

        property.append(
            createTextElement(
                "span",
                "actioncard-property-label",
                label + ": "
            ),
            createTextElement(
                "span",
                "",
                normalizeCardCopy(value)
            )
        );

        return property;
    }

    function renderStats(action) {
        const stats = [
            {
                label: "Duration",
                value: action.duration
            },
            {
                label: "Area",
                value: action.area
            },
            {
                label: "Range",
                value: action.range
            }
        ].filter(function (item) {
            return hasText(item.value);
        });

        if (stats.length === 0) {
            return null;
        }

        const row = document.createElement("div");
        row.className = "actioncard-stats";

        stats.forEach(function (item) {
            const stat = document.createElement("div");

            stat.className = "actioncard-stat";
            stat.append(
                createTextElement(
                    "span",
                    "actioncard-stat-value",
                    normalizeText(item.value)
                ),
                createTextElement(
                    "span",
                    "actioncard-stat-label",
                    item.label
                )
            );
            row.append(stat);
        });

        return row;
    }

    function renderRollRow(action) {
        const items = [];

        if (hasText(action.roll)) {
            const roll = document.createElement("div");

            roll.className = "actioncard-rollitem";
            roll.append(
                createTextElement(
                    "span",
                    "actioncard-rolllabel",
                    "Roll"
                ),
                createRollValue(action)
            );
            items.push(roll);
        }

        if (hasText(action.target)) {
            const target = document.createElement("div");

            target.className = "actioncard-rollitem";
            target.append(
                createTextElement(
                    "span",
                    "actioncard-rolllabel",
                    "Target"
                ),
                createTextElement(
                    "span",
                    "actioncard-rollvalue",
                    normalizeText(action.target)
                )
            );
            items.push(target);
        }

        if (items.length === 0) {
            return null;
        }

        const row = document.createElement("div");

        row.className = "actioncard-rollrow";
        row.append(...items);

        return row;
    }

    function renderResolution(label, value) {
        if (!hasText(value)) {
            return null;
        }

        const section = document.createElement("section");

        section.className = "actioncard-resolution";
        section.append(
            createTextElement(
                "h4",
                "actioncard-resolution-label",
                label + ":"
            ),
            createTextElement(
                "p",
                "actioncard-resolution-copy",
                normalizeCardCopy(value)
            )
        );

        return section;
    }

    function renderResolutions(action) {
        const fragment = document.createDocumentFragment();

        if (!hasText(action.roll)) {
            const effect = renderResolution("Effect", action.effect);

            if (effect) {
                fragment.append(effect);
            }

            return fragment;
        }

        [
            ["Weak Hit", action.weak],
            ["Hit", action.hit],
            ["Strong Hit", action.strong]
        ].forEach(function (entry) {
            const resolution = renderResolution(entry[0], entry[1]);

            if (resolution) {
                fragment.append(resolution);
            }
        });

        return fragment;
    }

    function createCardElement(source, options = {}) {
        const action = createAction(source);
        const article = document.createElement("article");
        const header = renderHeader(action);
        const body = document.createElement("div");
        const emptyMessage = options.emptyMessage || "";

        article.className = "actioncard usage-" +
            (action.usage || "atwill");
        article.setAttribute(
            "aria-label",
            action.title
                ? action.title + " Action Card"
                : "Action Card"
        );

        body.className = "actioncard-body";

        [
            renderFlavour(action),
            renderUsage(action),
            renderProperty("Trigger", action.trigger),
            renderStats(action),
            renderProperty("Requirement", action.requirement),
            renderRollRow(action)
        ].forEach(function (section) {
            if (section) {
                body.append(section);
            }
        });

        body.append(renderResolutions(action));

        if (!header && body.childElementCount === 0) {
            if (emptyMessage) {
                article.append(
                    createTextElement(
                        "p",
                        "actioncard-empty-note",
                        emptyMessage
                    )
                );
            }

            return article;
        }

        if (header) {
            article.append(header);
        }

        if (body.childElementCount > 0) {
            article.append(body);
        }

        return article;
    }

    function render(target, source, options = {}) {
        const card = createCardElement(source, options);

        target.replaceChildren(card);
        return card;
    }

    function renderToString(source, options = {}) {
        return createCardElement(source, options).outerHTML;
    }

    function setLibrary(payload) {
        const cards = Array.isArray(payload)
            ? payload
            : payload?.cards;

        library.clear();

        if (!Array.isArray(cards)) {
            throw new Error("cards.json must include a cards array.");
        }

        cards.forEach(function (item) {
            const id = normalizeText(item.id || item.key);
            const action = item.action || item.card || item;

            if (!id) {
                return;
            }

            library.set(id, {
                id: id,
                group: normalizeText(item.group),
                title: normalizeText(item.title) ||
                    normalizeText(action.title) ||
                    id,
                action: createAction(action)
            });
        });

        return getLibrary();
    }

    async function loadLibrary(path) {
        const response = await fetch(path, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Could not load " + path + ".");
        }

        return setLibrary(await response.json());
    }

    function getLibrary() {
        return Array.from(library.values()).map(function (item) {
            return {
                ...item,
                action: createAction(item.action)
            };
        });
    }

    function getCard(id) {
        const item = library.get(normalizeText(id));

        return item ? createAction(item.action) : null;
    }

    function parseFieldBlock(content) {
        const source = normalizeText(content);

        if (!source) {
            return {};
        }

        if (source.startsWith("{")) {
            const parsed = JSON.parse(source);

            return parsed.action && typeof parsed.action === "object"
                ? parsed.action
                : parsed;
        }

        const lines = source.split(/\r?\n/);
        const action = {};
        let index = 0;

        while (index < lines.length) {
            const line = lines[index];
            const match = line.match(
                /^([A-Za-z][A-Za-z0-9]*):(?:[ \t]*(.*))?$/
            );

            if (!match) {
                index += 1;
                continue;
            }

            const field = match[1];
            const value = match[2] || "";

            if (!fields.includes(field)) {
                index += 1;
                continue;
            }

            if (value !== "|" && value !== ">") {
                action[field] = value;
                index += 1;
                continue;
            }

            const block = [];
            index += 1;

            while (index < lines.length) {
                const nextLine = lines[index];
                const nextField = nextLine.match(
                    /^([A-Za-z][A-Za-z0-9]*):(?:[ \t]*(.*))?$/
                );

                if (nextField && fields.includes(nextField[1])) {
                    break;
                }

                block.push(
                    nextLine
                        .replace(/^\t/, "")
                        .replace(/^ {4}/, "")
                );
                index += 1;
            }

            action[field] = value === ">"
                ? block.join(" ").replace(/\s+/g, " ").trim()
                : block.join("\n").trim();
        }

        return action;
    }

    function resolveDefinition(attrs = {}, content = "") {
        let action = createAction();
        const id = normalizeText(attrs.id);
        const code = normalizeText(attrs.code);

        if (id) {
            const stored = getCard(id);

            if (!stored) {
                throw new Error(
                    'Action Card "' + id + '" was not found in cards.json.'
                );
            }

            action = stored;
        }

        if (code) {
            action = decodeCompact(code);
        }

        return createAction({
            ...action,
            ...parseFieldBlock(content)
        });
    }

    function encodeBase64Url(value) {
        const bytes = new TextEncoder().encode(value);
        let binary = "";

        for (let index = 0; index < bytes.length; index += 1) {
            binary += String.fromCharCode(bytes[index]);
        }

        return window.btoa(binary)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    }

    function decodeBase64Url(value) {
        const normalized = value
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const padding = "=".repeat((4 - normalized.length % 4) % 4);
        const binary = window.atob(normalized + padding);
        const bytes = Uint8Array.from(binary, function (character) {
            return character.charCodeAt(0);
        });

        return new TextDecoder().decode(bytes);
    }

    function encodeCompact(source) {
        const action = createAction(source);
        const values = fields.map(function (field) {
            return action[field];
        });

        while (values.length && values[values.length - 1] === "") {
            values.pop();
        }

        return "nac1." + encodeBase64Url(JSON.stringify(values));
    }

    function decodeCompact(code) {
        const value = normalizeText(code);

        if (!value.startsWith("nac1.")) {
            throw new Error("This is not a supported Action Card code.");
        }

        const values = JSON.parse(
            decodeBase64Url(value.slice("nac1.".length))
        );

        if (!Array.isArray(values)) {
            throw new Error("The Action Card code is malformed.");
        }

        const action = {};

        fields.forEach(function (field, index) {
            action[field] = values[index] || "";
        });

        return createAction(action);
    }

    function createPayload(source) {
        return {
            version: 1,
            type: "action-card",
            action: createAction(source)
        };
    }

    function sanitizeFileName(value) {
        const normalized = normalizeText(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        return normalized || "nakama-action-card";
    }

    function getExportPalette(theme, highContrast) {
        const dark = theme === "dark";

        return {
            paper: dark ? "#171a1f" : "#fffef8",
            flavour: dark ? "#22262c" : "#f2f0e7",
            text: highContrast
                ? dark ? "#fff" : "#000"
                : dark ? "#f2f3f1" : "#111",
            muted: highContrast
                ? dark ? "#fff" : "#000"
                : dark ? "#c9cdd2" : "#333",
            border: dark ? "#3c424a" : "#d8d4c8",
            subtle: dark ? "#9da3ab" : "#686e67",
            surfaceLow: dark ? "#22262c" : "#f3f3ee"
        };
    }

    function getExportUsageColour(action) {
        const colours = {
            atwill: "#3f744b",
            scene: "#a20f38",
            episode: "#686868",
            passive: "#674d88"
        };

        return colours[action.usage] || colours.atwill;
    }

    function getCanvasFont(options = {}) {
        const style = options.style ? options.style + " " : "";
        const weight = options.weight ? options.weight + " " : "";
        const size = options.size || 12;
        const family = options.family || "Arial, Helvetica, sans-serif";

        return style + weight + size + "px " + family;
    }

    function createCanvasTextStyle(options = {}) {
        return {
            font: getCanvasFont(options),
            colour: options.colour || "#111"
        };
    }

    function appendCanvasFragment(line, text, style, width) {
        const previous = line.fragments[line.fragments.length - 1];

        if (
            previous &&
            previous.font === style.font &&
            previous.colour === style.colour
        ) {
            previous.text += text;
            previous.width += width;
        } else {
            line.fragments.push({
                text: text,
                font: style.font,
                colour: style.colour,
                width: width
            });
        }

        line.width += width;
    }

    function breakCanvasWord(context, word, style, maxWidth) {
        const pieces = [];
        let current = "";
        let currentWidth = 0;

        Array.from(word).forEach(function (character) {
            context.font = style.font;

            const characterWidth = context.measureText(character).width;

            if (
                current &&
                currentWidth + characterWidth > maxWidth
            ) {
                pieces.push({
                    text: current,
                    width: currentWidth
                });
                current = "";
                currentWidth = 0;
            }

            current += character;
            currentWidth += characterWidth;
        });

        if (current) {
            pieces.push({
                text: current,
                width: currentWidth
            });
        }

        return pieces;
    }

    function wrapCanvasSegments(context, segments, maxWidth) {
        const lines = [];
        let line = {
            fragments: [],
            width: 0
        };
        let pendingSpace = null;

        function finishLine(force) {
            if (line.fragments.length > 0 || force) {
                lines.push(line);
            }

            line = {
                fragments: [],
                width: 0
            };
            pendingSpace = null;
        }

        segments.forEach(function (segment) {
            const style = segment.style;
            const parts = String(segment.text).split(/(\n|\s+)/);

            parts.forEach(function (part) {
                if (!part) {
                    return;
                }

                if (part === "\n") {
                    finishLine(true);
                    return;
                }

                if (/^\s+$/.test(part)) {
                    if (line.fragments.length > 0) {
                        context.font = style.font;
                        pendingSpace = {
                            style: style,
                            text: " ",
                            width: context.measureText(" ").width
                        };
                    }

                    return;
                }

                context.font = style.font;

                const wordWidth = context.measureText(part).width;
                const spaceWidth = pendingSpace
                    ? pendingSpace.width
                    : 0;

                if (
                    line.fragments.length > 0 &&
                    line.width + spaceWidth + wordWidth > maxWidth
                ) {
                    finishLine(false);
                }

                if (pendingSpace && line.fragments.length > 0) {
                    appendCanvasFragment(
                        line,
                        pendingSpace.text,
                        pendingSpace.style,
                        pendingSpace.width
                    );
                }

                pendingSpace = null;

                if (wordWidth <= maxWidth) {
                    appendCanvasFragment(
                        line,
                        part,
                        style,
                        wordWidth
                    );
                    return;
                }

                breakCanvasWord(
                    context,
                    part,
                    style,
                    maxWidth
                ).forEach(function (piece, index, pieces) {
                    if (
                        line.fragments.length > 0 &&
                        line.width + piece.width > maxWidth
                    ) {
                        finishLine(false);
                    }

                    appendCanvasFragment(
                        line,
                        piece.text,
                        style,
                        piece.width
                    );

                    if (index < pieces.length - 1) {
                        finishLine(false);
                    }
                });
            });
        });

        if (line.fragments.length > 0 || lines.length === 0) {
            lines.push(line);
        }

        return lines;
    }

    function drawCanvasLines(
        context,
        lines,
        x,
        y,
        lineHeight,
        options = {}
    ) {
        const align = options.align || "left";
        const width = options.width || 0;
        const continuationIndent = options.continuationIndent || 0;

        lines.forEach(function (line, lineIndex) {
            let cursorX = x;
            const baseline = y + lineHeight * (lineIndex + 1);

            if (align === "right") {
                cursorX = x + width - line.width;
            } else if (lineIndex > 0) {
                cursorX += continuationIndent;
            }

            line.fragments.forEach(function (fragment) {
                context.font = fragment.font;
                context.fillStyle = fragment.colour;
                context.fillText(
                    fragment.text,
                    cursorX,
                    baseline
                );
                cursorX += fragment.width;
            });
        });

        return lines.length * lineHeight;
    }

    function layoutCanvasText(
        context,
        segments,
        x,
        y,
        maxWidth,
        lineHeight,
        options = {}
    ) {
        const continuationIndent = options.continuationIndent || 0;
        const wrapWidth = continuationIndent > 0
            ? maxWidth - continuationIndent
            : maxWidth;
        const lines = wrapCanvasSegments(
            context,
            segments,
            Math.max(1, wrapWidth)
        );

        if (options.draw) {
            drawCanvasLines(
                context,
                lines,
                x,
                y,
                lineHeight,
                {
                    align: options.align,
                    width: maxWidth,
                    continuationIndent: continuationIndent
                }
            );
        }

        return {
            height: lines.length * lineHeight,
            lines: lines
        };
    }

    function getCanvasActionMeta(action) {
        return [
            labels.phase[action.phase] || "",
            formatCategory(action),
            normalizeText(action.cost)
        ].filter(hasText);
    }

    function renderCanvasHeader(
        context,
        action,
        palette,
        width,
        y,
        draw
    ) {
        const title = normalizeText(action.title);
        const metaValues = getCanvasActionMeta(action);

        if (!title && metaValues.length === 0) {
            return {
                height: 0,
                y: y
            };
        }

        const innerWidth = width - 18;
        const titleStyle = createCanvasTextStyle({
            family: 'Georgia, "Times New Roman", serif',
            size: 14,
            weight: "700",
            colour: "#fff"
        });
        const metaStyle = createCanvasTextStyle({
            family: 'Georgia, "Times New Roman", serif',
            size: 10,
            weight: "700",
            colour: "#fff"
        });
        const metaText = metaValues.join(" ");
        let titleWidth = innerWidth;
        let metaWidth = 0;
        let metaLayout = null;

        if (metaText) {
            context.font = metaStyle.font;
            metaWidth = Math.min(
                320,
                Math.max(
                    72,
                    Math.ceil(context.measureText(metaText).width)
                )
            );

            if (title) {
                metaWidth = Math.min(
                    metaWidth,
                    Math.max(120, innerWidth - 96)
                );
                titleWidth = Math.max(
                    72,
                    innerWidth - metaWidth - 8
                );
            } else {
                metaWidth = innerWidth;
            }

            metaLayout = layoutCanvasText(
                context,
                [
                    {
                        text: metaText,
                        style: metaStyle
                    }
                ],
                9 + titleWidth + (title ? 8 : 0),
                y + 3,
                metaWidth,
                10.5,
                {
                    align: "right",
                    draw: false
                }
            );
        }

        const titleLayout = title
            ? layoutCanvasText(
                context,
                [
                    {
                        text: title,
                        style: titleStyle
                    }
                ],
                9,
                y + 3,
                titleWidth,
                14.7,
                {
                    draw: false
                }
            )
            : {
                height: 0
            };
        const contentHeight = Math.max(
            titleLayout.height,
            metaLayout ? metaLayout.height : 0
        );
        const height = Math.max(22, Math.ceil(contentHeight + 6));

        if (draw) {
            context.fillStyle = getExportUsageColour(action);
            context.fillRect(1, y, width - 2, height);

            if (title) {
                layoutCanvasText(
                    context,
                    [
                        {
                            text: title,
                            style: titleStyle
                        }
                    ],
                    9,
                    y + 3,
                    titleWidth,
                    14.7,
                    {
                        draw: true
                    }
                );
            }

            if (metaText) {
                layoutCanvasText(
                    context,
                    [
                        {
                            text: metaText,
                            style: metaStyle
                        }
                    ],
                    title
                        ? 9 + titleWidth + 8
                        : 9,
                    y + 3,
                    metaWidth,
                    10.5,
                    {
                        align: "right",
                        draw: true
                    }
                );
            }
        }

        return {
            height: height,
            y: y + height
        };
    }

    function renderCanvasFlavour(
        context,
        action,
        palette,
        width,
        y,
        draw
    ) {
        if (!hasText(action.flavour)) {
            return {
                height: 0,
                y: y
            };
        }

        const style = createCanvasTextStyle({
            family: 'Georgia, "Times New Roman", serif',
            size: 11,
            style: "italic",
            colour: palette.muted
        });
        const layout = layoutCanvasText(
            context,
            [
                {
                    text: normalizeText(action.flavour),
                    style: style
                }
            ],
            9,
            y + 2,
            width - 18,
            11.55,
            {
                draw: false
            }
        );
        const height = Math.ceil(layout.height + 4);

        if (draw) {
            context.fillStyle = palette.flavour;
            context.fillRect(1, y, width - 2, height);
            layoutCanvasText(
                context,
                [
                    {
                        text: normalizeText(action.flavour),
                        style: style
                    }
                ],
                9,
                y + 2,
                width - 18,
                11.55,
                {
                    draw: true
                }
            );
        }

        return {
            height: height,
            y: y + height
        };
    }

    function renderCanvasParagraph(
        context,
        segments,
        width,
        y,
        draw,
        options = {}
    ) {
        const x = options.x || 13;
        const right = options.right || 9;
        const lineHeight = options.lineHeight || 12.5;
        const continuationIndent = options.continuationIndent || 0;
        const top = options.top || 0;
        const layout = layoutCanvasText(
            context,
            segments,
            x,
            y + top,
            width - x - right,
            lineHeight,
            {
                continuationIndent: continuationIndent,
                draw: false
            }
        );
        const height = Math.ceil(layout.height + top);

        if (draw) {
            layoutCanvasText(
                context,
                segments,
                x,
                y + top,
                width - x - right,
                lineHeight,
                {
                    continuationIndent: continuationIndent,
                    draw: true
                }
            );
        }

        return {
            height: height,
            y: y + height
        };
    }

    function renderCanvasUsage(
        context,
        action,
        palette,
        width,
        y,
        draw
    ) {
        const values = [];
        const usageLabel = labels.usage[action.usage] || "";
        const actionCost = labels.actionCost[action.actionCost];
        const style = createCanvasTextStyle({
            size: 12,
            weight: "700",
            colour: palette.text
        });
        const glyphStyle = createCanvasTextStyle({
            family:
                '"DejaVu Sans", "Arial Unicode MS", Arial, sans-serif',
            size: 12,
            colour: palette.text
        });

        if (usageLabel) {
            values.push({
                text: usageLabel,
                style: style
            });
        }

        if (actionCost) {
            if (values.length > 0) {
                values.push({
                    text: " ",
                    style: style
                });
            }

            values.push({
                text: actionCost.glyph,
                style: glyphStyle
            });
        }

        if (hasText(action.keywords)) {
            if (values.length > 0) {
                values.push({
                    text: " ",
                    style: style
                });
            }

            values.push({
                text: normalizeText(action.keywords),
                style: style
            });
        }

        if (values.length === 0) {
            return {
                height: 0,
                y: y
            };
        }

        return renderCanvasParagraph(
            context,
            values,
            width,
            y,
            draw,
            {
                top: 1,
                lineHeight: 13
            }
        );
    }

    function renderCanvasProperty(
        context,
        label,
        value,
        palette,
        width,
        y,
        draw
    ) {
        if (!hasText(value)) {
            return {
                height: 0,
                y: y
            };
        }

        const labelStyle = createCanvasTextStyle({
            size: 12,
            weight: "700",
            colour: palette.text
        });
        const textStyle = createCanvasTextStyle({
            size: 12,
            colour: palette.text
        });

        return renderCanvasParagraph(
            context,
            [
                {
                    text: label + ": ",
                    style: labelStyle
                },
                {
                    text: normalizeCardCopy(value),
                    style: textStyle
                }
            ],
            width,
            y,
            draw,
            {
                continuationIndent: 9,
                lineHeight: 12.5
            }
        );
    }

    function renderCanvasStats(
        context,
        action,
        palette,
        width,
        y,
        draw
    ) {
        const stats = [
            {
                label: "Duration",
                value: action.duration
            },
            {
                label: "Area",
                value: action.area
            },
            {
                label: "Range",
                value: action.range
            }
        ].filter(function (item) {
            return hasText(item.value);
        });

        if (stats.length === 0) {
            return {
                height: 0,
                y: y
            };
        }

        const labelStyle = createCanvasTextStyle({
            size: 12,
            weight: "700",
            colour: palette.text
        });
        const textStyle = createCanvasTextStyle({
            size: 12,
            colour: palette.text
        });
        const segments = [];

        stats.forEach(function (item, index) {
            if (index > 0) {
                segments.push({
                    text: "     ",
                    style: textStyle
                });
            }

            segments.push(
                {
                    text: item.label + ": ",
                    style: labelStyle
                },
                {
                    text: normalizeText(item.value),
                    style: textStyle
                }
            );
        });

        return renderCanvasParagraph(
            context,
            segments,
            width,
            y,
            draw
        );
    }

    function renderCanvasRollRow(
        context,
        action,
        palette,
        width,
        y,
        draw
    ) {
        const segments = [];
        const labelStyle = createCanvasTextStyle({
            size: 12,
            weight: "700",
            colour: palette.text
        });
        const textStyle = createCanvasTextStyle({
            size: 12,
            colour: palette.text
        });
        const glyphStyle = createCanvasTextStyle({
            family:
                '"DejaVu Sans", "Arial Unicode MS", Arial, sans-serif',
            size: 12,
            colour: palette.text
        });

        if (hasText(action.roll)) {
            let rollText = labels.roll[action.roll] || "";

            if (action.roll === "skill" && hasText(action.skill)) {
                rollText = normalizeText(action.skill);
            }

            segments.push({
                text: "Roll: ",
                style: labelStyle
            });

            if (rollIcons[action.rollIcon]) {
                segments.push(
                    {
                        text: rollIcons[action.rollIcon].character + " ",
                        style: glyphStyle
                    }
                );
            }

            segments.push({
                text: rollText,
                style: textStyle
            });
        }

        if (hasText(action.target)) {
            if (segments.length > 0) {
                segments.push({
                    text: "     ",
                    style: textStyle
                });
            }

            segments.push(
                {
                    text: "Target: ",
                    style: labelStyle
                },
                {
                    text: normalizeText(action.target),
                    style: textStyle
                }
            );
        }

        if (segments.length === 0) {
            return {
                height: 0,
                y: y
            };
        }

        return renderCanvasParagraph(
            context,
            segments,
            width,
            y,
            draw
        );
    }

    function renderCanvasResolution(
        context,
        label,
        value,
        palette,
        width,
        y,
        draw
    ) {
        if (!hasText(value)) {
            return {
                height: 0,
                y: y
            };
        }

        const labelStyle = createCanvasTextStyle({
            size: 12,
            weight: "700",
            colour: palette.text
        });
        const textStyle = createCanvasTextStyle({
            size: 12,
            colour: palette.text
        });

        return renderCanvasParagraph(
            context,
            [
                {
                    text: label + ": ",
                    style: labelStyle
                },
                {
                    text: normalizeCardCopy(value),
                    style: textStyle
                }
            ],
            width,
            y,
            draw,
            {
                continuationIndent: 9,
                lineHeight: 12.5
            }
        );
    }

    function renderCanvasBody(
        context,
        action,
        palette,
        width,
        y,
        draw
    ) {
        const sections = [];
        let cursorY = y;

        function addSection(renderer) {
            const result = renderer(cursorY);

            sections.push(result);
            cursorY = result.y;
        }

        addSection(function (sectionY) {
            return renderCanvasUsage(
                context,
                action,
                palette,
                width,
                sectionY,
                draw
            );
        });

        addSection(function (sectionY) {
            return renderCanvasProperty(
                context,
                "Trigger",
                action.trigger,
                palette,
                width,
                sectionY,
                draw
            );
        });

        addSection(function (sectionY) {
            return renderCanvasStats(
                context,
                action,
                palette,
                width,
                sectionY,
                draw
            );
        });

        addSection(function (sectionY) {
            return renderCanvasProperty(
                context,
                "Requirement",
                action.requirement,
                palette,
                width,
                sectionY,
                draw
            );
        });

        addSection(function (sectionY) {
            return renderCanvasRollRow(
                context,
                action,
                palette,
                width,
                sectionY,
                draw
            );
        });

        if (!hasText(action.roll)) {
            addSection(function (sectionY) {
                return renderCanvasResolution(
                    context,
                    "Effect",
                    action.effect,
                    palette,
                    width,
                    sectionY,
                    draw
                );
            });
        } else {
            [
                ["Weak Hit", action.weak],
                ["Hit", action.hit],
                ["Strong Hit", action.strong]
            ].forEach(function (entry) {
                addSection(function (sectionY) {
                    return renderCanvasResolution(
                        context,
                        entry[0],
                        entry[1],
                        palette,
                        width,
                        sectionY,
                        draw
                    );
                });
            });
        }

        return {
            height: cursorY - y,
            y: cursorY
        };
    }

    function hasCanvasCardContent(action) {
        return fields.some(function (field) {
            return hasText(action[field]);
        });
    }

    function renderCanvasEmptyNote(
        context,
        palette,
        width,
        y,
        draw
    ) {
        const style = createCanvasTextStyle({
            size: 11,
            colour: palette.subtle
        });
        const text = "Add content to create an Action Card.";
        const layout = layoutCanvasText(
            context,
            [
                {
                    text: text,
                    style: style
                }
            ],
            9,
            y + 8,
            width - 18,
            13,
            {
                draw: false
            }
        );
        const height = Math.ceil(layout.height + 16);

        if (draw) {
            context.fillStyle = palette.surfaceLow;
            context.fillRect(1, y, width - 2, height);
            layoutCanvasText(
                context,
                [
                    {
                        text: text,
                        style: style
                    }
                ],
                9,
                y + 8,
                width - 18,
                13,
                {
                    draw: true
                }
            );
        }

        return {
            height: height,
            y: y + height
        };
    }

    function renderActionCardCanvas(
        context,
        action,
        palette,
        width,
        draw
    ) {
        let cursorY = 1;

        if (draw) {
            context.textBaseline = "alphabetic";
            context.fillStyle = palette.paper;
            context.fillRect(0, 0, width, context.canvas.height);
        }

        if (!hasCanvasCardContent(action)) {
            cursorY = renderCanvasEmptyNote(
                context,
                palette,
                width,
                cursorY,
                draw
            ).y;
        } else {
            cursorY = renderCanvasHeader(
                context,
                action,
                palette,
                width,
                cursorY,
                draw
            ).y;
            cursorY = renderCanvasFlavour(
                context,
                action,
                palette,
                width,
                cursorY,
                draw
            ).y;
            cursorY = renderCanvasBody(
                context,
                action,
                palette,
                width,
                cursorY,
                draw
            ).y;
        }

        const height = Math.max(2, Math.ceil(cursorY + 1));

        if (draw) {
            context.strokeStyle = palette.border;
            context.lineWidth = 1;
            context.strokeRect(
                0.5,
                0.5,
                width - 1,
                height - 1
            );
        }

        return height;
    }

    function downloadCanvasPng(canvas, fileName) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (!blob) {
                    reject(
                        new Error("The PNG could not be created.")
                    );
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");

                link.href = url;
                link.download = fileName;
                document.body.append(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                resolve();
            }, "image/png");
        });
    }

    function exportPng(source, options = {}) {
        const action = createAction(source);
        const theme = options.theme === "dark" ? "dark" : "light";
        const width = 460;
        const palette = getExportPalette(
            theme,
            options.highContrast === true
        );
        const measurementCanvas = document.createElement("canvas");
        const measurementContext = measurementCanvas.getContext("2d");
        const height = renderActionCardCanvas(
            measurementContext,
            action,
            palette,
            width,
            false
        );
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;

        renderActionCardCanvas(
            context,
            action,
            palette,
            width,
            true
        );

        return downloadCanvasPng(
            canvas,
            sanitizeFileName(action.title) + ".png"
        );
    }

    window.NakamaActionCards = {
        version: 1,
        type: "action-card",
        fields: fields.slice(),
        blankAction: {
            ...blankAction
        },
        labels: labels,
        createAction: createAction,
        createCardElement: createCardElement,
        render: render,
        renderToString: renderToString,
        setLibrary: setLibrary,
        loadLibrary: loadLibrary,
        getLibrary: getLibrary,
        getCard: getCard,
        parseFieldBlock: parseFieldBlock,
        resolveDefinition: resolveDefinition,
        encodeCompact: encodeCompact,
        decodeCompact: decodeCompact,
        createPayload: createPayload,
        sanitizeFileName: sanitizeFileName,
        exportPng: exportPng
    };
}());
