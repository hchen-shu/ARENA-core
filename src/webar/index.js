import './ar-component.js';

const HIDDEN_CLASS = 'a-hidden';

const handleARButtonForNonWebXRMobile = function() {
    // if (!AFRAME.utils.device.isMobile()) {
    //     return;
    // }

    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) {
        window.addEventListener('DOMContentLoaded', handleARButtonForNonWebXRMobile);
        return;
    }

    if (window.hasNativeWebXRImplementation) {
        // handle webxr viewer
        const isWebXRViewer = navigator.userAgent.includes('WebXRViewer');
        if (isWebXRViewer) {
            window.addEventListener('enter-vr', function(e) {
                if (sceneEl.is('ar-mode')) {
                    sceneEl.setAttribute('arena-webar', '');
                }
            });
        }
        return;
    }

    if (sceneEl.hasLoaded) {
        const vrModeUI = sceneEl.components['vr-mode-ui'];
        const enterAREl = vrModeUI.enterAREl;
        enterAREl.classList.remove(HIDDEN_CLASS);
        enterAREl.removeEventListener('click', vrModeUI.onEnterARButtonClick, true);
        enterAREl.addEventListener('click', function() {
            sceneEl.setAttribute('arena-webar', '');
        });
    } else {
        sceneEl.addEventListener('loaded', handleARButtonForNonWebXRMobile);
    }
};

handleARButtonForNonWebXRMobile();
