var
    _debug = false, // debug mode, control the debug message output or not
// _debug = true, // debug mode, control the debug message output or not

    config = {
        mark: true,
        autoLocate: false,
        clear: true,
        color: 'red',
        debug: _debug,
        toStr: function () {
            var str = "{";
            for (var p in config) {
                var value = '';
                if (config.hasOwnProperty(p) && p != 'toStr') {
                    switch (typeof config[p]) {
                        case 'string':
                            value = "\'" + config[p] + "\'";
                            break;
                        case 'boolean':
                        default:
                            value = config[p];
                            break;
                    }
                    str = str + p + ":" + value + ', ';
                }
            }
            str = str.trim().replace(/\,$/, '}');
            return str;
        }
    },

    modelArrGlobal,

    selectChange,

    selectorGlobal; // for user-defined selector

/**
 * add/remove the selection-change event listener
 * @param toAdd {boolean}
 */
function toggleSelectionListener(toAdd) {
    if (toAdd) {
        chrome.devtools.panels.elements.onSelectionChanged.addListener(selectionChangedListener);
    } else {
        chrome.devtools.panels.elements.onSelectionChanged.removeListener(selectionChangedListener);
    }
}

// defined Tag object
inspectEval("Tag = null; " + Tag.toStr());

/**
 * onSelectionChanged listener
 */
function selectionChangedListener() {
    inspectEval("(function(config){return new Tag(null, config);})(" + config.toStr() + ")", function (result) {
        _debug && console.log("selection changed.");

        selectorGlobal = result.selector;

        modelArrGlobal = result["modelArray"].reverse();

        var content = document.getElementsByClassName("content")[0];

        // clear the old content.
        clearContent(content);

        // show the selector
        setResult(selectorGlobal, true);

        // create the dom structure
        createTagModal(modelArrGlobal, content);

        // resize the result window
        resize();
    });
}

/**
 * create the model(similar to a dom model)
 * @param modelArr {Array}
 * @param content {Element}
 */
function createTagModal(modelArr, content) {

    if (!isNotEmpty(modelArr)) {
        return;
    }

    for (var i = 0; i < modelArr.length; i++) {

        content.appendChild(createTagLine(modelArr, i));
    }
}

/**
 * create a line that contains a tag's dom info.
 * @param modelArr {Array}
 * @param modelArrIndex {number}
 * @returns {Element}
 */
function createTagLine(modelArr, modelArrIndex) {
    var
        model = modelArr[modelArrIndex],

        _modelIndex = 0,
        _model = model[_modelIndex],

        _modelAttrIndex = 1,
        _modelArr = model[_modelAttrIndex],

        clazz = "tag-line-" + modelArrIndex,
        attrLineClass = "tag-line-attr-" + modelArrIndex,
        ul = document.createElement("ul"),
        li = document.createElement("li");

    ul.classList.add(clazz);

    for (var i = 0; i < _model.length; i++) {
        _model[i] && li.appendChild(createPiece(_model[i], i, _modelIndex, modelArrIndex));
    }

    ul.appendChild(li);

    if (_modelArr) {

        ul.appendChild(createTagAttr(_modelArr, attrLineClass, 1, modelArrIndex));
        ul.classList.add("hasAttr");
        ul.firstChild.insertBefore(createActionTag(attrLineClass), ul.firstChild.firstChild);
    } else {

        ul.classList.add("noAttr");
    }

    return ul;
}

/**
 * create tag's attributes.
 * @param attrs {Array}
 * @param clazz {string}
 * @returns {Element}
 * @param modelIndex {index}
 * @param modelArrIndex {index}
 * @returns {Element}
 */
function createTagAttr(attrs, clazz, modelIndex, modelArrIndex) {

    var li = document.createElement("li");
    li.classList.add(clazz);

    for (var i = 0; i < attrs.length; i++) {

        attrs[i] && li.appendChild(createPiece(attrs[i], i, modelIndex, modelArrIndex));
    }

    return li;
}

/**
 * create a model item's part.
 * @param item {string}
 * @param spanIndex {number}
 * @param modelIndex {number}
 * @param modelArrIndex {number}
 * @returns {Element}
 */
function createPiece(item, spanIndex, modelIndex, modelArrIndex) {
    var
        clazz = "",
        clazz2 = "item-" + spanIndex,

        str = item["value"],
        isCheck = item["check"],

        overFlowHide = "overflow-hide",
        span = document.createElement("span");
    span.setAttribute("title", str);

    if (str.startsWith(".")) { // class
        clazz = "tagClass";
    } else if (str.startsWith("#")) { // id
        clazz = "tagId";
    } else if (str.startsWith("[")) { // attribute
        clazz = "tagAttr";
    } else { // tag name
        clazz = "tagName";
    }
    span.innerText = str;
    span.classList.add(clazz);
    span.classList.add(clazz2);
    isCheck && span.classList.add("isCheck");

    if (clazz != "tagName") {
        span.classList.add(overFlowHide);
    }

    // 自定义selector时用
    span.dataset.index = [modelArrIndex, modelIndex, spanIndex];

    span.addEventListener("mousedown", pieceListener.bind(span));
    return span;
}

/**
 * create expand/collapse tag.
 * @param target {string}
 * @returns {Element}
 */
function createActionTag(target) {
    var
        clazz = ["fa-caret-right", "fa-caret-down", "fa"],
        tag = document.createElement("i");

    tag.classList.add(clazz[2]);
    tag.classList.add(clazz[0]);

    tag.setAttribute("target", target);

    tag.addEventListener("click", actionListener.bind(tag));

    return tag;

    /**
     * expand/collapsing event handler
     */
    function actionListener() {

        if (this.classList.contains(clazz[0])) {

            this.classList.remove(clazz[0]);
            this.classList.add(clazz[1]);
        } else if (this.classList.contains(clazz[1])) {

            this.classList.remove(clazz[1]);
            this.classList.add(clazz[0]);
        }

        var targetTag = document.getElementsByClassName(this.getAttribute("target"))[0];
        targetTag.classList.toggle("show");

        // 调整窗口高度
        resize();
    }
}

