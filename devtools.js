chrome.devtools.panels.elements.createSidebarPane("Selector", function (sidebar) {
    sidebar.setPage("sideBar.html");
    var panel = null;

    sidebar.onShown.addListener(function (panelWindow) {
        panel = panelWindow;

        panel.toggleSelectionListener(true);

        var resizeFunc = function () {
            var newHeight = (this.document.body.getBoundingClientRect().height + 30) + "px";
            sidebar.setHeight(newHeight);
        };

        resizeFunc();
        panelWindow.onresize = resizeFunc;
        panelWindow.addEventListener("message", resizeFunc.bind(panelWindow));
    });
    sidebar.onHidden.addListener(function () {

        panel.toggleSelectionListener(false);
    });
});