var evalstr = "var IGNORE_ATTR = ['id', 'class', 'style', 'data-'];  var modalArr = []; ";
/**
 * 入口函数
 * @returns {Object}
 */
function doMain(target) {

    /**
     * 当前选中的标签
     * @type {Element}
     */
    // var target = $0;

    if (isComment(target)) {
        return null;
    }

    var
        info = getTagInfo(target, null),
        _modalArr = modalArr,
        selector = createSelector(_modalArr);

    _modalArr.reverse();

    return {
        /**
         * 被选中元素的信息和其父元素信息
         * @type {Object}
         */
        info: info,

        selector: selector,
        /**
         * @type {Array}
         * modalArr:{Array:[modal,modal,...]}
         * modal:[modalItem,modalItem,modalItem] length == 3
         * modal[0]: [tagName-object,id-object,class-object,class-object,...]
         * modal[1]: attributes (保留将来使用)
         * modal[2]: sifted selector(初步筛选过的单标签选则器)
         * xxx-object:{value:"",check:false}
         */
        modal: _modalArr
    };
}

/**
 * 获取元素信息
 * @param tag
 * @param childInfo
 * @returns {Object||null}
 */
function getTagInfo(tag, childInfo) {

    var
        info = {
            tagName: "",
            tagId: "",
            tagClass: "",
            attr: null,
            position: {
                top: 0,
                left: 0
            },
            /**
             * [0]:tagName|id|class
             * [1]:attributes
             */
            modal: [],
            childInfo: childInfo
        },

        _modal = [],
        _attrModal = [];

    if (!tag) {
        return info;
    }

    info.tagName = tag.tagName.toLowerCase();
    if (isNotEmpty(info.tagName)) {
        _modal.push(createModalItem("tagName", info.tagName));
    }

    info.tagId = tag.id;
    if (isNotEmpty(info.tagId)) {
        _modal.push(createModalItem("tagId", info.tagId));
    }

    info.tagClass = Array.prototype.slice.call(tag.classList, 0, tag.classList.length);
    if (isNotEmpty(info.tagClass)) {
        _modal = _modal.concat(createModalItem("tagClass", info.tagClass));
    }

    info.modal[0] = _modal;

    info.attr = {};

    for (var i = 0; i < tag.attributes.length; i++) {
        var
            attr = tag.attributes[i],
            name = attr['name'];

        if (IGNORE_ATTR.indexOf(name) < 0) {
            info.attr[name] = attr['value'];
            _attrModal.push(createModalItem(name, attr['value']));
        }
    }

    isNotEmptyO(info.attr) && (info.modal[1] = _attrModal);

    info.modal = initTagSelector(info.modal);

    // 全局变量 modalAr
    modalArr.push(info.modal);

    info.position.left = getTagLeft(tag);
    info.position.top = getTagTop(tag);

    if (tag.parentElement) {

        info = getTagInfo(tag.parentElement, info);
    }
    return info;
}

/**
 * 获取元素的x坐标
 * @param tag
 * @returns {Number|number}
 */
function getTagLeft(tag) {
    if (!tag) {
        return 0;
    }
    var actualLeft = tag.offsetLeft;
    var current = tag.offsetParent;

    while (current !== null) {
        actualLeft += current.offsetLeft;
        current = current.offsetParent;
    }
    return actualLeft;
}

/**
 * 获取元素的y坐标
 * @param tag
 * @returns {Number|number}
 */
function getTagTop(tag) {
    if (!tag) {
        return 0;
    }
    var actualTop = tag.offsetTop;
    var current = tag.offsetParent;
    while (current !== null) {
        actualTop += current.offsetTop;
        current = current.offsetParent;
    }
    return actualTop;
}

/**
 * 判断是否是注释
 * @param tag
 * @returns {boolean}
 */
function isComment(tag) {
    return tag ? tag.tagName == '#comment' : false;
}

/**
 * 遮盖选中的元素
 * @param ele {Element}
 * @param clearAll {boolean}
 * @param index {Number}
 */