/**
 * clear the content
 * @param element {Element}
 */
function clearContent(element) {
    element.innerText = "";
}

/**
 * show the selector
 * @param selector {string}
 * @param toCopy {boolean}
 */
function setResult(selector, toCopy) {

    var
        supportJQ = true,
        selectorSpan = document.querySelector(".selector"),
        calcContainer = document.querySelector(".calc-container"),
        numSpan = document.querySelector(".selector-num");

    selectorSpan.title = '单击可以只拷贝选择器';
    selectorSpan.style.cursor = 'default';

    selectorSpan.classList.add("active");

    selectorSpan.removeEventListener("click", copySelectorToClip);
    selectorSpan.addEventListener("click", copySelectorToClip);

    // 隐藏jQuery计算器
    calcContainer.style.display = 'none';

    inspectEval(
        "jQuery.fn.jquery",
        function (result, isException) {
            var toWarn = "";
            if (isException) {
                supportJQ = false;
                toWarn = "该页面不支持jQuery!";
            } else {

                _debug && console.debug("jQuery version " + result);
            }

            selectorSpan.innerHTML = "jQuery('" + selector + "');";

            // 拷贝结果
            toCopy && copyToClipboard(_debug);

            // 要先拷贝后再提示(由于提示时会隐藏结果标签，复制不成功)
            toWarn && warn(toWarn, 300);

            inspectEval("document.querySelectorAll('" + selector + "').length", function (res, ex) {

                if (ex) {
                    // numSpan.innerHTML = "长度计算出错!";
                    inspectEval("jQuery('" + selector + "').length", function (r, e) {
                        if (e) {
                            if (!selector || !selector.trim()) {
                                numSpan.innerHTML = "0";
                            } else {
                                numSpan.innerHTML = "长度计算出错!";
                            }
                        } else {
                            numSpan.innerHTML = r;
                        }
                    })
                } else {
                    numSpan.innerHTML = res;
                }
            });
        }
    );
}

/**
 * span {tagName, tagId, tagClass} click event handler
 */
function pieceListener(event) {
    if (event['which'] == 1) {
        var
            isChkCls = "isCheck",
            index = this.dataset.index.split(","),
            isCheck = this.classList.contains(isChkCls);

        this.classList.toggle(isChkCls);

        _debug && console.debug(isCheck);

        modelArrGlobal[index[0]][index[1]][index[2]]["check"] = !isCheck;

        selectorGlobal = modelToSelector();

        setResult(selectorGlobal, false);
    } else if (event['which'] == 3) {
        // 拷贝 span 的值 (tagName , tagId, tagClass)
        var
            me = this,
            msg = '',
            range = document.createRange();
        try {
            range.selectNode(me);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            msg = document.execCommand("copy") ? "拷贝成功!" : "拷贝失败!";
        } catch (err) {
            msg = "拷贝失败，该chrome版本不支持此操作!";
        } finally {
            window.getSelection().removeAllRanges();
        }
        warn(msg, 300);
    }
}

/**
 * turn model into selector
 * @returns {string}
 */
function modelToSelector() {
    var
        indexCache = -1,

        selector = "";

    selectChange = true;

    for (var i = 0; i < modelArrGlobal.length; i++) {

        var
            sibling = "", // 相邻元素
            subSelector = "",
            model = modelArrGlobal[i],
            modelItem = model[0], // model[0]: [tagName-object,id-object,class-object,class-object,...]
            attrs = model[1],// tag的属性
            numStartClass = false;

        for (var j = 0; j < modelItem.length; j++) {
            var itemObject = modelItem[j];
            if (itemObject && itemObject["check"]) {

                if (/\.\d/.test(itemObject['value'])) {
                    numStartClass = true;
                }

                // id中是否有数字
                if (itemObject['value'].startsWith("#") && /\d/.test(itemObject['value'])) {
                    subSelector = subSelector + '[id="' + itemObject['value'].replace("#", '') + '"]';
                } else {
                    subSelector = subSelector + itemObject['value'];
                }
                // 相邻元素
                sibling = ((indexCache + 1) == i) ? " > " : " ";
            }
        }

        if (numStartClass) {
            var theClass = subSelector.substring(subSelector.lastIndexOf(' '), subSelector.length);
            subSelector = '[class="' + theClass.split('.').join(' ') + '"]';
        }
        var attrStr = "";
        if (isNotEmptyO(attrs)) {

            for (var k = 0; k < attrs.length; k++) {
                var attrObj = attrs[k];
                if (isNotEmptyO(attrObj)) {
                    if (attrObj['check']) {
                        attrStr = attrStr + attrObj['value'];
                    }
                }
            }

            if (!subSelector && attrStr) {
                // 相邻元素
                sibling = ((indexCache + 1) == i) ? " > " : " ";
            }
        }

        if (subSelector) {

            subSelector = subSelector + attrStr;

            if (indexCache != -1) {
                selector = selector + sibling + subSelector;
            } else {
                selector = subSelector;
            }
            indexCache = i;
        } else {

            if (sibling) {
                if (indexCache != -1) {
                    selector = selector + sibling + attrStr;
                } else {
                    selector = attrStr;
                }
                indexCache = i;
            }
        }
    }

    return selector;
}

