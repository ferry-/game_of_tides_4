class WidgetBase {
  public element: HTMLElement;
  protected content: HTMLElement;
  protected elementHeight: string = "";
  protected contentHeight: string = "";
  protected sizeState: boolean = true;

  constructor(public label: string,
              public width?: number,
              public height?: number) {
    this.element = document.getElementById(label);
    if(!this.element) {
      this.element = document.createElement("div");
    }
    this.element.classList.add("widget");

    const button = document.createElement("div");
    button.innerHTML = "-";
    button.classList.add("button");
    this.element.appendChild(button);
    button.addEventListener("click", this.shrinkGrow.bind(this));

    this.content = document.createElement("div");
    this.element.appendChild(this.content);
    this.content.classList.add("content");

    if(width !== undefined) {
      this.element.style.width = "" + width + "px";
    }
    if(height !== undefined) {
      this.element.style.height = "" + height + "px";
    }
  }

  private shrinkGrow() {
    if(this.sizeState){
      if(this.element.style.height !== "") {
        this.elementHeight = this.element.style.height;
        this.element.style.height = "0";
      }
      this.contentHeight = this.content.style.height;
      this.content.style.height = "0";
    } else {
      if(this.elementHeight !== "") {
        this.element.style.height = this.elementHeight;
      }
      this.content.style.height = this.contentHeight;
    }
    this.sizeState = !this.sizeState;
  }
}

class StatusWidget extends WidgetBase {
  private message: HTMLElement;

  constructor() {
    super("FPS", 100, 50);
    setInterval(this.service.bind(this), 1000);

    this.message = document.createElement("div");
    this.message.classList.add("message");

    this.content.appendChild(this.message);

    this.content.classList.add("centered");
    this.message.classList.add("centered");
  }

  public service() {
    this.message.innerHTML = "FPS: " + Math.round(MainLoop.FPS);

    const bar = document.createElement("div");
    bar.classList.add("bar");
    if(Date.now() - MainLoop.lastDrawFrame <= 1000) {
      const height = 0.8 * this.height * MainLoop.FPS / maxFps;
      bar.style.background = "cadetblue";
      bar.style.height = "" + Math.round(height) + "px";
    }
    this.content.appendChild(bar);
    while(this.content.childElementCount > this.width) {
      this.content.removeChild(this.content.childNodes[1]);
    }
    this.content.classList.add("graph");
  }
}

class CameraPositionWidget extends WidgetBase {
  constructor(private camera: Camera) {
    super("CameraPos", 180, 50);
    setInterval(this.service.bind(this), 20);
    this.content.classList.add("centered");
  }

  public service() {
    const pitch = Math.round(THREE.Math.radToDeg(this.camera.pitch)) -90;
    const pitchString = "" + pitch + "\xB0";

    const yaw = Math.round(THREE.Math.radToDeg(this.camera.yaw));
    let yawString = "0\xB0";
    if(yaw < 0) {
      yawString = "" + (0 - yaw) + "\xB0E";
    } else if(yaw > 0) {
      yawString = "" + yaw + "\xB0W";
    }

    const height = Math.round(this.camera.distance * 1000);

    const degLat = Math.floor(this.camera.lat);
    const minLat = Math.floor((this.camera.lat - degLat) * 60);
    const degLon = Math.floor(this.camera.lon);
    const minLon = Math.floor((this.camera.lon - degLon) * 60);
    this.content.innerHTML =
      "lat: " + degLat + "\xB0&nbsp;" + minLat + "'" +
      "&nbsp;&nbsp;&nbsp;" +
      "lon: " + degLon + "\xB0&nbsp;" + minLon + "'" +
      "<br>" +
      "pitch: " + pitchString + "&nbsp;&nbsp;&nbsp;yaw: " + yawString +
      "<br>" +
      "height: " + height + "m";
  }
}

class MenuWidget extends WidgetBase {
  public userInput: Array<KeyboardEvent | ICustomInputEvent> = [];
  private uiMenu = new UIMenu();

