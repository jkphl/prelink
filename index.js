/* eslint no-param-reassign: ['off'], strict: ['error'], func-names: ['off'],
no-new-func: ["off"] */

'use strict';

(function (w) {
    // Register a global prelink() function (if not already present)
    if (!w.prelink) {
        w.prelink = () => null;
    }

    // If the global prelink() function doesn't have an onload handler defined: Add stub
    if (!w.prelink.onload) {
        w.prelink.onload = () => null;
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
        } else if (element.attachEvent) {
            element.attachEvent(`on${type}`, callback);
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
        } else if (element.attachEvent) {
            element.detachEvent(`on${type}`, callback);
        }
    }

    // Set all rel types to work on
    const relTypes = ['prefetch', 'preload'];

    // Browser specific overrides for relList.supports()
    const supportOverrides = {
        prefetch: !!w.MSInputMethodContext, // IE11 only (with doesn't support relList)
        preload: false,
    };

    // Find all <link> elements in the document
    const links = [].slice.apply(w.document.getElementsByTagName('link'));

    // Register link directives to enable automatically
    const autoEnable = { preload: true };

    // Define loaders for link resource types
    const loaders = {};

    /**
     * Loader for <link as="style">
     *
     * @param {Element} link Link element
     * @param {Boolean} enable Automatically enable resource after loading
     */
    loaders.style = function (link, enable) {
        const finalMedia = link.media || 'all';
        const onloadCode = link.getAttribute('onload');
        const onloadFunction = onloadCode ? new Function(onloadCode) : () => null;
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
        setTimeout(() => {
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
        const onloadCode = link.getAttribute('onload');
        const onloadFunction = onloadCode ? new Function(onloadCode) : () => null;

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
            const script = w.document.createElement('script');
            script.async = true;
            script.defer = true;
            script.onload = script.onreadystatechange = onload;
            script.src = link.href;
            link.parentNode.insertBefore(script, link);

            // Else: Use <object> approach
        } else {
            const object = w.document.createElement('object');
            object.onload = object.onreadystatechange = onload;
            object.width = object.height = 0;
            object.data = link.href;
            const run = w.setInterval(() => {
                if (document.body) {
                    document.body.appendChild(object);
                    w.clearInterval(run);
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
            const { relList } = w.document.createElement('link');
            return (relList && relList.supports(rel)) || supportOverrides[rel];
        } catch (e) {
            return false;
        }
    }

    /**
     * Polyfill a particular rel type
     *
     * @param {String} rel Rel type
     */
    function polyfill(rel) {
        links.filter(link => link.rel === rel && !link.getAttribute('data-prelink'))
            .forEach((link) => {
                link.setAttribute('data-prelink', true);
                const resourceType = (link.getAttribute('as') || 'undefined').toLowerCase();
                if (resourceType in loaders) {
                    loaders[resourceType](link, autoEnable[rel] || false);
                }
            });
    }

    // Polyfill all unsupported rel types
    relTypes.filter(rel => !supports(rel)).forEach((rel) => {
        const relPolyfill = () => polyfill(rel);

        // Rerun poly on an interval until onload to match <link> elements not in the document yet
        const run = w.setInterval(relPolyfill, 500);
        const clear = () => {
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
