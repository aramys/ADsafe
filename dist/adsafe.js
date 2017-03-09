/**
 * @preserve
 * @author Douglas Crockford <douglas@crockford.com>
 * @version 1.0.1
 * @description ADsafe, the JavaScript widget framework for advertising and mashups
 */
// adsafe.js
// 2016-02-07

//    Public Domain.

//    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
//    SUBJECT TO CHANGE WITHOUT NOTICE.

//    Original url: http://www.ADsafe.org/adsafe.js

// This file implements the core ADSAFE runtime. A site may add additional
// methods understanding that those methods will be made available to guest
// code.

// This code should be minified before deployment.
// See http://javascript.crockford.com/jsmin.html

// USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
// NOT CONTROL.

/*global window*/

/*jslint browser, devel, for, this
*/

/*property
    _, ___nodes___, ___star___, _intercept, a, abbr, acronym, addEventListener,
    address, altKey, append, appendChild, apply, area, arguments, autocomplete,
    b, bdo, big, blockquote, blur, br, bubble, button, call, callee, caller,
    cancelBubble, canvas, caption, center, change, charAt, charCode, check,
    checked, childNodes, cite, class, className, clientX, clientY, clone,
    cloneNode, code, col, colgroup, combine, concat, console, constructor,
    count, create, createDocumentFragment, createElement, createRange,
    createTextNode, createTextRange, cssFloat, ctrlKey, currentStyle, dd,
    defaultView, del, dfn, dir, disabled, div, dl, dt, each, em, empty, enable,
    ephemeral, eval, exec, expand, explode, fieldset, fire, firstChild, focus,
    font, form, fragment, fromCharCode, get, getCheck, getChecks, getClass,
    getClasses, getComputedStyle, getElementById, getElementsByTagName,
    getMark, getMarks, getName, getNames, getOffsetHeight, getOffsetHeights,
    getOffsetWidth, getOffsetWidths, getParent, getSelection, getStyle,
    getStyles, getTagName, getTagNames, getTitle, getTitles, getValue,
    getValues, go, h1, h2, h3, h4, h5, h6, has, hasOwnProperty, hr, i, id, img,
    inRange, indeterminate, indexOf, input, ins, insertBefore, isArray, kbd,
    key, keyCode, keys, klass, label, later, legend, length, li, lib, log, map,
    mark, menu, message, name, nextSibling, nodeName, nodeValue, object, off,
    offsetHeight, offsetWidth, ol, on, onclick, ondblclick, onfocusin,
    onfocusout, onkeypress, onmousedown, onmousemove, onmouseout, onmouseover,
    onmouseup, op, optgroup, option, p, parent, parentNode, postError, pre,
    prepend, preventDefault, protect, prototype, push, q, remove, removeChild,
    removeElement, replace, replaceChild, returnValue, row, samp, select,
    selection, selectionEnd, selectionStart, set, shiftKey, slice, small, span,
    srcElement, stack, stopPropagation, strong, style, styleFloat, sub, sup,
    table, tag, tagName, target, tbody, td, test, text, textarea, tfoot, th,
    that, thead, title, toLowerCase, toString, toUpperCase, tr, tt, type, u,
    ul, unwatch, value, valueOf, var, visibility, watch, window, writeln, x, y
*/

