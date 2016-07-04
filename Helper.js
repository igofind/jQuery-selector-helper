var Tag = function (tag, config) {

    // TODO create an extends method
    config = config || {};

    /**
     * mode: how to generate the selector
     * two mode:
     *      1).normal
     *      2).precise
     */
    this.mode = config['mode'] || Tag.SELECTOR_MODE.NORMAL;
    this.mark = config['mark'] || true;
    this.autoLocate = config['autoLocate'] || false;
    this.clear = config['clear'] || true;
    this.opacity = config['opacity'] || 0.6;
    this.color = config['color'] || 'red';

    this.debug = config['debug'] || false;

    this.tag = (tag && tag[0]) || $0;

    this.init();

    window['$tag'] = this;
};

Tag.prototype = {
    init: function () {

        this.debug && console.log('init begin...');

        var tag = this.tag;

        // The $0 is a comment element.
        if (tag.nodeName == '#comment') {
            this.isComment = true;
            return {
                name: tag.nodeName.toLowerCase()
            };
        }

        /**
         * modalArr:{Array:[modal,modal,...]}
         * modal:[modalItem,modalItem,modalItem] length == 3
         * modal[0]: [tagName-object,id-object,class-object,class-object,...]
         * modal[1]: attributes (保留将来使用)
         * modal[2]: sifted selector(初步筛选过的单标签选则器)
         * xxx-object:{value:"",check:false}
         *
         * @type {Array}
         */
        this.modelArray = [];

        this.info = this.getInfo();
        this.selector = this.createSelector();
        this.cover(null, this.clear);
    },
    getInfo: function (tag, notTarget) {

        this.debug && !notTarget && console.log('getInfo() invoked, arguments: ', arguments);

        tag = tag ? tag : this.tag;

        var info = {
            name: '',
            id: '',
            class: '',
            attr: null,
            position: {
                top: 0,
                left: 0
            }
        };

        var xy = this.locate(null, this.autoLocate);
        info.position.top = xy.y;
        info.position.left = xy.x;

        if (tag.parentElement) {

            info.parentInfo = this.getInfo(tag.parentElement, true);
        }
        info.name = tag.nodeName.toLowerCase();
        info.id = tag.id;
        info.class = Array.prototype.slice.call(tag.classList, 0, tag.classList.length);
        for (var i = 0; i < tag.attributes.length; i++) {
            var
                isIgnore = false,
                _attrName = tag.attributes[i].name;

            for (var j = 0; j < Tag.IGNORE_ATTR.length; j++) {
                isIgnore = (Tag.IGNORE_ATTR[j].indexOf(_attrName) > -1);
                if (isIgnore) {
                    break;
                }
            }
            if (isIgnore || !tag.getAttribute(_attrName)) {
                continue;
            }
            if (info.attr == null) {
                info.attr = {}
            }
            info.attr[_attrName] = tag.getAttribute(_attrName);
        }

        this.modelArray.push(this.createModelArrItem(info));

        return info;
    },
    getXY: function (tag) {

        this.debug && console.log('getXY() invoked, arguments: ', arguments);

        tag = tag ? tag : this.tag;

        var coords = {x: 0, y: 0},
            actualX = tag.offsetLeft,
            actualY = tag.offsetTop,
            current = tag.offsetParent;

        if (!tag) {
            return coords;
        }
        while (current != null) {
            actualX += current.offsetLeft;
            actualY += current.offsetTop;
            current = current.offsetParent;
        }
        coords.x = actualX;
        coords.y = actualY;

        return coords;
    },
    getAreaXY: function (tag) {

        this.debug && console.log('getAreaXY() invoked, arguments: ', arguments);

        tag = tag ? tag : this.tag;

        var xy = {x: 0, y: 0},
            map, img, imgXY;

        var coords = tag.coords.split(',');
        map = tag.parentElement;
        img = document.querySelector('img[usemap="#' + map.name + '"]');
        imgXY = this.getXY(img);

        switch (tag.shape) {
            case 'circle': // circle area
                xy.y = imgXY.y + parseInt(coords[1]) - parseInt(coords[2]);
                xy.x = imgXY.x + parseInt(coords[0]) - parseInt(coords[2]);
                break;
            case 'poly':
                break;
            case 'rect' : // rectangle area
            // break;
            default: // rectangle area
                xy.y = imgXY.y + parseInt(coords[1]);
                xy.x = imgXY.x + parseInt(coords[0]);
                break;
        }
        return xy;
    },
    cover: function (eles, clear, border) {

        this.debug && console.log('cover() invoked, arguments: ', arguments);

        var
            me = this,
            targets = [];

        clear = clear || this.clear;

        eles ? targets = targets.concat(Array.prototype.slice.call(eles, 0)) : targets.push(me.tag);

        clear && this.clearAllCover();

        targets.map(function (current, index, arr) {
            var divs = me.createCover(current, arr.length > 1 ? index : null, border);
            var markLine = null;
            for (var i = 0; i < divs.length; i++) {
                if (index == 0 && me.mark) {
                    markLine =
                        me.markLine4Cover(divs[i].style.left.replace("px", ''), divs[i].style.top.replace("px", ''));
                }

                divs[i].addEventListener("click", function () {
                    this.parentElement.removeChild(this);
                    index == 0 && me.mark && markLine && markLine.map(function (line, index, arr) {
                        line.remove();
                    });
                });
                document.body.appendChild(divs[i]);
            }
        });
        return targets.length;
    },
    createCover: function (tag, index, border) {

        this.debug && console.log('createCover() invoked, arguments: ', arguments);

        var
            xy = this.getXY(tag),
            div = document.createElement("div");

        div.classList.add("-slct");

        div.style.lineHeight = "14px !important;";
        div.style.cursor = "pointer";
        div.style.position = "absolute";
        div.style.color = "white";
        div.style.zIndex = "999999999999";
        div.style.backgroundColor = this.color;
        border && (div.style.border = '1px solid white');
        div.style.opacity = this.opacity;
        div.style.textAlign = 'left';
        div.style.overflow = 'hidden';

        if (tag.nodeName.toLowerCase() == 'area') {
            div = this.coverArea(tag, div, index);
        } else if (tag.nodeName.toLowerCase() == 'map') {
            return this.coverMap(tag, index);
        } else {
            div.style.height = tag.getBoundingClientRect().height + "px";
            div.style.width = tag.getBoundingClientRect().width + "px";
            div.style.top = xy.y + "px";
            div.style.left = xy.x + "px";
            var _tips = ' [' + tag.getBoundingClientRect().width + 'x' + tag.getBoundingClientRect().height + ']  ' +
                'X: ' + xy.x +
                ', Y: ' + xy.y;

            if (index != null) {
                div.title = "[" + index + "] " + tag.nodeName + _tips;
                div.appendChild(this.tip4Cover("[" + index + "] " + tag.nodeName, tag.getBoundingClientRect().width));
            } else {
                div.title = tag.nodeName + _tips;
                div.appendChild(this.tip4Cover(div.title, tag.getBoundingClientRect().width));
            }
        }
        return [div];
    },
    coverArea: function (tag, div, index) {

        this.debug && console.log('coverArea() invoked, arguments: ', arguments);

        tag = tag ? tag : this.tag;

        var
            coords, map, img, tipText, locateTip, imgXY,
            tipSpan = this.tip4Cover();

        coords = tag.coords.split(',');
        map = tag.parentElement;
        img = document.querySelector('img[usemap="#' + map.name + '"]');
        imgXY = this.getXY(img);

        tipText = 'map[name="' + map.name + '"]';

        if (index != null) {
            tipText = tipText ? tipText + " > " + tag.nodeName + "[" + index + "]" : "[" + index + "] " + tag.nodeName;
        } else {
            tipText = tipText ? tipText + " > " + tag.nodeName : tag.nodeName;
        }

        switch (tag.shape) {
            case 'circle': // circle area
                // http://www.haieruplus.com/cn/index.php?m=index&mz_ca=2021995&mz_sp=70mrf&mz_sb=1
                div.style.height = coords[2] * 2 + "px";
                div.style.width = coords[2] * 2 + "px";

                div.style.borderRadius = coords[2] + "px";

                div.style.top = (this.info.position.top = imgXY.y + parseInt(coords[1]) - parseInt(coords[2])) + "px";
                div.style.left = (this.info.position.left = imgXY.x + parseInt(coords[0]) - parseInt(coords[2])) + "px";

                tipSpan.style.marginTop = '45%';
                break;
            case 'poly':
                // https://zrzb.tmall.hk/shop/view_shop.htm?spm=a220m.1000862.1000730.3.qxBvB5&user_number_id=2130139739&rn=cd9d6c07f9e1e0e77473d8fc20b19c72
                break;
            case 'rect' : // rectangle area
            // break;
            default: // rectangle area
                div.style.height = coords[3] - coords[1] + "px";
                div.style.width = coords[2] - coords[0] + "px";

                div.style.top = (this.info.position.top = imgXY.y + parseInt(coords[1])) + "px";
                div.style.left = (this.info.position.left = imgXY.x + parseInt(coords[0])) + "px";
                break;
        }

        locateTip = ' [' + div.style.width.replace('xy', '') + 'x' + div.style.height.replace('xy', '') + ']  ' +
            'X: ' + this.info.position.left +
            ', Y: ' + this.info.position.top;

        tipText = tipText + locateTip;

        tipSpan.innerText = tipText;
        div.title = tipText;

        div.appendChild(tipSpan);
        return div;
    },
    //createMap: function (map, index) { // TODO
    coverMap: function (map) {

        this.debug && console.log('coverMap() invoked, arguments: ', arguments);

        map = map ? map : this.tag;
        var
            divs = [],
            areas = map.areas;
        for (var j = 0; j < areas.length; j++) {
            divs.push(this.createCover(areas[j], j)[0]);
        }
        return divs;
    },
    tip4Cover: function (text, paddingLeft) {

        this.debug && console.log('tip4Cover() invoked, arguments: ', arguments);

        var span = document.createElement("span");
        span.style.display = "inline-block";
        span.style.lineHeight = "14px";
        span.style.fontSize = "12px";
        span.style.textAlign = "left";
        span.style.paddingLeft = paddingLeft == undefined ? "2px" : paddingLeft <= 180 ? "3px" : "10%";
        span.style.width = "100%";
        span.style.whiteSpace = "nowrap";
        span.style.overflow = 'hidden';
        span.innerText = text;
        return span;
    },
    markLine4Cover: function (x, y, markOnce) {

        this.debug && console.log('markLine4Cover() invoked, arguments: ', arguments);

        var
            oldX = document.getElementsByClassName('markLine4CoverX')[0],
            oldY = document.getElementsByClassName('markLine4CoverY')[0];

        if (markOnce && (oldX || oldY)) {
            return [];
        } else {
            oldX && oldX.remove();
            oldY && oldY.remove();
        }

        var
            lineX = document.createElement('div'),
            lineY = document.createElement('div'),
            height = document.body.clientHeight,
            width = document.body.clientWidth;

        lineX.classList.add('markLine4CoverX');
        lineX.style.height = height + 'px';
        lineX.style.width = '1px';
        lineX.style.borderLeft = '1px solid ' + this.color;
        lineX.style.position = 'absolute';
        lineX.style.top = '0px';
        lineX.style.left = x + 'px';
        lineX.style.zIndex = '999999999999';
        lineX.title = 'left : ' + x + ' px';

        lineY.classList.add('markLine4CoverY');
        lineY.style.width = width + 'px';
        lineY.style.height = '1px';
        lineY.style.borderTop = '1px solid ' + this.color;
        lineY.style.position = 'absolute';
        lineY.style.top = y + 'px';
        lineY.style.left = '0px';
        lineY.style.zIndex = '999999999999';
        lineY.title = 'top : ' + y + ' px';

        document.body.appendChild(lineX);
        document.body.appendChild(lineY);
        return [lineX, lineY];
    },
    clearAllCover: function () {
        var arr = document.querySelectorAll(".-slct, .markLine4CoverX, .markLine4CoverY");
        for (var i = 0; i < arr.length; i++) {
            arr[i].parentNode.removeChild(arr[i]);
        }
    },
    locate: function (tag, scroll) {

        this.debug && console.log('locate() invoked, arguments: ', arguments);

        tag = tag ? tag : this.tag;
        var xy = {x: 0, y: 0};
        if (tag.nodeName.toLowerCase() == 'area') {
            xy = this.getAreaXY(tag);
        } else if (tag.nodeName.toLowerCase() == 'map') {
            xy = this.getAreaXY(tag.querySelector('area'));
        } else {
            xy = this.getXY();
        }

        scroll && window.scrollTo(xy.x, xy.y);

        return xy;
    },
    createModelArrItem: function (info) {

        this.debug && console.log('createModelArrItem() invoked, arguments: ', arguments);

        var modelItem = [], item = [], item_attr = [];
        // name
        item.push(this.createModeItem('tagName', info.name));
        // id
        item.push(this.createModeItem('tagId', info.id));
        // class
        item = item.concat(this.createModeItem('tagClass', info.class));

        modelItem[0] = item;

        if (info.attr) {
            for (var name in info.attr) {
                if (info.attr.hasOwnProperty(name)) {
                    item_attr.push(this.createModeItem(name, info.attr[name]))
                }
            }
            modelItem[1] = item_attr;
        }
        return modelItem;
    },
    createModeItem: function (type, value) {

        this.debug && console.log('createModeItem() invoked, arguments: ', arguments);

        if ((Array.isArray(value) && value.length == 0) || ((typeof value) == 'string' && (value == null || value.trim().length == 0))) {
            return null;
        }
        var
            item = "",
            _result = [],
            result = {},
            isClass = false;

        switch (type) {
            case "tagName": // tag name
                value && (item = value);
                break;
            case "tagId": // tag id
                value && (item = "#" + value);
                break;
            case "tagClass": // tag class
                isClass = true;
                for (var i = 0; i < value.length; i++) {
                    var _item = {
                        check: false
                    };
                    _item["value"] = "." + value[i];
                    _result.push(_item);
                }
                break;
            default: // tag attr
                value && (item = '[' + type + '="' + value + '"]');
                break;
        }
        if (!isClass) {
            result["value"] = item;
            result["check"] = false;
        }

        return _result.length > 0 ? _result : isClass ? null : result;
    },
    createSelector: function (modelArray) {

        this.debug && console.log('createSelector() invoked, arguments: ', arguments);

        modelArray = modelArray || this.modelArray.reverse();
        var selector = "", _selector = '';

        // 根据this.selectorMode来
        for (var i = 0; i < modelArray.length; i++) {
            switch (this.mode) {
                case 1: // precise
                    break;
                default: // normal
                    modelArray[i] = this.siftModelSelector(modelArray[i], selector);
                    _selector = modelArray[i][2];
                    if (_selector) {
                        selector = _selector + ' ' + selector;
                    }
                    break;
            }
        }
        return selector.trimRight ? selector.trimRight() : selector.trim();
    },
    siftModelSelector: function (model, lastSelector) {

        this.debug && console.log('siftModelSelector() invoked, arguments: ', arguments);

        var selector = '';
        var _model = model[0],
            id = _model[1] ? _model[1]['value'] : '',
            clazz = _model.slice(2),
            name = _model[0]['value'];

        var id_selector, clazz_selector, name_selector,
            useId = false, useClass = false, useName = false;
        var splitStr = " ", childSplitStr = " > ";
        if (id && id.trim().length > 0) {
            if (/\d/.test(id)) {
                id_selector = '[id="' + id.replace("#", '') + '"]';
            } else {
                id_selector = id;
            }
        } else if (clazz && clazz.length > 0) {
            clazz_selector = this.siftClass(clazz);
        }
        name_selector = name;

        if (!lastSelector) {
            if (id_selector) {
                selector = id_selector;
                useId = true;
            } else if (clazz_selector) {
                selector = name_selector + clazz_selector;
                useClass = true;
                useName = true;
            } else {
                selector = name_selector;
                useName = true;
            }
        } else {
            var last = document.querySelectorAll(lastSelector);
            var tag_id = id_selector ? document.querySelectorAll(id_selector + splitStr + lastSelector) : null;
            var tag_id_child = id_selector ? document.querySelectorAll(id_selector + childSplitStr + lastSelector) : null;
            var tag_name = document.querySelectorAll(name_selector + splitStr + lastSelector);
            var tag_name_child = document.querySelectorAll(name_selector + childSplitStr + lastSelector);
            var tag_class = clazz_selector ? document.querySelectorAll(clazz_selector + splitStr + lastSelector) : null;
            var tag_class_child = clazz_selector ? document.querySelectorAll(clazz_selector + childSplitStr + lastSelector) : null;

            if (tag_id && tag_id.length > 0 && tag_id.length < last.length) {
                selector = id_selector;
                if (tag_id_child && tag_id_child.length > 0 && tag_id_child.length <= tag_id.length) {
                    selector = id_selector + " >";
                }
                useId = true;
            } else if (tag_name.length > 0 && tag_name.length < last.length) {
                selector = name_selector;
                if (tag_name_child && tag_name_child.length > 0 && tag_name_child.length <= tag_name.length) {
                    selector = name_selector + " >";
                }
                useName = true;
            } else if (tag_class && tag_class.length > 0 && tag_class.length < last.length) {
                selector = clazz_selector;
                if (tag_class_child && tag_class_child.length > 0 && tag_class_child.length <= tag_class.length) {
                    selector = clazz_selector + " >";
                }
                useClass = true;
            } else {
                selector = "";
            }
        }
        model[0][0] && (model[0][0]['check'] = useName);

        model[0][1] && (model[0][1]['check'] = useId);

        if (useClass) {
            var classList = model[0].slice(2);
            for (var i = 0; i < classList.length; i++) {
                var obj = classList[i];
                if (selector.indexOf(obj['value']) > -1) {
                    obj['check'] = true;
                }
                classList[i] = obj;
            }
            model[0].splice(2, classList.length);
            model[0] = model[0].concat(classList);
        }
        model[2] = selector;
        return model;
    },
    /**
     *  Filter suitable class.
     */
    siftClass: function (classList) {

        this.debug && console.log('siftClass() invoked, arguments: ', arguments);

        var list = Array.prototype.slice.call(classList, 0, classList.length);
        for (var i = 0; i < list.length; i++) {
            if (list[i] && list[i]['value']) {
                list[i] = list[i]['value'];
            }
        }
        var result = '';
        var miniNum = 0;
        var classGroup = this.groupClass(list);
        // Compare the elements length which can be searched by every group of class.
        for (var j = 0; j < classGroup.length; j++) {
            var item = classGroup[j];
            if (/\.\d/.test(item)) {
                item = '[class="' + item.split(".").join(' ').trim() + '"]';
            }
            var num = document.querySelectorAll(item).length;
            if (num == 1) { // This means that only one element has this class.
                result = item;
                break;
            } else {
                if (j == 0) {
                    result = item;
                    miniNum = num;
                } else {
                    if (num < miniNum) {
                        miniNum = num;
                        result = item;
                    }
                }
            }
        }
        return result;
    },
    /**
     * List all possible combinations of class (not arranged).
     */
    groupClass: function (listA, listB, result) {

        this.debug && console.log('groupClass() invoked, arguments: ', arguments);

        var _result = [];
        result = result || listA;
        if (listA.length <= 1) {
            return result;
        }

        listB = listB || listA;

        for (var i = 0; i < listA.length; i++) {
            var a = listA[i];
            var j = i + 1;
            for (; j < listB.length; j++) {
                var b = listB[j];
                if (a.indexOf(b) == -1) {
                    _result.push(a + b);
                }
            }
        }

        return this.groupClass(_result, listB.slice(1, listB.length), result.concat(_result));
    }
};
Tag.toStr = function () {
    var str = "var Tag = " + Tag + ";" +
        " Tag.IGNORE_ATTR = ['id', 'class', 'style','data-'];" +
        " Tag.SELECTOR_MODE = { NORMAL: 0, PRECISE: 1};" +
        " Tag.prototype= {";
    for (var fn in Tag.prototype) {
        if (Tag.prototype.hasOwnProperty(fn)) {
            str = str + fn + ":" + Tag.prototype[fn] + ', ';
        }
    }
    str = str.trim().replace(/\,$/, '};');
    return str;
};
Tag.IGNORE_ATTR = ['id', 'class', 'style', 'data-']; // TODO delete
Tag.SELECTOR_MODE = { // TODO use
    NORMAL: 0,
    PRECISE: 1
};