  constructor(public label: string) {
    super("Menu");
    setInterval(this.service.bind(this), 1000);

    UIMaster.clientMessageQueues.push(this.userInput);

    const content = {
      worldLevelGenerate: {
        label: "cursor size:",
        type: "range",
        key: "generateLevel",
        value: 6,
        min: 1,
        max: 16,
      },
      worldLevel0: {
        label: "0",
        type: "checkbox",
        key: "0",
      },
      worldLevel1: {
        label: "1",
        type: "checkbox",
        key: "1",
      },
      worldLevel2: {
        label: "2",
        type: "checkbox",
        key: "2",
      },
      worldLevel3: {
        label: "3",
        type: "checkbox",
        key: "3",
      },
      worldLevel4: {
        label: "4",
        type: "checkbox",
        key: "4",
      },
      worldLevel5: {
        label: "5",
        type: "checkbox",
        key: "5",
      },
      worldLevel6: {
        label: "6",
        type: "checkbox",
        key: "6",
      },
      worldLevel7: {
        label: "7",
        type: "checkbox",
        key: "7",
      },
      worldLevel8: {
        label: "8",
        type: "checkbox",
        key: "8",
      },
      worldLevel9: {
        label: "9",
        type: "checkbox",
        key: "9",
      },
      worldLevel10: {
        label: "10",
        type: "checkbox",
        key: "10",
      },
      worldLevel11: {
        label: "11",
        type: "checkbox",
        key: "11",
      },
      worldLevel12: {
        label: "12",
        type: "checkbox",
        key: "12",
      },
      worldLevel13: {
        label: "13",
        type: "checkbox",
        key: "13",
      },
      worldLevel14: {
        label: "14",
        type: "checkbox",
        key: "14",
      },
    };

    const container = document.createElement("div");
    this.content.appendChild(container);
    for(const id in content) {
      if(content.hasOwnProperty(id)) {
        const newElement = document.createElement("div");

        const newLabel = document.createElement("div");
        newLabel.innerHTML = content[id].label;
        newLabel.className = "inline";

        const newInput = document.createElement("input");
        newInput.id = this.label + "_" + content[id].key;
        newInput.name = content[id].key;
        newInput.type = content[id].type;
        newInput.checked = true;
        newInput.value = content[id].value || content[id].key || id;
        if(content[id].min !== undefined) {
          newInput.min = content[id].min;
        }
        if(content[id].max !== undefined) {
          newInput.max = content[id].max;
        }

        newInput.className = "inline";

        newElement.appendChild(newLabel);
        newElement.appendChild(newInput);
        container.appendChild(newElement);

        newInput.onclick = this.onClick.bind(this);
      }
    }
  }

  private service() {
    const debounce = {};
    while (this.userInput.length) {
      const input = this.userInput.pop();
      switch(input.key || input.type) {
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
        case "10":
        case "11":
        case "12":
        case "13":
        case "14":
          if(input.type === "keydown" && !debounce[input.key]) {
            debounce[input.key] = true;
            this.onKeyPress(input as KeyboardEvent);
          }
          break;
      }
    }
  }

  private onKeyPress(event: KeyboardEvent) {
    const id = this.label + "_" + event.key;
    const checkBox = document.getElementById(id) as HTMLInputElement;
    if(checkBox) {
      const change = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      checkBox.dispatchEvent(change);
    }
  }

  private onClick(event: MouseEvent) {
    const target = event.target as HTMLInputElement;
    let menuEvent: ICustomInputEvent;
    if(target.type === "checkbox") {
      menuEvent = {type: "menuevent",
                   key: target.value,
                   value: target.checked};
    } else {
      menuEvent = {type: "menuevent",
                   key: target.name,
                   value: target.value};
    }
    this.uiMenu.changes[target.value] = menuEvent;
  }
}

class CursorPositionWidget extends WidgetBase {
  private container: HTMLElement;

  constructor(private scene: Scene) {
    super("CursorPos", 100, 50);
    setInterval(this.service.bind(this), 200);
    this.content.classList.add("centered");
    this.container = document.createElement("div");
    this.content.appendChild(this.container);
  }

  public service() {
    this.container.innerHTML = "";
    const face = this.scene.faceUnderMouse;
    if(face === undefined) {
      return;
    }

    const sizeDiv = document.createElement("div");
    this.container.appendChild(sizeDiv);

    const point0 = new THREE.Vector3(0, 0, 0);
    const point1 = new THREE.Vector3(0, 0, 0);
    const point2 = new THREE.Vector3(0, 0, 0);

    point0.copy(face.points[0].point);
    point1.copy(face.points[1].point);
    point2.copy(face.points[2].point);

    const size = Math.round(1000 * (point0.distanceTo(point1) +
                                    point1.distanceTo(point2) +
                                    point2.distanceTo(point0)) / 3) / 1000;
    sizeDiv.innerHTML = "size: " + size;


    /*const tileLabel = this.scene.makeTileLabel(
      face.indexHigh,
      face.indexLow,
      this.scene.generateTileLevel);
    const tile = this.scene.activeMeshes[tileLabel];

    if(tile === undefined) {
      return;
    }

    const tileDiv = document.createElement("div");
    this.container.appendChild(tileDiv);
    tileDiv.innerHTML = "" + tile.userData.label;

    tile.userData.neighbours.forEach((neighbour, i) => {
      const neighbourDiv = document.createElement("div");
      this.container.appendChild(neighbourDiv);
      neighbourDiv.innerHTML = "" + i + " " +
        neighbour.indexHigh + " " +
        neighbour.indexLow + " ";
    });*/
  }
}

class BrowserInfoWidget extends WidgetBase {
  private container: HTMLElement;
  private fpsContainer: HTMLElement;

  constructor(private browserInfo: BrowserInfo) {
    super("BrowserInfo");
    setInterval(this.service.bind(this), 10000);

    this.service();
  }

  public service() {
    this.content.innerHTML = this.browserInfo.returnHtml().innerHTML;
    const lineCount = this.content.childElementCount;
    if(this.sizeState) {
      this.content.style.height = "" + lineCount + "em";
    }
  }
}