function coverToEle(ele, clearAll, index) {
    if (!ele) {
        return;
    }

    if (clearAll) {
        var arr = document.querySelectorAll(".-slct");
        for (var i = 0; i < arr.length; i++) {
            arr[i].parentNode.removeChild(arr[i]);
        }
    }

    var div = document.createElement("div");
    div.classList.add("-slct");

    div.style.lineHeight = "14px";
    div.style.cursor = "pointer";
    div.style.position = "absolute";
    div.style.color = "white";
    div.style.zIndex = "999999999999";
    div.style.backgroundColor = "rgb(255, 0, 0)";
    div.style.opacity = 0.7;
    div.style.textAlign = 'left';
    div.style.overflowX = 'hidden';

    var
        _offsetParent = ele.offsetParent,
        transform = ele.style.transform;
    while(_offsetParent != null){
        if(_offsetParent.style.transform){
            transform = _offsetParent.style.transform
        }
        _offsetParent = _offsetParent.offsetParent;
    }
    if(transform){
        // http://support-cn.samsung.com/campaign/mobilephone/C/?cid=cn_banner_g.pconline.com_201606hhpgalaxyclunchJun_20160611_HHP_CMT_13170
        div.style.transform = transform;
    }

    var tipText = ""; // 遮层上的信息

    var shape = 'rect'; // circle
    // TODO area
    if (ele.nodeName.toLowerCase() == 'area') {
        isArea();
    } else if (ele.nodeName.toLowerCase() == 'map') {
        isMap(ele);
    } else {
        div.style.height = ele.getBoundingClientRect().height + "px";
        div.style.width = ele.getBoundingClientRect().width + "px";
        div.style.top = getTagTop(ele) + "px";
        div.style.left = getTagLeft(ele) + "px";

        if (index != null) {
            tipText = "[" + index + "] " + ele.nodeName;
        } else {
            tipText = ele.nodeName;
        }
    }

    var span = document.createElement("span");
    span.style.display = "inline-block";
    // span.style.verticalAlign = "sub";
    span.style.textAlign = "left";
    span.style.width = "100%";
    span.innerText = tipText;
    span.style.whiteSpace = "nowrap";
    span.style.overflow = 'hidden';

    if (shape == 'circle') {
        span.style.marginTop = '45%';
    }

    div.title = tipText;
    div.appendChild(span);

    document.body.appendChild(div);

    div.addEventListener("click", function () {
        div.parentElement.removeChild(div);
    });

    function isArea() {
        var coords = ele.coords.split(","),
            map = ele.parentElement,
            img = document.querySelector("img[usemap='#" + map.name + "']");

        tipText = 'map[name="' + map.name + '"]';

        if (index != null) {
            tipText = tipText ? tipText + " > " + ele.nodeName + "[" + index + "]" : "[" + index + "] " + ele.nodeName;
        } else {
            tipText = tipText ? tipText + " > " + ele.nodeName : ele.nodeName;
        }

        switch (ele.shape) {
            case 'circle': // 圆形
                // http://www.haieruplus.com/cn/index.php?m=index&mz_ca=2021995&mz_sp=70mrf&mz_sb=1
                shape = 'circle';

                div.style.height = coords[2] * 2 + "px";
                div.style.width = coords[2] * 2 + "px";

                div.style.borderRadius = coords[2] + "px";

                div.style.top = getTagTop(img) + parseInt(coords[1]) - parseInt(coords[2]) + "px";
                div.style.left = getTagLeft(img) + parseInt(coords[0]) - parseInt(coords[2]) + "px";
                break;
            case 'poly': // TODO 多边形
                // https://zrzb.tmall.hk/shop/view_shop.htm?spm=a220m.1000862.1000730.3.qxBvB5&user_number_id=2130139739&rn=cd9d6c07f9e1e0e77473d8fc20b19c72
                shape = 'poly';

                break;
            case 'rect' : // 矩形
            // break;
            default: // 矩形
                shape = 'rect';
                div.style.height = coords[3] - coords[1] + "px";
                div.style.width = coords[2] - coords[0] + "px";

                div.style.top = getTagTop(img) + parseInt(coords[1]) + "px";
                div.style.left = getTagLeft(img) + parseInt(coords[0]) + "px";
                // console.debug(coords, div.style.height, div.style.width, div.style.top, div.style.left);
                break;
        }
    }

    function isMap(targetMap) {
        var areas = targetMap.areas;
        for (var j = 0; j < areas.length; j++) {
            coverToEle(areas[j], false, j);
        }
    }

}

/**
 * 滚动到tag位置
 * @returns {{x: (Number|number), y: (Number|number)}}
 */
