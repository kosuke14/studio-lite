import { PointerLockControls } from "./PointerLockControls.js";
import MobileCamera from "./MobileCamera.js";

export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
}

export default class FlyCamera {
    constructor(cam, domElement) {
        this.cam = cam;
        this.domElement = domElement;
        this.isMobile = isMobileDevice();

        if (this.isMobile) {
            this.mobile = new MobileCamera(cam, domElement);
            this.mobile.showUI();
            this.controls = null;
        } else {
            this.mobile = null;
            this.movementSpeed = 0;
            this.horizontalMovementSpeed = 0;
            this.verticalMovementSpeed = 0;
            this.flySpeed = 5;
            this.controls = new PointerLockControls(this.cam, this.domElement);

            domElement.addEventListener('click', () => {
                this.controls.lock();
            });

            window.addEventListener("keydown", (e) => {
                if (!this.controls.isLocked) return;
                switch (e.code) {
                    case "KeyW": this.moveForward = true; break;
                    case "KeyS": this.moveBackward = true; break;
                    case "KeyA": this.moveLeft = true; break;
                    case "KeyD": this.moveRight = true; break;
                    case "KeyE": this.moveUp = true; break;
                    case "KeyQ": this.moveDown = true; break;
                }
            });

            window.addEventListener("keyup", (e) => {
                if (!this.controls.isLocked) return;
                switch (e.code) {
                    case "KeyW": this.moveForward = false; break;
                    case "KeyS": this.moveBackward = false; break;
                    case "KeyA": this.moveLeft = false; break;
                    case "KeyD": this.moveRight = false; break;
                    case "KeyE": this.moveUp = false; break;
                    case "KeyQ": this.moveDown = false; break;
                }
            });
        }
    }

    update(dt) {
        if (this.isMobile) {
            this.mobile.update(dt);
            return;
        }
        if (!this.controls.isLocked) return;
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
        if (this.moveUp) {
            if (this.verticalMovementSpeed < 50) this.verticalMovementSpeed += this.flySpeed;
        } else if (this.moveDown) {
            if (this.verticalMovementSpeed > -50) this.verticalMovementSpeed -= this.flySpeed;
        } else {
            if (this.verticalMovementSpeed > 0) this.verticalMovementSpeed -= this.flySpeed;
            else if (this.verticalMovementSpeed < 0) this.verticalMovementSpeed += this.flySpeed;
        }
        this.cam.translateX(this.horizontalMovementSpeed * dt);
        this.cam.translateY(this.verticalMovementSpeed * dt);
        this.cam.translateZ(-this.movementSpeed * dt);
    }
}