// /****************************************toolbar*******************************************/
var
    /**
     * toolbar item's class
     * @type {string[]}
     */
    barItems = [
        "item-location", "item-location-auto", "item-location-all", "item-location-clear", "item-copy",
        //"item-mark-links",
        "item-load-jq"
    ],

    /**
     * the toolbar
     * @type {Element}
     */
    bar = document.getElementsByClassName("bar")[0];

for (var i = 0; i < barItems.length; i++) {
    var
        clickListener = null,
        item = bar.querySelector("." + barItems[i]);

    switch (barItems[i]) {
        // location button
        case "item-location":
            clickListener = locate;
            break;
        // auto-location button
        case "item-location-auto":
            clickListener = autoLocate;
            break;
        // mark all tag
        case "item-location-all":
            clickListener = markAll;
            break;
        // clear all cover layers
        case "item-location-clear":
            clickListener = unMarkAll;
            break;
        // copy result to clipboard
        case "item-copy":
            clickListener = copyToClipboard;
            break;
        //case "item-mark-links": // TODO
        //    clickListener = markAllLinks;
        //    break;
        case "item-load-jq":
            clickListener = loadJQ;
            break;
        default:
            break;
    }
    item.addEventListener("click", clickListener.bind(item));
}

// Calculation jQuery expression
var
    clickTag = document.querySelector(".click-to-edit"),
    calcContainer = document.querySelector(".calc-container");

clickTag.addEventListener("click", calc.bind(calcContainer));

/**
 * scroll the selected element into the view.
 */
function locate() {
    inspectEval("$tag.locate(null , true)");
}

/**
 * 自动定位当前选中的元素(可开关)
 */
function autoLocate() {

    var
        switchOff = "fa-toggle-off",
        switchOn = "fa-toggle-on",
        clazzs = this.classList;

    if (clazzs.contains(switchOff)) {
        this.classList.remove(switchOff);
        this.classList.add(switchOn);
        config.autoLocate = true;
    } else if (clazzs.contains(switchOn)) {
        this.classList.remove(switchOn);
        this.classList.add(switchOff);
        config.autoLocate = false;
    }
}

/**
 * 标记所有当前选择器能查找到的元素
 */
function markAll() {

    inspectEval("$tag != null", function (result, isException) {
        if (!isException && result) {
            inspectEval("$tag.cover(document.querySelectorAll('" + selectorGlobal + "'), true, true)", function (result,
                                                                                                                 isExcept) {
                _debug && console.log("markAll invoked, " + result + " elements were covered.");
            });
        }
    });
}

/**
 * clear all cover layers
 */
function unMarkAll() {
    inspectEval("$tag != null", function (result) {
        result && inspectEval("$tag.clearAllCover();", function (res, isEx) {
            if (isEx) {
                warn("清除失败！", 300);
            } else {
                warn("清除成功！", 300);
            }
        });
    });
}

/**
 * copy the result to the clipboard.
 * @param toWarn
 */
function copyToClipboard(toWarn) {
    var
        msg = "",
        range = document.createRange(),
        span = document.querySelector(".result > .selector.active"),
        input = document.querySelector(".calc-editor");

    if (span) {

        // 针对没有select()方法的元素
        range.selectNode(span);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    } else {
        input.select();
    }

    try {
        msg = document.execCommand("copy") ? "拷贝成功!" : "拷贝失败!";
    } catch (err) {
        msg = "拷贝失败，该chrome版本不支持此操作!";
    }
    window.getSelection().removeAllRanges();
    toWarn && warn(msg, 300);
}

/**
 * copy selector to the clipboard.
 */
function copySelectorToClip() {
    var
        msg = "",
        range = document.createRange(),
        span = document.querySelector(".result > .selector.active"),
        text = span.innerText,
        _text = text;

    if (span) {

        // 针对没有select()方法的元素
        _text = _text.replace("jQuery('", "").replace("');", "");
        span.innerText = _text;

        range.selectNode(span);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        try {
            msg = document.execCommand("copy") ? "拷贝成功!" : "拷贝失败!";
        } catch (err) {
            msg = "拷贝失败，该chrome版本不支持此操作!";
        }
        window.getSelection().removeAllRanges();

        span.innerText = text;
        warn(msg, 300);
    }
}

/**
 * TODO
 * 标记所有的可点击链接
 * 判断是否有jq，没有则提示要求注入
 * cursor:pointer + a[href]
 * visible:true
 * 对于overflow:hidden的(例如焦点图)查找其container
 */
function markAllLinks() {
}

/**
 * inject the jQuery object.
 */
function loadJQ() {
    inspectEval("jQuery.fn.jquery", function (result, isException) {

        if (isException) { // 页面中没有jq

            //var jqSrc = chrome.extension.getURL("jquery.min.js"); // TODO 行不通
            var jqSrc = "https://g.alicdn.com/sj/lib/jquery.min.js";

            inspectEval("(" + _loadJQ + ")('" + jqSrc + "')", function (res, isEx) {
                if (!isEx) {
                    window.setTimeout(function () {
                        inspectEval("jQuery.fn.jquery", function (r, ex) {
                            if (!ex) {
                                warn("jQuery " + r + " 嵌入成功！", 2000);
                            } else {
                                warn("该页面中无法嵌入jQuery！", 2000);
                            }
                        })
                    }, 1000);
                } else {
                    warn("嵌入jQuery失败！");
                }
            })

        } else {
            warn("此页面中已有 jQuery " + result + " ");
        }
    });

    function _loadJQ(src) {
        var script = document.createElement("script");
        script.classList.add("load-jq");
        script.src = src;
        document.head.insertBefore(script, document.head.firstChild);

        var timer = window.setInterval(function () {
            if (window['jQuery']) {
                // http://www.ikea.com/cn/zh/catalog/categories/series/19027/ 库冲突
                // jQuery.noConflict(true);
                jQuery.noConflict();
                window.clearInterval(timer);
                return jQuery.fn.jquery;
            }
        }, 100)
    }
}

