/**
 * uadrag.js - Element drag support.
 * Rende un elemento HTML draggabile con il mouse.
 * Segue BEST_PRACTICES_JS.md: factory pattern, no class/this/new/prototype.
 *
 * @module  uadrag
 * @version 1.0.0
 * @date    2026-06-02
 */
"use strict";

var NODRAG_TAGS = ["input", "select", "a"];
var NODRAG_CLASS = "nodrag";

var UaDrag = function(element) {
    if (!element) {
        console.error("UaDrag: elemento non valido");
        return;
    }

    var pos1 = 0;
    var pos2 = 0;
    var pos3 = 0;
    var pos4 = 0;

    var closeDragElement = function() {
        document.onmouseup = null;
        document.onmousemove = null;
    };

    var elementDrag = function(e) {
        var ev = e || window.event;
        ev.preventDefault();
        pos1 = pos3 - ev.clientX;
        pos2 = pos4 - ev.clientY;
        pos3 = ev.clientX;
        pos4 = ev.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    };

    var dragMouseDown = function(e) {
        var ev = e || window.event;
        var target = ev.target || null;
        if (!target) return;

        var tagName = target.tagName.toLowerCase();
        if (NODRAG_TAGS.indexOf(tagName) !== -1) return;
        if (target.classList.contains(NODRAG_CLASS)) return;

        ev.preventDefault();
        pos3 = ev.clientX;
        pos4 = ev.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    };

    element.onmousedown = dragMouseDown;
};

export { UaDrag };
