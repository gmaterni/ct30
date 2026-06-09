/**
 * uawindow.js - Window management system.
 * Crea e gestisce finestre modali/draggable sovrapposte.
 * Segue BEST_PRACTICES_JS.md: factory pattern, no class/this/new/prototype.
 *
 * @module  uawindow
 * @version 1.0.0
 * @date    2026-06-02
 */
"use strict";

import { UaDrag } from "./uadrag.js";

var _windows = {};

var _setActive = function(id) {
    for (var k in _windows) {
        if (_windows[k] && _windows[k].element) {
            _windows[k].element.classList.remove("active-window");
        }
    }
    if (_windows[id] && _windows[id].element) {
        _windows[id].element.classList.add("active-window");
    }
};

var _newWindow = function(element) {
    var win = {
        element: element,
        x: "0px",
        y: "0px",
        isOpen: false,
        isVisible: false,
        firstShow: true,
        pos: 0,
        wz: 0,
        vw: "px",
        vh: "px"
    };

    var api = {};

    api.vwvh = function() {
        win.vw = "vw";
        win.vh = "vh";
        return api;
    };

    api.addClassStyle = function(className) {
        if (!win.element.classList.contains(className)) {
            win.element.classList.add(className);
        }
        return api;
    };

    api.removeClassStyle = function(className) {
        if (win.element.classList.contains(className)) {
            win.element.classList.remove(className);
        }
        return api;
    };

    api.getElement = function() {
        return win.element;
    };

    api.getId = function() {
        return win.element.id;
    };

    api.setStyle = function(styles) {
        for (var prop in styles) {
            win.element.style[prop] = styles[prop];
        }
        return api;
    };

    api.setHtml = function(content) {
        if (content instanceof HTMLElement) {
            win.element.innerHTML = "";
            win.element.appendChild(content);
        } else {
            win.element.innerHTML = content;
        }
        return api;
    };

    api.getHtml = function() {
        return win.element.innerHTML;
    };

    api.setXY = function(x, y, pos) {
        var position = pos !== undefined ? pos : 0;
        win.x = x;
        win.y = y;
        win.pos = position;
        return api;
    };

    api.setCenterY = function(y, pos) {
        var xd = window.innerWidth;
        var wd = win.element.clientWidth;
        var x = (xd - wd) / 2;
        api.setXY(x, y, pos);
        return api;
    };

    api.setCenter = function(pos) {
        var xd = window.innerWidth;
        var yd = window.innerHeight;
        var wd = win.element.clientWidth;
        var wh = win.element.clientHeight;
        var x = (xd - wd) / 2;
        var y = (yd - wh) / 2;
        api.setXY(x, y, pos);
        return api;
    };

    api.linkToId = function(linkedId, dx, dy, pos) {
        var lk = document.getElementById(linkedId);
        if (!lk) return api;
        api.linkToElement(lk, dx, dy, pos);
        return api;
    };

    api.linkToElement = function(elm, dx, dy, pos) {
        var x = elm.offsetLeft + elm.offsetWidth + dx;
        var y = elm.offsetTop + dy;
        if (y < 0) {
            y = 0;
        }
        api.setXY(x, y, pos);
        return api;
    };

    api.setZ = function(z) {
        win.wz = z;
        return api;
    };

    api.reset = function() {
        win.firstShow = true;
        return api;
    };

    api.toggle = function() {
        if (!win.isVisible) {
            api.show();
        } else {
            api.hide();
        }
        return api;
    };

    api.show = function() {
        var id = win.element.id;
        _setActive(id);

        if (win.firstShow || win.pos === 1 || (win.pos === 0 && !win.isVisible)) {
            win.element.style.position = "absolute";
            win.element.style.marginLeft = "0";
            win.element.style.marginTop = "0";
            win.element.style.top = win.y + win.vh;
            if (win.x >= 0) {
                win.element.style.left = win.x + win.vw;
            } else {
                win.element.style.right = (-win.x) + win.vw;
            }
            if (win.wz > 0) {
                win.element.style.zIndex = win.wz;
            }

            win.element.addEventListener("mousedown", function() {
                _setActive(id);
            });
        }

        win.element.style.display = "";
        win.firstShow = false;
        win.isVisible = true;
        win.isOpen = true;
        return api;
    };

    api.hide = function() {
        win.element.style.display = "none";
        win.isVisible = false;
        return api;
    };

    api.close = function() {
        win.element.style.display = "none";
        win.element.innerHTML = "";
        win.isOpen = false;
        return api;
    };

    api.remove = function() {
        var id = win.element.id;
        UaWindowAdm.remove(id);
        return null;
    };

    api.drag = function() {
        UaDrag(win.element);
        return api;
    };

    return api;
};

var UaWindowAdm = {
    ws: _windows,

    create: function(id, parentId) {
        var w = document.getElementById(id);
        if (!w) {
            w = document.createElement("div");
            var parent = parentId ? document.getElementById(parentId) : document.body;
            parent.appendChild(w);
            w.id = id;
            w.setAttribute("data-name", "ua-window");
            var uaw = _newWindow(w);
            _windows[id] = uaw;
        }
        var existing = _windows[id];
        w.style.display = "none";
        return existing;
    },

    get: function(id) {
        var win = _windows[id] || null;
        return win;
    },

    show: function(id) {
        if (_windows[id]) {
            _windows[id].show();
        }
    },

    close: function(id) {
        if (_windows[id]) {
            _windows[id].close();
        }
    },

    toggle: function(id) {
        if (_windows[id]) {
            _windows[id].toggle();
        }
    },

    setActive: function(id) {
        _setActive(id);
    },

    hide: function(id) {
        if (_windows[id]) {
            _windows[id].hide();
        }
    },

    closeThis: function(e) {
        var ancestor = e.closest('[data-name="ua-window"]');
        var id = ancestor.id;
        _windows[id].close();
    },

    showAll: function() {
        for (var k in _windows) {
            _windows[k].show();
        }
    },

    hideAll: function() {
        for (var k in _windows) {
            _windows[k].hide();
        }
    },

    closeAll: function() {
        for (var k in _windows) {
            _windows[k].close();
        }
    },

    remove: function(id) {
        if (!_windows[id]) return;
        var el = document.getElementById(id);
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
        _windows[id] = null;
        delete _windows[id];
    },

    removeAll: function() {
        for (var k in _windows) {
            UaWindowAdm.remove(k);
        }
        _windows = {};
    }
};

export { UaWindowAdm };