function scrollToTag() {
    var
        selectedTag = $0,
        x = getTagLeft(selectedTag),
        y = getTagTop(selectedTag);

    window.scrollTo(x, y);

    return {x: x, y: y};
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

/**
 * 生成modal的item
 * @param type
 * @param value
 * @returns {*}
 */
function createModalItem(type, value) {

    if (!isNotEmpty(type) || !isNotEmpty(value)) {
        return null;
    }

    var
        item = "",
        _result = [],
        result = {};

    switch (type) {
        case "tagName": // tag name
            item = value;
            break;
        case "tagId": // tag id
            item = "#" + value;
            break;
        case "tagClass": // tag class
            for (var i = 0; i < value.length; i++) {
                var _item = {
                    check: false
                };
                _item["value"] = "." + value[i];
                _result.push(_item);
            }
            break;
        default: // tag attr
            item = '[' + type + '="' + value + '"]';
            break;
    }
    result["value"] = item;
    result["check"] = false;

    return _result.length > 0 ? _result : result;
}

/**
 * 生成选择器(主入口)
 * @param modalArray {Array}
 * @returns {*}
 */
function createSelector(modalArray) {

    var isSibling = true,
        selector = modalArray[0][2];

    for (var i = 1; i < modalArray.length; i++) {
        var pSelector = modalArray[i][2];

        if (!siftTagSelector(pSelector, selector)) {

            isSibling = false;
            for (var j = 0; j < modalArray[i].length; j++) {

                if (Array.isArray(modalArray[i][j])) {
                    for (var k = 0; k < modalArray[i][j].length; k++) {
                        if (modalArray[i][j][k]) {
                            modalArray[i][j][k]["check"] = false;
                        }
                    }
                }
            }
        } else {
            if (isSibling) {
                selector = pSelector + " > " + selector;
            } else {
                selector = pSelector + " " + selector;
            }
        }
    }
    return selector;
}

/**
 * 初始化tag的选择器
 * @param modal {object}
 * @returns {*}
 */
function initTagSelector(modal) {

    var
        _modal = modal[0],// modal[1]:attributes

        /**
         * TODO 判断id的唯一性(只有不规范的页面会有多个相同的id)
         * @type {boolean}
         */
        hasId = false,
        idStr = "",

        clazzStr = "",
        hasClass = false,

        tagName = "";

    for (var i = 0; i < _modal.length; i++) {

        var item = _modal[i];

        if (item["value"].startsWith("#")) { // id

            idStr = item["value"];
            if (/\d/.test(idStr)) {
                idStr = '[id="' + idStr.replace("#", '') + '"]';
            }
            hasId = true;
            _modal[i]["check"] = true;
            break;
        } else if (item["value"].startsWith(".")) {
            hasClass = true;
            clazzStr = clazzStr + item["value"];
            _modal[i]["check"] = true;
        } else {
            tagName = item["value"];
        }
    }

    if (hasId) {
        modal[2] = idStr;
    } else if (hasClass) {
        if (/\.\d/.test(clazzStr)) {
            clazzStr = '[class="' + clazzStr.split(".").join(' ').trim() + '"]';
        }
        modal[2] = clazzStr;
        // TODO 精确筛选class
    } else {
        modal[2] = tagName;
        _modal[0]["check"] = true;
    }

    modal[0] = _modal;

    return modal;
}

/**
 * 筛选有效选择器
 * 思路:
 *  var pElements = document.querySelectorAll(pSelector > cSelector);
 *  var cElements = document.querySelectorAll(cSelector);
 *  pElements.length < cElements.length ? pSelector有效 : pSelector无效
 *
 * @param pSelector: parent node selector {string}
 * @param cSelector: child node selector {string}
 */
function siftTagSelector(pSelector, cSelector) {
    var
        cElements,
        pElements;

    try {
        cElements = document.querySelectorAll(cSelector);
        pElements = document.querySelectorAll(pSelector + " " + cSelector);
    } catch (e) {
        // 百度搜出的结果中会有 id=2这种标签
        // document.querySelectorAll("#2")会报错
        console.warn(e);
    }

    return cElements.length == 1 ? false : pElements.length < cElements.length;
}

evalstr = evalstr + doMain + " ";
evalstr = evalstr + getTagInfo + " ";
evalstr = evalstr + getTagLeft + " ";
evalstr = evalstr + getTagTop + " ";
evalstr = evalstr + isComment + " ";
evalstr = evalstr + scrollToTag + " ";

evalstr = evalstr + isNotEmpty + " ";
evalstr = evalstr + isNotEmptyO + " ";
evalstr = evalstr + createModalItem + " ";
evalstr = evalstr + createSelector + " ";
evalstr = evalstr + initTagSelector + " ";
evalstr = evalstr + siftTagSelector + " ";

evalstr = evalstr + " doMain($0);";