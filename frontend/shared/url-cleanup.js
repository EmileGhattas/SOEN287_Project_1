(function () {
    if (typeof window === "undefined" || !window.history || !window.history.replaceState) {
        return;
    }

    const { pathname, search, hash } = window.location;
    if (pathname.endsWith(".html")) {
        const cleanPath = pathname.replace(/\.html$/, "");
        if (cleanPath !== pathname) {
            window.history.replaceState(null, "", `${cleanPath}${search}${hash}`);
        }
    }
})();
