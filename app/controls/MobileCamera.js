import { Euler, Vector3 } from '../thirdparty/three/three.core.js';

const _euler = new Euler(0, 0, 0, 'YXZ');
const _PI_2 = Math.PI / 2;
const _MOUSE_SENSITIVITY = 0.004;

export default class MobileCamera {
    constructor(cam, domElement) {
        this.cam = cam;
        this.domElement = domElement;
        this.flySpeed = 5;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;
        this.movementSpeed = 0;
        this.horizontalMovementSpeed = 0;
        this.verticalMovementSpeed = 0;

        // Thumbstick state
        this.thumbstick = { active: false, touchId: null, startX: 0, startY: 0, dx: 0, dy: 0 };

        // Camera rotation state
        this.rotationTouch = { active: false, touchId: null, lastX: 0, lastY: 0 };

        // Pinch zoom state
        this.pinch = { active: false, touchId1: null, touchId2: null, lastDist: 0 };

        // Create thumbstick UI
        this._createThumbstickUI();

        // Touch events
        domElement.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        domElement.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        domElement.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        domElement.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });
    }

    _createThumbstickUI() {
        // Left thumbstick container
        this.thumbEl = document.createElement('div');
        this.thumbEl.id = 'mobile-thumbstick';
        this.thumbEl.style.cssText = `
            position: fixed; bottom: 20px; left: 20px; width: 120px; height: 120px;
            background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%; z-index: 1000; touch-action: none; display: none;
        `;

        this.thumbKnob = document.createElement('div');
        this.thumbKnob.style.cssText = `
            position: absolute; top: 50%; left: 50%; width: 40px; height: 40px;
            background: rgba(255,255,255,0.4); border-radius: 50%;
            transform: translate(-50%, -50%); pointer-events: none;
        `;
        this.thumbEl.appendChild(this.thumbKnob);
        document.body.appendChild(this.thumbEl);

        // Right side label for rotation hint
        this.hintEl = document.createElement('div');
        this.hintEl.style.cssText = `
            position: fixed; bottom: 80px; right: 30px;
            color: rgba(255,255,255,0.3); font-size: 12px; z-index: 1000;
            pointer-events: none; display: none; text-align: center;
        `;
        this.hintEl.innerHTML = '&#x1F446; drag to look<br>&#x1F91C; pinch to zoom';
        document.body.appendChild(this.hintEl);
    }

    showUI() {
        this.thumbEl.style.display = 'block';
        this.hintEl.style.display = 'block';
    }

    hideUI() {
        this.thumbEl.style.display = 'none';
        this.hintEl.style.display = 'none';
    }

    _getTouchById(touches, id) {
        for (let i = 0; i < touches.length; i++) {
            if (touches[i].identifier === id) return touches[i];
        }
        return null;
    }

    _onTouchStart(e) {
        e.preventDefault();
        const touches = e.changedTouches;
        const rect = this.domElement.getBoundingClientRect();

        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            const x = t.clientX;
            const y = t.clientY;

            // Left half = thumbstick
            if (x < window.innerWidth * 0.5 && !this.thumbstick.active) {
                this.thumbstick.active = true;
                this.thumbstick.touchId = t.identifier;
                this.thumbstick.startX = x;
                this.thumbstick.startY = y;
                this.thumbstick.dx = 0;
                this.thumbstick.dy = 0;
                // Position thumbstick at touch point
                this.thumbEl.style.left = (x - 60) + 'px';
                this.thumbEl.style.bottom = 'auto';
                this.thumbEl.style.top = (y - 60) + 'px';
            }
            // Right half = camera rotation
            else if (x >= window.innerWidth * 0.5 && !this.rotationTouch.active) {
                this.rotationTouch.active = true;
                this.rotationTouch.touchId = t.identifier;
                this.rotationTouch.lastX = x;
                this.rotationTouch.lastY = y;
            }
        }

        // Detect pinch (2 touches on right side)
        if (e.touches.length >= 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            this.pinch.active = true;
            this.pinch.touchId1 = t1.identifier;
            this.pinch.touchId2 = t2.identifier;
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            this.pinch.lastDist = Math.sqrt(dx * dx + dy * dy);
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        const touches = e.touches;

        // Update thumbstick
        if (this.thumbstick.active) {
            const t = this._getTouchById(touches, this.thumbstick.touchId);
            if (t) {
                this.thumbstick.dx = (t.clientX - this.thumbstick.startX) / 50;
                this.thumbstick.dy = (t.clientY - this.thumbstick.startY) / 50;
                // Clamp to circle
                const dist = Math.sqrt(this.thumbstick.dx * this.thumbstick.dx + this.thumbstick.dy * this.thumbstick.dy);
                if (dist > 1) {
                    this.thumbstick.dx /= dist;
                    this.thumbstick.dy /= dist;
                }
                // Move knob visual
                this.thumbKnob.style.transform = `translate(calc(-50% + ${this.thumbstick.dx * 30}px), calc(-50% + ${this.thumbstick.dy * 30}px))`;

                this.moveForward = this.thumbstick.dy < -0.2;
                this.moveBackward = this.thumbstick.dy > 0.2;
                this.moveLeft = this.thumbstick.dx < -0.2;
                this.moveRight = this.thumbstick.dx > 0.2;
            }
        }

        // Update camera rotation
        if (this.rotationTouch.active && !this.pinch.active) {
            const t = this._getTouchById(touches, this.rotationTouch.touchId);
            if (t) {
                const dx = t.clientX - this.rotationTouch.lastX;
                const dy = t.clientY - this.rotationTouch.lastY;
                this.rotationTouch.lastX = t.clientX;
                this.rotationTouch.lastY = t.clientY;

                _euler.setFromQuaternion(this.cam.quaternion);
                _euler.y -= dx * _MOUSE_SENSITIVITY;
                _euler.x -= dy * _MOUSE_SENSITIVITY;
                _euler.x = Math.max(_PI_2 - Math.PI, Math.min(_PI_2, _euler.x));
                this.cam.quaternion.setFromEuler(_euler);
            }
        }

        // Update pinch zoom
        if (this.pinch.active && e.touches.length >= 2) {
            const t1 = this._getTouchById(touches, this.pinch.touchId1);
            const t2 = this._getTouchById(touches, this.pinch.touchId2);
            if (t1 && t2) {
                const dx = t1.clientX - t2.clientX;
                const dy = t1.clientY - t2.clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const delta = this.pinch.lastDist - dist;
                this.pinch.lastDist = dist;

                // Move camera forward/backward along look direction
                const dir = new Vector3();
                dir.set(0, 0, -1).applyQuaternion(this.cam.quaternion);
                this.cam.position.addScaledVector(dir, delta * 0.1);
            }
        }
    }

    _onTouchEnd(e) {
        const touches = e.touches;

        // Check if thumbstick touch ended
        if (this.thumbstick.active) {
            const t = this._getTouchById(touches, this.thumbstick.touchId);
            if (!t) {
                this.thumbstick.active = false;
                this.thumbstick.dx = 0;
                this.thumbstick.dy = 0;
                this.moveForward = false;
                this.moveBackward = false;
                this.moveLeft = false;
                this.moveRight = false;
                this.thumbKnob.style.transform = 'translate(-50%, -50%)';
                // Reset position
                this.thumbEl.style.left = '20px';
                this.thumbEl.style.top = 'auto';
                this.thumbEl.style.bottom = '20px';
            }
        }

        // Check if rotation touch ended
        if (this.rotationTouch.active) {
            const t = this._getTouchById(touches, this.rotationTouch.touchId);
            if (!t) {
                this.rotationTouch.active = false;
            }
        }

        // Check if pinch ended
        if (e.touches.length < 2) {
            this.pinch.active = false;
        }
    }

    update(dt) {
        if (this.moveForward) {
            if (this.movementSpeed < 50) this.movementSpeed += this.flySpeed;
        } else if (this.moveBackward) {
            if (this.movementSpeed > -50) this.movementSpeed -= this.flySpeed;
        } else {
            if (this.movementSpeed > 0) this.movementSpeed -= this.flySpeed;
            else if (this.movementSpeed < 0) this.movementSpeed += this.flySpeed;
        }

        if (this.moveLeft) {
            if (this.horizontalMovementSpeed > -50) this.horizontalMovementSpeed -= this.flySpeed;
        } else if (this.moveRight) {
            if (this.horizontalMovementSpeed < 50) this.horizontalMovementSpeed += this.flySpeed;
        } else {
            if (this.horizontalMovementSpeed > 0) this.horizontalMovementSpeed -= this.flySpeed;
            else if (this.horizontalMovementSpeed < 0) this.horizontalMovementSpeed += this.flySpeed;
        }

        this.cam.translateX(this.horizontalMovementSpeed * dt);
        this.cam.translateZ(-this.movementSpeed * dt);
    }
}
