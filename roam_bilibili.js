// ==UserScript==
// @name         Roam Bilibili
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Zhu Xianxiang
// @match        https://*.roamresearch.com
// @match        https://player.bilibili.com/*
// @grant        GM_addStyle
// ==/UserScript==


(function () {
    'use strict';

    if (window.top == window) {
        main();
    } else {
        sub();
    }
})();

function sub() {
    GM_addStyle('.bilibili-player-video-sendjumpbar {display:none !important;}');
    unsafeWindow.addEventListener("message", (event) => {
        if (event.data.indexOf('seek#') != -1) {
            const myPlayer = unsafeWindow.myPlayer;
            myPlayer.seek(event.data.substr(event.data.indexOf('#') + 1));
            if (myPlayer.getState !== undefined && myPlayer.getState() === "PAUSED" || myPlayer.getState() === "READY") {
                myPlayer.play();
            }
        }
    }, false);
}

function main() {
    const players = new Map();
    const activateVideos = () => {
        Array.from(document.getElementsByTagName('IFRAME'))
            .filter(iframe => iframe.src.includes('player.bilibili.com'))
            .forEach(iframeEl => {
                const bvid = iframeEl.src.match(/(?<=bvid=).*?(?=&|$)/)[0];
                // console.log(ytId);
                const block = iframeEl.closest('.roam-block-container');
                if (!block.classList.contains('bilibili-activated')) {
                    const parent = iframeEl.parentElement;
                    parent.id = 'player-' + players.size;
                    block.classList.add('bilibili-activated');
                    block.dataset.ytId = bvid;
                    players[bvid] = iframeEl.contentWindow;
                }
                addTimestampControls(block, players[bvid]);
            });
    };

    const addTimestampControls = (block, player) => {
        if (block.children.length < 2) return null;
        const childBlocks = Array.from(block.children[1].children);
        childBlocks.forEach(child => {
            if (child.classList.contains("rm-multibar") || child.querySelectorAll('.roam-block').length === 0) {
                return;
            }
            const timestamp = getTimestamp(child);
            const buttonIfPresent = child.dataset.timestampActivated ? getControlButton(child) : null;
            const timestampChanged = buttonIfPresent !== null && timestamp != buttonIfPresent.dataset.timestamp;
            if (buttonIfPresent !== null && (timestamp === null || timestampChanged)) {
                buttonIfPresent.remove();
                child.classList.remove('timestamp-activated');
                child.dataset.timestampActivated = false;
            }
            if (timestamp !== null && (buttonIfPresent === null || timestampChanged)) {
                addControlButton(child, () => player.postMessage('seek#' + timestamp, '*'));
                getControlButton(child).dataset.timestamp = timestamp;
                child.classList.add('timestamp-activated');
                child.dataset.timestampActivated = true;
            }
        });
    };

    const getControlButton = (block) => {const button = block.querySelectorAll('.timestamp-control')[0]; if (button === undefined) return null; else return button;};

    const addControlButton = (block, fn) => {
        const button = document.createElement('button');
        button.innerText = '►';

        button.classList.add('timestamp-control');
        button.addEventListener('click', fn);
        button.style.marginRight = '8px';
        button.style.marginLeft = '16px'
        button.style.fontSize = '8px';
        const parentEl = block.children[0].children[0];
        parentEl.insertBefore(button, parentEl.querySelectorAll('.roam-block')[0]);
    };

    const getTimestamp = (block) => {
        const innerBlockSelector = block.querySelectorAll('.roam-block');
        const blockText = innerBlockSelector.length ? innerBlockSelector[0].textContent : '';
        // console.log(blockText);
        const matches = blockText.match(/^((?:\d+:)?\d+:\d\d)\D/); // start w/ m:ss or h:mm:ss
        if (!matches || matches.length < 2) return null;
        const timeParts = matches[1].split(':').map(part => parseInt(part));
        if (timeParts.length == 3) return timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
        else if (timeParts.length == 2) return timeParts[0] * 60 + timeParts[1];
        else return null;
    };

    setInterval(activateVideos, 3000);
}