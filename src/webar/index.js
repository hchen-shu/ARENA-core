import './ar-component.js';

const HIDDEN_CLASS = 'a-hidden';

const handleARButtonForNonWebXRMobile = function() {
    if (window.hasNativeWebXRImplementation) {
        return;
    }

    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) {
        window.addEventListener('DOMContentLoaded', handleARButtonForNonWebXRMobile);
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