/**
 * 根据输入的选择器来查找和标记所能找到元素
 * 注:要能够保存历史
 */
function calc() {
    var
        me = this,
        selector = document.querySelector(".selector");

    //隐藏 .selector
    selector.classList.remove("active");

    me.style.display = 'block';
    me.innerHTML = '';
    destroyInput();

    window['_history'] = window['_history'] || [];
    window['_h_index'] = window['_h_index'] || 0; // 历史记录的当前序号
    window['_s_index'] = -1; // 被编辑选择器选中元素定位用的当前序号
    window['_s_length'] = -1; // 被编辑选择器选中元素定位用的当前序号

    /**
     * 创建查找工具栏
     * <input type="text"><i class="fa fa-caret-left"></i><i class="fa fa-search"></i><i class="fa fa-caret-right"></i>
     */
    var
        input = tag("textarea", "calc-editor",
            {
                title: '使用 alt + up/down 可查看历史记录',
                style: "width: 418px;" + " font-size: 12px; font-family: monospace; border: 1px solid silver"
            }
        ),

        iSearch = tag("i", ['fa', 'fa-search'], {title: '搜索 ( 左单击空白处 )'}),
        iLeft = tag("i", ['fa', 'fa-caret-left'], {title: '查询结果中的上一个元素'}),
        iRight = tag("i", ['fa', 'fa-caret-right'], {title: "查询结果中的下一个元素"}),

        iExecute = tag("i", ['fa', 'fa-play'], {title: '执行表达式 ( 右单击空白处 )'}),
        iUp = tag("i", ['fa', 'fa-caret-up'], {title: '上一个历史记录'}),
        iDown = tag("i", ['fa', 'fa-caret-down'], {title: "下一个历史记录"}),

        str = selector.innerText.trim(),

        selector_holder = input.value;

    input.value = (str != "无" && str != "") ? str : history() ? history() : "";

    // 此次编辑的Selector存入history
    history(null, input.value);

    input.addEventListener("keydown", function (event) {
        var _alt = event['altKey'];

        switch (event["keyCode"]) {
            case 38: // 前一次查询记录
                _alt && (input.value = history(current(-1)));
                break;
            case 40: // 后一次查询记录
                _alt && (input.value = history(current(1)));
                break;
            default:
                break;
        }
    });

    // 只用来阻止聚焦时产生的鼠标点击事件的传播
    input.addEventListener("mouseup", function () {
        event.stopPropagation();
    });

    input.addEventListener("blur", function () {
        if (input.value != null && input.value != "") {
            input.value = input.value.trim();
        }
        selector_holder = input.value;
    });

    // 查询
    iSearch.addEventListener("mouseup", function () {
        goSearch.bind(input);

        goSearch(function (len) {
            if (len > 0) {
                detectEvent();
            }
        });

        event.stopPropagation();
    });
    // 查询结果中的上一个元素
    iLeft.addEventListener("mouseup", function () {
        input.value && go(-1);

        event.stopPropagation();
    });
    // 查询结果中的下一个元素
    iRight.addEventListener("mouseup", function () {
        input.value && go(1);

        event.stopPropagation();
    });

    // 执行
    iExecute.addEventListener("mouseup", function () {
        execute(input.value);

        event.stopPropagation();
    });
    // 上一个历史记录
    iUp.addEventListener("mouseup", function () {
        input.value = history(current(-1));

        event.stopPropagation();
    });
    // 下一个历史记录
    iDown.addEventListener("mouseup", function () {
        input.value = history(current(1));

        event.stopPropagation();
    });

    me.appendChild(input);

    // 调整页面
    resize();

    me.appendChild(tag("br"));
    me.appendChild(iSearch);
    me.appendChild(iLeft);
    me.appendChild(iRight);

    me.appendChild(iExecute);
    me.appendChild(iUp);
    me.appendChild(iDown);

    me.appendChild(createCalc());

    input.addEventListener('focus', function () {
        resetOperatorStatus();
    });

    input.focus();

    /**
     * 创建标签
     * @param name
     * @param clazz
     * @param attrs
     * @returns {Element}
     */
    function tag(name, clazz, attrs) {
        var tag = document.createElement(name);

        if (typeof clazz == "string") {
            tag.classList.add(clazz);
        } else if (Array.isArray(clazz)) {
            for (var i = 0; i < clazz.length; i++) {
                tag.classList.add(clazz[i]);
            }
        }

        if (typeof attrs == "object") {
            for (var attr in attrs) {
                tag.setAttribute(attr, attrs[attr]);
            }
        }

        return tag;
    }

    /**
     * 标记上一个/下一个元素
     * @param flag
     */
    function go(flag) {
        if (flag == 1) {
            if (window['_s_index'] + 1 < window['_s_length']) {
                window['_s_index']++;
            }
        } else {
            window['_s_index']--;
            if (window['_s_index'] < 0) {
                window['_s_index'] = 0;
            }
        }

        inspectEval(getTagLeft
            + getTagTop
            + _scrollToTag
            + " (" + _scrollToTag + ")(" + window['_s_index'] + ");",
            function (result, isException) {
                if (isException) {
                    warn("选择器错误或者页面不支持jQuery！");
                }
            }
        );

        function _scrollToTag(index) {

            // var tag = window['jQuery'] ? jQuery(selector)[index] : document.querySelectorAll(selector)[index];

            var cover = document.getElementsByClassName("-slct");
            for (var i = 0; i < cover.length; i++) {
                if (i == index) {
                    cover[i].style.backgroundColor = "green";
                    window.scrollTo(getTagLeft(cover[i]), getTagTop(cover[i]));
                } else {
                    cover[i].style.backgroundColor = "rgb(255, 0, 0)";
                }
            }
        }
    }

    /**
     * 标记所有当前选择器能查找到的元素
     * @returns {number}
     */
    function goSearch(callback, toWarn) {
        if (!input.value) {
            return 0;
        }

        window['_s_index'] = -1;
        window['_s_length'] = 0;

        inspectEval(getTagLeft
            + getTagTop
            + coverToEle
            + " (" + _searchAll + ")(" + input.value.replace(/\;$/, "") + ")",
            function (result, isException) {
                if (isException) {
                    warn("该页面不支持jQuery或者表达式错误！");
                } else {
                    history(null, input.value);
                    document.querySelector(".selector-num").innerHTML = window['_s_length'] = Number.parseInt(result);

                    if (typeof callback == "function") {
                        callback(window['_s_length']);
                    }
                    toWarn != false && warn("搜索成功！", 300);
                    go();
                }
            }
        );

        function _searchAll(tags) {
            tags = jQuery(tags);
            for (var i = 0; i < tags.length; i++) {
                if (i == 0) {
                    coverToEle(tags[i], true, 0);
                } else {
                    coverToEle(tags[i], false, i);
                }
            }

            return tags.length;
        }
    }

    /**
     * 执行输入的表达式
     * @param expr
     * @param msg
     * @returns {null}
     */
    function execute(expr, msg) {
        if (!expr || !expr.trim()) {
            return null;
        }

        inspectEval('jQuery.fn.jquery', function (result, exception) {
            if (!exception) {
                inspectEval("(function(){" + expr + "; return null;})();", function (res, isEx) {
                    if (isEx) {
                        warn("表达式有错误！", 500);
                    } else {
                        history(null, input.value);
                        warn(msg || "执行成功！", 300);
                    }
                });
            } else {
                warn("该页面不支持jQuery或者表达式错误！");
            }
        })
    }

    /**
     * 历史记录
     * @param index
     * @param item
     * @returns {*}
     */
    function history(index, item) {

        var _history = window['_history'];

        if (index != null) {
            if (index >= 0 && _history.length > 0) {
                return _history[index];
            }
            return "";
        } else if (item) {
            if (!_history.includes(item)) {
                _history[_history.length] = item;
                window['_history'] = _history;
            }
        } else {
            if (_history.length > 0) {
                return _history[_history.length - 1];
            } else {
                return "";
            }
        }
    }

    /**
     * 当前历史记录索引
     * @param flag
     * @returns {*}
     */
    function current(flag) {
        var current = window['_h_index'];

        switch (flag) {
            case -1 :
                if (current - 1 >= 0) {
                    current--;
                }
                break;
            case 1:
                if (current + 1 < window['_history'].length) {
                    current++;
                }
                break;
            default:
                break;
        }

        return window['_h_index'] = current;
    }

    /* jQuery计算器面板 */
    function createCalc() {
        var
            filtrate = [
                {name: ':eq()', title: ':eq(index)', hasArgs: true, posit: 'inner'},
                {name: ':lt()', title: ':lt(index)', hasArgs: true, posit: 'inner'},
                {name: ':gt()', title: ':gt(index)', hasArgs: true, posit: 'inner'},
                {name: ':not()', title: ':not(selector)', hasArgs: true, posit: 'inner'},
                {name: ':has()', title: ':has(selector) ', hasArgs: true, posit: 'inner'},
                {name: ':contains()', title: ':contains(text)', hasArgs: true, posit: 'inner'},
                {name: ':first', hasArgs: false, posit: 'inner'},
                {name: ':last', hasArgs: false, posit: 'inner'},
                {name: ':odd', hasArgs: false, posit: 'inner'},
                {name: ':even', hasArgs: false, posit: 'inner'},
                {name: ':visible', hasArgs: false, posit: 'inner'},
                {name: ':hidden', hasArgs: false, posit: 'inner'}
            ],
            simpleHandler = [
                {name: '.slice()', title: 'slice(start,[end])', hasArgs: true, posit: 'outer'},
                {name: '.children()', title: 'children([expr])', hasArgs: true, posit: 'outer'},
                {name: '.next()', title: 'next([expr])', hasArgs: true, posit: 'outer'},
                {name: '.prev()', title: 'prev([expr])', hasArgs: true, posit: 'outer'},
                {name: '.show()', title: 'show([s,[e],[fn]])', hasArgs: true, posit: 'outer'},

                {name: '.find()', title: 'find(e|o|e)', hasArgs: true, posit: 'outer'},
                {name: '.parent()', title: 'parent([expr])', hasArgs: true, posit: 'outer'},
                {name: '.nextall()', title: 'nextall([expr])', hasArgs: true, posit: 'outer'},
                {name: '.prevall()', title: 'prevall([expr])', hasArgs: true, posit: 'outer'},
                {name: '.hide()', title: 'hide([s,[e],[fn]])', hasArgs: true, posit: 'outer'},

                {name: '.filter()', title: 'filter(expr|obj|ele|fn)', hasArgs: true, posit: 'outer'},
                {name: '.parents()', title: 'parents([expr])', hasArgs: true, posit: 'outer'},
                {name: '.nextUntil()', title: 'nextUntil([element][,filter])', hasArgs: true, posit: 'outer'},
                {name: '.prevUntil()', title: 'filter([element][,filter])', hasArgs: true, posit: 'outer'},
                {name: '.remove()', title: 'remove([expr])', hasArgs: true, posit: 'outer'},

                {name: '.not()', title: 'not(expr|ele)', hasArgs: true, posit: 'outer'},
                {name: '.siblings()', title: 'siblings([expr])', hasArgs: true, posit: 'outer'},
                {name: '.is()', title: 'is(expr|obj|ele|fn)', hasArgs: true, posit: 'outer'},
                {name: '.has()', title: 'has(expr|ele)', hasArgs: true, posit: 'outer'},
                {name: '.hasClass()', title: 'hasClass(class)', hasArgs: true, posit: 'outer'}
            ],

            container = tag("div", ['line-container'], {
                style: "/*width: 300px; height: 100px; border: 1px solid" +
                " silver*/"
            });

        var operatorPanel = createLine(['operate-container'], {
            style: 'border: 1px dashed silver; width: 420px; min-height:35px;' +
            ' margin-bottom: 8px;'
        });

        // clear all operator
        operatorPanel.appendChild(clearOperators());
        container.appendChild(operatorPanel);

        // 筛选
        var filtrateLine = createLine();
        for (var i = 0; i < filtrate.length; i++) {

            var btn = createBtn(filtrate[i]['name']);

            if (filtrate[i]['name'] == ':contains()') {
                btn = createBtn(filtrate[i]['name'], ['lg-width']);
            }

            btn.dataset['hasArgs'] = filtrate[i]['hasArgs'];
            btn.dataset['posit'] = filtrate[i]['posit'];

            if (filtrate[i]['title']) {
                btn.title = filtrate[i]['title'];
            } else {
                btn.title = filtrate[i]['name'];
            }

            btn.addEventListener("mouseup", addToOperate);
            filtrateLine.appendChild(btn);
        }
        container.appendChild(filtrateLine);

        // 常用方法
        var simpleHandlerLine = createLine(['simple-method']);
        for (i = 0; i < simpleHandler.length; i++) {
            btn = createBtn(simpleHandler[i]['name']);

            btn.dataset['hasArgs'] = simpleHandler[i]['hasArgs'];
            btn.dataset['posit'] = simpleHandler[i]['posit'];

            if (simpleHandler[i]['title']) {
                btn.title = simpleHandler[i]['title'];
            } else {
                btn.title = simpleHandler[i]['name'];
            }

            btn.addEventListener("mouseup", addToOperate);
            simpleHandlerLine.appendChild(btn);
        }
        container.appendChild(simpleHandlerLine);

        container.appendChild(tag("br")); // 调整与下方区域的间隔

        // 鼠标右击查询
        window['mouse_right_click'] && me.removeEventListener("mouseup", window['mouse_right_click']);
        me.addEventListener("mouseup", window['mouse_right_click'] = function () {
            _debug && console.debug(event);
            if (event['which'] == 1) {
                goSearch(function (len) {
                    if (len > 0) {
                        detectEvent();
                    }
                });
            } else if (event['which'] == 3) {
                execute(input.value);
            }
        });

        return container;
    }

    /**
     *
     * @param value
     * @param clazz
     * @param attrs
     * @returns {Element}
     */
    function createBtn(value, clazz, attrs) {
        var btn = tag("span", clazz || [], $extends(attrs, {}));
        btn.innerText = value;
        return btn;
    }

    /**
     *
     * @param clazz
     * @param attrs
     * @returns {Element}
     */
    function createLine(clazz, attrs) {
        var _clazz = ['line'];
        if (clazz) {
            _clazz = _clazz.concat(clazz);
        }
        _debug && console.debug(_clazz);
        return tag("div", _clazz, $extends(attrs, {}));
    }

    /**
     *
     */
    function addToOperate() {
        var
            me = this,
            area = document.querySelector(".operate-container"),
            btn = createBtn(me.innerText, ['operate'], {style: 'margin: 2px; width: auto;'}),
            closeBtn = createCloseBtn(btn),
            hasArgs = me.dataset['hasArgs'],
            posit = me.dataset['posit'];

        var btns = area.querySelectorAll(".selected");
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove("selected");
        }

        btn.addEventListener('mouseup', function () {

            var
                isSelected = this.classList.contains("selected"),
                _btns = area.querySelectorAll(".selected");

            destroyInput();

            for (i = 0; i < _btns.length; i++) {
                _btns[i].classList.remove("selected");

            }

            if (btn.isSameNode(this)) {
                if (isSelected) {
                    this.classList.remove("selected");
                } else {
                    this.classList.add("selected");
                    initInput();
                }

            } else {
                this.classList.add("selected");
                initInput();
            }

            event.stopPropagation();
        });

        btn.classList.add("selected");
        btn.dataset['posit'] = posit;

        btn.appendChild(closeBtn);
        area.appendChild(btn);
        evalOperator();

        destroyInput();
        initInput();

        event.stopPropagation();
    }

    /**
     * 清空所有的操作对象
     * @returns {Element}
     */
    function clearOperators() {
        var btn = tag("i", ['fa', 'fa-close'], {style: 'float:right;margin: 0;color: #6F6F6F;'});
        btn.addEventListener("mouseup", function () {

            var operatorPanel = document.querySelector('.operate-container');
            operatorPanel.innerHTML = "";
            operatorPanel.appendChild(btn);

            input.value = selector_holder;

            event.stopPropagation();
        });
        return btn;
    }

    /**
     *
     */
    function addToTrigger() {

        var
            me = this,
            area = document.querySelector(".operate-container"),
            btn = createBtn(".trigger('" + me.innerText + "')", ['operate', 'trigger'], {
                style: 'margin: 2px; width:' +
                ' auto;'
            }),
            triggerBtn = area.querySelector(".operate.trigger"),
            closeBtn = createCloseBtn(btn),
            posit = "outer";

        var btns = area.querySelectorAll(".selected");
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove("selected");
        }
        if (triggerBtn) {
            triggerBtn.remove();
        }

        btn.addEventListener('click', function () {

            var
                isSelected = this.classList.contains("selected"),
                _btns = area.querySelectorAll(".selected");

            destroyInput();

            for (i = 0; i < _btns.length; i++) {
                _btns[i].classList.remove("selected");

            }

            if (btn.isSameNode(this)) {
                if (isSelected) {
                    this.classList.remove("selected");
                } else {
                    this.classList.add("selected");
                }

            } else {
                this.classList.add("selected");
            }

            event.stopPropagation();
        });

        btn.classList.add('selected');
        btn.dataset['posit'] = posit;

        btn.appendChild(closeBtn);
        area.appendChild(btn);
        evalOperator();

        execute(input.value, me.innerText + " 已触发！");

        event.stopPropagation();
    }

    /**
     * 删除按钮
     * @param target
     * @returns {Element}
     */
    function createCloseBtn(target) {
        var btn = tag("i", [
            'fa', 'fa-close'
        ], {
            style: 'font-size: 10px;width: auto;float: right;margin-top: -3px;margin-right: -1px;color:' +
            ' #6F6F6F;'
        });
        btn.addEventListener("mouseup", function () {

            target.remove();
            evalOperator();

            event.stopPropagation();
        });
        return btn;
    }

    /**
     * 初始化操作区域操作符状态
     */
    function resetOperatorStatus() {
        destroyInput();
        var btns = document.querySelectorAll(".operate-container .selected");
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove("selected");
        }
    }

    /**
     * 初始化输入监听事件
     */
    function initInput() {
        document.addEventListener("keydown", window.argsInput);
    }

    /**
     * 输入处理逻辑
     * 在点击"选择器"创建calcContainer前需要destroyInput，argsInput挂在window下比较好拿到.
     */
    window.argsInput = function () {
        _debug && console.debug(event);
        var
            code = event['keyCode'],
            shift = event['shiftKey'],

            tag = document.querySelector(".operate.selected");

        if (tag) {
            if (code == 37 || code == 39) { // 移动
                var
                    index = 0,
                    _tag = tag.cloneNode(true),
                    tags = document.querySelectorAll('span.operate');

                // cloneNode不会克隆closeBtn的事件
                _tag.querySelector('i').remove();
                _tag.appendChild(createCloseBtn(_tag));

                for (var k = 0; k < tags.length; k++) {

                    if (tags[k].isSameNode(tag)) {

                        if (code == 37) { // 向左
                            index = k - 1;
                            if (index >= 0) {
                                tag.parentNode.insertBefore(_tag, tags[index]);
                                tag.remove();
                                evalOperator();
                            }
                        } else {// 向右
                            index = k + 2;
                            if (index < tags.length + 2) {
                                tag.parentNode.insertBefore(_tag, tags[index]);
                                tag.remove();
                                evalOperator();
                            }
                        }
                        break;
                    }
                }

            } else if (code == 8) {
                tag.innerHTML = tag.innerText.replace(/(.\))$/, ")");
                tag.appendChild(createCloseBtn(tag));
                evalOperator();
            } else {
                //var inputChar = String.fromCharCode(code); // 符号对应不上
                var inputChar = codeToChar(event);

                _debug && console.debug(inputChar);

                if (inputChar && inputChar.trim()) {
                    if (!shift && code >= 65 && code <= 90) {
                        inputChar = inputChar.toLowerCase();
                    }
                    tag.innerText = tag.innerText.replace(")", inputChar + ")");
                    tag.appendChild(createCloseBtn(tag));
                    evalOperator();
                }
            }
        }
    };

    /**
     * 销毁输入监听事件
     */
    function destroyInput() {
        document.removeEventListener("keydown", window.argsInput);
    }

    /**
     * 探测jQuery、Dom事件
     */
    function detectEvent() {

        // TODO var domEvents = [];
        var selector = input.value.replace(/\;$/, '');

        inspectEval("(" + _detectEvent + ")(" + selector + ")", function (events, isExp) {
            if (!isExp) {
                // 事件
                var eventNamesLine = createLine(['event-line']);
                for (var i = 0; i < events.length; i++) {
                    var btn = createBtn(events[i], null, {style: 'width:auto;'});

                    btn.title = events[i];

                    btn.addEventListener("mouseup", addToTrigger);

                    eventNamesLine.appendChild(btn);
                }
                var
                    container = document.querySelector('.line-container'),
                    eventLine = container.querySelector('.event-line'),
                    brs = container.querySelectorAll("br");

                if (eventLine) {
                    eventLine.remove();
                }

                if (brs.length > 0) {
                    brs[brs.length - 1].remove();
                }
                container.appendChild(eventNamesLine);
                container.appendChild(tag('br'));
            }
        });

        function _detectEvent(s) {
            var
                events = [],
                _events = jQuery._data(jQuery(s)[0], 'events');

            for (var n in _events) {
                if (_events.hasOwnProperty(n)) {
                    events.push(n);
                }
            }
            return events;
        }
    }

    /**
     * event['keyCode'] 对应字符转换
     */
    function codeToChar(event) {
        var
            result = "",

            code = event['keyCode'],

            shift = event['shiftKey'],

            abc = [
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                'u',
                'v',
                'w', 'x', 'y', 'z'
            ],
            abcCode = [],

            digit = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            digitCode = [],

            symbol_s = ['*', '+', null, '-', '.', '/'],
            symbolCode_s = [],

            symbol_n = [')', '!', '@', '#', '$', '%', '^', '&', '*', '('],
            symbolCode_n = [],

            symbol_m = [';', '=', ',', '-', '.', '/', '`', '[', '\\', ']', "'"],
            symbolCode_m = [],

            symbol_m_u = [':', '+', '<', '_', '>', '?', '~', '{', '|', '}', '"'],
            symbolCode_m_u = [];

        // 26个字母
        for (var j = 65; j < abc.length + 65; j++) {
            abcCode[j] = abc[j - 65];
        }

        // 主键盘数字
        for (j = 48; j < digit.length + 48; j++) {
            digitCode[j] = digit[j - 48];
        }

        // 主键盘数字 + shift => 符号
        for (j = 48; j < symbol_n.length + 48; j++) {
            symbolCode_n[j] = symbol_n[j - 48];
        }

        // 小键盘数字
        for (j = 96; j < digit.length + 96; j++) {
            digitCode[j] = digit[j - 96];
        }

        // 小键盘符号
        for (j = 106; j < symbol_s.length + 106; j++) {
            symbolCode_s[j] = symbol_s[j - 106];
        }

        // 主键盘符号 keyCode 186-192 219-222
        for (j = 186; j < (symbol_m.length + 186); j++) {
            if (j >= (symbol_m.length + 186 - 4)) {

                symbolCode_m[j + 26] = symbol_m[j - 186];
            } else {
                symbolCode_m[j] = symbol_m[j - 186];
            }
        }

        // 主键盘符号 + shift keyCode 186-192 219-222
        for (j = 186; j < (symbol_m_u.length + 186); j++) {

            if (j >= (symbol_m_u.length + 186 - 4)) {
                symbolCode_m_u[j + 26] = symbol_m_u[j - 186];
            } else {
                symbolCode_m_u[j] = symbol_m_u[j - 186];
            }
        }

        if (abcCode[code] != undefined && abcCode[code] != null) {
            if (shift) {
                result = abcCode[code].toUpperCase();
            } else {
                result = abcCode[code];
            }
        } else if (digitCode[code] != undefined && digitCode[code] != null) {

            if (shift) {
                result = symbolCode_n[code];
            } else {
                result = digitCode[code];
            }
        } else if (symbolCode_s[code] != undefined && symbolCode_s[code] != null) {
            result = symbolCode_s[code];
        } else if (symbolCode_m[code] != undefined && symbolCode_m[code] != null) {
            if (shift) {
                result = symbolCode_m_u[code];
            } else {
                result = symbolCode_m[code];
            }
        } else {
            _debug && warn("codeToChar映射错误！", 1500);
        }

        return result;
    }

    /**
     * 拼接operator到selector
     */
    function evalOperator() {
        var
            selector = selector_holder,
            operatorsContainer = document.querySelector('.operate-container'),
            operators = operatorsContainer.querySelectorAll(".operate-container span");

        if (selector.length == 0) {
            return null;
        }

        if (selector.length > 0) {
            selector = selector.replace(/\;$/, '');
        }

        for (var i = 0; i < operators.length; i++) {
            var
                singleQuoteStr = "')",
                doubleQuoteStr = '")',
                tag = operators[i],
                posit = tag.dataset['posit'],
                value = tag.innerText;

            if (!posit || posit == 'outer') {
                selector = selector + value;
            } else {
                if (selector.endsWith(singleQuoteStr)) {
                    selector = selector.replace(singleQuoteStr, value + singleQuoteStr);

                } else if (selector.endsWith(doubleQuoteStr)) {
                    selector = selector.replace(doubleQuoteStr, value + doubleQuoteStr);
                } else {
                    selector = selector.replace(/\)$/, value + ")");
                }
            }
        }
        selector = selector + ";";
        input.value = selector;
    }

}

