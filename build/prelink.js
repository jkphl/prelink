/* eslint no-param-reassign: ['off'], strict: ['error'], func-names: ['off'],
no-new-func: ["off"] */
'use strict';
(function (w) {
    // Register a global prelink() function (if not already present)
    if (!w.prelink) {
        w.prelink = function () { return null; };
    }
    // If the global prelink() function doesn't have an onload handler defined: Add stub
    if (!w.prelink.onload) {
        w.prelink.onload = function () { return null; };
    }
    /**
     * Add an event listener to an element
     *
     * @param {Element} element Element
     * @param {String} type Event type
     * @param {Function} callback Callback
     */
    function addListener(element, type, callback) {
        if (element.addEventListener) {
            element.addEventListener(type, callback);
        }
        else if (element.attachEvent) {
            element.attachEvent("on" + type, callback);
        }
    }
    /**
     * Remove an event listener from an element
     *
     * @param {Element} element Element
     * @param {String} type Event type
     * @param {Function} callback Callback
     */
    function removeListener(element, type, callback) {
        if (element.addEventListener) {
            element.removeEventListener(type, callback);
        }
        else if (element.attachEvent) {
            element.detachEvent("on" + type, callback);
        }
    }
    // Set all rel types to work on
    var relTypes = ['prefetch', 'preload'];
    // Browser specific overrides for relList.supports()
    var supportOverrides = {
        prefetch: !!w.MSInputMethodContext,
        preload: false
    };
    // Find all <link> elements in the document
    var links = w.document.getElementsByTagName('link');
    // Register link directives to enable automatically
    var autoEnable = { preload: true };
    // Define loaders for link resource types
    var loaders = {};
    /**
     * Loader for <link as="style">
     *
     * @param {Element} link Link element
     * @param {Boolean} enable Automatically enable resource after loading
     */
    loaders.style = function (link, enable) {
        var finalMedia = link.media || 'all';
        var onloadCode = link.getAttribute('onload');
        var onloadFunction = onloadCode ? new Function(onloadCode) : function () { return null; };
        link.onload = null;
        /**
         * Enable the stylesheet
         */
        function enableStylesheet() {
            removeListener(link, 'load', enableStylesheet);
            if (enable) {
                link.media = finalMedia;
            }
            onloadFunction.apply(link);
        }
        addListener(link, 'load', enableStylesheet);
        // Set rel and non-applicable media type to start an async request
        // note: timeout allows this to happen async to let rendering continue in IE
        setTimeout(function () {
            link.rel = 'stylesheet';
            link.media = 'only x';
        });
        // Also enable media after 3 seconds, which will catch very old browsers
        // (Android 2.x, old Firefox) that don't support onload on link
        setTimeout(enableStylesheet, 3000);
    };
    /**
     * Loader for <link as="script">
     *
     * @param {Element} link Link element
     * @param {Boolean} enable Automatically enable resource after loading
     */
    loaders.script = function (link, enable) {
        var onloadCode = link.getAttribute('onload');
        var onloadFunction = onloadCode ? new Function(onloadCode) : function () { return null; };
        /**
         * Onload handler
         */
        function onload() {
            if (!this.readyState || this.readyState === 'complete') {
                this.onload = this.onreadystatechange = null;
                if (!enable) {
                    this.parentElement.removeChild(this);
                }
                onloadFunction.apply(this);
            }
        }
        // If the resource should be enabled automatically: Add a <script> element
        if (enable) {
            var script = w.document.createElement('script');
            script.async = true;
            script.defer = true;
            script.onload = script.onreadystatechange = onload;
            script.src = link.href;
            link.parentNode.insertBefore(script, link);
            // Else: Use <object> approach
        }
        else {
            var object_1 = w.document.createElement('object');
            object_1.onload = object_1.onreadystatechange = onload;
            object_1.width = object_1.height = 0;
            object_1.data = link.href;
            var run_1 = w.setInterval(function () {
                if (document.body) {
                    document.body.appendChild(object_1);
                    w.clearInterval(run_1);
                }
            }, 100);
        }
    };
    /**
     * Test for a specific rel type support
     *
     * @param {String} rel Rel type
     * @return {Boolean} Rel type is supported
     */
    function supports(rel) {
        try {
            var relList = w.document.createElement('link').relList;
            return (relList && relList.supports(rel)) || supportOverrides[rel];
        }
        catch (e) {
            return false;
        }
    }
    /**
     * Polyfill a particular rel type
     *
     * @param {String} rel Rel type
     */
    function polyfill(rel) {
        [].slice.apply(links).filter(function (link) { return link.rel === rel && !link.getAttribute('data-prelink'); })
            .forEach(function (link) {
            link.setAttribute('data-prelink', true);
            var resourceType = (link.getAttribute('as') || 'undefined').toLowerCase();
            if (resourceType in loaders) {
                loaders[resourceType](link, autoEnable[rel] || false);
            }
        });
    }
    // Polyfill all unsupported rel types
    relTypes.filter(function (rel) { return !supports(rel); }).forEach(function (rel) {
        var relPolyfill = function () { return polyfill(rel); };
        // Rerun poly on an interval until onload to match <link> elements not in the document yet
        var run = w.setInterval(relPolyfill, 500);
        var clear = function () {
            relPolyfill();
            w.clearInterval(run);
        };
        addListener(w, 'load', clear);
    });
    // commonjs
    if (typeof exports !== 'undefined') {
        exports.prelink = w.prelink;
    }
}(typeof global !== 'undefined' ? global : window));