var ADSAFE;
ADSAFE = (function () {
    "use strict";

    var adsafe_id;      // The id of the current widget
    var adsafe_lib;     // The script libraries loaded by the current widget

// These member names are banned from guest scripts. The ADSAFE.get and
// ADSAFE.put methods will not allow access to these properties.

    var banned = {
        arguments: true,
        callee: true,
        caller: true,
        constructor: true,
        eval: true,
        prototype: true,
        stack: true,
        unwatch: true,
        valueOf: true,
        watch: true
    };

    var cache_style_object;
    var cache_style_node;
    var defaultView = document.defaultView;
    var ephemeral;
    var flipflop;       // Used in :even/:odd processing
    var has_focus;
    var hunter;         // Set of hunter patterns
    var interceptors = [];

    var makeableTagName = {

// This is the whitelist of elements that may be created with the .tag(tagName)
// method.

        a: true,
        abbr: true,
        acronym: true,
        address: true,
        area: true,
        b: true,
        bdo: true,
        big: true,
        blockquote: true,
        br: true,
        button: true,
        canvas: true,
        caption: true,
        center: true,
        cite: true,
        code: true,
        col: true,
        colgroup: true,
        dd: true,
        del: true,
        dfn: true,
        dir: true,
        div: true,
        dl: true,
        dt: true,
        em: true,
        fieldset: true,
        font: true,
        form: true,
        h1: true,
        h2: true,
        h3: true,
        h4: true,
        h5: true,
        h6: true,
        hr: true,
        i: true,
        img: true,
        input: true,
        ins: true,
        kbd: true,
        label: true,
        legend: true,
        li: true,
        map: true,
        menu: true,
        object: true,
        ol: true,
        optgroup: true,
        option: true,
        p: true,
        pre: true,
        q: true,
        samp: true,
        select: true,
        small: true,
        span: true,
        strong: true,
        sub: true,
        sup: true,
        table: true,
        tbody: true,
        td: true,
        textarea: true,
        tfoot: true,
        th: true,
        thead: true,
        tr: true,
        tt: true,
        u: true,
        ul: true,
        var: true
    };
    var name;
    var pecker;     // set of pecker patterns
    var result;
    var star;
    var the_range;
    var value;


//  The error function is called if there is a violation or confusion.
//  It throws an exception.

    function error(message) {
        ADSAFE.log("ADsafe error: " + (message || "ADsafe violation."));
        throw {
            name: "ADsafe",
            message: message || "ADsafe violation."
        };
    }


//    Some of JavaScript's implicit string conversions can grant extraordinary
//    powers to untrusted code. So we use the string_check function to prevent
//    such abuses.

    function string_check(string) {
        if (typeof string !== "string") {
            error("ADsafe string violation.");
        }
        return string;
    }


//    The object.hasOwnProperty method has a number of hazards. So we wrap it in
//    the owns function.

    function owns(object, string) {
        return object && typeof object === "object" &&
                Object.prototype.hasOwnProperty.call(object, string_check(string));
    }

//  The reject functions enforce the restriction on property names.
//  reject_property allows access only to objects and arrays. It does not allow
//  use of the banned names, or names that are not strings and not numbers,
//  or strings that start or end with _.

    function reject_name(name) {
        return typeof name !== "number" && (typeof name !== "string" ||
                banned[name] || name.charAt(0) === "_" || name.slice(-1) === "_");
    }


    function reject_property(object, name) {
        return typeof object !== "object" || reject_name(name);
    }


    function reject_global(that) {
        if (that.window) {
            error();
        }
    }


    function getStyleObject(node) {

// The getStyleObject function returns the computed style object for a node.

        if (node === cache_style_node) {
            return cache_style_object;
        }
        cache_style_node = node;
        cache_style_object =
                node.currentStyle || defaultView.getComputedStyle(node, "");
        return cache_style_object;
    }


    function walkTheDOM(node, func, skip) {

// Recursively traverse the DOM tree, starting with the node, in document
// source order, calling the func on each node visisted.

        if (!skip) {
            func(node);
        }
        node = node.firstChild;
        while (node) {
            walkTheDOM(node, func);
            node = node.nextSibling;
        }
    }


    function purge_event_handlers(node) {

// We attach all event handlers to an "___ on ___" property. The property name
// contains spaces to insure that there is no collision with HTML attribues.
// Keeping the handlers in a single property makes it easy to remove them
// all at once. Removal is required to avoid memory leakage on IE6 and IE7.

        walkTheDOM(node, function (node) {
            if (node.tagName) {
                node["___ on ___"] = null;
                node.change = null;
            }
        });
    }


    function parse_query(text, id) {

// Convert a query string into an array of op/name/value selectors.
// A query string is a sequence of triples wrapped in brackets; or names,
// possibly prefixed by # . & > _, or :option, or * or /. A triple is a name,
// and operator (one of [=, [!=, [*=, [~=, [|=, [$=, or [^=) and a value.

// If the id parameter is supplied, then the name following # must have the
// id as a prefix and must match the ADsafe rule for id: being all uppercase
// letters and digits with one underbar.

// A name must be all lower case and may contain digits, -, or _.

        var match;          // A match array
        var query = [];     // The resulting query array
        var selector;
        var qx = (id)
            ? /^\s*(?:([\*\/])|\[\s*([a-z][0-9a-z_\-]*)\s*(?:([!*~\|$\^]?=)\s*([0-9A-Za-z_\-*%&;.\/:!]+)\s*)?\]|#\s*([A-Z]+_[A-Z0-9]+)|:\s*([a-z]+)|([.&_>\+]?)\s*([a-z][0-9a-z\-]*))\s*/
            : /^\s*(?:([\*\/])|\[\s*([a-z][0-9a-z_\-]*)\s*(?:([!*~\|$\^]?=)\s*([0-9A-Za-z_\-*%&;.\/:!]+)\s*)?\]|#\s*([\-A-Za-z0-9_]+)|:\s*([a-z]+)|([.&_>\+]?)\s*([a-z][0-9a-z\-]*))\s*/;

// Loop over all of the selectors in the text.

        do {

// The qx teases the components of one selector out of the text, ignoring
// whitespace.

//          match[0]  the whole selector
//          match[1]  * /
//          match[2]  attribute name
//          match[3]  = != *= ~= |= $= ^=
//          match[4]  attribute value
//          match[5]  # id
//          match[6]  : option
//          match[7]  . & _ > +
//          match[8]      name

            match = qx.exec(string_check(text));
            if (!match) {
                error("ADsafe: Bad query:" + text);
            }

// Make a selector object and stuff it in the query.

            if (match[1]) {

// The selector is * or /

                selector = {
                    op: match[1]
                };
            } else if (match[2]) {

// The selector is in brackets.

                selector = (match[3])
                    ? {
                        op: "[" + match[3],
                        name: match[2],
                        value: match[4]
                    }
                    : {
                        op: "[",
                        name: match[2]
                    };
            } else if (match[5]) {

// The selector is an id.

                if (query.length > 0 || match[5].length <= id.length ||
                        match[5].slice(0, id.length) !== id) {
                    error("ADsafe: Bad query: " + text);
                }
                selector = {
                    op: "#",
                    name: match[5]
                };

// The selector is a colon.

            } else if (match[6]) {
                selector = {
                    op: ":" + match[6]
                };

// The selector is one of > + . & _ or a naked tag name

            } else {
                selector = {
                    op: match[7],
                    name: match[8]
                };
            }

// Add the selector to the query.

            query.push(selector);

// Remove the selector from the text. If there is more text, have another go.

            text = text.slice(match[0].length);
        } while (text);
        return query;
    }


    hunter = {

// These functions implement the hunter behaviors.

        "": function (node) {
            var array;
            var nodelist = node.getElementsByTagName(name);
            var i;
            var length;

// getElementsByTagName produces a nodeList, which is one of the world's most
// inefficient data structures. It is so slow that JavaScript's pseudo arrays
// look terrifically swift by comparison. So we do the conversion. This is
// easily done on some browsers, less easily on others.

            try {
                array = Array.prototype.slice.call(nodelist, 0);
                result = (result.length)
                    ? result.concat(array)
                    : array;
            } catch (ignore) {
                length = nodelist.length;
                for (i = 0; i < length; i += 1) {
                    result.push(nodelist[i]);
                }
            }
        },
        "+": function (node) {
            node = node.nextSibling;
            name = name.toUpperCase();
            while (node && !node.tagName) {
                node = node.nextSibling;
            }
            if (node && node.tagName === name) {
                result.push(node);
            }
        },
        ">": function (node) {
            node = node.firstChild;
            name = name.toUpperCase();
            while (node) {
                if (node.tagName === name) {
                    result.push(node);
                }
                node = node.nextSibling;
            }
        },
        "#": function () {
            var n = document.getElementById(name);
            if (n.tagName) {
                result.push(n);
            }
        },
        "/": function (node) {
            var nodes = node.childNodes;
            var i;
            var length = nodes.length;
            for (i = 0; i < length; i += 1) {
                result.push(nodes[i]);
            }
        },
        "*": function (node) {
            star = true;
            walkTheDOM(node, function (node) {
                result.push(node);
            }, true);
        }
    };

    pecker = {
        ".": function (node) {
            var classy = " " + node.className + " ";
            return classy.indexOf(" " + name + " ") >= 0;
        },
        "&": function (node) {
            return node.name === name;
        },
        "_": function (node) {
            return node.type === name;
        },
        "[": function (node) {
            return typeof node[name] === "string";
        },
        "[=": function (node) {
            var member = node[name];
            return typeof member === "string" && member === value;
        },
        "[!=": function (node) {
            var member = node[name];
            return typeof member === "string" && member !== value;
        },
        "[^=": function (node) {
            var member = node[name];
            return typeof member === "string" &&
                    member.slice(0, member.length) === value;
        },
        "[$=": function (node) {
            var member = node[name];
            return typeof member === "string" &&
                    member.slice(-member.length) === value;
        },
        "[*=": function (node) {
            var member = node[name];
            return typeof member === "string" &&
                    member.indexOf(value) >= 0;
        },
        "[~=": function (node) {
            var member = node[name];
            if (typeof member === "string") {
                member = " " + member + " ";
                return member.indexOf(" " + value + " ") >= 0;
            }
        },
        "[|=": function (node) {
            var member = node[name];
            if (typeof member === "string") {
                member = "-" + member + "-";
                return member.indexOf("-" + value + "-") >= 0;
            }
        },
        ":blur": function (node) {
            return node !== has_focus;
        },
        ":checked": function (node) {
            return node.checked;
        },
        ":disabled": function (node) {
            return node.tagName && node.disabled;
        },
        ":enabled": function (node) {
            return node.tagName && !node.disabled;
        },
        ":even": function (node) {
            var f;
            if (node.tagName) {
                f = flipflop;
                flipflop = !flipflop;
                return f;
            }
            return false;
        },
        ":focus": function (node) {
            return node === has_focus;
        },
        ":hidden": function (node) {
            return node.tagName && getStyleObject(node).visibility !== "visible";
        },
        ":odd": function (node) {
            if (node.tagName) {
                flipflop = !flipflop;
                return flipflop;
            }
            return false;
        },
        ":tag": function (node) {
            return node.tagName;
        },
        ":text": function (node) {
            return node.nodeName === "#text";
        },
        ":trim": function (node) {
            return node.nodeName !== "#text" || (/\W/.test(node.nodeValue));
        },
        ":unchecked": function (node) {
            return node.tagName && !node.checked;
        },
        ":visible": function (node) {
            return node.tagName && getStyleObject(node).visibility === "visible";
        }
    };


    function quest(query, nodes) {
        var selector;
        var func;
        var i;
        var j;

// Step through each selector.

        for (i = 0; i < query.length; i += 1) {
            selector = query[i];
            name = selector.name;
            func = hunter[selector.op];

// There are two kinds of selectors: hunters and peckers. If this is a hunter,
// loop through the the nodes, passing each node to the hunter function.
// Accumulate all the nodes it finds.

            if (typeof func === "function") {
                if (star) {
                    error("ADsafe: Query violation: *" + selector.op +
                            (selector.name || ""));
                }
                result = [];
                for (j = 0; j < nodes.length; j += 1) {
                    func(nodes[j]);
                }
            } else {

// If this is a pecker, get its function. There is a special case for
// the :first and :rest selectors because they are so simple.

                value = selector.value;
                flipflop = false;
                func = pecker[selector.op];
                if (typeof func !== "function") {
                    switch (selector.op) {
                    case ":first":
                        result = nodes.slice(0, 1);
                        break;
                    case ":rest":
                        result = nodes.slice(1);
                        break;
                    default:
                        error("ADsafe: Query violation: :" + selector.op);
                    }
                } else {

// For the other selectors, make an array of nodes that are filtered by
// the pecker function.

                    result = [];
                    for (j = 0; j < nodes.length; j += 1) {
                        if (func(nodes[j])) {
                            result.push(nodes[j]);
                        }
                    }
                }
            }
            nodes = result;
        }
        return result;
    }


    function make_root(root, id) {

        if (id) {
            if (root.tagName !== "DIV") {
                error("ADsafe: Bad node.");
            }
        } else {
            if (root.tagName !== "BODY") {
                error("ADsafe: Bad node.");
            }
        }

// A Bunch is a container that holds zero or more dom nodes.
// It has many useful methods.

        function Bunch(nodes) {
            this.___nodes___ = nodes;
            this.___star___ = star && nodes.length > 1;
            star = false;
        }

        var allow_focus = true;
        var dom;
        var dom_event = function (ev) {
            var key;
            var target;
            var that;
            var the_event;
            var the_target;
            var the_actual_event = ev || event;
            var type = the_actual_event.type;

// Get the target node and wrap it in a bunch.

            the_target = the_actual_event.target || the_actual_event.srcElement;
            target = new Bunch([the_target]);
            that = target;

// Use the PPK hack to make focus bubbly on IE.
// When a widget has focus, it can use the focus method.

            switch (type) {
            case "mousedown":
                allow_focus = true;
                if (document.selection) {
                    the_range = document.selection.createRange();
                }
                break;
            case "focus":
            case "focusin":
                allow_focus = true;
                has_focus = the_target;
                the_actual_event.cancelBubble = false;
                type = "focus";
                break;
            case "blur":
            case "focusout":
                allow_focus = false;
                has_focus = null;
                type = "blur";
                break;
            case "keypress":
                allow_focus = true;
                has_focus = the_target;
                key = String.fromCharCode(the_actual_event.charCode ||
                        the_actual_event.keyCode);
                switch (key) {
                case "\u000d":
                case "\u000a":
                    type = "enterkey";
                    break;
                case "\u001b":
                    type = "escapekey";
                    break;
                }
                break;

// This is a workaround for Safari.

            case "click":
                allow_focus = true;
                break;
            }
            if (the_actual_event.cancelBubble &&
                    the_actual_event.stopPropagation) {
                the_actual_event.stopPropagation();
            }

// Make the event object.

            the_event = {
                altKey: the_actual_event.altKey,
                ctrlKey: the_actual_event.ctrlKey,
                bubble: function () {

// Bubble up. Get the parent of that node. It becomes the new that.
// getParent throws when bubbling is not possible.

                    try {
                        var parent = that.getParent();
                        var b = parent.___nodes___[0];
                        that = parent;
                        the_event.that = that;

// If that node has an event handler, fire it. Otherwise, bubble up.

                        if (b["___ on ___"] &&
                                b["___ on ___"][type]) {
                            that.fire(the_event);
                        } else {
                            the_event.bubble();
                        }
                    } catch (e) {
                        error(e);
                    }
                },
                key: key,
                preventDefault: function () {
                    if (the_actual_event.preventDefault) {
                        the_actual_event.preventDefault();
                    }
                    the_actual_event.returnValue = false;
                },
                shiftKey: the_actual_event.shiftKey,
                target: target,
                that: that,
                type: type,
                x: the_actual_event.clientX,
                y: the_actual_event.clientY
            };

// If the target has event handlers, then fire them. Otherwise, bubble up.

            if (the_target["___ on ___"] &&
                    the_target["___ on ___"][the_event.type]) {
                target.fire(the_event);
            } else {
                while (true) {
                    the_target = the_target.parentNode;
                    if (!the_target) {
                        break;
                    }
                    if (the_target["___ on ___"] &&
                            the_target["___ on ___"][the_event.type]) {
                        that = new Bunch([the_target]);
                        the_event.that = that;
                        that.fire(the_event);
                        break;
                    }
                    if (the_target["___adsafe root___"]) {
                        break;
                    }
                }
            }
            if (the_event.type === "escapekey") {
                if (ephemeral) {
                    ephemeral.remove();
                }
                ephemeral = null;
            }
            that = null;
            the_actual_event = null;
            the_event = null;
            the_target = null;
            return;
        };

// Mark the node as a root. This prevents event bubbling from propagating
// past it.

        root["___adsafe root___"] = "___adsafe root___";

        Bunch.prototype = {
            append: function (appendage) {
                reject_global(this);
                var b = this.___nodes___;
                var flag = false;
                var i;
                var j;
                var node;
                var rep;
                if (b.length === 0 || !appendage) {
                    return this;
                }
                if (Array.isArray(appendage)) {
                    if (appendage.length !== b.length) {
                        error("ADsafe: Array length: " + b.length + "-" +
                                value.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        rep = appendage[i].___nodes___;
                        for (j = 0; j < rep.length; j += 1) {
                            b[i].appendChild(rep[j]);
                        }
                    }
                } else {
                    if (typeof appendage !== "string") {
                        rep = appendage.___nodes___;
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (rep) {
                            for (j = 0; j < rep.length; j += 1) {
                                node.appendChild((flag)
                                    ? rep[j].cloneNode(true)
                                    : rep[j]);
                            }
                            flag = true;
                        } else {
                            node.appendChild(document.createTextNode(appendage));
                        }
                    }
                }
                return this;
            },
            blur: function () {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                var node;
                has_focus = null;
                for (i = 0; i < b.length; i += 1) {
                    node = b[i];
                    if (node.blur) {
                        node.blur();
                    }
                }
                return this;
            },
            check: function (value) {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                var node;
                if (Array.isArray(value)) {
                    if (value.length !== b.length) {
                        error("ADsafe: Array length: " + b.length + "-" +
                                value.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node.checked = !!value[i];
                        }
                    }
                } else {
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node.checked = !!value;
                        }
                    }
                }
                return this;
            },
            "class": function (value) {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                var node;
                if (Array.isArray(value)) {
                    if (value.length !== b.length) {
                        error("ADsafe: Array length: " + b.length + "-" +
                                value.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        if (/url/i.test(string_check(value[i]))) {
                            error("ADsafe error.");
                        }
                        node = b[i];
                        if (node.tagName) {
                            node.className = value[i];
                        }
                    }
                } else {
                    if (/url/i.test(string_check(value))) {
                        error("ADsafe error.");
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node.className = value;
                        }
                    }
                }
                return this;
            },
            clone: function (deep, n) {
                var a = [];
                var b = this.___nodes___;
                var c;
                var i;
                var j;
                var k = n || 1;
                for (i = 0; i < k; i += 1) {
                    c = [];
                    for (j = 0; j < b.length; j += 1) {
                        c.push(b[j].cloneNode(deep));
                    }
                    a.push(new Bunch(c));
                }
                return (n)
                    ? a
                    : a[0];
            },
            count: function () {
                reject_global(this);
                return this.___nodes___.length;
            },
            each: function (func) {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                if (typeof func === "function") {
                    for (i = 0; i < b.length; i += 1) {
                        func(new Bunch([b[i]]));
                    }
                    return this;
                }
                error();
            },
            empty: function () {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                var node;
                if (Array.isArray(value)) {
                    if (value.length !== b.length) {
                        error("ADsafe: Array length: " + b.length + "-" +
                                value.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        while (node.firstChild) {
                            purge_event_handlers(node);
                            node.removeChild(node.firstChild);
                        }
                    }
                } else {
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        while (node.firstChild) {
                            purge_event_handlers(node);
                            node.removeChild(node.firstChild);
                        }
                    }
                }
                return this;
            },
            enable: function (enable) {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                var node;
                if (Array.isArray(enable)) {
                    if (enable.length !== b.length) {
                        error("ADsafe: Array length: " + b.length + "-" +
                                enable.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node.disabled = !enable[i];
                        }
                    }
                } else {
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node.disabled = !enable;
                        }
                    }
                }
                return this;
            },
            ephemeral: function () {
                reject_global(this);
                if (ephemeral) {
                    ephemeral.remove();
                }
                ephemeral = this;
                return this;
            },
            explode: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    a[i] = new Bunch([b[i]]);
                }
                return a;
            },
            fire: function (event) {

    // Fire an event on an object. The event can be either
    // a string containing the name of the event, or an
    // object containing a type property containing the
    // name of the event. Handlers registered by the "on"
    // method that match the event name will be invoked.

                reject_global(this);
                var array;
                var b;
                var i;
                var j;
                var n;
                var node;
                var on;
                var type;

                if (typeof event === "string") {
                    type = event;
                    event = {type: type};
                } else if (typeof event === "object") {
                    type = event.type;
                } else {
                    error();
                }
                b = this.___nodes___;
                n = b.length;
                for (i = 0; i < n; i += 1) {
                    node = b[i];
                    on = node["___ on ___"];

    // If an array of handlers exist for this event, then
    // loop through it and execute the handlers in order.

                    if (owns(on, type)) {
                        array = on[type];
                        for (j = 0; j < array.length; j += 1) {

    // Invoke a handler. Pass the event object.

                            array[j].call(this, event);
                        }
                    }
                }
                return this;
            },
            focus: function () {
                reject_global(this);
                var b = this.___nodes___;
                if (b.length > 0 && allow_focus) {
                    has_focus = b[0].focus();
                    return this;
                }
                error();
            },
            fragment: function () {
                reject_global(this);
                return new Bunch([document.createDocumentFragment()]);
            },
            getCheck: function () {
                return this.getChecks()[0];
            },
            getChecks: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    a[i] = b[i].checked;
                }
                return a;
            },
            getClass: function () {
                return this.getClasses()[0];
            },
            getClasses: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    a[i] = b[i].className;
                }
                return a;
            },
            getMark: function () {
                return this.getMarks()[0];
            },
            getMarks: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    a[i] = b[i]["_adsafe mark_"];
                }
                return a;
            },
            getName: function () {
                return this.getNames()[0];
            },
            getNames: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    a[i] = b[i].name;
                }
                return a;
            },
            getOffsetHeight: function () {
                return this.getOffsetHeights()[0];
            },
            getOffsetHeights: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    a[i] = b[i].offsetHeight;
                }
                return a;
            },
            getOffsetWidth: function () {
                return this.getOffsetWidths()[0];
            },
            getOffsetWidths: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    a[i] = b[i].offsetWidth;
                }
                return a;
            },
            getParent: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                var n;
                for (i = 0; i < b.length; i += 1) {
                    n = b[i].parentNode;
                    if (n["___adsafe root___"]) {
                        error("ADsafe parent violation.");
                    }
                    a[i] = n;
                }
                return new Bunch(a);
            },
            getSelection: function () {
                reject_global(this);
                var b = this.___nodes___;
                var end;
                var node;
                var start;
                var range;
                if (b.length === 1 && allow_focus) {
                    node = b[0];
                    if (typeof node.selectionStart === "number") {
                        start = node.selectionStart;
                        end = node.selectionEnd;
                        return node.value.slice(start, end);
                    }
                    range = node.createTextRange();
                    range.expand("textedit");
                    if (range.inRange(the_range)) {
                        return the_range.text;
                    }
                }
                return null;
            },
            getStyle: function (name) {
                return this.getStyles(name)[0];
            },
            getStyles: function (name) {
                reject_global(this);
                if (reject_name(name)) {
                    error("ADsafe style violation.");
                }
                var a = [];
                var b = this.___nodes___;
                var i;
                var node;
                var s;
                for (i = 0; i < b.length; i += 1) {
                    node = b[i];
                    if (node.tagName) {
                        s = (name !== "float")
                            ? getStyleObject(node)[name]
                            : getStyleObject(node).cssFloat ||
                                    getStyleObject(node).styleFloat;
                        if (typeof s === "string") {
                            a[i] = s;
                        }
                    }
                }
                return a;
            },
            getTagName: function () {
                return this.getTagNames()[0];
            },
            getTagNames: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                var tagName;
                for (i = 0; i < b.length; i += 1) {
                    tagName = b[i].tagName;
                    a[i] = (typeof tagName === "string")
                        ? tagName.toLowerCase()
                        : tagName;
                }
                return a;
            },
            getTitle: function () {
                return this.getTitles()[0];
            },
            getTitles: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    a[i] = b[i].title;
                }
                return a;
            },
            getValue: function () {
                return this.getValues()[0];
            },
            getValues: function () {
                reject_global(this);
                var a = [];
                var b = this.___nodes___;
                var i;
                var node;
                for (i = 0; i < b.length; i += 1) {
                    node = b[i];
                    if (node.nodeName === "#text") {
                        a[i] = node.nodeValue;
                    } else if (node.tagName && node.type !== "password") {
                        a[i] = node.value;
                        if (!a[i] && node.firstChild &&
                                node.firstChild.nodeName === "#text") {
                            a[i] = node.firstChild.nodeValue;
                        }
                    }
                }
                return a;
            },
            indeterminate: function (value) {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                var node;
                if (Array.isArray(value)) {
                    if (value.length !== b.length) {
                        error("ADsafe: Array length: " + b.length + "-" +
                                value.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node.indeterminate = !!value[i];
                        }
                    }
                } else {
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node.indeterminate = !!value;
                        }
                    }
                }
                return this;
            },
            klass: function (value) {
                return this.class(value);
            },
            mark: function (value) {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                var node;
                if (Array.isArray(value)) {
                    if (value.length !== b.length) {
                        error("ADsafe: Array length: " + b.length + "-" +
                                value.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node["_adsafe mark_"] = String(value[i]);
                        }
                    }
                } else {
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node["_adsafe mark_"] = String(value);
                        }
                    }
                }
                return this;
            },
            off: function (type) {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                var node;
                for (i = 0; i < b.length; i += 1) {
                    node = b[i];
                    if (typeof type === "string") {
                        if (typeof node["___ on ___"] === "object") {
                            node["___ on ___"][type] = null;
                        }
                    } else {
                        node["___ on ___"] = null;
                    }
                }
                return this;
            },
            on: function (type, func) {
                reject_global(this);
                if (typeof type !== "string" || typeof func !== "function") {
                    error();
                }

                var b = this.___nodes___;
                var i;
                var node;
                var on;
                var ontype;
                for (i = 0; i < b.length; i += 1) {
                    node = b[i];

// The change event does not propogate, so we must put the handler on the
// instance.

                    if (type === "change") {
                        ontype = "on" + type;
                        if (node[ontype] !== dom_event) {
                            node[ontype] = dom_event;
                        }
                    }

// Register an event. Put the function in a handler array, making one if it
// doesn't yet exist for this type on this node.

                    on = node["___ on ___"];
                    if (!on) {
                        on = {};
                        node["___ on ___"] = on;
                    }
                    if (owns(on, type)) {
                        on[type].push(func);
                    } else {
                        on[type] = [func];
                    }
                }
                return this;
            },
            protect: function () {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    b[i]["___adsafe root___"] = "___adsafe root___";
                }
                return this;
            },
            q: function (text) {
                reject_global(this);
                star = this.___star___;
                return new Bunch(quest(parse_query(string_check(text), id),
                        this.___nodes___));
            },
            remove: function () {
                reject_global(this);
                this.replace();
            },
            replace: function (replacement) {
                reject_global(this);
                var b = this.___nodes___;
                var flag = false;
                var i;
                var j;
                var newnode;
                var node;
                var parent;
                var rep;
                if (b.length === 0) {
                    return;
                }
                for (i = 0; i < b.length; i += 1) {
                    purge_event_handlers(b[i]);
                }
                if (!replacement || replacement.length === 0 ||
                        (replacement.___nodes___ &&
                        replacement.___nodes___.length === 0)) {
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        purge_event_handlers(node);
                        if (node.parentNode) {
                            node.parentNode.removeChild(node);
                        }
                    }
                } else if (Array.isArray(replacement)) {
                    if (replacement.length !== b.length) {
                        error("ADsafe: Array length: " +
                                b.length + "-" + value.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        parent = node.parentNode;
                        purge_event_handlers(node);
                        if (parent) {
                            rep = replacement[i].___nodes___;
                            if (rep.length > 0) {
                                newnode = rep[0];
                                parent.replaceChild(newnode, node);
                                for (j = 1; j < rep.length; j += 1) {
                                    node = newnode;
                                    newnode = rep[j];
                                    parent.insertBefore(newnode, node.nextSibling);
                                }
                            } else {
                                parent.removeChild(node);
                            }
                        }
                    }
                } else {
                    rep = replacement.___nodes___;
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        purge_event_handlers(node);
                        parent = node.parentNode;
                        if (parent) {
                            newnode = (flag)
                                ? rep[0].cloneNode(true)
                                : rep[0];
                            parent.replaceChild(newnode, node);
                            for (j = 1; j < rep.length; j += 1) {
                                node = newnode;
                                newnode = (flag)
                                    ? rep[j].clone(true)
                                    : rep[j];
                                parent.insertBefore(newnode, node.nextSibling);
                            }
                            flag = true;
                        }
                    }
                }
                return this;
            },
            select: function () {
                reject_global(this);
                var b = this.___nodes___;
                if (b.length < 1 || !allow_focus) {
                    error();
                }
                b[0].focus();
                b[0].select();
                return this;
            },
            selection: function (string) {
                reject_global(this);
                string_check(string);
                var b = this.___nodes___;
                var end;
                var node;
                var old;
                var start;
                var range;
                if (b.length === 1 && allow_focus) {
                    node = b[0];
                    if (typeof node.selectionStart === "number") {
                        start = node.selectionStart;
                        end = node.selectionEnd;
                        old = node.value;
                        node.value = old.slice(0, start) + string + old.slice(end);
                        node.selectionStart = start + string.length;
                        node.selectionEnd = start + string.length;
                        node.focus();
                    } else {
                        range = node.createTextRange();
                        range.expand("textedit");
                        if (range.inRange(the_range)) {
                            the_range.select();
                            the_range.text = string;
                            the_range.select();
                        }
                    }
                }
                return this;
            },
            style: function (name, value) {
                reject_global(this);
                if (reject_name(name)) {
                    error("ADsafe style violation.");
                }
                if (value === undefined || (/url/i.test(string_check(value)))) {
                    error();
                }
                var b = this.___nodes___;
                var i;
                var node;
                var v;
                if (Array.isArray(value)) {
                    if (value.length !== b.length) {
                        error("ADsafe: Array length: " +
                                b.length + "-" + value.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        v = string_check(value[i]);
                        if (/url/i.test(v)) {
                            error();
                        }
                        if (node.tagName) {
                            if (name !== "float") {
                                node.style[name] = v;
                            } else {
                                node.style.cssFloat = v;
                                node.style.styleFloat = v;
                            }
                        }
                    }
                } else {
                    v = string_check(value);
                    if (/url/i.test(v)) {
                        error();
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            if (name !== "float") {
                                node.style[name] = v;
                            } else {
                                node.style.cssFloat = v;
                                node.style.styleFloat = v;
                            }
                        }
                    }
                }
                return this;
            },
            tag: function (tag, type, name) {
                reject_global(this);
                var node;
                if (typeof tag !== "string") {
                    error();
                }
                if (makeableTagName[tag] !== true) {
                    error("ADsafe: Bad tag: " + tag);
                }
                node = document.createElement(tag);
                if (name) {
                    node.autocomplete = "off";
                    node.name = string_check(name);
                }
                if (type) {
                    node.type = string_check(type);
                }
                return new Bunch([node]);
            },
            text: function (text) {
                reject_global(this);
                var a;
                var i;
                if (Array.isArray(text)) {
                    a = [];
                    for (i = 0; i < text.length; i += 1) {
                        a[i] = document.createTextNode(string_check(text[i]));
                    }
                    return new Bunch(a);
                }
                return new Bunch([document.createTextNode(string_check(text))]);
            },
            title: function (value) {
                reject_global(this);
                var b = this.___nodes___;
                var i;
                var node;
                if (Array.isArray(value)) {
                    if (value.length !== b.length) {
                        error("ADsafe: Array length: " + b.length +
                                "-" + value.length);
                    }
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node.title = string_check(value[i]);
                        }
                    }
                } else {
                    string_check(value);
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            node.title = value;
                        }
                    }
                }
                return this;
            },
            value: function (value) {
                reject_global(this);
                if (value === undefined) {
                    error();
                }
                var b = this.___nodes___;
                var i;
                var node;
                if (Array.isArray(value) && b.length === value.length) {
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            if (node.type !== "password") {
                                if (typeof node.value === "string") {
                                    node.value = value[i];
                                } else {
                                    while (node.firstChild) {
                                        purge_event_handlers(node.firstChild);
                                        node.removeChild(node.firstChild);
                                    }
                                    node.appendChild(document.createTextNode(
                                        String(value[i])
                                    ));
                                }
                            }
                        } else if (node.nodeName === "#text") {
                            node.nodeValue = String(value[i]);
                        }
                    }
                } else {
                    value = String(value);
                    for (i = 0; i < b.length; i += 1) {
                        node = b[i];
                        if (node.tagName) {
                            if (node.tagName !== "BUTTON" &&
                                    typeof node.value === "string") {
                                node.value = value;
                            } else {
                                while (node.firstChild) {
                                    purge_event_handlers(node.firstChild);
                                    node.removeChild(node.firstChild);
                                }
                                node.appendChild(document.createTextNode(value));
                            }
                        } else if (node.nodeName === "#text") {
                            node.nodeValue = value;
                        }
                    }
                }
                return this;
            }
        };