// /*************************************Others**********************************************/

/**
 * Interact with the current page.
 * @param evalStr
 * @param callback
 */
function inspectEval(evalStr, callback) {
    chrome.devtools.inspectedWindow.eval(
        evalStr,
        function () {
            if (typeof callback === "function") {
                callback.apply(callback, arguments);
            }
        }
    );
}

/**
 * resize the result page.
 */
function resize() {
    window.postMessage("resize-side-pane", "*");
}

/**
 * Delayed show some messages.
 */
function warn(msg, time) {
    var
        clazz = "active",
        resultSpan = document.querySelector(".result .selector"),
        warnSpan = document.querySelector(".result .alert"),
        isActive = resultSpan.classList.contains(clazz);

    warnSpan.innerText = msg;
    warnSpan.classList.add(clazz);
    resultSpan.classList.remove(clazz);

    time = time || 1000;
    setTimeout(timer, time);

    function timer() {
        warnSpan.innerText = "";
        warnSpan.classList.remove(clazz);
        isActive && resultSpan.classList.add(clazz);
    }
}

/**
 * 对象继承
 */
function $extends(from, to) {

    if (!from || !to || Array.isArray(from) || Array.isArray(to) || typeof from != typeof to) {
        return to;
    }
    for (var n in from) {
        if (from.hasOwnProperty(n)) {
            to[n] = from[n];
        }
    }
    return to;
}

/**
 * 判断给定对象是否为空
 * @param obj {object}
 * @returns {boolean}
 */
function isNotEmpty(obj) {
    var
        result = true,
        type = typeof obj;

    switch (type) {
        case "undefined":
            result = false;
            break;
        case "object":
            result = isNotEmptyO(obj);
            break;
        case "string":
            result = obj.trim().length > 0;
            break;
        default:
            var isArr = Array.isArray(obj);
            if (isArr) {
                result = isArr.length > 0;
            } else {
                // number/boolean return true
            }
            break;
    }

    return result;
}

/**
 * 判断对象是否为空
 * @param obj {object}
 * @returns {boolean}
 */
function isNotEmptyO(obj) {

    if (typeof obj === "undefined" || obj === null) {
        return false;
    }

    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            return true;
        }
    }
    return false;
}