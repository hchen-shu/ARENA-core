import {ARSource} from './ar-source.js';
import {Preprocessor} from './preprocessor';
import * as Comlink from 'comlink';

const HIDDEN_CLASS = 'a-hidden';

const DTAG_ERROR_THRESH = 5e-6;

AFRAME.registerComponent('arena-webar', {
    schema: {
        enabled: {type: 'boolean', default: true},
        drawTagsEnabled: {type: 'boolean', default: true},
        cvRateMs: {type: 'number', default: 100},
        quadSigma: {type: 'number', default: 0.2},
        imageWidth: {type: 'number', default: 1280},
        imageHeight: {type: 'number', default: 720},
        cx: {type: 'number', default: 636.9118},
        cy: {type: 'number', default: 360.5100},
        fx: {type: 'number', default: 997.2827},
        fy: {type: 'number', default: 997.2827},
    },

    init: function() {
        this.dtagMatrix = new THREE.Matrix4();
        this.rigMatrix = new THREE.Matrix4();
        // this.vioMatrixPrev = new THREE.Matrix4();
        this.vioMatrix = new THREE.Matrix4();
        this.vioMatrixInv = new THREE.Matrix4();
        // this.vioMatrixDiff = new THREE.Matrix4();
        this.tagPoseMatrix = new THREE.Matrix4();
        // this.identityMatrix = new THREE.Matrix4();
        // this.vioRot = new THREE.Quaternion();
        // this.vioPos = new THREE.Vector3();
        // this.vioPosDiff = new THREE.Vector3();
        // this.tagPoseRot = new THREE.Quaternion();

        this.FLIPMATRIX = new THREE.Matrix4();
        this.FLIPMATRIX.set(
            1, 0, 0, 0,
            0, -1, 0, 0,
            0, 0, -1, 0,
            0, 0, 0, 1,
        );

        this.originMatrix = new THREE.Matrix4();
        this.originMatrix.set( // row-major
            1, 0, 0, 0,
            0, 0, 1, 0,
            0, -1, 0, 0,
            0, 0, 0, 1,
        );

        this.ORIGINTAG = {
            id: 'ORIGIN',
            uuid: 'ORIGIN',
            pose: this.originMatrix,
        };

        this.aprilTags = {
            0: this.ORIGINTAG,
        };

        this.arSource = new ARSource();
        this.arSource.init()
            .then(this.onARInit.bind(this))
            .catch((err) => {
                console.warn(err);
            });
    },

    onARInit: async function(source) {
        const data = this.data;
        const el = this.el;

        document.body.appendChild(source);

        this.sourceWidth = this.arSource.options.width;
        this.sourceHeight = this.arSource.options.height;

        // hide enviornment and make scene transparent
        const env = document.getElementById('env');
        env.setAttribute('visible', false);
        el.setAttribute('background', 'transparent', true);

        // hide ar/vr buttons
        this.hideVRButtons();

        // hide icons
        const icons = document.getElementById('icons-div');
        icons.style.display = 'none';
        const chatIcons = document.getElementsByClassName('chat-button-group')[0];
        chatIcons.style.display = 'none';

        const camera = document.getElementById('my-camera');
        // disable aframe's usage of gyro
        camera.setAttribute('look-controls', 'magicWindowTrackingEnabled', false);
        // remove dragging to rotate scene
        camera.setAttribute('look-controls', 'touchEnabled', false);
        // enable updating vio to MQTT
        camera.setAttribute('arena-camera', 'vioEnabled', true);

        // create preprocessor
        this.preprocessor = new Preprocessor(data.imageWidth, data.imageHeight);
        this.preprocessor.setKernelSigma(data.quadSigma);
        this.preprocessor.attachElem(source);

        this.grayscale = new Uint8Array(data.imageWidth * data.imageHeight);

        // create overlay canvas to draw detections, if needed
        if (data.drawTagsEnabled) {
            this.overlayCanvas = document.createElement('canvas');
            this.overlayCanvas.id = 'ar-overlay';
            this.overlayCanvas.width = this.arSource.options.width;
            this.overlayCanvas.height = this.arSource.options.height;
            this.overlayCanvas.style.position = 'absolute';
            this.overlayCanvas.style.top = '0px';
            this.overlayCanvas.style.left = '0px';
            this.overlayCanvas.style.zIndex = '-1';
            document.body.appendChild(this.overlayCanvas);
        }

        // setup aframe canvas positioning
        // el.renderer.domElement.style.position = 'absolute';
        // el.renderer.domElement.style.top = '0px';
        // el.renderer.domElement.style.left = '0px';

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));

        // download Apriltag wasm module and start processing loop
        await this.apriltagInit();
    },

    apriltagInit: async function() {
        const Apriltag = Comlink.wrap(new Worker('../apriltag/apriltag.js'));
        this.aprilTag = await new Apriltag(Comlink.proxy(this.onApriltagInit.bind(this)));
    },

    onApriltagInit: function() {
        const data = this.data;
        const el = this.el;

        this.aprilTag.set_camera_info(data.fx, data.fy, data.cx, data.cy);

        this.processCV();
    },

    hideVRButtons: function() {
        const data = this.data;
        const el = this.el;

        const enterAREl = el.components['vr-mode-ui'].enterAREl;
        enterAREl.classList.add(HIDDEN_CLASS);
        const enterVREl = el.components['vr-mode-ui'].enterVREl;
        enterVREl.classList.add(HIDDEN_CLASS);
    },

    onResize: function() {
        const data = this.data;
        const el = this.el;

        this.arSource.resize(window.innerWidth, window.innerHeight);
        // this.arSource.copyDimensionsTo(el.renderer.domElement);
        if (data.drawTagsEnabled) {
            this.arSource.copyDimensionsTo(this.overlayCanvas);
        }
    },

    processCV: async function() {
        const data = this.data;
        const el = this.el;

        // this.vioMatrixPrev.copy(this.vioMatrix);
        const camParentMat = document.getElementById('my-camera').object3D.parent.matrixWorld;
        const camMat = document.getElementById('my-camera').object3D.matrixWorld;
        this.vioMatrix.copy(camParentMat).invert(); // vioMatrix.getInverse(camParent);
        this.vioMatrix.multiply(camMat);
        this.vioMatrixInv.copy(this.vioMatrix).invert(); // vioMatrixT.getInverse(vioMatrix);

        // this.vioRot.setFromRotationMatrix(this.vioMatrix);
        // this.vioPos.setFromMatrixPosition(this.vioMatrix);

        const imageData = this.preprocessor.getPixels();
        let j = 0;
        // grab only one channel; already grayscaled!
        for (let i = 0; i < 4 * data.imageWidth * data.imageHeight; i+=4) {
            this.grayscale[j] = imageData[i];
            j++;
        }

        // detect apriltags
        const detections = await this.aprilTag.detect(this.grayscale, data.imageWidth, data.imageHeight);

        if (detections.length > 0) {
            for (const detection of detections) {
                const d = detection;
                // console.log(d.pose.e);
                // if (d.pose.e > DTAG_ERROR_THRESH) {
                //     continue;
                // }

                // search for tag with detection id
                const indexedTag = this.aprilTags[d.id];

                // if tag has pose, update camera position based on pose
                if (indexedTag?.pose) {
                    const refTag = indexedTag;

                    // calculate pose
                    const rigPose = this.getRigPoseFromAprilTag(d.pose, refTag.pose);

                    // update camera
                    document.getElementById('cameraSpinner').object3D.quaternion.setFromRotationMatrix(rigPose);
                    document.getElementById('cameraRig').object3D.position.setFromMatrixPosition(rigPose);
                }
            }

            if (data.drawTagsEnabled) {
                this.drawTags(detections);
            }

            const ids = detections.map((tag) => tag.id);
            console.log('April Tag IDs Detected: ' + ids.join(', '));
        }

        setTimeout(this.processCV.bind(this), data.cvRateMs);
    },

    getRigPoseFromAprilTag: function(dtagPose, refTagPose) {
        const r = dtagPose.R;
        const t = dtagPose.t;

        this.dtagMatrix.set( // Transposed rotation
            r[0][0], r[1][0], r[2][0], t[0],
            r[0][1], r[1][1], r[2][1], t[1],
            r[0][2], r[1][2], r[2][2], t[2],
            0, 0, 0, 1,
        );
        this.dtagMatrix.premultiply(this.FLIPMATRIX);
        this.dtagMatrix.multiply(this.FLIPMATRIX);

        // Python rig_pose = ref_tag_pose @ np.linalg.inv(dtag_pose) @ np.linalg.inv(vio_pose)
        this.dtagMatrix.copy(this.dtagMatrix).invert();
        this.rigMatrix.identity();
        this.rigMatrix.multiplyMatrices(refTagPose, this.dtagMatrix);
        this.rigMatrix.multiply(this.vioMatrixInv);

        return this.rigMatrix;
    },

    getTagPoseFromRig: function(dtag) {
        const r = dtag.R;
        const t = dtag.t;

        this.dtagMatrix.set( // Transposed rotation
            r[0][0], r[1][0], r[2][0], t[0],
            r[0][1], r[1][1], r[2][1], t[1],
            r[0][2], r[1][2], r[2][2], t[2],
            0, 0, 0, 1,
        );
        this.dtagMatrix.premultiply(this.FLIPMATRIX);
        this.dtagMatrix.multiply(this.FLIPMATRIX);

        // Python ref_tag_pose = rig_pose @ vio_pose @ dtag_pose
        this.tagPoseMatrix.copy(this.rigMatrix);
        this.tagPoseMatrix.multiply(this.vioMatrix);
        this.tagPoseMatrix.multiply(this.dtagMatrix);

        return this.tagPoseMatrix;
    },

    drawTags: function(tags) {
        const data = this.data;
        if (!data.drawTagsEnabled) {
            return;
        }

        const overlayCtx = this.overlayCanvas.getContext('2d');
        overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        for (const tag of tags) {
            this.drawTag(tag);
        }
    },

    drawTag: function(tag) {
        const data = this.data;
        if (!data.drawTagsEnabled) {
            return;
        }

        const overlayCtx = this.overlayCanvas.getContext('2d');

        overlayCtx.beginPath();
        overlayCtx.lineWidth = 3;
        overlayCtx.strokeStyle = 'blue';
        overlayCtx.moveTo(tag.corners[0].x, tag.corners[0].y);
        overlayCtx.lineTo(tag.corners[1].x, tag.corners[1].y);
        overlayCtx.lineTo(tag.corners[2].x, tag.corners[2].y);
        overlayCtx.lineTo(tag.corners[3].x, tag.corners[3].y);
        overlayCtx.lineTo(tag.corners[0].x, tag.corners[0].y);
        overlayCtx.stroke();

        overlayCtx.font = 'bold 20px Arial';
        overlayCtx.textAlign = 'center';
        overlayCtx.fillStyle = 'red';
        overlayCtx.fillText(tag.id, tag.center.x, tag.center.y);
    },

    update(oldData) {
        const data = this.data;
        if (data.enabled) {

        }
    },

    tick: function(t, dt) {

    },
});