// Return an ADsafe dom object.

        dom = {
            append: function (bunch) {
                var b = (typeof bunch === "string")
                    ? [document.createTextNode(bunch)]
                    : bunch.___nodes___;
                var i;
                var n;
                for (i = 0; i < b.length; i += 1) {
                    n = b[i];
                    if (typeof n === "string" || typeof n === "number") {
                        n = document.createTextNode(String(n));
                    }
                    root.appendChild(n);
                }
                return dom;
            },
            combine: function (array) {
                if (!array || !array.length) {
                    error("ADsafe: Bad combination.");
                }
                var b = array[0].___nodes___;
                var i;
                for (i = 0; i < array.length; i += 1) {
                    b = b.concat(array[i].___nodes___);
                }
                return new Bunch(b);
            },
            count: function () {
                return 1;
            },
            ephemeral: function (bunch) {
                if (ephemeral) {
                    ephemeral.remove();
                }
                ephemeral = bunch;
                return dom;
            },
            fragment: function () {
                return new Bunch([document.createDocumentFragment()]);
            },
            prepend: function (bunch) {
                var b = bunch.___nodes___;
                var i;
                for (i = 0; i < b.length; i += 1) {
                    root.insertBefore(b[i], root.firstChild);
                }
                return dom;
            },
            q: function (text) {
                star = false;
                var query = parse_query(text, id);
                if (typeof hunter[query[0].op] !== "function") {
                    error("ADsafe: Bad query: " + query[0]);
                }
                return new Bunch(quest(query, [root]));
            },
            remove: function () {
                purge_event_handlers(root);
                root.parent.removeElement(root);
                root = null;
            },
            row: function (values) {
                var tr = document.createElement("tr");
                var td;
                var i;
                for (i = 0; i < values.length; i += 1) {
                    td = document.createElement("td");
                    td.appendChild(document.createTextNode(String(values[i])));
                    tr.appendChild(td);
                }
                return new Bunch([tr]);
            },
            tag: function (tag, type, name) {
                var node;
                if (typeof tag !== "string") {
                    error();
                }
                if (makeableTagName[tag] !== true) {
                    error("ADsafe: Bad tag: " + tag);
                }
                node = document.createElement(tag);
                if (name) {
                    node.autocomplete = "off";
                    node.name = name;
                }
                if (type) {
                    node.type = type;
                }
                return new Bunch([node]);
            },
            text: function (text) {
                var a;
                var i;
                if (Array.isArray(text)) {
                    a = [];
                    for (i = 0; i < text.length; i += 1) {
                        a[i] = document.createTextNode(string_check(text[i]));
                    }
                    return new Bunch(a);
                }
                return new Bunch([document.createTextNode(string_check(text))]);
            }
        };

        if (typeof root.addEventListener === "function") {
            root.addEventListener("focus", dom_event, true);
            root.addEventListener("blur", dom_event, true);
            root.addEventListener("mouseover", dom_event, true);
            root.addEventListener("mouseout", dom_event, true);
            root.addEventListener("mouseup", dom_event, true);
            root.addEventListener("mousedown", dom_event, true);
            root.addEventListener("mousemove", dom_event, true);
            root.addEventListener("click", dom_event, true);
            root.addEventListener("dblclick", dom_event, true);
            root.addEventListener("keypress", dom_event, true);
        } else {
            root.onclick = dom_event;
            root.ondblclick = dom_event;
            root.onfocusin = dom_event;
            root.onfocusout = dom_event;
            root.onkeypress = dom_event;
            root.onmouseout = dom_event;
            root.onmousedown = dom_event;
            root.onmousemove = dom_event;
            root.onmouseover = dom_event;
            root.onmouseup = dom_event;
        }
        return [dom, Bunch.prototype];
    }


