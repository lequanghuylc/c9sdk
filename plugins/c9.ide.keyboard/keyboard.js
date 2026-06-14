define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "layout", "ui", "commands", "tabManager"
    ];
    main.provides = ["keyboard"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var layout = imports.layout;
        var ui = imports.ui;
        var commands = imports.commands;
        var tabs = imports.tabManager;

        try {
            console.log("[keyboard] Plugin loading...");
            
            var plugin = new Plugin("Ajax.org", main.consumes);
            var emit = plugin.getEmitter();

            var keyboardBar, keyboardOverlay, isVisible = false;
            var isDragging = false;
            var dragOffset = { x: 0, y: 0 };
            var dragTarget = null;
            var modifierState = { ctrl: false, alt: false, meta: false };

            // Insert CSS for keyboard button
            ui.insertCss([
                ".keyboard-btn {",
                "    font-size: 11px !important;",
                "    padding: 2px 6px !important;",
                "}",
                "#c9-dev-keyboard button:hover {",
                "    background: #555 !important;",
                "}",
                "#c9-dev-keyboard button:active {",
                "    background: #666 !important;",
                "}",
            ].join("\n"), null, plugin);

            // Key definitions
            var keyDefs = [
                { label: "F1", keyCode: 112, key: "F1", send: "\x1bOP" },
                { label: "F2", keyCode: 113, key: "F2", send: "\x1bOQ" },
                { label: "F3", keyCode: 114, key: "F3", send: "\x1bOR" },
                { label: "F4", keyCode: 115, key: "F4", send: "\x1bOS" },
                { label: "F5", keyCode: 116, key: "F5", send: "\x1b[15~" },
                { label: "F6", keyCode: 117, key: "F6", send: "\x1b[17~" },
                { label: "F7", keyCode: 118, key: "F7", send: "\x1b[18~" },
                { label: "F8", keyCode: 119, key: "F8", send: "\x1b[19~" },
                { label: "F9", keyCode: 120, key: "F9", send: "\x1b[20~" },
                { label: "F10", keyCode: 121, key: "F10", send: "\x1b[21~" },
                { label: "F11", keyCode: 122, key: "F11", send: "\x1b[23~" },
                { label: "F12", keyCode: 123, key: "F12", send: "\x1b[24~" },
                { label: "Esc", keyCode: 27, key: "Escape", send: "\x1b" },
                { label: "Tab", keyCode: 9, key: "Tab", send: "\t" },
                { label: "Backspace", keyCode: 8, key: "Backspace", send: "\x7f" },
                { label: "Delete", keyCode: 46, key: "Delete", send: "\x1b[3~" },
                { label: "Home", keyCode: 36, key: "Home", send: "\x1b[1~" },
                { label: "End", keyCode: 35, key: "End", send: "\x1b[4~" },
                { label: "PgUp", keyCode: 33, key: "PageUp", send: "\x1b[5~" },
                { label: "PgDn", keyCode: 34, key: "PageDown", send: "\x1b[6~" },
                { label: "Ctrl", keyCode: 17, key: "Control", isModifier: true },
                { label: "Alt", keyCode: 18, key: "Alt", isModifier: true },
                { label: "Cmd", keyCode: 91, key: "Meta", isModifier: true },
                { label: "↑", keyCode: 38, key: "ArrowUp", send: "\x1b[A" },
                { label: "↓", keyCode: 40, key: "ArrowDown", send: "\x1b[B" },
                { label: "←", keyCode: 37, key: "ArrowLeft", send: "\x1b[D" },
                { label: "→", keyCode: 39, key: "ArrowRight", send: "\x1b[C" },
            ];

            /***** Initialization *****/

            plugin.on("load", function() {
                console.log("[keyboard] Plugin loaded, drawing...");
                draw();
            });

            function draw() {
                try {
                    console.log("[keyboard] Drawing keyboard button...");
                    var logobar = layout.findParent({ name: "menus" });
                    if (!logobar) {
                        console.log("[keyboard] ERROR: logobar not found");
                        return;
                    }
                    console.log("[keyboard] Found logobar:", logobar);

                    var btnKeyboard = new ui.button({
                        id: "btnKeyboard",
                        skin: "c9-toolbarbutton-glossy",
                        "class": "keyboard-btn",
                        caption: "Keyboard",
                        tooltip: "Show virtual keyboard for terminal",
                        width: "80",
                        onclick: function() {
                            toggleKeyboard();
                        }
                    });
                    // Ensure id is set on the element
                    if (btnKeyboard.getElement) {
                        btnKeyboard.getElement().id = "btnKeyboard";
                    }
                    ui.insertByIndex(logobar, btnKeyboard, 200, plugin);
                    console.log("[keyboard] Keyboard button created");

                    createKeyboardBar();
                    console.log("[keyboard] Draw complete");
                } catch(e) {
                    console.log("[keyboard] ERROR in draw:", e.message, e.stack);
                }
            }

            function createKeyboardBar() {
                try {
                    console.log("[keyboard] Creating keyboard bar...");
                    
                    // Create overlay
                    keyboardOverlay = document.createElement("div");
                    keyboardOverlay.style.cssText = "display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:9998;";
                    keyboardOverlay.addEventListener("mousedown", function(e) {
                        if (e.target === keyboardOverlay) hideKeyboard();
                    });
                    document.body.appendChild(keyboardOverlay);

                    // Create keyboard bar container
                    keyboardBar = document.createElement("div");
                    keyboardBar.id = "c9-dev-keyboard";
                    keyboardBar.style.cssText = [
                        "position:fixed;",
                        "z-index:9999;",
                        "background:#2a2a2a;",
                        "border:1px solid #555;",
                        "border-radius:8px;",
                        "box-shadow:0 4px 12px rgba(0,0,0,0.5);",
                        "padding:6px;",
                        "display:flex;",
                        "flex-direction:column;",
                        "gap:4px;",
                        "user-select:none;",
                        "-webkit-user-select:none;",
                        "min-width:300px;",
                        "max-width:90vw;"
                    ].join("");

                    // Header bar (for dragging)
                    var header = document.createElement("div");
                    header.style.cssText = [
                        "display:flex;",
                        "align-items:center;",
                        "justify-content:space-between;",
                        "padding:4px 8px;",
                        "background:#1a1a1a;",
                        "border-radius:6px 6px 0 0;",
                        "cursor:move;",
                        "color:#aaa;",
                        "font-size:11px;",
                        "font-family:sans-serif;"
                    ].join("");

                    var title = document.createElement("span");
                    title.textContent = "Dev Keyboard";
                    header.appendChild(title);

                    // Dismiss button
                    var dismissBtn = document.createElement("button");
                    dismissBtn.innerHTML = "&#x2715;";
                    dismissBtn.style.cssText = [
                        "background:none;border:none;color:#aaa;font-size:16px;cursor:pointer;padding:0 4px;line-height:1;"
                    ].join("");
                    dismissBtn.onclick = function(e) { e.stopPropagation(); hideKeyboard(); };
                    header.appendChild(dismissBtn);

                    keyboardBar.appendChild(header);

                    // Key container
                    var keyContainer = document.createElement("div");
                    keyContainer.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;padding:4px;";

                    // Group keys by rows
                    var rows = [
                        keyDefs.filter(function(k) { return k.keyCode >= 112 && k.keyCode <= 123; }),
                        keyDefs.filter(function(k) { return [27, 9, 8, 46, 36, 35, 33, 34].indexOf(k.keyCode) !== -1; }),
                        keyDefs.filter(function(k) { return k.isModifier; }),
                        keyDefs.filter(function(k) { return [38, 40, 37, 39].indexOf(k.keyCode) !== -1; }),
                    ];

                    rows.forEach(function(rowKeys) {
                        var rowDiv = document.createElement("div");
                        rowDiv.style.cssText = "display:flex;gap:3px;flex-wrap:wrap;";
                        rowKeys.forEach(function(keyDef) {
                            var btn = createKeyButton(keyDef);
                            rowDiv.appendChild(btn);
                        });
                        keyContainer.appendChild(rowDiv);
                    });

                    keyboardBar.appendChild(keyContainer);
                    document.body.appendChild(keyboardBar);

                    // Setup drag on header
                    setupDrag(header);
                    console.log("[keyboard] Keyboard bar created");
                } catch(e) {
                    console.log("[keyboard] ERROR in createKeyboardBar:", e.message, e.stack);
                }
            }

            function createKeyButton(keyDef) {
                var btn = document.createElement("button");
                var isModifier = keyDef.isModifier;

                btn.textContent = keyDef.label;
                btn.style.cssText = [
                    "background:" + (isModifier ? "#4a4a6a" : "#3a3a3a") + ";",
                    "border:1px solid #555;",
                    "border-radius:4px;",
                    "color:#ddd;",
                    "font-size:" + (keyDef.label.length > 3 ? "10px" : "12px") + "px;",
                    "font-family:sans-serif;",
                    "padding:4px 8px;",
                    "cursor:pointer;",
                    "min-width:" + (isModifier ? "50px" : "28px") + ";",
                    "text-align:center;"
                ].join("");

                btn.onmousedown = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleKeyPress(keyDef, btn);
                };

                btn.ontouchstart = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleKeyPress(keyDef, btn);
                };

                return btn;
            }

            function handleKeyPress(keyDef, btn) {
                if (keyDef.isModifier) {
                    var modName = keyDef.label.toLowerCase();
                    modifierState[modName] = !modifierState[modName];
                    btn.style.background = modifierState[modName] ? "#6a6a9a" : "#4a4a6a";
                    return;
                }

                var isControl = modifierState.ctrl;
                var isMeta = modifierState.meta;
                var isAlt = modifierState.alt;
                var textToSend = keyDef.send;

                if (isControl && keyDef.keyCode >= 65 && keyDef.keyCode <= 90) {
                    textToSend = String.fromCharCode(keyDef.keyCode - 64);
                } else if (isControl && keyDef.keyCode === 32) {
                    textToSend = String.fromCharCode(0);
                } else if (isControl && keyDef.keyCode === 219) {
                    textToSend = String.fromCharCode(27);
                } else if (isAlt && !isControl) {
                    if (keyDef.keyCode >= 65 && keyDef.keyCode <= 90) {
                        textToSend = "\x1b" + String.fromCharCode(keyDef.keyCode + 32);
                    }
                } else if (isMeta && !isControl) {
                    if (keyDef.keyCode >= 65 && keyDef.keyCode <= 90) {
                        textToSend = "\x1b" + String.fromCharCode(keyDef.keyCode + 32);
                    }
                }

                sendToTerminal(textToSend);
                dispatchKeyEvent(keyDef, isControl, isMeta, isAlt);
            }

            function sendToTerminal(text) {
                var focusedTab = tabs.focussedTab;
                if (!focusedTab) return;

                if (focusedTab.editorType === "terminal" || focusedTab.editorType === "output") {
                    var session = focusedTab.document.getSession();
                    if (session && session.send) {
                        console.log("[keyboard] Sending to terminal:", text);
                        session.send(text);
                    }
                }
            }

            function dispatchKeyEvent(keyDef, isControl, isMeta, isAlt) {
                var focusedTab = tabs.focussedTab;
                if (!focusedTab) return;

                if (focusedTab.editorType === "terminal" || focusedTab.editorType === "output") {
                    var session = focusedTab.document.getSession();
                    if (!session || !session.aceSession || !session.aceSession.ace) return;

                    var ace = session.aceSession.ace;
                    if (!ace) return;

                    var keyboardEvent = new KeyboardEvent("keydown", {
                        bubbles: true,
                        cancelable: true,
                        key: keyDef.key,
                        keyCode: keyDef.keyCode,
                        which: keyDef.keyCode,
                        ctrlKey: isControl,
                        metaKey: isMeta,
                        altKey: isAlt,
                        shiftKey: false
                    });

                    var container = ace.container;
                    if (container) {
                        container.dispatchEvent(keyboardEvent);
                    }
                    document.body.dispatchEvent(keyboardEvent);
                }
            }

            function setupDrag(header) {
                header.addEventListener("mousedown", function(e) {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    isDragging = true;
                    var rect = keyboardBar.getBoundingClientRect();
                    dragOffset.x = e.clientX - rect.left;
                    dragOffset.y = e.clientY - rect.top;
                    dragTarget = keyboardBar;
                    document.addEventListener("mousemove", onDrag);
                    document.addEventListener("mouseup", stopDrag);
                });

                header.addEventListener("touchstart", function(e) {
                    var touch = e.touches[0];
                    isDragging = true;
                    var rect = keyboardBar.getBoundingClientRect();
                    dragOffset.x = touch.clientX - rect.left;
                    dragOffset.y = touch.clientY - rect.top;
                    dragTarget = keyboardBar;
                    document.addEventListener("touchmove", onDragTouch, { passive: false });
                    document.addEventListener("touchend", stopDragTouch);
                }, { passive: false });

                function onDrag(e) {
                    if (!isDragging) return;
                    e.preventDefault();
                    var x = e.clientX - dragOffset.x;
                    var y = e.clientY - dragOffset.y;
                    x = Math.max(0, Math.min(x, window.innerWidth - keyboardBar.offsetWidth));
                    y = Math.max(0, Math.min(y, window.innerHeight - keyboardBar.offsetHeight));
                    keyboardBar.style.left = x + "px";
                    keyboardBar.style.top = y + "px";
                }

                function onDragTouch(e) {
                    if (!isDragging) return;
                    e.preventDefault();
                    var touch = e.touches[0];
                    var x = touch.clientX - dragOffset.x;
                    var y = touch.clientY - dragOffset.y;
                    x = Math.max(0, Math.min(x, window.innerWidth - keyboardBar.offsetWidth));
                    y = Math.max(0, Math.min(y, window.innerHeight - keyboardBar.offsetHeight));
                    keyboardBar.style.left = x + "px";
                    keyboardBar.style.top = y + "px";
                }

                function stopDrag() {
                    isDragging = false;
                    document.removeEventListener("mousemove", onDrag);
                    document.removeEventListener("mouseup", stopDrag);
                }

                function stopDragTouch() {
                    isDragging = false;
                    document.removeEventListener("touchmove", onDragTouch);
                    document.removeEventListener("touchend", stopDragTouch);
                }
            }

            function toggleKeyboard() {
                if (isVisible) hideKeyboard();
                else showKeyboard();
            }

            function showKeyboard() {
                isVisible = true;
                keyboardBar.style.display = "flex";
                keyboardOverlay.style.display = "block";
                
                // Position at bottom-center to avoid blocking the menu bar
                var barW = keyboardBar.offsetWidth;
                var barH = keyboardBar.offsetHeight;
                var x = Math.max(10, (window.innerWidth - barW) / 2);
                var y = Math.max(10, window.innerHeight - barH - 20);
                keyboardBar.style.left = x + "px";
                keyboardBar.style.top = y + "px";
                
                // Ensure overlay doesn't block button clicks by placing it below the keyboard bar
                setTimeout(function() {
                    var btn = document.querySelector('.keyboard-btn');
                    if (btn) {
                        btn.style.zIndex = '10000';
                    }
                }, 50);
            }

            function hideKeyboard() {
                isVisible = false;
                keyboardBar.style.display = "none";
                keyboardOverlay.style.display = "none";
                modifierState = { ctrl: false, alt: false, meta: false };
            }

            /***** Lifecycle *****/

            plugin.on("unload", function() {
                if (keyboardBar && keyboardBar.parentNode) {
                    keyboardBar.parentNode.removeChild(keyboardBar);
                }
                if (keyboardOverlay && keyboardOverlay.parentNode) {
                    keyboardOverlay.parentNode.removeChild(keyboardOverlay);
                }
            });

            /***** Register and define API *****/

            plugin.freezePublicAPI({
                show: showKeyboard,
                hide: hideKeyboard,
                toggle: toggleKeyboard,
                isVisible: function() { return isVisible; }
            });

            console.log("[keyboard] Plugin registered successfully");

        } catch(e) {
            console.log("[keyboard] CRITICAL ERROR:", e.message, e.stack);
        }

        register(null, {
            keyboard: plugin
        });
    }
});