//  Return the ADSAFE object.

    return {
        create: function (o) {
            reject_global(o);
            return Object.create(o);
        },

//  ADSAFE.get retrieves a value from an object.

        get: function (object, name) {
            reject_global(object);
            if (!reject_property(object, name)) {
                return object[name];
            }
            error();
        },

//  ADSAFE.go allows a guest widget to get access to a wrapped dom node and
//  approved ADsafe libraries. It is passed an id and a function. The function
//  will be passed the wrapped dom node and an object containing the libraries.

        go: function (id, f) {
            var dom;
            var fun;
            var root;
            var i;
            var scripts;

//  If ADSAFE.id was called, the id better match.

            if (adsafe_id && adsafe_id !== id) {
                error();
            }

//  Get the dom node for the widget's div container.

            root = document.getElementById(id);
            if (root.tagName !== "DIV") {
                error();
            }
            adsafe_id = null;

//  Delete the scripts held in the div. They have all run, so we don't need
//  them any more. If the div had no scripts, then something is wrong.
//  This provides some protection against mishaps due to weakness in the
//  document.getElementById function.

            scripts = root.getElementsByTagName("script");
            i = scripts.length - 1;
            if (i < 0) {
                error();
            }
            do {
                root.removeChild(scripts[i]);
                i -= 1;
            } while (i >= 0);
            root = make_root(root, id);
            dom = root[0];

// If the page has registered interceptors, call then.

            for (i = 0; i < interceptors.length; i += 1) {
                fun = interceptors[i];
                if (typeof fun === "function") {
                    try {
                        fun(id, dom, adsafe_lib, root[1]);
                    } catch (e1) {
                        ADSAFE.log(e1);
                    }
                }
            }

//  Call the supplied function.

            try {
                f(dom, adsafe_lib);
            } catch (e2) {
                ADSAFE.log(e2);
            }
            root = null;
            adsafe_lib = null;
        },

//  ADSAFE.has returns true if the object contains an own property with the
//  given name.

        has: function (object, name) {
            return owns(object, name);
        },

//  ADSAFE.id allows a guest widget to indicate that it wants to load
//  ADsafe approved libraries.

        id: function (id) {

//  Calls to ADSAFE.id must be balanced with calls to ADSAFE.go.
//  Only one id can be active at a time.

            if (adsafe_id) {
                error();
            }
            adsafe_id = id;
            adsafe_lib = {};
        },

//  ADSAFE.isArray returns true if the operand is an array.

        isArray: Array.isArray || function (value) {
            return Object.prototype.toString.apply(value) === "[object Array]";
        },

//  ADSAFE.keys returns an array of keys.

        keys: Object.keys,

//  ADSAFE.later calls a function at a later time.

        later: function (func, timeout) {
            if (typeof func === "function") {
                setTimeout(func, timeout || 0);
            } else {
                error();
            }
        },

//  ADSAFE.lib allows an approved ADsafe library to make itself available
//  to a widget. The library provides a name and a function. The result of
//  calling that function will be made available to the widget via the name.

        lib: function (name, f) {
            if (!adsafe_id || reject_name(name)) {
                error("ADsafe lib violation.");
            }
            adsafe_lib[name] = f(adsafe_lib);
        },

//  ADSAFE.log is a debugging aid that spams text to the browser's log.
//  Overwrite this function to send log matter somewhere else.

        log: function log(s) {
            if (window.console) {
                console.log(s);
            } else if (typeof Debug === "object") {
                Debug.writeln(s);      /* IE */
            } else {
                opera.postError(s);    /* Opera */
            }
        },

//  ADSAFE.remove deletes a value from an object.

        remove: function (object, name) {
            if (!reject_property(object, name)) {
                delete object[name];
                return;
            }
            error();
        },

//  ADSAFE.set stores a value in an object.

        set: function (object, name, value) {
            reject_global(object);
            if (!reject_property(object, name)) {
                object[name] = value;
                return;
            }
            error();
        },

//  ADSAFE._intercept allows the page to register a function that will
//  see the widget's capabilities.

        _intercept: function (f) {
            interceptors.push(f);
        }

    };
}());

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJhZHNhZmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAcHJlc2VydmVcbiAqIEBhdXRob3IgRG91Z2xhcyBDcm9ja2ZvcmQgPGRvdWdsYXNAY3JvY2tmb3JkLmNvbT5cbiAqIEB2ZXJzaW9uIDwlPSB2ZXJzaW9uICU+XG4gKiBAZGVzY3JpcHRpb24gPCU9IGRlc2NyaXB0aW9uICU+XG4gKi9cbi8vIGFkc2FmZS5qc1xuLy8gMjAxNi0wMi0wN1xuXG4vLyAgICBQdWJsaWMgRG9tYWluLlxuXG4vLyAgICBOTyBXQVJSQU5UWSBFWFBSRVNTRUQgT1IgSU1QTElFRC4gVVNFIEFUIFlPVVIgT1dOIFJJU0suXG4vLyAgICBTVUJKRUNUIFRPIENIQU5HRSBXSVRIT1VUIE5PVElDRS5cblxuLy8gICAgT3JpZ2luYWwgdXJsOiBodHRwOi8vd3d3LkFEc2FmZS5vcmcvYWRzYWZlLmpzXG5cbi8vIFRoaXMgZmlsZSBpbXBsZW1lbnRzIHRoZSBjb3JlIEFEU0FGRSBydW50aW1lLiBBIHNpdGUgbWF5IGFkZCBhZGRpdGlvbmFsXG4vLyBtZXRob2RzIHVuZGVyc3RhbmRpbmcgdGhhdCB0aG9zZSBtZXRob2RzIHdpbGwgYmUgbWFkZSBhdmFpbGFibGUgdG8gZ3Vlc3Rcbi8vIGNvZGUuXG5cbi8vIFRoaXMgY29kZSBzaG91bGQgYmUgbWluaWZpZWQgYmVmb3JlIGRlcGxveW1lbnQuXG4vLyBTZWUgaHR0cDovL2phdmFzY3JpcHQuY3JvY2tmb3JkLmNvbS9qc21pbi5odG1sXG5cbi8vIFVTRSBZT1VSIE9XTiBDT1BZLiBJVCBJUyBFWFRSRU1FTFkgVU5XSVNFIFRPIExPQUQgQ09ERSBGUk9NIFNFUlZFUlMgWU9VIERPXG4vLyBOT1QgQ09OVFJPTC5cblxuLypnbG9iYWwgd2luZG93Ki9cblxuLypqc2xpbnQgYnJvd3NlciwgZGV2ZWwsIGZvciwgdGhpc1xuKi9cblxuLypwcm9wZXJ0eVxuICAgIF8sIF9fX25vZGVzX19fLCBfX19zdGFyX19fLCBfaW50ZXJjZXB0LCBhLCBhYmJyLCBhY3JvbnltLCBhZGRFdmVudExpc3RlbmVyLFxuICAgIGFkZHJlc3MsIGFsdEtleSwgYXBwZW5kLCBhcHBlbmRDaGlsZCwgYXBwbHksIGFyZWEsIGFyZ3VtZW50cywgYXV0b2NvbXBsZXRlLFxuICAgIGIsIGJkbywgYmlnLCBibG9ja3F1b3RlLCBibHVyLCBiciwgYnViYmxlLCBidXR0b24sIGNhbGwsIGNhbGxlZSwgY2FsbGVyLFxuICAgIGNhbmNlbEJ1YmJsZSwgY2FudmFzLCBjYXB0aW9uLCBjZW50ZXIsIGNoYW5nZSwgY2hhckF0LCBjaGFyQ29kZSwgY2hlY2ssXG4gICAgY2hlY2tlZCwgY2hpbGROb2RlcywgY2l0ZSwgY2xhc3MsIGNsYXNzTmFtZSwgY2xpZW50WCwgY2xpZW50WSwgY2xvbmUsXG4gICAgY2xvbmVOb2RlLCBjb2RlLCBjb2wsIGNvbGdyb3VwLCBjb21iaW5lLCBjb25jYXQsIGNvbnNvbGUsIGNvbnN0cnVjdG9yLFxuICAgIGNvdW50LCBjcmVhdGUsIGNyZWF0ZURvY3VtZW50RnJhZ21lbnQsIGNyZWF0ZUVsZW1lbnQsIGNyZWF0ZVJhbmdlLFxuICAgIGNyZWF0ZVRleHROb2RlLCBjcmVhdGVUZXh0UmFuZ2UsIGNzc0Zsb2F0LCBjdHJsS2V5LCBjdXJyZW50U3R5bGUsIGRkLFxuICAgIGRlZmF1bHRWaWV3LCBkZWwsIGRmbiwgZGlyLCBkaXNhYmxlZCwgZGl2LCBkbCwgZHQsIGVhY2gsIGVtLCBlbXB0eSwgZW5hYmxlLFxuICAgIGVwaGVtZXJhbCwgZXZhbCwgZXhlYywgZXhwYW5kLCBleHBsb2RlLCBmaWVsZHNldCwgZmlyZSwgZmlyc3RDaGlsZCwgZm9jdXMsXG4gICAgZm9udCwgZm9ybSwgZnJhZ21lbnQsIGZyb21DaGFyQ29kZSwgZ2V0LCBnZXRDaGVjaywgZ2V0Q2hlY2tzLCBnZXRDbGFzcyxcbiAgICBnZXRDbGFzc2VzLCBnZXRDb21wdXRlZFN0eWxlLCBnZXRFbGVtZW50QnlJZCwgZ2V0RWxlbWVudHNCeVRhZ05hbWUsXG4gICAgZ2V0TWFyaywgZ2V0TWFya3MsIGdldE5hbWUsIGdldE5hbWVzLCBnZXRPZmZzZXRIZWlnaHQsIGdldE9mZnNldEhlaWdodHMsXG4gICAgZ2V0T2Zmc2V0V2lkdGgsIGdldE9mZnNldFdpZHRocywgZ2V0UGFyZW50LCBnZXRTZWxlY3Rpb24sIGdldFN0eWxlLFxuICAgIGdldFN0eWxlcywgZ2V0VGFnTmFtZSwgZ2V0VGFnTmFtZXMsIGdldFRpdGxlLCBnZXRUaXRsZXMsIGdldFZhbHVlLFxuICAgIGdldFZhbHVlcywgZ28sIGgxLCBoMiwgaDMsIGg0LCBoNSwgaDYsIGhhcywgaGFzT3duUHJvcGVydHksIGhyLCBpLCBpZCwgaW1nLFxuICAgIGluUmFuZ2UsIGluZGV0ZXJtaW5hdGUsIGluZGV4T2YsIGlucHV0LCBpbnMsIGluc2VydEJlZm9yZSwgaXNBcnJheSwga2JkLFxuICAgIGtleSwga2V5Q29kZSwga2V5cywga2xhc3MsIGxhYmVsLCBsYXRlciwgbGVnZW5kLCBsZW5ndGgsIGxpLCBsaWIsIGxvZywgbWFwLFxuICAgIG1hcmssIG1lbnUsIG1lc3NhZ2UsIG5hbWUsIG5leHRTaWJsaW5nLCBub2RlTmFtZSwgbm9kZVZhbHVlLCBvYmplY3QsIG9mZixcbiAgICBvZmZzZXRIZWlnaHQsIG9mZnNldFdpZHRoLCBvbCwgb24sIG9uY2xpY2ssIG9uZGJsY2xpY2ssIG9uZm9jdXNpbixcbiAgICBvbmZvY3Vzb3V0LCBvbmtleXByZXNzLCBvbm1vdXNlZG93biwgb25tb3VzZW1vdmUsIG9ubW91c2VvdXQsIG9ubW91c2VvdmVyLFxuICAgIG9ubW91c2V1cCwgb3AsIG9wdGdyb3VwLCBvcHRpb24sIHAsIHBhcmVudCwgcGFyZW50Tm9kZSwgcG9zdEVycm9yLCBwcmUsXG4gICAgcHJlcGVuZCwgcHJldmVudERlZmF1bHQsIHByb3RlY3QsIHByb3RvdHlwZSwgcHVzaCwgcSwgcmVtb3ZlLCByZW1vdmVDaGlsZCxcbiAgICByZW1vdmVFbGVtZW50LCByZXBsYWNlLCByZXBsYWNlQ2hpbGQsIHJldHVyblZhbHVlLCByb3csIHNhbXAsIHNlbGVjdCxcbiAgICBzZWxlY3Rpb24sIHNlbGVjdGlvbkVuZCwgc2VsZWN0aW9uU3RhcnQsIHNldCwgc2hpZnRLZXksIHNsaWNlLCBzbWFsbCwgc3BhbixcbiAgICBzcmNFbGVtZW50LCBzdGFjaywgc3RvcFByb3BhZ2F0aW9uLCBzdHJvbmcsIHN0eWxlLCBzdHlsZUZsb2F0LCBzdWIsIHN1cCxcbiAgICB0YWJsZSwgdGFnLCB0YWdOYW1lLCB0YXJnZXQsIHRib2R5LCB0ZCwgdGVzdCwgdGV4dCwgdGV4dGFyZWEsIHRmb290LCB0aCxcbiAgICB0aGF0LCB0aGVhZCwgdGl0bGUsIHRvTG93ZXJDYXNlLCB0b1N0cmluZywgdG9VcHBlckNhc2UsIHRyLCB0dCwgdHlwZSwgdSxcbiAgICB1bCwgdW53YXRjaCwgdmFsdWUsIHZhbHVlT2YsIHZhciwgdmlzaWJpbGl0eSwgd2F0Y2gsIHdpbmRvdywgd3JpdGVsbiwgeCwgeVxuKi9cblxudmFyIEFEU0FGRTtcbkFEU0FGRSA9IChmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgYWRzYWZlX2lkOyAgICAgIC8vIFRoZSBpZCBvZiB0aGUgY3VycmVudCB3aWRnZXRcbiAgICB2YXIgYWRzYWZlX2xpYjsgICAgIC8vIFRoZSBzY3JpcHQgbGlicmFyaWVzIGxvYWRlZCBieSB0aGUgY3VycmVudCB3aWRnZXRcblxuLy8gVGhlc2UgbWVtYmVyIG5hbWVzIGFyZSBiYW5uZWQgZnJvbSBndWVzdCBzY3JpcHRzLiBUaGUgQURTQUZFLmdldCBhbmRcbi8vIEFEU0FGRS5wdXQgbWV0aG9kcyB3aWxsIG5vdCBhbGxvdyBhY2Nlc3MgdG8gdGhlc2UgcHJvcGVydGllcy5cblxuICAgIHZhciBiYW5uZWQgPSB7XG4gICAgICAgIGFyZ3VtZW50czogdHJ1ZSxcbiAgICAgICAgY2FsbGVlOiB0cnVlLFxuICAgICAgICBjYWxsZXI6IHRydWUsXG4gICAgICAgIGNvbnN0cnVjdG9yOiB0cnVlLFxuICAgICAgICBldmFsOiB0cnVlLFxuICAgICAgICBwcm90b3R5cGU6IHRydWUsXG4gICAgICAgIHN0YWNrOiB0cnVlLFxuICAgICAgICB1bndhdGNoOiB0cnVlLFxuICAgICAgICB2YWx1ZU9mOiB0cnVlLFxuICAgICAgICB3YXRjaDogdHJ1ZVxuICAgIH07XG5cbiAgICB2YXIgY2FjaGVfc3R5bGVfb2JqZWN0O1xuICAgIHZhciBjYWNoZV9zdHlsZV9ub2RlO1xuICAgIHZhciBkZWZhdWx0VmlldyA9IGRvY3VtZW50LmRlZmF1bHRWaWV3O1xuICAgIHZhciBlcGhlbWVyYWw7XG4gICAgdmFyIGZsaXBmbG9wOyAgICAgICAvLyBVc2VkIGluIDpldmVuLzpvZGQgcHJvY2Vzc2luZ1xuICAgIHZhciBoYXNfZm9jdXM7XG4gICAgdmFyIGh1bnRlcjsgICAgICAgICAvLyBTZXQgb2YgaHVudGVyIHBhdHRlcm5zXG4gICAgdmFyIGludGVyY2VwdG9ycyA9IFtdO1xuXG4gICAgdmFyIG1ha2VhYmxlVGFnTmFtZSA9IHtcblxuLy8gVGhpcyBpcyB0aGUgd2hpdGVsaXN0IG9mIGVsZW1lbnRzIHRoYXQgbWF5IGJlIGNyZWF0ZWQgd2l0aCB0aGUgLnRhZyh0YWdOYW1lKVxuLy8gbWV0aG9kLlxuXG4gICAgICAgIGE6IHRydWUsXG4gICAgICAgIGFiYnI6IHRydWUsXG4gICAgICAgIGFjcm9ueW06IHRydWUsXG4gICAgICAgIGFkZHJlc3M6IHRydWUsXG4gICAgICAgIGFyZWE6IHRydWUsXG4gICAgICAgIGI6IHRydWUsXG4gICAgICAgIGJkbzogdHJ1ZSxcbiAgICAgICAgYmlnOiB0cnVlLFxuICAgICAgICBibG9ja3F1b3RlOiB0cnVlLFxuICAgICAgICBicjogdHJ1ZSxcbiAgICAgICAgYnV0dG9uOiB0cnVlLFxuICAgICAgICBjYW52YXM6IHRydWUsXG4gICAgICAgIGNhcHRpb246IHRydWUsXG4gICAgICAgIGNlbnRlcjogdHJ1ZSxcbiAgICAgICAgY2l0ZTogdHJ1ZSxcbiAgICAgICAgY29kZTogdHJ1ZSxcbiAgICAgICAgY29sOiB0cnVlLFxuICAgICAgICBjb2xncm91cDogdHJ1ZSxcbiAgICAgICAgZGQ6IHRydWUsXG4gICAgICAgIGRlbDogdHJ1ZSxcbiAgICAgICAgZGZuOiB0cnVlLFxuICAgICAgICBkaXI6IHRydWUsXG4gICAgICAgIGRpdjogdHJ1ZSxcbiAgICAgICAgZGw6IHRydWUsXG4gICAgICAgIGR0OiB0cnVlLFxuICAgICAgICBlbTogdHJ1ZSxcbiAgICAgICAgZmllbGRzZXQ6IHRydWUsXG4gICAgICAgIGZvbnQ6IHRydWUsXG4gICAgICAgIGZvcm06IHRydWUsXG4gICAgICAgIGgxOiB0cnVlLFxuICAgICAgICBoMjogdHJ1ZSxcbiAgICAgICAgaDM6IHRydWUsXG4gICAgICAgIGg0OiB0cnVlLFxuICAgICAgICBoNTogdHJ1ZSxcbiAgICAgICAgaDY6IHRydWUsXG4gICAgICAgIGhyOiB0cnVlLFxuICAgICAgICBpOiB0cnVlLFxuICAgICAgICBpbWc6IHRydWUsXG4gICAgICAgIGlucHV0OiB0cnVlLFxuICAgICAgICBpbnM6IHRydWUsXG4gICAgICAgIGtiZDogdHJ1ZSxcbiAgICAgICAgbGFiZWw6IHRydWUsXG4gICAgICAgIGxlZ2VuZDogdHJ1ZSxcbiAgICAgICAgbGk6IHRydWUsXG4gICAgICAgIG1hcDogdHJ1ZSxcbiAgICAgICAgbWVudTogdHJ1ZSxcbiAgICAgICAgb2JqZWN0OiB0cnVlLFxuICAgICAgICBvbDogdHJ1ZSxcbiAgICAgICAgb3B0Z3JvdXA6IHRydWUsXG4gICAgICAgIG9wdGlvbjogdHJ1ZSxcbiAgICAgICAgcDogdHJ1ZSxcbiAgICAgICAgcHJlOiB0cnVlLFxuICAgICAgICBxOiB0cnVlLFxuICAgICAgICBzYW1wOiB0cnVlLFxuICAgICAgICBzZWxlY3Q6IHRydWUsXG4gICAgICAgIHNtYWxsOiB0cnVlLFxuICAgICAgICBzcGFuOiB0cnVlLFxuICAgICAgICBzdHJvbmc6IHRydWUsXG4gICAgICAgIHN1YjogdHJ1ZSxcbiAgICAgICAgc3VwOiB0cnVlLFxuICAgICAgICB0YWJsZTogdHJ1ZSxcbiAgICAgICAgdGJvZHk6IHRydWUsXG4gICAgICAgIHRkOiB0cnVlLFxuICAgICAgICB0ZXh0YXJlYTogdHJ1ZSxcbiAgICAgICAgdGZvb3Q6IHRydWUsXG4gICAgICAgIHRoOiB0cnVlLFxuICAgICAgICB0aGVhZDogdHJ1ZSxcbiAgICAgICAgdHI6IHRydWUsXG4gICAgICAgIHR0OiB0cnVlLFxuICAgICAgICB1OiB0cnVlLFxuICAgICAgICB1bDogdHJ1ZSxcbiAgICAgICAgdmFyOiB0cnVlXG4gICAgfTtcbiAgICB2YXIgbmFtZTtcbiAgICB2YXIgcGVja2VyOyAgICAgLy8gc2V0IG9mIHBlY2tlciBwYXR0ZXJuc1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHN0YXI7XG4gICAgdmFyIHRoZV9yYW5nZTtcbiAgICB2YXIgdmFsdWU7XG5cblxuLy8gIFRoZSBlcnJvciBmdW5jdGlvbiBpcyBjYWxsZWQgaWYgdGhlcmUgaXMgYSB2aW9sYXRpb24gb3IgY29uZnVzaW9uLlxuLy8gIEl0IHRocm93cyBhbiBleGNlcHRpb24uXG5cbiAgICBmdW5jdGlvbiBlcnJvcihtZXNzYWdlKSB7XG4gICAgICAgIEFEU0FGRS5sb2coXCJBRHNhZmUgZXJyb3I6IFwiICsgKG1lc3NhZ2UgfHwgXCJBRHNhZmUgdmlvbGF0aW9uLlwiKSk7XG4gICAgICAgIHRocm93IHtcbiAgICAgICAgICAgIG5hbWU6IFwiQURzYWZlXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlIHx8IFwiQURzYWZlIHZpb2xhdGlvbi5cIlxuICAgICAgICB9O1xuICAgIH1cblxuXG4vLyAgICBTb21lIG9mIEphdmFTY3JpcHQncyBpbXBsaWNpdCBzdHJpbmcgY29udmVyc2lvbnMgY2FuIGdyYW50IGV4dHJhb3JkaW5hcnlcbi8vICAgIHBvd2VycyB0byB1bnRydXN0ZWQgY29kZS4gU28gd2UgdXNlIHRoZSBzdHJpbmdfY2hlY2sgZnVuY3Rpb24gdG8gcHJldmVudFxuLy8gICAgc3VjaCBhYnVzZXMuXG5cbiAgICBmdW5jdGlvbiBzdHJpbmdfY2hlY2soc3RyaW5nKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyaW5nICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBlcnJvcihcIkFEc2FmZSBzdHJpbmcgdmlvbGF0aW9uLlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH1cblxuXG4vLyAgICBUaGUgb2JqZWN0Lmhhc093blByb3BlcnR5IG1ldGhvZCBoYXMgYSBudW1iZXIgb2YgaGF6YXJkcy4gU28gd2Ugd3JhcCBpdCBpblxuLy8gICAgdGhlIG93bnMgZnVuY3Rpb24uXG5cbiAgICBmdW5jdGlvbiBvd25zKG9iamVjdCwgc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBvYmplY3QgJiYgdHlwZW9mIG9iamVjdCA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICAgICAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHN0cmluZ19jaGVjayhzdHJpbmcpKTtcbiAgICB9XG5cbi8vICBUaGUgcmVqZWN0IGZ1bmN0aW9ucyBlbmZvcmNlIHRoZSByZXN0cmljdGlvbiBvbiBwcm9wZXJ0eSBuYW1lcy5cbi8vICByZWplY3RfcHJvcGVydHkgYWxsb3dzIGFjY2VzcyBvbmx5IHRvIG9iamVjdHMgYW5kIGFycmF5cy4gSXQgZG9lcyBub3QgYWxsb3dcbi8vICB1c2Ugb2YgdGhlIGJhbm5lZCBuYW1lcywgb3IgbmFtZXMgdGhhdCBhcmUgbm90IHN0cmluZ3MgYW5kIG5vdCBudW1iZXJzLFxuLy8gIG9yIHN0cmluZ3MgdGhhdCBzdGFydCBvciBlbmQgd2l0aCBfLlxuXG4gICAgZnVuY3Rpb24gcmVqZWN0X25hbWUobmFtZSkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG5hbWUgIT09IFwibnVtYmVyXCIgJiYgKHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiIHx8XG4gICAgICAgICAgICAgICAgYmFubmVkW25hbWVdIHx8IG5hbWUuY2hhckF0KDApID09PSBcIl9cIiB8fCBuYW1lLnNsaWNlKC0xKSA9PT0gXCJfXCIpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcmVqZWN0X3Byb3BlcnR5KG9iamVjdCwgbmFtZSkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iamVjdCAhPT0gXCJvYmplY3RcIiB8fCByZWplY3RfbmFtZShuYW1lKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHJlamVjdF9nbG9iYWwodGhhdCkge1xuICAgICAgICBpZiAodGhhdC53aW5kb3cpIHtcbiAgICAgICAgICAgIGVycm9yKCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGdldFN0eWxlT2JqZWN0KG5vZGUpIHtcblxuLy8gVGhlIGdldFN0eWxlT2JqZWN0IGZ1bmN0aW9uIHJldHVybnMgdGhlIGNvbXB1dGVkIHN0eWxlIG9iamVjdCBmb3IgYSBub2RlLlxuXG4gICAgICAgIGlmIChub2RlID09PSBjYWNoZV9zdHlsZV9ub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVfc3R5bGVfb2JqZWN0O1xuICAgICAgICB9XG4gICAgICAgIGNhY2hlX3N0eWxlX25vZGUgPSBub2RlO1xuICAgICAgICBjYWNoZV9zdHlsZV9vYmplY3QgPVxuICAgICAgICAgICAgICAgIG5vZGUuY3VycmVudFN0eWxlIHx8IGRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUobm9kZSwgXCJcIik7XG4gICAgICAgIHJldHVybiBjYWNoZV9zdHlsZV9vYmplY3Q7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiB3YWxrVGhlRE9NKG5vZGUsIGZ1bmMsIHNraXApIHtcblxuLy8gUmVjdXJzaXZlbHkgdHJhdmVyc2UgdGhlIERPTSB0cmVlLCBzdGFydGluZyB3aXRoIHRoZSBub2RlLCBpbiBkb2N1bWVudFxuLy8gc291cmNlIG9yZGVyLCBjYWxsaW5nIHRoZSBmdW5jIG9uIGVhY2ggbm9kZSB2aXNpc3RlZC5cblxuICAgICAgICBpZiAoIXNraXApIHtcbiAgICAgICAgICAgIGZ1bmMobm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGUuZmlyc3RDaGlsZDtcbiAgICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgICAgIHdhbGtUaGVET00obm9kZSwgZnVuYyk7XG4gICAgICAgICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZztcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcHVyZ2VfZXZlbnRfaGFuZGxlcnMobm9kZSkge1xuXG4vLyBXZSBhdHRhY2ggYWxsIGV2ZW50IGhhbmRsZXJzIHRvIGFuIFwiX19fIG9uIF9fX1wiIHByb3BlcnR5LiBUaGUgcHJvcGVydHkgbmFtZVxuLy8gY29udGFpbnMgc3BhY2VzIHRvIGluc3VyZSB0aGF0IHRoZXJlIGlzIG5vIGNvbGxpc2lvbiB3aXRoIEhUTUwgYXR0cmlidWVzLlxuLy8gS2VlcGluZyB0aGUgaGFuZGxlcnMgaW4gYSBzaW5nbGUgcHJvcGVydHkgbWFrZXMgaXQgZWFzeSB0byByZW1vdmUgdGhlbVxuLy8gYWxsIGF0IG9uY2UuIFJlbW92YWwgaXMgcmVxdWlyZWQgdG8gYXZvaWQgbWVtb3J5IGxlYWthZ2Ugb24gSUU2IGFuZCBJRTcuXG5cbiAgICAgICAgd2Fsa1RoZURPTShub2RlLCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIG5vZGVbXCJfX18gb24gX19fXCJdID0gbnVsbDtcbiAgICAgICAgICAgICAgICBub2RlLmNoYW5nZSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcGFyc2VfcXVlcnkodGV4dCwgaWQpIHtcblxuLy8gQ29udmVydCBhIHF1ZXJ5IHN0cmluZyBpbnRvIGFuIGFycmF5IG9mIG9wL25hbWUvdmFsdWUgc2VsZWN0b3JzLlxuLy8gQSBxdWVyeSBzdHJpbmcgaXMgYSBzZXF1ZW5jZSBvZiB0cmlwbGVzIHdyYXBwZWQgaW4gYnJhY2tldHM7IG9yIG5hbWVzLFxuLy8gcG9zc2libHkgcHJlZml4ZWQgYnkgIyAuICYgPiBfLCBvciA6b3B0aW9uLCBvciAqIG9yIC8uIEEgdHJpcGxlIGlzIGEgbmFtZSxcbi8vIGFuZCBvcGVyYXRvciAob25lIG9mIFs9LCBbIT0sIFsqPSwgW349LCBbfD0sIFskPSwgb3IgW149KSBhbmQgYSB2YWx1ZS5cblxuLy8gSWYgdGhlIGlkIHBhcmFtZXRlciBpcyBzdXBwbGllZCwgdGhlbiB0aGUgbmFtZSBmb2xsb3dpbmcgIyBtdXN0IGhhdmUgdGhlXG4vLyBpZCBhcyBhIHByZWZpeCBhbmQgbXVzdCBtYXRjaCB0aGUgQURzYWZlIHJ1bGUgZm9yIGlkOiBiZWluZyBhbGwgdXBwZXJjYXNlXG4vLyBsZXR0ZXJzIGFuZCBkaWdpdHMgd2l0aCBvbmUgdW5kZXJiYXIuXG5cbi8vIEEgbmFtZSBtdXN0IGJlIGFsbCBsb3dlciBjYXNlIGFuZCBtYXkgY29udGFpbiBkaWdpdHMsIC0sIG9yIF8uXG5cbiAgICAgICAgdmFyIG1hdGNoOyAgICAgICAgICAvLyBBIG1hdGNoIGFycmF5XG4gICAgICAgIHZhciBxdWVyeSA9IFtdOyAgICAgLy8gVGhlIHJlc3VsdGluZyBxdWVyeSBhcnJheVxuICAgICAgICB2YXIgc2VsZWN0b3I7XG4gICAgICAgIHZhciBxeCA9IChpZClcbiAgICAgICAgICAgID8gL15cXHMqKD86KFtcXCpcXC9dKXxcXFtcXHMqKFthLXpdWzAtOWEtel9cXC1dKilcXHMqKD86KFshKn5cXHwkXFxeXT89KVxccyooWzAtOUEtWmEtel9cXC0qJSY7LlxcLzohXSspXFxzKik/XFxdfCNcXHMqKFtBLVpdK19bQS1aMC05XSspfDpcXHMqKFthLXpdKyl8KFsuJl8+XFwrXT8pXFxzKihbYS16XVswLTlhLXpcXC1dKikpXFxzKi9cbiAgICAgICAgICAgIDogL15cXHMqKD86KFtcXCpcXC9dKXxcXFtcXHMqKFthLXpdWzAtOWEtel9cXC1dKilcXHMqKD86KFshKn5cXHwkXFxeXT89KVxccyooWzAtOUEtWmEtel9cXC0qJSY7LlxcLzohXSspXFxzKik/XFxdfCNcXHMqKFtcXC1BLVphLXowLTlfXSspfDpcXHMqKFthLXpdKyl8KFsuJl8+XFwrXT8pXFxzKihbYS16XVswLTlhLXpcXC1dKikpXFxzKi87XG5cbi8vIExvb3Agb3ZlciBhbGwgb2YgdGhlIHNlbGVjdG9ycyBpbiB0aGUgdGV4dC5cblxuICAgICAgICBkbyB7XG5cbi8vIFRoZSBxeCB0ZWFzZXMgdGhlIGNvbXBvbmVudHMgb2Ygb25lIHNlbGVjdG9yIG91dCBvZiB0aGUgdGV4dCwgaWdub3Jpbmdcbi8vIHdoaXRlc3BhY2UuXG5cbi8vICAgICAgICAgIG1hdGNoWzBdICB0aGUgd2hvbGUgc2VsZWN0b3Jcbi8vICAgICAgICAgIG1hdGNoWzFdICAqIC9cbi8vICAgICAgICAgIG1hdGNoWzJdICBhdHRyaWJ1dGUgbmFtZVxuLy8gICAgICAgICAgbWF0Y2hbM10gID0gIT0gKj0gfj0gfD0gJD0gXj1cbi8vICAgICAgICAgIG1hdGNoWzRdICBhdHRyaWJ1dGUgdmFsdWVcbi8vICAgICAgICAgIG1hdGNoWzVdICAjIGlkXG4vLyAgICAgICAgICBtYXRjaFs2XSAgOiBvcHRpb25cbi8vICAgICAgICAgIG1hdGNoWzddICAuICYgXyA+ICtcbi8vICAgICAgICAgIG1hdGNoWzhdICAgICAgbmFtZVxuXG4gICAgICAgICAgICBtYXRjaCA9IHF4LmV4ZWMoc3RyaW5nX2NoZWNrKHRleHQpKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQmFkIHF1ZXJ5OlwiICsgdGV4dCk7XG4gICAgICAgICAgICB9XG5cbi8vIE1ha2UgYSBzZWxlY3RvciBvYmplY3QgYW5kIHN0dWZmIGl0IGluIHRoZSBxdWVyeS5cblxuICAgICAgICAgICAgaWYgKG1hdGNoWzFdKSB7XG5cbi8vIFRoZSBzZWxlY3RvciBpcyAqIG9yIC9cblxuICAgICAgICAgICAgICAgIHNlbGVjdG9yID0ge1xuICAgICAgICAgICAgICAgICAgICBvcDogbWF0Y2hbMV1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaFsyXSkge1xuXG4vLyBUaGUgc2VsZWN0b3IgaXMgaW4gYnJhY2tldHMuXG5cbiAgICAgICAgICAgICAgICBzZWxlY3RvciA9IChtYXRjaFszXSlcbiAgICAgICAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcDogXCJbXCIgKyBtYXRjaFszXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG1hdGNoWzJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG1hdGNoWzRdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcDogXCJbXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBtYXRjaFsyXVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaFs1XSkge1xuXG4vLyBUaGUgc2VsZWN0b3IgaXMgYW4gaWQuXG5cbiAgICAgICAgICAgICAgICBpZiAocXVlcnkubGVuZ3RoID4gMCB8fCBtYXRjaFs1XS5sZW5ndGggPD0gaWQubGVuZ3RoIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaFs1XS5zbGljZSgwLCBpZC5sZW5ndGgpICE9PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQmFkIHF1ZXJ5OiBcIiArIHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxlY3RvciA9IHtcbiAgICAgICAgICAgICAgICAgICAgb3A6IFwiI1wiLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBtYXRjaFs1XVxuICAgICAgICAgICAgICAgIH07XG5cbi8vIFRoZSBzZWxlY3RvciBpcyBhIGNvbG9uLlxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoWzZdKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3IgPSB7XG4gICAgICAgICAgICAgICAgICAgIG9wOiBcIjpcIiArIG1hdGNoWzZdXG4gICAgICAgICAgICAgICAgfTtcblxuLy8gVGhlIHNlbGVjdG9yIGlzIG9uZSBvZiA+ICsgLiAmIF8gb3IgYSBuYWtlZCB0YWcgbmFtZVxuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yID0ge1xuICAgICAgICAgICAgICAgICAgICBvcDogbWF0Y2hbN10sXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG1hdGNoWzhdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuLy8gQWRkIHRoZSBzZWxlY3RvciB0byB0aGUgcXVlcnkuXG5cbiAgICAgICAgICAgIHF1ZXJ5LnB1c2goc2VsZWN0b3IpO1xuXG4vLyBSZW1vdmUgdGhlIHNlbGVjdG9yIGZyb20gdGhlIHRleHQuIElmIHRoZXJlIGlzIG1vcmUgdGV4dCwgaGF2ZSBhbm90aGVyIGdvLlxuXG4gICAgICAgICAgICB0ZXh0ID0gdGV4dC5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICB9IHdoaWxlICh0ZXh0KTtcbiAgICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgIH1cblxuXG4gICAgaHVudGVyID0ge1xuXG4vLyBUaGVzZSBmdW5jdGlvbnMgaW1wbGVtZW50IHRoZSBodW50ZXIgYmVoYXZpb3JzLlxuXG4gICAgICAgIFwiXCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICB2YXIgYXJyYXk7XG4gICAgICAgICAgICB2YXIgbm9kZWxpc3QgPSBub2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKG5hbWUpO1xuICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICB2YXIgbGVuZ3RoO1xuXG4vLyBnZXRFbGVtZW50c0J5VGFnTmFtZSBwcm9kdWNlcyBhIG5vZGVMaXN0LCB3aGljaCBpcyBvbmUgb2YgdGhlIHdvcmxkJ3MgbW9zdFxuLy8gaW5lZmZpY2llbnQgZGF0YSBzdHJ1Y3R1cmVzLiBJdCBpcyBzbyBzbG93IHRoYXQgSmF2YVNjcmlwdCdzIHBzZXVkbyBhcnJheXNcbi8vIGxvb2sgdGVycmlmaWNhbGx5IHN3aWZ0IGJ5IGNvbXBhcmlzb24uIFNvIHdlIGRvIHRoZSBjb252ZXJzaW9uLiBUaGlzIGlzXG4vLyBlYXNpbHkgZG9uZSBvbiBzb21lIGJyb3dzZXJzLCBsZXNzIGVhc2lseSBvbiBvdGhlcnMuXG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXJyYXkgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChub2RlbGlzdCwgMCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gKHJlc3VsdC5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgID8gcmVzdWx0LmNvbmNhdChhcnJheSlcbiAgICAgICAgICAgICAgICAgICAgOiBhcnJheTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge1xuICAgICAgICAgICAgICAgIGxlbmd0aCA9IG5vZGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gobm9kZWxpc3RbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCIrXCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICB3aGlsZSAobm9kZSAmJiAhbm9kZS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm9kZSAmJiBub2RlLnRhZ05hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCI+XCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBub2RlID0gbm9kZS5maXJzdENoaWxkO1xuICAgICAgICAgICAgbmFtZSA9IG5hbWUudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiI1wiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG5hbWUpO1xuICAgICAgICAgICAgaWYgKG4udGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIi9cIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBub2RlcyA9IG5vZGUuY2hpbGROb2RlcztcbiAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgdmFyIGxlbmd0aCA9IG5vZGVzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG5vZGVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCIqXCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBzdGFyID0gdHJ1ZTtcbiAgICAgICAgICAgIHdhbGtUaGVET00obm9kZSwgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHBlY2tlciA9IHtcbiAgICAgICAgXCIuXCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICB2YXIgY2xhc3N5ID0gXCIgXCIgKyBub2RlLmNsYXNzTmFtZSArIFwiIFwiO1xuICAgICAgICAgICAgcmV0dXJuIGNsYXNzeS5pbmRleE9mKFwiIFwiICsgbmFtZSArIFwiIFwiKSA+PSAwO1xuICAgICAgICB9LFxuICAgICAgICBcIiZcIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLm5hbWUgPT09IG5hbWU7XG4gICAgICAgIH0sXG4gICAgICAgIFwiX1wiOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGUudHlwZSA9PT0gbmFtZTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJbXCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIG5vZGVbbmFtZV0gPT09IFwic3RyaW5nXCI7XG4gICAgICAgIH0sXG4gICAgICAgIFwiWz1cIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBtZW1iZXIgPSBub2RlW25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBtZW1iZXIgPT09IFwic3RyaW5nXCIgJiYgbWVtYmVyID09PSB2YWx1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJbIT1cIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBtZW1iZXIgPSBub2RlW25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBtZW1iZXIgPT09IFwic3RyaW5nXCIgJiYgbWVtYmVyICE9PSB2YWx1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJbXj1cIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBtZW1iZXIgPSBub2RlW25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBtZW1iZXIgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgICAgICAgICAgICAgbWVtYmVyLnNsaWNlKDAsIG1lbWJlci5sZW5ndGgpID09PSB2YWx1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJbJD1cIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBtZW1iZXIgPSBub2RlW25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBtZW1iZXIgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgICAgICAgICAgICAgbWVtYmVyLnNsaWNlKC1tZW1iZXIubGVuZ3RoKSA9PT0gdmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIFwiWyo9XCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICB2YXIgbWVtYmVyID0gbm9kZVtuYW1lXTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgbWVtYmVyID09PSBcInN0cmluZ1wiICYmXG4gICAgICAgICAgICAgICAgICAgIG1lbWJlci5pbmRleE9mKHZhbHVlKSA+PSAwO1xuICAgICAgICB9LFxuICAgICAgICBcIlt+PVwiOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgdmFyIG1lbWJlciA9IG5vZGVbbmFtZV07XG4gICAgICAgICAgICBpZiAodHlwZW9mIG1lbWJlciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIG1lbWJlciA9IFwiIFwiICsgbWVtYmVyICsgXCIgXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lbWJlci5pbmRleE9mKFwiIFwiICsgdmFsdWUgKyBcIiBcIikgPj0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJbfD1cIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBtZW1iZXIgPSBub2RlW25hbWVdO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZW1iZXIgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBtZW1iZXIgPSBcIi1cIiArIG1lbWJlciArIFwiLVwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBtZW1iZXIuaW5kZXhPZihcIi1cIiArIHZhbHVlICsgXCItXCIpID49IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiOmJsdXJcIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlICE9PSBoYXNfZm9jdXM7XG4gICAgICAgIH0sXG4gICAgICAgIFwiOmNoZWNrZWRcIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLmNoZWNrZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIFwiOmRpc2FibGVkXCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZS50YWdOYW1lICYmIG5vZGUuZGlzYWJsZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIFwiOmVuYWJsZWRcIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLnRhZ05hbWUgJiYgIW5vZGUuZGlzYWJsZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIFwiOmV2ZW5cIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBmO1xuICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIGYgPSBmbGlwZmxvcDtcbiAgICAgICAgICAgICAgICBmbGlwZmxvcCA9ICFmbGlwZmxvcDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgXCI6Zm9jdXNcIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlID09PSBoYXNfZm9jdXM7XG4gICAgICAgIH0sXG4gICAgICAgIFwiOmhpZGRlblwiOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGUudGFnTmFtZSAmJiBnZXRTdHlsZU9iamVjdChub2RlKS52aXNpYmlsaXR5ICE9PSBcInZpc2libGVcIjtcbiAgICAgICAgfSxcbiAgICAgICAgXCI6b2RkXCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgZmxpcGZsb3AgPSAhZmxpcGZsb3A7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZsaXBmbG9wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBcIjp0YWdcIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLnRhZ05hbWU7XG4gICAgICAgIH0sXG4gICAgICAgIFwiOnRleHRcIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLm5vZGVOYW1lID09PSBcIiN0ZXh0XCI7XG4gICAgICAgIH0sXG4gICAgICAgIFwiOnRyaW1cIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLm5vZGVOYW1lICE9PSBcIiN0ZXh0XCIgfHwgKC9cXFcvLnRlc3Qobm9kZS5ub2RlVmFsdWUpKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCI6dW5jaGVja2VkXCI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZS50YWdOYW1lICYmICFub2RlLmNoZWNrZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIFwiOnZpc2libGVcIjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLnRhZ05hbWUgJiYgZ2V0U3R5bGVPYmplY3Qobm9kZSkudmlzaWJpbGl0eSA9PT0gXCJ2aXNpYmxlXCI7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBmdW5jdGlvbiBxdWVzdChxdWVyeSwgbm9kZXMpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yO1xuICAgICAgICB2YXIgZnVuYztcbiAgICAgICAgdmFyIGk7XG4gICAgICAgIHZhciBqO1xuXG4vLyBTdGVwIHRocm91Z2ggZWFjaCBzZWxlY3Rvci5cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcXVlcnkubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIHNlbGVjdG9yID0gcXVlcnlbaV07XG4gICAgICAgICAgICBuYW1lID0gc2VsZWN0b3IubmFtZTtcbiAgICAgICAgICAgIGZ1bmMgPSBodW50ZXJbc2VsZWN0b3Iub3BdO1xuXG4vLyBUaGVyZSBhcmUgdHdvIGtpbmRzIG9mIHNlbGVjdG9yczogaHVudGVycyBhbmQgcGVja2Vycy4gSWYgdGhpcyBpcyBhIGh1bnRlcixcbi8vIGxvb3AgdGhyb3VnaCB0aGUgdGhlIG5vZGVzLCBwYXNzaW5nIGVhY2ggbm9kZSB0byB0aGUgaHVudGVyIGZ1bmN0aW9uLlxuLy8gQWNjdW11bGF0ZSBhbGwgdGhlIG5vZGVzIGl0IGZpbmRzLlxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZ1bmMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGlmIChzdGFyKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQURzYWZlOiBRdWVyeSB2aW9sYXRpb246ICpcIiArIHNlbGVjdG9yLm9wICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoc2VsZWN0b3IubmFtZSB8fCBcIlwiKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBub2Rlcy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBmdW5jKG5vZGVzW2pdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4vLyBJZiB0aGlzIGlzIGEgcGVja2VyLCBnZXQgaXRzIGZ1bmN0aW9uLiBUaGVyZSBpcyBhIHNwZWNpYWwgY2FzZSBmb3Jcbi8vIHRoZSA6Zmlyc3QgYW5kIDpyZXN0IHNlbGVjdG9ycyBiZWNhdXNlIHRoZXkgYXJlIHNvIHNpbXBsZS5cblxuICAgICAgICAgICAgICAgIHZhbHVlID0gc2VsZWN0b3IudmFsdWU7XG4gICAgICAgICAgICAgICAgZmxpcGZsb3AgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBmdW5jID0gcGVja2VyW3NlbGVjdG9yLm9wXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGZ1bmMgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHNlbGVjdG9yLm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCI6Zmlyc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5vZGVzLnNsaWNlKDAsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCI6cmVzdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gbm9kZXMuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQURzYWZlOiBRdWVyeSB2aW9sYXRpb246IDpcIiArIHNlbGVjdG9yLm9wKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbi8vIEZvciB0aGUgb3RoZXIgc2VsZWN0b3JzLCBtYWtlIGFuIGFycmF5IG9mIG5vZGVzIHRoYXQgYXJlIGZpbHRlcmVkIGJ5XG4vLyB0aGUgcGVja2VyIGZ1bmN0aW9uLlxuXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgbm9kZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmdW5jKG5vZGVzW2pdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG5vZGVzW2pdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5vZGVzID0gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBtYWtlX3Jvb3Qocm9vdCwgaWQpIHtcblxuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIGlmIChyb290LnRhZ05hbWUgIT09IFwiRElWXCIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQmFkIG5vZGUuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHJvb3QudGFnTmFtZSAhPT0gXCJCT0RZXCIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQmFkIG5vZGUuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbi8vIEEgQnVuY2ggaXMgYSBjb250YWluZXIgdGhhdCBob2xkcyB6ZXJvIG9yIG1vcmUgZG9tIG5vZGVzLlxuLy8gSXQgaGFzIG1hbnkgdXNlZnVsIG1ldGhvZHMuXG5cbiAgICAgICAgZnVuY3Rpb24gQnVuY2gobm9kZXMpIHtcbiAgICAgICAgICAgIHRoaXMuX19fbm9kZXNfX18gPSBub2RlcztcbiAgICAgICAgICAgIHRoaXMuX19fc3Rhcl9fXyA9IHN0YXIgJiYgbm9kZXMubGVuZ3RoID4gMTtcbiAgICAgICAgICAgIHN0YXIgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhbGxvd19mb2N1cyA9IHRydWU7XG4gICAgICAgIHZhciBkb207XG4gICAgICAgIHZhciBkb21fZXZlbnQgPSBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBrZXk7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0O1xuICAgICAgICAgICAgdmFyIHRoYXQ7XG4gICAgICAgICAgICB2YXIgdGhlX2V2ZW50O1xuICAgICAgICAgICAgdmFyIHRoZV90YXJnZXQ7XG4gICAgICAgICAgICB2YXIgdGhlX2FjdHVhbF9ldmVudCA9IGV2IHx8IGV2ZW50O1xuICAgICAgICAgICAgdmFyIHR5cGUgPSB0aGVfYWN0dWFsX2V2ZW50LnR5cGU7XG5cbi8vIEdldCB0aGUgdGFyZ2V0IG5vZGUgYW5kIHdyYXAgaXQgaW4gYSBidW5jaC5cblxuICAgICAgICAgICAgdGhlX3RhcmdldCA9IHRoZV9hY3R1YWxfZXZlbnQudGFyZ2V0IHx8IHRoZV9hY3R1YWxfZXZlbnQuc3JjRWxlbWVudDtcbiAgICAgICAgICAgIHRhcmdldCA9IG5ldyBCdW5jaChbdGhlX3RhcmdldF0pO1xuICAgICAgICAgICAgdGhhdCA9IHRhcmdldDtcblxuLy8gVXNlIHRoZSBQUEsgaGFjayB0byBtYWtlIGZvY3VzIGJ1YmJseSBvbiBJRS5cbi8vIFdoZW4gYSB3aWRnZXQgaGFzIGZvY3VzLCBpdCBjYW4gdXNlIHRoZSBmb2N1cyBtZXRob2QuXG5cbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBcIm1vdXNlZG93blwiOlxuICAgICAgICAgICAgICAgIGFsbG93X2ZvY3VzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQuc2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoZV9yYW5nZSA9IGRvY3VtZW50LnNlbGVjdGlvbi5jcmVhdGVSYW5nZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJmb2N1c1wiOlxuICAgICAgICAgICAgY2FzZSBcImZvY3VzaW5cIjpcbiAgICAgICAgICAgICAgICBhbGxvd19mb2N1cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgaGFzX2ZvY3VzID0gdGhlX3RhcmdldDtcbiAgICAgICAgICAgICAgICB0aGVfYWN0dWFsX2V2ZW50LmNhbmNlbEJ1YmJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHR5cGUgPSBcImZvY3VzXCI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiYmx1clwiOlxuICAgICAgICAgICAgY2FzZSBcImZvY3Vzb3V0XCI6XG4gICAgICAgICAgICAgICAgYWxsb3dfZm9jdXMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBoYXNfZm9jdXMgPSBudWxsO1xuICAgICAgICAgICAgICAgIHR5cGUgPSBcImJsdXJcIjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJrZXlwcmVzc1wiOlxuICAgICAgICAgICAgICAgIGFsbG93X2ZvY3VzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBoYXNfZm9jdXMgPSB0aGVfdGFyZ2V0O1xuICAgICAgICAgICAgICAgIGtleSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodGhlX2FjdHVhbF9ldmVudC5jaGFyQ29kZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhlX2FjdHVhbF9ldmVudC5rZXlDb2RlKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJcXHUwMDBkXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIlxcdTAwMGFcIjpcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IFwiZW50ZXJrZXlcIjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIlxcdTAwMWJcIjpcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IFwiZXNjYXBla2V5XCI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuLy8gVGhpcyBpcyBhIHdvcmthcm91bmQgZm9yIFNhZmFyaS5cblxuICAgICAgICAgICAgY2FzZSBcImNsaWNrXCI6XG4gICAgICAgICAgICAgICAgYWxsb3dfZm9jdXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoZV9hY3R1YWxfZXZlbnQuY2FuY2VsQnViYmxlICYmXG4gICAgICAgICAgICAgICAgICAgIHRoZV9hY3R1YWxfZXZlbnQuc3RvcFByb3BhZ2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhlX2FjdHVhbF9ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIH1cblxuLy8gTWFrZSB0aGUgZXZlbnQgb2JqZWN0LlxuXG4gICAgICAgICAgICB0aGVfZXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgYWx0S2V5OiB0aGVfYWN0dWFsX2V2ZW50LmFsdEtleSxcbiAgICAgICAgICAgICAgICBjdHJsS2V5OiB0aGVfYWN0dWFsX2V2ZW50LmN0cmxLZXksXG4gICAgICAgICAgICAgICAgYnViYmxlOiBmdW5jdGlvbiAoKSB7XG5cbi8vIEJ1YmJsZSB1cC4gR2V0IHRoZSBwYXJlbnQgb2YgdGhhdCBub2RlLiBJdCBiZWNvbWVzIHRoZSBuZXcgdGhhdC5cbi8vIGdldFBhcmVudCB0aHJvd3Mgd2hlbiBidWJibGluZyBpcyBub3QgcG9zc2libGUuXG5cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnQgPSB0aGF0LmdldFBhcmVudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGIgPSBwYXJlbnQuX19fbm9kZXNfX19bMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0ID0gcGFyZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhlX2V2ZW50LnRoYXQgPSB0aGF0O1xuXG4vLyBJZiB0aGF0IG5vZGUgaGFzIGFuIGV2ZW50IGhhbmRsZXIsIGZpcmUgaXQuIE90aGVyd2lzZSwgYnViYmxlIHVwLlxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYltcIl9fXyBvbiBfX19cIl0gJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYltcIl9fXyBvbiBfX19cIl1bdHlwZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmZpcmUodGhlX2V2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlX2V2ZW50LmJ1YmJsZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgcHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoZV9hY3R1YWxfZXZlbnQucHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoZV9hY3R1YWxfZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGVfYWN0dWFsX2V2ZW50LnJldHVyblZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaGlmdEtleTogdGhlX2FjdHVhbF9ldmVudC5zaGlmdEtleSxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHRhcmdldCxcbiAgICAgICAgICAgICAgICB0aGF0OiB0aGF0LFxuICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICAgICAgeDogdGhlX2FjdHVhbF9ldmVudC5jbGllbnRYLFxuICAgICAgICAgICAgICAgIHk6IHRoZV9hY3R1YWxfZXZlbnQuY2xpZW50WVxuICAgICAgICAgICAgfTtcblxuLy8gSWYgdGhlIHRhcmdldCBoYXMgZXZlbnQgaGFuZGxlcnMsIHRoZW4gZmlyZSB0aGVtLiBPdGhlcndpc2UsIGJ1YmJsZSB1cC5cblxuICAgICAgICAgICAgaWYgKHRoZV90YXJnZXRbXCJfX18gb24gX19fXCJdICYmXG4gICAgICAgICAgICAgICAgICAgIHRoZV90YXJnZXRbXCJfX18gb24gX19fXCJdW3RoZV9ldmVudC50eXBlXSkge1xuICAgICAgICAgICAgICAgIHRhcmdldC5maXJlKHRoZV9ldmVudCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoZV90YXJnZXQgPSB0aGVfdGFyZ2V0LnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhlX3RhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoZV90YXJnZXRbXCJfX18gb24gX19fXCJdICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlX3RhcmdldFtcIl9fXyBvbiBfX19cIl1bdGhlX2V2ZW50LnR5cGVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0ID0gbmV3IEJ1bmNoKFt0aGVfdGFyZ2V0XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVfZXZlbnQudGhhdCA9IHRoYXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmZpcmUodGhlX2V2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGVfdGFyZ2V0W1wiX19fYWRzYWZlIHJvb3RfX19cIl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoZV9ldmVudC50eXBlID09PSBcImVzY2FwZWtleVwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVwaGVtZXJhbCkge1xuICAgICAgICAgICAgICAgICAgICBlcGhlbWVyYWwucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVwaGVtZXJhbCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGF0ID0gbnVsbDtcbiAgICAgICAgICAgIHRoZV9hY3R1YWxfZXZlbnQgPSBudWxsO1xuICAgICAgICAgICAgdGhlX2V2ZW50ID0gbnVsbDtcbiAgICAgICAgICAgIHRoZV90YXJnZXQgPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9O1xuXG4vLyBNYXJrIHRoZSBub2RlIGFzIGEgcm9vdC4gVGhpcyBwcmV2ZW50cyBldmVudCBidWJibGluZyBmcm9tIHByb3BhZ2F0aW5nXG4vLyBwYXN0IGl0LlxuXG4gICAgICAgIHJvb3RbXCJfX19hZHNhZmUgcm9vdF9fX1wiXSA9IFwiX19fYWRzYWZlIHJvb3RfX19cIjtcblxuICAgICAgICBCdW5jaC5wcm90b3R5cGUgPSB7XG4gICAgICAgICAgICBhcHBlbmQ6IGZ1bmN0aW9uIChhcHBlbmRhZ2UpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgZmxhZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIHZhciBqO1xuICAgICAgICAgICAgICAgIHZhciBub2RlO1xuICAgICAgICAgICAgICAgIHZhciByZXA7XG4gICAgICAgICAgICAgICAgaWYgKGIubGVuZ3RoID09PSAwIHx8ICFhcHBlbmRhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGFwcGVuZGFnZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwcGVuZGFnZS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQXJyYXkgbGVuZ3RoOiBcIiArIGIubGVuZ3RoICsgXCItXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXAgPSBhcHBlbmRhZ2VbaV0uX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgcmVwLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYltpXS5hcHBlbmRDaGlsZChyZXBbal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcHBlbmRhZ2UgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcCA9IGFwcGVuZGFnZS5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHJlcC5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKChmbGFnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPyByZXBbal0uY2xvbmVOb2RlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHJlcFtqXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGFwcGVuZGFnZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJsdXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZTtcbiAgICAgICAgICAgICAgICBoYXNfZm9jdXMgPSBudWxsO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSBiW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5ibHVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmJsdXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjaGVjazogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQXJyYXkgbGVuZ3RoOiBcIiArIGIubGVuZ3RoICsgXCItXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLmNoZWNrZWQgPSAhIXZhbHVlW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUgPSBiW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuY2hlY2tlZCA9ICEhdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJjbGFzc1wiOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZTtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQURzYWZlOiBBcnJheSBsZW5ndGg6IFwiICsgYi5sZW5ndGggKyBcIi1cIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgvdXJsL2kudGVzdChzdHJpbmdfY2hlY2sodmFsdWVbaV0pKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQURzYWZlIGVycm9yLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUgPSBiW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuY2xhc3NOYW1lID0gdmFsdWVbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoL3VybC9pLnRlc3Qoc3RyaW5nX2NoZWNrKHZhbHVlKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQURzYWZlIGVycm9yLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5jbGFzc05hbWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjbG9uZTogZnVuY3Rpb24gKGRlZXAsIG4pIHtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgYztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICB2YXIgajtcbiAgICAgICAgICAgICAgICB2YXIgayA9IG4gfHwgMTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgazsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGIubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMucHVzaChiW2pdLmNsb25lTm9kZShkZWVwKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYS5wdXNoKG5ldyBCdW5jaChjKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAobilcbiAgICAgICAgICAgICAgICAgICAgPyBhXG4gICAgICAgICAgICAgICAgICAgIDogYVswXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb3VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19fbm9kZXNfX18ubGVuZ3RoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVhY2g6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBmdW5jID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmMobmV3IEJ1bmNoKFtiW2ldXSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlcnJvcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQXJyYXkgbGVuZ3RoOiBcIiArIGIubGVuZ3RoICsgXCItXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwdXJnZV9ldmVudF9oYW5kbGVycyhub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUNoaWxkKG5vZGUuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAobm9kZS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHVyZ2VfZXZlbnRfaGFuZGxlcnMobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVDaGlsZChub2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVuYWJsZTogZnVuY3Rpb24gKGVuYWJsZSkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIHZhciBub2RlO1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVuYWJsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuYWJsZS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQXJyYXkgbGVuZ3RoOiBcIiArIGIubGVuZ3RoICsgXCItXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGUubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5kaXNhYmxlZCA9ICFlbmFibGVbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5kaXNhYmxlZCA9ICFlbmFibGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXBoZW1lcmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICBpZiAoZXBoZW1lcmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGVwaGVtZXJhbC5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXBoZW1lcmFsID0gdGhpcztcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBleHBsb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhW2ldID0gbmV3IEJ1bmNoKFtiW2ldXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZpcmU6IGZ1bmN0aW9uIChldmVudCkge1xuXG4gICAgLy8gRmlyZSBhbiBldmVudCBvbiBhbiBvYmplY3QuIFRoZSBldmVudCBjYW4gYmUgZWl0aGVyXG4gICAgLy8gYSBzdHJpbmcgY29udGFpbmluZyB0aGUgbmFtZSBvZiB0aGUgZXZlbnQsIG9yIGFuXG4gICAgLy8gb2JqZWN0IGNvbnRhaW5pbmcgYSB0eXBlIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlXG4gICAgLy8gbmFtZSBvZiB0aGUgZXZlbnQuIEhhbmRsZXJzIHJlZ2lzdGVyZWQgYnkgdGhlIFwib25cIlxuICAgIC8vIG1ldGhvZCB0aGF0IG1hdGNoIHRoZSBldmVudCBuYW1lIHdpbGwgYmUgaW52b2tlZC5cblxuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGFycmF5O1xuICAgICAgICAgICAgICAgIHZhciBiO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIHZhciBqO1xuICAgICAgICAgICAgICAgIHZhciBuO1xuICAgICAgICAgICAgICAgIHZhciBub2RlO1xuICAgICAgICAgICAgICAgIHZhciBvbjtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXZlbnQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IGV2ZW50O1xuICAgICAgICAgICAgICAgICAgICBldmVudCA9IHt0eXBlOiB0eXBlfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBldmVudCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gZXZlbnQudHlwZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICBuID0gYi5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG47IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgb24gPSBub2RlW1wiX19fIG9uIF9fX1wiXTtcblxuICAgIC8vIElmIGFuIGFycmF5IG9mIGhhbmRsZXJzIGV4aXN0IGZvciB0aGlzIGV2ZW50LCB0aGVuXG4gICAgLy8gbG9vcCB0aHJvdWdoIGl0IGFuZCBleGVjdXRlIHRoZSBoYW5kbGVycyBpbiBvcmRlci5cblxuICAgICAgICAgICAgICAgICAgICBpZiAob3ducyhvbiwgdHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5ID0gb25bdHlwZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgYXJyYXkubGVuZ3RoOyBqICs9IDEpIHtcblxuICAgIC8vIEludm9rZSBhIGhhbmRsZXIuIFBhc3MgdGhlIGV2ZW50IG9iamVjdC5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5W2pdLmNhbGwodGhpcywgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZvY3VzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgaWYgKGIubGVuZ3RoID4gMCAmJiBhbGxvd19mb2N1cykge1xuICAgICAgICAgICAgICAgICAgICBoYXNfZm9jdXMgPSBiWzBdLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlcnJvcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZyYWdtZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1bmNoKFtkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCldKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRDaGVjazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENoZWNrcygpWzBdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENoZWNrczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYVtpXSA9IGJbaV0uY2hlY2tlZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q2xhc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRDbGFzc2VzKClbMF07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q2xhc3NlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYVtpXSA9IGJbaV0uY2xhc3NOYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRNYXJrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0TWFya3MoKVswXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRNYXJrczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYVtpXSA9IGJbaV1bXCJfYWRzYWZlIG1hcmtfXCJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXROYW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0TmFtZXMoKVswXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXROYW1lczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYVtpXSA9IGJbaV0ubmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0T2Zmc2V0SGVpZ2h0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0T2Zmc2V0SGVpZ2h0cygpWzBdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldE9mZnNldEhlaWdodHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBhID0gW107XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGFbaV0gPSBiW2ldLm9mZnNldEhlaWdodDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0T2Zmc2V0V2lkdGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPZmZzZXRXaWR0aHMoKVswXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRPZmZzZXRXaWR0aHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBhID0gW107XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGFbaV0gPSBiW2ldLm9mZnNldFdpZHRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBhID0gW107XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIHZhciBuO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBiW2ldLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuW1wiX19fYWRzYWZlIHJvb3RfX19cIl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQURzYWZlIHBhcmVudCB2aW9sYXRpb24uXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFbaV0gPSBuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1bmNoKGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFNlbGVjdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBlbmQ7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGU7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0O1xuICAgICAgICAgICAgICAgIHZhciByYW5nZTtcbiAgICAgICAgICAgICAgICBpZiAoYi5sZW5ndGggPT09IDEgJiYgYWxsb3dfZm9jdXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbMF07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZS5zZWxlY3Rpb25TdGFydCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLnNlbGVjdGlvblN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbm9kZS5zZWxlY3Rpb25FbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS52YWx1ZS5zbGljZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByYW5nZSA9IG5vZGUuY3JlYXRlVGV4dFJhbmdlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLmV4cGFuZChcInRleHRlZGl0XCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmFuZ2UuaW5SYW5nZSh0aGVfcmFuZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhlX3JhbmdlLnRleHQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0U3R5bGU6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U3R5bGVzKG5hbWUpWzBdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFN0eWxlczogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmIChyZWplY3RfbmFtZShuYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZSBzdHlsZSB2aW9sYXRpb24uXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZTtcbiAgICAgICAgICAgICAgICB2YXIgcztcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcyA9IChuYW1lICE9PSBcImZsb2F0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBnZXRTdHlsZU9iamVjdChub2RlKVtuYW1lXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogZ2V0U3R5bGVPYmplY3Qobm9kZSkuY3NzRmxvYXQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldFN0eWxlT2JqZWN0KG5vZGUpLnN0eWxlRmxvYXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhW2ldID0gcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRUYWdOYW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VGFnTmFtZXMoKVswXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRUYWdOYW1lczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgdmFyIHRhZ05hbWU7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFnTmFtZSA9IGJbaV0udGFnTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgYVtpXSA9ICh0eXBlb2YgdGFnTmFtZSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgID8gdGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRhZ05hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFRpdGxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VGl0bGVzKClbMF07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VGl0bGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhW2ldID0gYltpXS50aXRsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRWYWx1ZXMoKVswXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRWYWx1ZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBhID0gW107XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIHZhciBub2RlO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSBiW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5ub2RlTmFtZSA9PT0gXCIjdGV4dFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhW2ldID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZS50YWdOYW1lICYmIG5vZGUudHlwZSAhPT0gXCJwYXNzd29yZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhW2ldID0gbm9kZS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYVtpXSAmJiBub2RlLmZpcnN0Q2hpbGQgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5maXJzdENoaWxkLm5vZGVOYW1lID09PSBcIiN0ZXh0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhW2ldID0gbm9kZS5maXJzdENoaWxkLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbmRldGVybWluYXRlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZTtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQURzYWZlOiBBcnJheSBsZW5ndGg6IFwiICsgYi5sZW5ndGggKyBcIi1cIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUgPSBiW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuaW5kZXRlcm1pbmF0ZSA9ICEhdmFsdWVbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5pbmRldGVybWluYXRlID0gISF2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBrbGFzczogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xhc3ModmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hcms6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIHZhciBub2RlO1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJBRHNhZmU6IEFycmF5IGxlbmd0aDogXCIgKyBiLmxlbmd0aCArIFwiLVwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVtcIl9hZHNhZmUgbWFya19cIl0gPSBTdHJpbmcodmFsdWVbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUgPSBiW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVbXCJfYWRzYWZlIG1hcmtfXCJdID0gU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvZmY6IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGU7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlW1wiX19fIG9uIF9fX1wiXSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVbXCJfX18gb24gX19fXCJdW3R5cGVdID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVbXCJfX18gb24gX19fXCJdID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogZnVuY3Rpb24gKHR5cGUsIGZ1bmMpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdHlwZSAhPT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgZnVuYyAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIHZhciBub2RlO1xuICAgICAgICAgICAgICAgIHZhciBvbjtcbiAgICAgICAgICAgICAgICB2YXIgb250eXBlO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSBiW2ldO1xuXG4vLyBUaGUgY2hhbmdlIGV2ZW50IGRvZXMgbm90IHByb3BvZ2F0ZSwgc28gd2UgbXVzdCBwdXQgdGhlIGhhbmRsZXIgb24gdGhlXG4vLyBpbnN0YW5jZS5cblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gXCJjaGFuZ2VcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgb250eXBlID0gXCJvblwiICsgdHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlW29udHlwZV0gIT09IGRvbV9ldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVbb250eXBlXSA9IGRvbV9ldmVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4vLyBSZWdpc3RlciBhbiBldmVudC4gUHV0IHRoZSBmdW5jdGlvbiBpbiBhIGhhbmRsZXIgYXJyYXksIG1ha2luZyBvbmUgaWYgaXRcbi8vIGRvZXNuJ3QgeWV0IGV4aXN0IGZvciB0aGlzIHR5cGUgb24gdGhpcyBub2RlLlxuXG4gICAgICAgICAgICAgICAgICAgIG9uID0gbm9kZVtcIl9fXyBvbiBfX19cIl07XG4gICAgICAgICAgICAgICAgICAgIGlmICghb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlW1wiX19fIG9uIF9fX1wiXSA9IG9uO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvd25zKG9uLCB0eXBlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb25bdHlwZV0ucHVzaChmdW5jKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uW3R5cGVdID0gW2Z1bmNdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb3RlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBiW2ldW1wiX19fYWRzYWZlIHJvb3RfX19cIl0gPSBcIl9fX2Fkc2FmZSByb290X19fXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHE6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICBzdGFyID0gdGhpcy5fX19zdGFyX19fO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQnVuY2gocXVlc3QocGFyc2VfcXVlcnkoc3RyaW5nX2NoZWNrKHRleHQpLCBpZCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9fX25vZGVzX19fKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlcGxhY2UoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXBsYWNlOiBmdW5jdGlvbiAocmVwbGFjZW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgZmxhZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIHZhciBqO1xuICAgICAgICAgICAgICAgIHZhciBuZXdub2RlO1xuICAgICAgICAgICAgICAgIHZhciBub2RlO1xuICAgICAgICAgICAgICAgIHZhciBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgdmFyIHJlcDtcbiAgICAgICAgICAgICAgICBpZiAoYi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBwdXJnZV9ldmVudF9oYW5kbGVycyhiW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFyZXBsYWNlbWVudCB8fCByZXBsYWNlbWVudC5sZW5ndGggPT09IDAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChyZXBsYWNlbWVudC5fX19ub2Rlc19fXyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnQuX19fbm9kZXNfX18ubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBwdXJnZV9ldmVudF9oYW5kbGVycyhub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVwbGFjZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXBsYWNlbWVudC5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQXJyYXkgbGVuZ3RoOiBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGIubGVuZ3RoICsgXCItXCIgKyB2YWx1ZS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHB1cmdlX2V2ZW50X2hhbmRsZXJzKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcCA9IHJlcGxhY2VtZW50W2ldLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXAubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdub2RlID0gcmVwWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQucmVwbGFjZUNoaWxkKG5ld25vZGUsIG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAxOyBqIDwgcmVwLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gbmV3bm9kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld25vZGUgPSByZXBbal07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5ld25vZGUsIG5vZGUubmV4dFNpYmxpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcCA9IHJlcGxhY2VtZW50Ll9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBwdXJnZV9ldmVudF9oYW5kbGVycyhub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdub2RlID0gKGZsYWcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gcmVwWzBdLmNsb25lTm9kZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHJlcFswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQucmVwbGFjZUNoaWxkKG5ld25vZGUsIG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDE7IGogPCByZXAubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IG5ld25vZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld25vZGUgPSAoZmxhZylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gcmVwW2pdLmNsb25lKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHJlcFtqXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShuZXdub2RlLCBub2RlLm5leHRTaWJsaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgaWYgKGIubGVuZ3RoIDwgMSB8fCAhYWxsb3dfZm9jdXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYlswXS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIGJbMF0uc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VsZWN0aW9uOiBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICBzdHJpbmdfY2hlY2soc3RyaW5nKTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGVuZDtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZTtcbiAgICAgICAgICAgICAgICB2YXIgb2xkO1xuICAgICAgICAgICAgICAgIHZhciBzdGFydDtcbiAgICAgICAgICAgICAgICB2YXIgcmFuZ2U7XG4gICAgICAgICAgICAgICAgaWYgKGIubGVuZ3RoID09PSAxICYmIGFsbG93X2ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSBiWzBdO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUuc2VsZWN0aW9uU3RhcnQgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbm9kZS5zZWxlY3Rpb25TdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IG5vZGUuc2VsZWN0aW9uRW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2xkID0gbm9kZS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUudmFsdWUgPSBvbGQuc2xpY2UoMCwgc3RhcnQpICsgc3RyaW5nICsgb2xkLnNsaWNlKGVuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNlbGVjdGlvblN0YXJ0ID0gc3RhcnQgKyBzdHJpbmcubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zZWxlY3Rpb25FbmQgPSBzdGFydCArIHN0cmluZy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZSA9IG5vZGUuY3JlYXRlVGV4dFJhbmdlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZS5leHBhbmQoXCJ0ZXh0ZWRpdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyYW5nZS5pblJhbmdlKHRoZV9yYW5nZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGVfcmFuZ2Uuc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlX3JhbmdlLnRleHQgPSBzdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlX3JhbmdlLnNlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0eWxlOiBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmIChyZWplY3RfbmFtZShuYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZSBzdHlsZSB2aW9sYXRpb24uXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCAoL3VybC9pLnRlc3Qoc3RyaW5nX2NoZWNrKHZhbHVlKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZTtcbiAgICAgICAgICAgICAgICB2YXIgdjtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQURzYWZlOiBBcnJheSBsZW5ndGg6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYi5sZW5ndGggKyBcIi1cIiArIHZhbHVlLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUgPSBiW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgdiA9IHN0cmluZ19jaGVjayh2YWx1ZVtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoL3VybC9pLnRlc3QodikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYW1lICE9PSBcImZsb2F0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHlsZVtuYW1lXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHlsZS5jc3NGbG9hdCA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc3R5bGUuc3R5bGVGbG9hdCA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdiA9IHN0cmluZ19jaGVjayh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgvdXJsL2kudGVzdCh2KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IGJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgIT09IFwiZmxvYXRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0eWxlW25hbWVdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0eWxlLmNzc0Zsb2F0ID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHlsZS5zdHlsZUZsb2F0ID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGFnOiBmdW5jdGlvbiAodGFnLCB0eXBlLCBuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRhZyAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobWFrZWFibGVUYWdOYW1lW3RhZ10gIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJBRHNhZmU6IEJhZCB0YWc6IFwiICsgdGFnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLmF1dG9jb21wbGV0ZSA9IFwib2ZmXCI7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IHN0cmluZ19jaGVjayhuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS50eXBlID0gc3RyaW5nX2NoZWNrKHR5cGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1bmNoKFtub2RlXSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGV4dDogZnVuY3Rpb24gKHRleHQpIHtcbiAgICAgICAgICAgICAgICByZWplY3RfZ2xvYmFsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBhO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGEgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHRleHQubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFbaV0gPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmdfY2hlY2sodGV4dFtpXSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQnVuY2goYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQnVuY2goW2RvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZ19jaGVjayh0ZXh0KSldKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aXRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0X2dsb2JhbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IHRoaXMuX19fbm9kZXNfX187XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQXJyYXkgbGVuZ3RoOiBcIiArIGIubGVuZ3RoICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCItXCIgKyB2YWx1ZS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnRpdGxlID0gc3RyaW5nX2NoZWNrKHZhbHVlW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZ19jaGVjayh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnRpdGxlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJlamVjdF9nbG9iYWwodGhpcyk7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0aGlzLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIHZhciBub2RlO1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiBiLmxlbmd0aCA9PT0gdmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlICE9PSBcInBhc3N3b3JkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlLnZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnZhbHVlID0gdmFsdWVbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAobm9kZS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHVyZ2VfZXZlbnRfaGFuZGxlcnMobm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUNoaWxkKG5vZGUuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFN0cmluZyh2YWx1ZVtpXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlLm5vZGVOYW1lID09PSBcIiN0ZXh0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLm5vZGVWYWx1ZSA9IFN0cmluZyh2YWx1ZVtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lICE9PSBcIkJVVFRPTlwiICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2Ygbm9kZS52YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHVyZ2VfZXZlbnRfaGFuZGxlcnMobm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQ2hpbGQobm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlLm5vZGVOYW1lID09PSBcIiN0ZXh0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLm5vZGVWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4vLyBSZXR1cm4gYW4gQURzYWZlIGRvbSBvYmplY3QuXG5cbiAgICAgICAgZG9tID0ge1xuICAgICAgICAgICAgYXBwZW5kOiBmdW5jdGlvbiAoYnVuY2gpIHtcbiAgICAgICAgICAgICAgICB2YXIgYiA9ICh0eXBlb2YgYnVuY2ggPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgID8gW2RvY3VtZW50LmNyZWF0ZVRleHROb2RlKGJ1bmNoKV1cbiAgICAgICAgICAgICAgICAgICAgOiBidW5jaC5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICB2YXIgbjtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBuID0gYltpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBuID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBuID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoU3RyaW5nKG4pKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByb290LmFwcGVuZENoaWxkKG4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZG9tO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbWJpbmU6IGZ1bmN0aW9uIChhcnJheSkge1xuICAgICAgICAgICAgICAgIGlmICghYXJyYXkgfHwgIWFycmF5Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQmFkIGNvbWJpbmF0aW9uLlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGIgPSBhcnJheVswXS5fX19ub2Rlc19fXztcbiAgICAgICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYiA9IGIuY29uY2F0KGFycmF5W2ldLl9fX25vZGVzX19fKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdW5jaChiKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb3VudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVwaGVtZXJhbDogZnVuY3Rpb24gKGJ1bmNoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVwaGVtZXJhbCkge1xuICAgICAgICAgICAgICAgICAgICBlcGhlbWVyYWwucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVwaGVtZXJhbCA9IGJ1bmNoO1xuICAgICAgICAgICAgICAgIHJldHVybiBkb207XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnJhZ21lbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1bmNoKFtkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCldKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcmVwZW5kOiBmdW5jdGlvbiAoYnVuY2gpIHtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IGJ1bmNoLl9fX25vZGVzX19fO1xuICAgICAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBiLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvb3QuaW5zZXJ0QmVmb3JlKGJbaV0sIHJvb3QuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkb207XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcTogZnVuY3Rpb24gKHRleHQpIHtcbiAgICAgICAgICAgICAgICBzdGFyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gcGFyc2VfcXVlcnkodGV4dCwgaWQpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaHVudGVyW3F1ZXJ5WzBdLm9wXSAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKFwiQURzYWZlOiBCYWQgcXVlcnk6IFwiICsgcXVlcnlbMF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1bmNoKHF1ZXN0KHF1ZXJ5LCBbcm9vdF0pKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBwdXJnZV9ldmVudF9oYW5kbGVycyhyb290KTtcbiAgICAgICAgICAgICAgICByb290LnBhcmVudC5yZW1vdmVFbGVtZW50KHJvb3QpO1xuICAgICAgICAgICAgICAgIHJvb3QgPSBudWxsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJvdzogZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICAgICAgICAgIHZhciB0ciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0clwiKTtcbiAgICAgICAgICAgICAgICB2YXIgdGQ7XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0ZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgdGQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoU3RyaW5nKHZhbHVlc1tpXSkpKTtcbiAgICAgICAgICAgICAgICAgICAgdHIuYXBwZW5kQ2hpbGQodGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1bmNoKFt0cl0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRhZzogZnVuY3Rpb24gKHRhZywgdHlwZSwgbmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBub2RlO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGFnICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtYWtlYWJsZVRhZ05hbWVbdGFnXSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZTogQmFkIHRhZzogXCIgKyB0YWcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWcpO1xuICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuYXV0b2NvbXBsZXRlID0gXCJvZmZcIjtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS50eXBlID0gdHlwZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdW5jaChbbm9kZV0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRleHQ6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGE7XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYVtpXSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZ19jaGVjayh0ZXh0W2ldKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdW5jaChhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdW5jaChbZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nX2NoZWNrKHRleHQpKV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2Ygcm9vdC5hZGRFdmVudExpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHJvb3QuYWRkRXZlbnRMaXN0ZW5lcihcImZvY3VzXCIsIGRvbV9ldmVudCwgdHJ1ZSk7XG4gICAgICAgICAgICByb290LmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsIGRvbV9ldmVudCwgdHJ1ZSk7XG4gICAgICAgICAgICByb290LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW92ZXJcIiwgZG9tX2V2ZW50LCB0cnVlKTtcbiAgICAgICAgICAgIHJvb3QuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlb3V0XCIsIGRvbV9ldmVudCwgdHJ1ZSk7XG4gICAgICAgICAgICByb290LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGRvbV9ldmVudCwgdHJ1ZSk7XG4gICAgICAgICAgICByb290LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgZG9tX2V2ZW50LCB0cnVlKTtcbiAgICAgICAgICAgIHJvb3QuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBkb21fZXZlbnQsIHRydWUpO1xuICAgICAgICAgICAgcm9vdC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZG9tX2V2ZW50LCB0cnVlKTtcbiAgICAgICAgICAgIHJvb3QuYWRkRXZlbnRMaXN0ZW5lcihcImRibGNsaWNrXCIsIGRvbV9ldmVudCwgdHJ1ZSk7XG4gICAgICAgICAgICByb290LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCBkb21fZXZlbnQsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm9vdC5vbmNsaWNrID0gZG9tX2V2ZW50O1xuICAgICAgICAgICAgcm9vdC5vbmRibGNsaWNrID0gZG9tX2V2ZW50O1xuICAgICAgICAgICAgcm9vdC5vbmZvY3VzaW4gPSBkb21fZXZlbnQ7XG4gICAgICAgICAgICByb290Lm9uZm9jdXNvdXQgPSBkb21fZXZlbnQ7XG4gICAgICAgICAgICByb290Lm9ua2V5cHJlc3MgPSBkb21fZXZlbnQ7XG4gICAgICAgICAgICByb290Lm9ubW91c2VvdXQgPSBkb21fZXZlbnQ7XG4gICAgICAgICAgICByb290Lm9ubW91c2Vkb3duID0gZG9tX2V2ZW50O1xuICAgICAgICAgICAgcm9vdC5vbm1vdXNlbW92ZSA9IGRvbV9ldmVudDtcbiAgICAgICAgICAgIHJvb3Qub25tb3VzZW92ZXIgPSBkb21fZXZlbnQ7XG4gICAgICAgICAgICByb290Lm9ubW91c2V1cCA9IGRvbV9ldmVudDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW2RvbSwgQnVuY2gucHJvdG90eXBlXTtcbiAgICB9XG5cblxuLy8gIFJldHVybiB0aGUgQURTQUZFIG9iamVjdC5cblxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgIHJlamVjdF9nbG9iYWwobyk7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZShvKTtcbiAgICAgICAgfSxcblxuLy8gIEFEU0FGRS5nZXQgcmV0cmlldmVzIGEgdmFsdWUgZnJvbSBhbiBvYmplY3QuXG5cbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAob2JqZWN0LCBuYW1lKSB7XG4gICAgICAgICAgICByZWplY3RfZ2xvYmFsKG9iamVjdCk7XG4gICAgICAgICAgICBpZiAoIXJlamVjdF9wcm9wZXJ0eShvYmplY3QsIG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVycm9yKCk7XG4gICAgICAgIH0sXG5cbi8vICBBRFNBRkUuZ28gYWxsb3dzIGEgZ3Vlc3Qgd2lkZ2V0IHRvIGdldCBhY2Nlc3MgdG8gYSB3cmFwcGVkIGRvbSBub2RlIGFuZFxuLy8gIGFwcHJvdmVkIEFEc2FmZSBsaWJyYXJpZXMuIEl0IGlzIHBhc3NlZCBhbiBpZCBhbmQgYSBmdW5jdGlvbi4gVGhlIGZ1bmN0aW9uXG4vLyAgd2lsbCBiZSBwYXNzZWQgdGhlIHdyYXBwZWQgZG9tIG5vZGUgYW5kIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBsaWJyYXJpZXMuXG5cbiAgICAgICAgZ286IGZ1bmN0aW9uIChpZCwgZikge1xuICAgICAgICAgICAgdmFyIGRvbTtcbiAgICAgICAgICAgIHZhciBmdW47XG4gICAgICAgICAgICB2YXIgcm9vdDtcbiAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgdmFyIHNjcmlwdHM7XG5cbi8vICBJZiBBRFNBRkUuaWQgd2FzIGNhbGxlZCwgdGhlIGlkIGJldHRlciBtYXRjaC5cblxuICAgICAgICAgICAgaWYgKGFkc2FmZV9pZCAmJiBhZHNhZmVfaWQgIT09IGlkKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoKTtcbiAgICAgICAgICAgIH1cblxuLy8gIEdldCB0aGUgZG9tIG5vZGUgZm9yIHRoZSB3aWRnZXQncyBkaXYgY29udGFpbmVyLlxuXG4gICAgICAgICAgICByb290ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgICAgICAgICAgaWYgKHJvb3QudGFnTmFtZSAhPT0gXCJESVZcIikge1xuICAgICAgICAgICAgICAgIGVycm9yKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZHNhZmVfaWQgPSBudWxsO1xuXG4vLyAgRGVsZXRlIHRoZSBzY3JpcHRzIGhlbGQgaW4gdGhlIGRpdi4gVGhleSBoYXZlIGFsbCBydW4sIHNvIHdlIGRvbid0IG5lZWRcbi8vICB0aGVtIGFueSBtb3JlLiBJZiB0aGUgZGl2IGhhZCBubyBzY3JpcHRzLCB0aGVuIHNvbWV0aGluZyBpcyB3cm9uZy5cbi8vICBUaGlzIHByb3ZpZGVzIHNvbWUgcHJvdGVjdGlvbiBhZ2FpbnN0IG1pc2hhcHMgZHVlIHRvIHdlYWtuZXNzIGluIHRoZVxuLy8gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkIGZ1bmN0aW9uLlxuXG4gICAgICAgICAgICBzY3JpcHRzID0gcm9vdC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKTtcbiAgICAgICAgICAgIGkgPSBzY3JpcHRzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICBpZiAoaSA8IDApIHtcbiAgICAgICAgICAgICAgICBlcnJvcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIHJvb3QucmVtb3ZlQ2hpbGQoc2NyaXB0c1tpXSk7XG4gICAgICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICAgICAgfSB3aGlsZSAoaSA+PSAwKTtcbiAgICAgICAgICAgIHJvb3QgPSBtYWtlX3Jvb3Qocm9vdCwgaWQpO1xuICAgICAgICAgICAgZG9tID0gcm9vdFswXTtcblxuLy8gSWYgdGhlIHBhZ2UgaGFzIHJlZ2lzdGVyZWQgaW50ZXJjZXB0b3JzLCBjYWxsIHRoZW4uXG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBpbnRlcmNlcHRvcnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICBmdW4gPSBpbnRlcmNlcHRvcnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBmdW4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuKGlkLCBkb20sIGFkc2FmZV9saWIsIHJvb3RbMV0pO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgQURTQUZFLmxvZyhlMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbi8vICBDYWxsIHRoZSBzdXBwbGllZCBmdW5jdGlvbi5cblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBmKGRvbSwgYWRzYWZlX2xpYik7XG4gICAgICAgICAgICB9IGNhdGNoIChlMikge1xuICAgICAgICAgICAgICAgIEFEU0FGRS5sb2coZTIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm9vdCA9IG51bGw7XG4gICAgICAgICAgICBhZHNhZmVfbGliID0gbnVsbDtcbiAgICAgICAgfSxcblxuLy8gIEFEU0FGRS5oYXMgcmV0dXJucyB0cnVlIGlmIHRoZSBvYmplY3QgY29udGFpbnMgYW4gb3duIHByb3BlcnR5IHdpdGggdGhlXG4vLyAgZ2l2ZW4gbmFtZS5cblxuICAgICAgICBoYXM6IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBvd25zKG9iamVjdCwgbmFtZSk7XG4gICAgICAgIH0sXG5cbi8vICBBRFNBRkUuaWQgYWxsb3dzIGEgZ3Vlc3Qgd2lkZ2V0IHRvIGluZGljYXRlIHRoYXQgaXQgd2FudHMgdG8gbG9hZFxuLy8gIEFEc2FmZSBhcHByb3ZlZCBsaWJyYXJpZXMuXG5cbiAgICAgICAgaWQ6IGZ1bmN0aW9uIChpZCkge1xuXG4vLyAgQ2FsbHMgdG8gQURTQUZFLmlkIG11c3QgYmUgYmFsYW5jZWQgd2l0aCBjYWxscyB0byBBRFNBRkUuZ28uXG4vLyAgT25seSBvbmUgaWQgY2FuIGJlIGFjdGl2ZSBhdCBhIHRpbWUuXG5cbiAgICAgICAgICAgIGlmIChhZHNhZmVfaWQpIHtcbiAgICAgICAgICAgICAgICBlcnJvcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRzYWZlX2lkID0gaWQ7XG4gICAgICAgICAgICBhZHNhZmVfbGliID0ge307XG4gICAgICAgIH0sXG5cbi8vICBBRFNBRkUuaXNBcnJheSByZXR1cm5zIHRydWUgaWYgdGhlIG9wZXJhbmQgaXMgYW4gYXJyYXkuXG5cbiAgICAgICAgaXNBcnJheTogQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KHZhbHVlKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICAgICAgICB9LFxuXG4vLyAgQURTQUZFLmtleXMgcmV0dXJucyBhbiBhcnJheSBvZiBrZXlzLlxuXG4gICAgICAgIGtleXM6IE9iamVjdC5rZXlzLFxuXG4vLyAgQURTQUZFLmxhdGVyIGNhbGxzIGEgZnVuY3Rpb24gYXQgYSBsYXRlciB0aW1lLlxuXG4gICAgICAgIGxhdGVyOiBmdW5jdGlvbiAoZnVuYywgdGltZW91dCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBmdW5jID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmMsIHRpbWVvdXQgfHwgMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVycm9yKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbi8vICBBRFNBRkUubGliIGFsbG93cyBhbiBhcHByb3ZlZCBBRHNhZmUgbGlicmFyeSB0byBtYWtlIGl0c2VsZiBhdmFpbGFibGVcbi8vICB0byBhIHdpZGdldC4gVGhlIGxpYnJhcnkgcHJvdmlkZXMgYSBuYW1lIGFuZCBhIGZ1bmN0aW9uLiBUaGUgcmVzdWx0IG9mXG4vLyAgY2FsbGluZyB0aGF0IGZ1bmN0aW9uIHdpbGwgYmUgbWFkZSBhdmFpbGFibGUgdG8gdGhlIHdpZGdldCB2aWEgdGhlIG5hbWUuXG5cbiAgICAgICAgbGliOiBmdW5jdGlvbiAobmFtZSwgZikge1xuICAgICAgICAgICAgaWYgKCFhZHNhZmVfaWQgfHwgcmVqZWN0X25hbWUobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihcIkFEc2FmZSBsaWIgdmlvbGF0aW9uLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFkc2FmZV9saWJbbmFtZV0gPSBmKGFkc2FmZV9saWIpO1xuICAgICAgICB9LFxuXG4vLyAgQURTQUZFLmxvZyBpcyBhIGRlYnVnZ2luZyBhaWQgdGhhdCBzcGFtcyB0ZXh0IHRvIHRoZSBicm93c2VyJ3MgbG9nLlxuLy8gIE92ZXJ3cml0ZSB0aGlzIGZ1bmN0aW9uIHRvIHNlbmQgbG9nIG1hdHRlciBzb21ld2hlcmUgZWxzZS5cblxuICAgICAgICBsb2c6IGZ1bmN0aW9uIGxvZyhzKSB7XG4gICAgICAgICAgICBpZiAod2luZG93LmNvbnNvbGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIERlYnVnID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgRGVidWcud3JpdGVsbihzKTsgICAgICAvKiBJRSAqL1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvcGVyYS5wb3N0RXJyb3Iocyk7ICAgIC8qIE9wZXJhICovXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbi8vICBBRFNBRkUucmVtb3ZlIGRlbGV0ZXMgYSB2YWx1ZSBmcm9tIGFuIG9iamVjdC5cblxuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmICghcmVqZWN0X3Byb3BlcnR5KG9iamVjdCwgbmFtZSkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgb2JqZWN0W25hbWVdO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVycm9yKCk7XG4gICAgICAgIH0sXG5cbi8vICBBRFNBRkUuc2V0IHN0b3JlcyBhIHZhbHVlIGluIGFuIG9iamVjdC5cblxuICAgICAgICBzZXQ6IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgICByZWplY3RfZ2xvYmFsKG9iamVjdCk7XG4gICAgICAgICAgICBpZiAoIXJlamVjdF9wcm9wZXJ0eShvYmplY3QsIG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0W25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXJyb3IoKTtcbiAgICAgICAgfSxcblxuLy8gIEFEU0FGRS5faW50ZXJjZXB0IGFsbG93cyB0aGUgcGFnZSB0byByZWdpc3RlciBhIGZ1bmN0aW9uIHRoYXQgd2lsbFxuLy8gIHNlZSB0aGUgd2lkZ2V0J3MgY2FwYWJpbGl0aWVzLlxuXG4gICAgICAgIF9pbnRlcmNlcHQ6IGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICBpbnRlcmNlcHRvcnMucHVzaChmKTtcbiAgICAgICAgfVxuXG4gICAgfTtcbn0oKSk7XG4iXSwiZmlsZSI6ImFkc2FmZS5qcyJ9
